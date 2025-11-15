# Data Model: City Events

**Feature**: City Events
**Date**: 2025-11-15
**Status**: Complete

## Overview

This document defines the database schema for the City Events feature, including tables, fields, indexes, relationships, and validation rules. All schema definitions follow Convex conventions and will be implemented in `convex/schema.ts`.

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   cities    │         │      events      │         │    users    │
│             │◄────────│                  │────────►│             │
│  (existing) │ cityId  │  (new table)     │ ownerId │  (existing) │
└─────────────┘         └──────────────────┘         └─────────────┘
                               │                            │
                               │ eventId                    │ userId
                               │                            │
                               ▼                            ▼
                        ┌─────────────────────────────────────┐
                        │      eventParticipants (new)        │
                        │                                     │
                        │  Links users to events they joined  │
                        └─────────────────────────────────────┘
```

## Tables

### events (NEW)

Represents a social gathering/meetup in a specific city.

#### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `_id` | `Id<'events'>` | Auto | Unique event identifier | System-generated |
| `_creationTime` | `number` | Auto | Unix timestamp (ms) when event created | System-generated |
| `title` | `string` | Yes | Event name/title | 1-100 characters |
| `description` | `string` | Yes | Detailed event description | 1-5000 characters |
| `startTime` | `number` | Yes | Event start time (Unix ms) | Must be > Date.now() at creation |
| `endTime` | `number` | No | Event end time (Unix ms) | If provided, must be > startTime |
| `timezone` | `string` | Yes | IANA timezone (e.g., "America/New_York") | Valid IANA timezone string |
| `location` | `string` | Yes | Physical location/address | 1-500 characters |
| `cityId` | `Id<'cities'>` | Yes | Reference to cities table | Must exist in cities table |
| `ownerId` | `Id<'users'>` | Yes | Reference to user who created event | Must exist in users table |
| `maxCapacity` | `number` | No | Maximum number of participants | If provided, must be >= 1 |
| `isParticipantListHidden` | `boolean` | Yes | Whether to hide participant list from non-owners | Default: false |
| `isCancelled` | `boolean` | Yes | Whether event is cancelled | Default: false |

#### Indexes

```typescript
events: defineTable({
  title: v.string(),
  description: v.string(),
  startTime: v.number(),
  endTime: v.optional(v.number()),
  timezone: v.string(),
  location: v.string(),
  cityId: v.id('cities'),
  ownerId: v.id('users'),
  maxCapacity: v.optional(v.number()),
  isParticipantListHidden: v.boolean(),
  isCancelled: v.boolean(),
})
  .index('by_city', ['cityId'])
  .index('by_city_and_start', ['cityId', 'startTime'])
  .index('by_owner', ['ownerId'])
```

**Index Usage**:
- `by_city`: Get all events in a city (before filtering by time)
- `by_city_and_start`: Get upcoming/past events in a city, sorted by start time (primary query for city pages)
- `by_owner`: Get all events owned by a user (for owner management, deletion cascade)

#### State Transitions

Events have implicit states based on fields:

```
┌─────────────┐  Event date passes   ┌─────────────┐
│  Upcoming   │─────────────────────►│    Past     │
│             │                      │             │
│ startTime > │                      │ startTime < │
│  Date.now() │                      │  Date.now() │
└─────────────┘                      └─────────────┘
       │                                    │
       │ Owner cancels                      │
       ▼                                    ▼
┌─────────────────────────────────────────────────┐
│             Cancelled                           │
│          isCancelled = true                     │
└─────────────────────────────────────────────────┘
```

**State Rules**:
- Upcoming: `startTime > Date.now() && !isCancelled`
- Past: `startTime <= Date.now() && !isCancelled`
- Cancelled: `isCancelled === true` (hidden from all event lists)

### eventParticipants (NEW)

Represents a user's attendance/RSVP to an event.

#### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `_id` | `Id<'eventParticipants'>` | Auto | Unique participant record ID | System-generated |
| `_creationTime` | `number` | Auto | Unix timestamp (ms) when user joined | System-generated |
| `eventId` | `Id<'events'>` | Yes | Reference to events table | Must exist in events table |
| `userId` | `Id<'users'>` | Yes | Reference to users table | Must exist in users table |

#### Indexes

```typescript
eventParticipants: defineTable({
  eventId: v.id('events'),
  userId: v.id('users'),
})
  .index('by_event', ['eventId'])
  .index('by_user', ['userId'])
  .index('by_event_and_user', ['eventId', 'userId'])
