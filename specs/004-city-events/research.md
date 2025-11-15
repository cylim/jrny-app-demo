# Research: City Events

**Feature**: City Events
**Date**: 2025-11-15
**Status**: Complete

## Overview

This document consolidates research findings for implementing the City Events feature, covering Convex best practices, timezone handling, capacity management, and privacy controls.

## Key Technical Decisions

### 1. Timezone Storage and Display

**Decision**: Store event times in Unix milliseconds with separate timezone field

**Rationale**:
- Convex stores timestamps as numbers (Unix milliseconds since epoch)
- Storing timezone separately (`timezone: v.string()`) allows organizers to specify event timezone (e.g., "America/New_York")
- Display times using browser's `Intl.DateTimeFormat` with specified timezone for accurate localization
- Prevents DST issues and allows users in different timezones to see correct local times

**Implementation Approach**:
```typescript
// In Convex schema
events: defineTable({
  startTime: v.number(),  // Unix milliseconds
  endTime: v.optional(v.number()),
  timezone: v.string(),   // IANA timezone (e.g., "America/New_York")
  // ... other fields
})

// In frontend
const eventDate = new Date(event.startTime);
const formatted = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: event.timezone
}).format(eventDate);
```

**Alternatives Considered**:
- **ISO 8601 strings**: Rejected because Convex uses numbers for timestamps and existing codebase pattern uses `_creationTime` (number)
- **UTC only**: Rejected because users need to see events in the organizer's intended timezone, not converted to their local time

### 2. Event-Participant Relationship Model

**Decision**: Separate `eventParticipants` table with compound index

**Rationale**:
- Allows efficient queries for "all participants in an event" and "all events a user joined"
- Compound index `by_event_and_user` prevents duplicate joins
- Enables atomic join/leave operations with single document create/delete
- Supports future features (e.g., RSVP status, join timestamp)

**Schema Design**:
```typescript
eventParticipants: defineTable({
  eventId: v.id('events'),
  userId: v.id('users'),
  joinedAt: v.number(),  // Unix milliseconds
})
.index('by_event', ['eventId'])
.index('by_user', ['userId'])
.index('by_event_and_user', ['eventId', 'userId'])
```