```

**Index Usage**:
- `by_event`: Get all participants for an event (for participant list display)
- `by_user`: Get all events a user joined (for user profile tabs)
- `by_event_and_user`: Check if user already joined event (prevent duplicates), unique lookup

#### Constraints

**Uniqueness**: The combination of `(eventId, userId)` must be unique (enforced by application logic using `.unique()` query on `by_event_and_user` index).

**Cascade Delete Rules**:
1. When event is deleted → Delete all `eventParticipants` records for that event
2. When user is deleted → Delete all `eventParticipants` records for that user
3. When event owner is deleted → Delete event (which triggers #1)

## Relationships

### Event ← → City (Many-to-One)

- **Cardinality**: Many events belong to one city
- **Foreign Key**: `events.cityId` → `cities._id`
- **Constraint**: `cityId` is immutable after event creation (cannot change event's city)
- **Delete Behavior**: Cities cannot be deleted if events exist (or implement cascade delete)

### Event ← → User (Many-to-One, as Owner)

- **Cardinality**: Many events belong to one owner
- **Foreign Key**: `events.ownerId` → `users._id`
- **Constraint**: Only the owner can edit/cancel event
- **Delete Behavior**: When user deleted, cascade delete all owned events

### Event ← → User (Many-to-Many, as Participants)

- **Cardinality**: Many users can join many events
- **Junction Table**: `eventParticipants`
- **Foreign Keys**:
  - `eventParticipants.eventId` → `events._id`
  - `eventParticipants.userId` → `users._id`
- **Uniqueness**: Each (event, user) pair can exist only once
- **Delete Behavior**: Bidirectional cascade (event deleted → participants deleted, user deleted → their participations deleted)

## Validation Rules

### Event Creation

```typescript
// Validation logic in createEvent mutation
function validateEventCreation(args) {
  // Title length
  if (args.title.length < 1 || args.title.length > 100) {
    throw new Error('Title must be 1-100 characters');
  }

  // Description length
  if (args.description.length < 1 || args.description.length > 5000) {
    throw new Error('Description must be 1-5000 characters');
  }

  // Start time must be in future
  if (args.startTime <= Date.now()) {
    throw new Error('Event start time must be in the future');
  }

  // End time (if provided) must be after start time
  if (args.endTime && args.endTime <= args.startTime) {
    throw new Error('Event end time must be after start time');
  }

  // Timezone must be valid IANA timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: args.timezone });
  } catch (e) {
    throw new Error('Invalid timezone');
  }

  // Location length
  if (args.location.length < 1 || args.location.length > 500) {
    throw new Error('Location must be 1-500 characters');
  }

  // Max capacity (if provided) must be >= 1
  if (args.maxCapacity !== undefined && args.maxCapacity < 1) {
    throw new Error('Max capacity must be at least 1');
  }
}
```

### Event Joining

```typescript
// Validation logic in joinEvent mutation
async function validateEventJoin(ctx, eventId, userId) {
  // Event must exist
  const event = await ctx.db.get(eventId);
  if (!event) throw new Error('Event not found');

  // Event must not be cancelled
  if (event.isCancelled) throw new Error('Event is cancelled');

  // Event must be upcoming (not past)
  if (event.startTime < Date.now()) {
    throw new Error('Cannot join past event');
  }

  // User must not already be joined
  const existing = await ctx.db
    .query('eventParticipants')
    .withIndex('by_event_and_user', q =>
      q.eq('eventId', eventId).eq('userId', userId)
    )
    .unique();

  if (existing) throw new Error('Already joined this event');

  // Check capacity if limit set
  if (event.maxCapacity !== undefined) {
    const participantCount = await ctx.db
      .query('eventParticipants')
      .withIndex('by_event', q => q.eq('eventId', eventId))
      .collect()
      .then(p => p.length);

    if (participantCount >= event.maxCapacity) {
      throw new Error('Event is full');
    }
  }
}
```

## Query Patterns

### 1. Get Upcoming Events in City

**Use Case**: Display upcoming events on city page

**Query**:
```typescript
export const listUpcomingEvents = query({
  args: { cityId: v.id('cities') },
  returns: v.array(eventValidator),
  handler: async (ctx, { cityId }) => {
    return await ctx.db
      .query('events')
      .withIndex('by_city_and_start', q =>
        q.eq('cityId', cityId).gte('startTime', Date.now())
      )
      .filter(q => q.eq(q.field('isCancelled'), false))
      .order('asc')
      .take(50);  // Limit to 50 upcoming events
  }
});
```

**Complexity**: O(log n + k) where k = number of upcoming events in city (max 50)

### 2. Get Event with Participant Count

**Use Case**: Display event detail page

**Query**:
```typescript
export const getEvent = query({
  args: { eventId: v.id('events') },
  returns: v.union(eventWithDetailsValidator, v.null()),
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) return null;

    const participants = await ctx.db
      .query('eventParticipants')
      .withIndex('by_event', q => q.eq('eventId', eventId))
      .collect();

    const viewerIdentity = await ctx.auth.getUserIdentity();
    const isOwner = viewerIdentity && event.ownerId === viewerIdentity.subject;
    const canSeeParticipants = !event.isParticipantListHidden || isOwner;

    return {
      ...event,
      participantCount: participants.length,
      participants: canSeeParticipants ? participants : [],
      isOwner,
      isFull: event.maxCapacity ? participants.length >= event.maxCapacity : false
    };
  }
});
```

**Complexity**: O(1 + m) where m = number of participants (typically small)

### 3. Get User's Events (Upcoming & Past)

**Use Case**: Display user profile tabs

**Query**:
```typescript
export const getUserEvents = query({
  args: { userId: v.id('users') },
  returns: v.object({
    upcoming: v.array(eventValidator),
    past: v.array(eventValidator)
  }),
  handler: async (ctx, { userId }) => {
    const participations = await ctx.db
      .query('eventParticipants')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const eventIds = participations.map(p => p.eventId);
    const events = await Promise.all(eventIds.map(id => ctx.db.get(id)));
    const validEvents = events.filter(e => e && !e.isCancelled);

    const now = Date.now();
    return {
      upcoming: validEvents.filter(e => e.startTime >= now)
                           .sort((a, b) => a.startTime - b.startTime),
      past: validEvents.filter(e => e.startTime < now)
                      .sort((a, b) => b.startTime - a.startTime)  // Newest first
    };
  }
});
```

**Complexity**: O(m + m * log n) where m = number of events user joined

## Data Migration

### Initial Schema Addition

**Step 1**: Add tables to `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ... existing tables (users, cities, visits) ...

  events: defineTable({
    title: v.string(),
    description: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    timezone: v.string(),
    location: v.string(),
    cityId: v.id('cities'),
    ownerId: v.id('users'),
    maxCapacity: v.optional(v.number()),
    isParticipantListHidden: v.boolean(),
    isCancelled: v.boolean(),
  })
    .index('by_city', ['cityId'])
    .index('by_city_and_start', ['cityId', 'startTime'])
    .index('by_owner', ['ownerId']),

  eventParticipants: defineTable({
    eventId: v.id('events'),
    userId: v.id('users'),
  })
    .index('by_event', ['eventId'])
    .index('by_user', ['userId'])
    .index('by_event_and_user', ['eventId', 'userId']),
});
```

**Step 2**: Run `npx convex dev` to generate types

**Step 3**: Verify types in `convex/_generated/dataModel.ts`

### No Data Migration Required

This is a new feature with new tables. No existing data needs migration.

## Performance Considerations

### Index Efficiency

**Compound Index Order**: `['cityId', 'startTime']` allows range queries on startTime after filtering by cityId:

```typescript
// Efficient: Uses both cityId and startTime in index
.withIndex('by_city_and_start', q =>
  q.eq('cityId', cityId).gte('startTime', Date.now())
)

// Less efficient: Would need separate by_city index
.withIndex('by_city', q => q.eq('cityId', cityId))
.filter(q => q.gte(q.field('startTime'), Date.now()))
```

### Participant Count Caching

**Decision**: Do NOT cache participant count in events table

**Rationale**:
- Convex queries are fast (<100ms)
- Caching adds complexity (eventual consistency, race conditions)
- Participant counts are typically small (<100)
- Real-time accuracy more important than micro-optimization

### Large Event Lists

**Pattern**: Use `.take(N)` to limit results

```typescript
.take(50)  // Only fetch 50 upcoming events
```

**Future Enhancement**: Implement pagination using Convex's `paginationOptsValidator` if cities have >50 upcoming events

## Security Considerations

### Authorization Matrix

| Action | Anonymous | Participant | Owner | Other User |
|--------|-----------|-------------|-------|------------|
| View public event | ✅ | ✅ | ✅ | ✅ |
| View hidden participant list | ❌ | Self only | ✅ Full list | ❌ |
| Join event | ❌ | N/A | ✅ | ✅ |
| Leave event | ❌ | ✅ | ✅ | ❌ |
| Edit event | ❌ | ❌ | ✅ | ❌ |
| Cancel event | ❌ | ❌ | ✅ | ❌ |
| Delete event | ❌ | ❌ | ✅ | ❌ |

### Input Sanitization

All string inputs (title, description, location) should be displayed using React's default XSS protection (no `dangerouslySetInnerHTML`). Convex validators prevent injection at the database level.

## Testing Data Model

### Unit Test Cases

1. **Event Creation**:
   - ✅ Valid event with all required fields
   - ❌ Missing required field (title, startTime, etc.)
   - ❌ Invalid start time (in past)
   - ❌ Invalid timezone string
   - ❌ End time before start time

2. **Event Joining**:
   - ✅ User joins available event
   - ❌ User joins event twice
   - ❌ User joins full event
   - ❌ User joins cancelled event
   - ❌ User joins past event

3. **Cascade Deletion**:
   - ✅ Delete event → all participants deleted
   - ✅ Delete user → all participations deleted
   - ✅ Delete event owner → all owned events + participants deleted

4. **Query Results**:
   - ✅ Upcoming events excludes past events
   - ✅ Upcoming events excludes cancelled events
   - ✅ User's past events sorted by start time (desc)
   - ✅ Hidden participant list not visible to non-owners

## Next Steps

1. Generate API contracts (`contracts/events.yaml`)
2. Create quickstart guide (`quickstart.md`)
3. Update agent context with new schema
4. Proceed to task generation (`/speckit.tasks`)