**Alternatives Considered**:
- **Array of participant IDs in event document**: Rejected due to Convex query limitations (can't efficiently filter/index array contents)
- **Array of event IDs in user document**: Rejected for same reason + concurrent update risks

### 3. Capacity Management

**Decision**: Optional `maxCapacity` field with pre-join validation

**Rationale**:
- `maxCapacity: v.optional(v.number())` allows events without limits (undefined = unlimited)
- Validation in join mutation prevents race conditions:
  ```typescript
  const participantCount = await ctx.db
    .query('eventParticipants')
    .withIndex('by_event', q => q.eq('eventId', eventId))
    .collect()
    .then(p => p.length);

  if (event.maxCapacity && participantCount >= event.maxCapacity) {
    throw new Error('Event is full');
  }
  ```
- Client shows "Event Full" badge when `participantCount === maxCapacity`

**Alternatives Considered**:
- **Denormalized participant count**: Rejected due to eventual consistency risks and Convex best practice of avoiding denormalization
- **Waitlist feature**: Deferred to future iteration (P4+)

### 4. Participant List Privacy

**Decision**: `isParticipantListHidden` boolean with viewer-aware queries

**Rationale**:
- Simple boolean flag on event document
- Query returns participant list only when:
  1. `isParticipantListHidden === false`, OR
  2. Viewer is the event owner, OR
  3. Viewer is a participant (can see they're joined but not others)
- Implements privacy requirements FR-014, FR-015, FR-016, FR-017

**Query Logic**:
```typescript
// In getEvent query
const viewerIdentity = await ctx.auth.getUserIdentity();
const isOwner = viewerIdentity && event.ownerId === viewerIdentity.subject;
const isParticipant = viewerIdentity && await ctx.db
  .query('eventParticipants')
  .withIndex('by_event_and_user', q =>
    q.eq('eventId', eventId).eq('userId', viewerIdentity.subject)
  )
  .unique() !== null;

const canSeeParticipants = !event.isParticipantListHidden || isOwner;
const canSeeOwnParticipation = isParticipant;
```

**Alternatives Considered**:
- **Enum with visibility levels**: Rejected as over-engineering for binary public/private need
- **Per-participant visibility control**: Deferred to future iteration

### 5. Past Events Handling

**Decision**: Computed "upcoming" vs "past" via query filtering, not status field

**Rationale**:
- No need for background job to update event status
- Queries filter by comparing `startTime` to current time:
  ```typescript
  // Upcoming events
  .filter(q => q.gte(q.field('startTime'), Date.now()))

  // Past events
  .filter(q => q.lt(q.field('startTime'), Date.now()))
  ```
- Automatically accurate without cron jobs or manual updates
- Aligns with Convex best practices (avoid denormalization)

**Alternatives Considered**:
- **Status enum (`upcoming`, `past`, `cancelled`)**: Rejected because `upcoming`/`past` is derivable from time comparison; only `cancelled` needs explicit storage
- **Scheduled function to mark events as past**: Rejected as unnecessary overhead

### 6. Event Deletion Cascade

**Decision**: Convex mutation with transaction-like batch deletion

**Rationale**:
- When user deletes account, delete all owned events AND their participants
- Convex mutations are atomic, so batch deletion is safe:
  ```typescript
  // In user deletion mutation
  const ownedEvents = await ctx.db
    .query('events')
    .withIndex('by_owner', q => q.eq('ownerId', userId))
    .collect();

  for (const event of ownedEvents) {
    // Delete all participants
    const participants = await ctx.db
      .query('eventParticipants')
      .withIndex('by_event', q => q.eq('eventId', event._id))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Delete event
    await ctx.db.delete(event._id);
  }
  ```
- Implements FR-028, FR-029

**Alternatives Considered**:
- **Soft delete**: Rejected as it complicates queries and doesn't align with user expectation of full data deletion
- **Orphaned events**: Rejected due to poor UX (participants see events with deleted owners)

### 7. City Association

**Decision**: Immutable `cityId` field set at event creation from city page context

**Rationale**:
- Event creation only accessible from city page (`/c/:shortSlug`)
- City ID passed to event creation mutation from page context
- No UI to change city after creation (prevents confusion/abuse)
- Aligns with clarification #4: "Event creation occurs on the city page where the city is preset and immutable"

**Implementation**:
```typescript
// In createEvent mutation
args: {
  cityId: v.id('cities'),  // Required, from city page context
  title: v.string(),
  // ... other fields
}

// City page provides cityId to EventForm component
<EventForm cityId={city._id} />
```

**Alternatives Considered**:
- **City search selector**: Rejected per spec clarification (preset city from page context)
- **Allow editing city**: Rejected to prevent duplicate city handling complexity

## Index Strategy

### Required Indexes

Based on functional requirements and query patterns:

```typescript
// events table indexes
events: defineTable({...})
  .index('by_city', ['cityId'])
  .index('by_city_and_start', ['cityId', 'startTime'])
  .index('by_owner', ['ownerId'])
  .index('by_id', ['_id'])  // Already provided by Convex

// eventParticipants table indexes
eventParticipants: defineTable({...})
  .index('by_event', ['eventId'])
  .index('by_user', ['userId'])
  .index('by_event_and_user', ['eventId', 'userId'])
```

**Rationale**:
- `by_city_and_start`: Enables efficient "upcoming events in city" query (filter by city, sort by startTime)
- `by_owner`: Supports user deletion cascade (find all owned events)
- `by_event`: Get all participants for an event (for participant list)
- `by_user`: Get all events a user joined (for user profile tabs)
- `by_event_and_user`: Prevent duplicate joins, check if user already joined

## UI/UX Patterns

### Optimistic Updates

**Pattern**: Use TanStack Query's `useMutation` with optimistic updates for join/leave actions

**Rationale**:
- Immediate UI feedback improves perceived performance
- Convex's real-time subscriptions will reconcile actual state
- Error rollback handled by TanStack Query

**Example**:
```typescript
const joinMutation = useMutation({
  mutationFn: (eventId) => convexMutation(api.events.join, { eventId }),
  onMutate: async (eventId) => {
    // Optimistically add user to participant list
    queryClient.setQueryData(['event', eventId], (old) => ({
      ...old,
      participantCount: old.participantCount + 1
    }));
  },
  onError: (err, eventId, context) => {
    // Rollback on error
    queryClient.setQueryData(['event', eventId], context.previousData);
  }
});
```

### Loading States

**Pattern**: Use TanStack Query's `isLoading` and `isPending` states with Kirby-style LoadingDots component

**Locations**:
- Event list on city page: Show LoadingDots while fetching
- Event detail page: Suspense boundary with LoadingDots fallback
- Join/Leave buttons: Show `isPending` state with disabled button + spinner

### Error Handling

**Pattern**: React Error Boundaries with Sentry integration for event pages

**Implementation**:
- Wrap `/e/$eventId` route with Error Boundary
- Show user-friendly "Event not found" or "Failed to load event" messages
- Capture errors to Sentry with event ID context

## Performance Considerations

### Query Optimization

**Approach**: Use Convex indexes and pagination for large event lists

```typescript
// For city pages with many events
export const listUpcomingEvents = query({
  args: {
    cityId: v.id('cities'),
    paginationOpts: paginationOptsValidator
  },
  returns: paginatedReturnValidator(eventValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('events')
      .withIndex('by_city_and_start', q =>
        q.eq('cityId', args.cityId).gte('startTime', Date.now())
      )
      .order('asc')
      .paginate(args.paginationOpts);
  }
});
```

**Rationale**:
- Prevents loading 1000+ events at once
- Pagination built into Convex
- Meets SC-003 requirement (<2s event page load)

### Real-time Updates

**Pattern**: Use Convex's live queries for event participant counts and updates

**Rationale**:
- When user A joins event, user B (viewing same event page) sees participant count update automatically
- No polling needed - Convex pushes updates via WebSocket
- Implements real-time social discovery feature

## Testing Strategy

### Integration Tests (Playwright)

**Critical Paths**:
1. User creates event from city page → event appears in city event list
2. User joins event → participant count increases, user sees event in "My Events"
3. Event owner hides participant list → non-participants can't see list
4. Anonymous user views event → sees details but can't join
5. Event reaches capacity → "Event Full" shown, join button disabled

### Unit Tests (Vitest + convex-test)

**Convex Function Tests**:
1. `createEvent` with all required fields → returns event ID
2. `joinEvent` when at capacity → throws error
3. `joinEvent` when already joined → throws error
4. `listUpcomingEvents` → only returns future events
5. `deleteUserCascade` → deletes events and participants

### Performance Tests

**Approach**: Load test with 100 concurrent users creating/joining events

**Metrics**:
- Event creation latency (target: <500ms p95)
- Event list query latency (target: <200ms p95)
- Join mutation latency (target: <300ms p95)

## Security Considerations

### Authorization Checks

**Pattern**: Every mutation verifies user identity and ownership

```typescript
export const updateEvent = mutation({
  args: { eventId: v.id('events'), /* update fields */ },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error('Event not found');
    if (event.ownerId !== identity.subject) {
      throw new Error('Not authorized');
    }

    // Proceed with update...
  }
});
```

### Input Validation

**Pattern**: Convex validators for all inputs

**Example**:
```typescript
args: {
  title: v.string(),  // Required
  description: v.string(),
  startTime: v.number(),  // Validate > Date.now() in handler
  timezone: v.string(),  // Validate against IANA timezone list
  location: v.string(),
  maxCapacity: v.optional(v.number()),  // If provided, validate > 0
  isParticipantListHidden: v.boolean()
}
```

**Additional Validation in Handler**:
- `startTime` must be in the future
- `maxCapacity` (if provided) must be >= 1
- `timezone` must be valid IANA timezone
- `title` and `description` length limits (e.g., title < 100 chars)

## Dependencies

### No New Dependencies Required

**Rationale**: All functionality can be implemented with existing stack:
- Convex: Database, real-time subscriptions, auth
- TanStack Query + @convex-dev/react-query: Data fetching
- Framer Motion: Animations (already installed)
- Tailwind CSS + shadcn/ui: Styling (already installed)
- Vitest + Playwright: Testing (already installed)

### Optional Enhancement (Future)

**Timezone Picker Component**: Consider adding `react-timezone-select` for better UX in event creation form (user-friendly timezone selection dropdown)

## Open Questions (Resolved in Spec)

All technical questions have been resolved through clarification session:
1. ✅ Timezone handling: Organizers specify timezone
2. ✅ Capacity limits: Optional, set by organizer
3. ✅ Past events: Filtered from city pages, shown in user profile past tab
4. ✅ Deleted owner: Events deleted when owner account deleted
5. ✅ Anonymous viewing: Can view public events, can't join
6. ✅ City selection: Preset from city page, immutable

## Next Steps

Proceed to **Phase 1: Data Model & Contracts** to:
1. Define Convex schema (`data-model.md`)
2. Generate API contracts for mutations/queries (`contracts/`)
3. Create quickstart guide (`quickstart.md`)
4. Update Claude agent context
