# Quickstart: City Events Feature

**Branch**: `004-city-events`
**Last Updated**: 2025-11-15

## Overview

This guide provides a quickstart for implementing the City Events feature. Follow these steps in order to ensure proper integration with the existing JRNY application.

## Prerequisites

- [x] Development environment set up (`npm install` completed)
- [x] Convex dev server running (`npm run dev:convex`)
- [x] Web dev server running (`npm run dev:web`)
- [x] Authenticated user session (Google OAuth working)
- [x] Cities table populated with data

## Implementation Checklist

### Phase 1: Database Schema (convex/)

**File**: `convex/schema.ts`

- [ ] Add `events` table definition with all fields
- [ ] Add `eventParticipants` table definition
- [ ] Add indexes: `by_city`, `by_city_and_start`, `by_owner` (events)
- [ ] Add indexes: `by_event`, `by_user`, `by_event_and_user` (eventParticipants)
- [ ] Run `npx convex dev` to generate types
- [ ] Verify types in `convex/_generated/dataModel.ts`

**Validation**: Check that TypeScript recognizes `Id<'events'>` and `Id<'eventParticipants'>` types.

---

### Phase 2: Convex Functions (convex/events.ts)

**New File**: `convex/events.ts`

Implement functions in this order (dependencies flow downward):

**Queries** (read-only, no auth required for basic queries):
1. [ ] `getEvent` - Get single event with participant count
2. [ ] `listUpcomingEvents` - Get future events for a city
3. [ ] `listPastEvents` - Get past events for a city (optional for P1)
4. [ ] `getUserEvents` - Get user's joined events (upcoming & past tabs)
5. [ ] `getEventParticipants` - Get participant list with privacy logic

**Mutations** (require authentication):
6. [ ] `createEvent` - Create new event (requires auth, validates inputs)
7. [ ] `joinEvent` - Join event (validates capacity, duplication)
8. [ ] `leaveEvent` - Leave event (removes participation)
9. [ ] `updateEvent` - Edit event details (owner only)
10. [ ] `cancelEvent` - Mark event as cancelled (owner only)
11. [ ] `deleteEvent` - Delete event & participants (owner only)

**Internal Mutations** (for cascade deletes):
12. [ ] `deleteUserEvents` - Delete all events owned by user
13. [ ] `deleteUserParticipations` - Delete all user participations

**Testing Each Function**:
- Use Convex dashboard (`http://localhost:3000/dashboard`) to test functions
- Test with sample data before building UI

---

### Phase 3: Event Components (src/components/events/)

**Create Directory**: `src/components/events/`

**Components** (implement in this order):

1. [ ] **EventCard** (`event-card.tsx`)
   - Displays event summary (title, date, location, participant count)
   - Shows "Event Full" badge if at capacity
   - Shows "Past" badge if event is in the past
   - Kirby-style rounded borders, pastel colors
   - Used in: City page event list, user profile tabs

2. [ ] **EventForm** (`event-form.tsx`)
   - Form for creating/editing events
   - Fields: title, description, date/time, timezone, location, maxCapacity, isParticipantListHidden
   - Validation: All required fields, start time in future, valid timezone
   - Uses shadcn/ui form components
   - Timezone selector (HTML select or react-timezone-select)
   - Used in: Create event modal/page, edit event modal

3. [ ] **EventParticipantList** (`event-participant-list.tsx`)
   - Displays list of participants with avatars
   - Respects privacy settings (shows/hides based on viewer role)
   - Shows "Hidden by organizer" message when private
   - Shows participant count even when list hidden
   - Used in: Event detail page

4. [ ] **EventActions** (`event-actions.tsx`)
   - Join/Leave button (toggles based on participation status)
   - Edit/Cancel/Delete buttons (owner only)
   - Handles loading states (TanStack Query `isPending`)
   - Optimistic updates for join/leave
   - Used in: Event detail page

**Testing Components**:
- Use Storybook or component playground to test in isolation
- Test all states: loading, error, empty, full

---

### Phase 4: Event Detail Page (src/routes/e/$eventId.tsx)

**New Route**: `src/routes/e/$eventId.tsx`

**Implementation**:
- [ ] Create route file with TanStack Router `createFileRoute()`
- [ ] Use `useSuspenseQuery` with `convexQuery(api.events.getEvent, { eventId })`
- [ ] Display event details (title, description, date/time with timezone, location)
- [ ] Show EventParticipantList component
- [ ] Show EventActions component
- [ ] Add Error Boundary for "Event not found" state
- [ ] Add Sentry error tracking
- [ ] Implement Kirby-style animations (Framer Motion)

**Layout**:
```
┌─────────────────────────────────────┐
│  Event Title                        │
│  [Owner Avatar] Owner Name          │
│                                     │
│  📅 [Date/Time in Timezone]         │
│  📍 [Location]                      │
│  👥 [X/Y participants] [Full Badge] │
│                                     │
│  Description...                     │
│                                     │
│  [Join/Leave/Edit Buttons]          │
│                                     │
│  Participants (if visible):         │
│  [Avatar] [Avatar] [Avatar] ...     │
└─────────────────────────────────────┘
```

**Validation**: Navigate to `/e/[some-event-id]` and verify all elements render correctly.

---

### Phase 5: City Page Integration (src/routes/c/$shortSlug.tsx)

**Existing Route**: Update `src/routes/c/$shortSlug.tsx`

**Changes**:
- [ ] Add "Upcoming Events" section after city details
- [ ] Query upcoming events: `useSuspenseQuery(convexQuery(api.events.listUpcomingEvents, { cityId }))`
- [ ] Display event cards in grid/list (use EventCard component)
- [ ] Add "Create Event" button (logged-in users only)
- [ ] Show "No upcoming events" empty state with CTA to create first event
- [ ] Add loading state (LoadingDots component)

**Layout**:
```
┌─────────────────────────────────────┐
│  City Name, Country                 │
│  [City Image]                       │
│  [Visitor Stats]                    │
│                                     │
│  Upcoming Events      [+ Create]    │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ Event Card  │ │ Event Card  │   │
│  └─────────────┘ └─────────────┘   │
│  ┌─────────────┐                    │
│  │ Event Card  │ ...                │
│  └─────────────┘                    │
└─────────────────────────────────────┘
```

**Validation**: Navigate to a city page and verify events section appears below city info.

---

### Phase 6: User Profile Integration (src/routes/u/$username.tsx)

**Existing Route**: Update `src/routes/u/$username.tsx`

**Changes**:
- [ ] Add "Events" tab to user profile navigation
- [ ] Implement tab switching (Upcoming / Past)
- [ ] Query user events: `useSuspenseQuery(convexQuery(api.events.getUserEvents, { userId }))`
- [ ] Display event cards in each tab (use EventCard component)
- [ ] Show "No events yet" empty state
- [ ] Add loading states for each tab

**Layout**:
```
┌─────────────────────────────────────┐
│  [Avatar] Username                  │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │Visits │ │Events │ │Settings│     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
│  Events Tab:                        │
│  ┌─────────────┐ ┌──────────┐      │
│  │ Upcoming(3) │ │ Past(12) │      │
│  └─────────────┘ └──────────┘      │
│                                     │
│  [Upcoming events list...]          │
└─────────────────────────────────────┘
```

**Validation**: Navigate to user profile and verify Events tab shows joined events.

---

### Phase 7: User Account Deletion Cascade

**Existing File**: Update user deletion logic (likely in `convex/users.ts` or similar)

**Changes**:
- [ ] Find existing user deletion mutation
- [ ] Call `ctx.runMutation(internal.events.deleteUserEvents, { userId })`
- [ ] Call `ctx.runMutation(internal.events.deleteUserParticipations, { userId })`
- [ ] Ensure cascade happens before user document deletion

**Validation**: Delete test user account and verify their events and participations are deleted.

---

### Phase 8: Testing

**Integration Tests** (`tests/integration/events.spec.ts`):

- [ ] Test: Create event from city page → appears in city event list
- [ ] Test: Join event → participant count increases
- [ ] Test: Leave event → removed from participant list
- [ ] Test: Event at capacity → "Event Full" shown, join disabled
- [ ] Test: Hidden participant list → non-owner can't see list
- [ ] Test: Anonymous user views event → can see details, can't join
- [ ] Test: Cancel event → removed from all lists
- [ ] Test: Delete user → owned events deleted

**Unit Tests** (`tests/unit/events.test.ts`):

- [ ] Test all Convex functions with convex-test
- [ ] Test validation errors (past start time, invalid timezone, etc.)
- [ ] Test capacity checks (prevent joining full event)
- [ ] Test duplicate join prevention
- [ ] Test cascade deletes

**Run Tests**:
```bash
bun test
bun test:e2e
```

---

### Phase 9: Polish & Performance

**UI Polish**:
- [ ] Add Framer Motion animations to event cards (fadeIn, slideUp)
- [ ] Add loading dots component for event lists
- [ ] Add skeleton loaders for event detail page
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Add dark mode support (use Tailwind `dark:` classes)

**Performance**:
- [ ] Verify event page load time <2s (SC-003)
- [ ] Test with 50+ events in a city (pagination if needed)
- [ ] Test real-time updates (open event in two tabs, join in one, verify update in other)
- [ ] Run Lighthouse audit (Performance score >90)

**Accessibility**:
- [ ] Keyboard navigation for all interactive elements
- [ ] ARIA labels for buttons and links
- [ ] Screen reader testing for event details

---

## Development Workflow

### 1. Start Development Servers

```bash
# Terminal 1: Convex backend
npm run dev:convex

# Terminal 2: Web frontend
npm run dev:web
```

### 2. Implement Feature

Follow the checklist above in order. Each phase builds on the previous one.

### 3. Test Incrementally

After each phase, test the functionality:
- Use Convex dashboard to test backend functions
- Use browser to test UI components
- Use React DevTools to inspect component state

### 4. Commit Frequently

```bash
git add .
git commit -m "feat(events): implement [specific feature]"
```

### 5. Run Linting & Type Checking

```bash
npm run lint          # TypeScript + Biome linter
npm run format        # Biome formatter
```

---

## Common Issues & Solutions

### Issue: TypeScript Error "Property 'events' does not exist on type 'DataModel'"

**Solution**: Run `npx convex dev` to regenerate types after updating schema.

### Issue: "Event not found" Error in Convex Dashboard

**Solution**: Verify `eventId` is a valid `Id<'events'>` string (format: `kg2...`). Use Convex dashboard "Data" tab to browse existing events.

### Issue: Timezone Dropdown Shows Invalid Timezones

**Solution**: Use `Intl.supportedValuesOf('timeZone')` to get valid IANA timezones for dropdown.

### Issue: Participant Count Not Updating in Real-Time

**Solution**: Verify using `useSuspenseQuery` with `convexQuery()` (not regular fetch). Convex automatically subscribes to live updates.

### Issue: "Event Full" Badge Shown Incorrectly

**Solution**: Check `maxCapacity` is set (not undefined) and participant count comparison logic.

### Issue: Join Button Clickable for Anonymous Users

**Solution**: Check authentication status before rendering join button:
```tsx
const identity = useAuthIdentity();
if (!identity) return <SignInPrompt />;
```

---

## API Testing with Convex Dashboard

**URL**: `http://localhost:3000/dashboard` (when Convex dev server running)

### Test Event Creation

1. Go to "Functions" tab
2. Select `events:createEvent`
3. Input:
```json
{
  "cityId": "kg2abcd...",
  "title": "Test Meetup",
  "description": "Let's meet at the cafe!",
  "startTime": 1700000000000,
  "timezone": "America/New_York",
  "location": "Central Park",
  "maxCapacity": 10,
  "isParticipantListHidden": false
}
```
4. Click "Run"
5. Verify returns event ID

### Test Event Query

1. Select `events:getEvent`
2. Input: `{ "eventId": "[returned ID from create]" }`
3. Click "Run"
4. Verify returns event details with `participantCount: 0`

### Test Join Event

1. Select `events:joinEvent`
2. Input: `{ "eventId": "[event ID]" }`
3. Click "Run"
4. Re-run `getEvent` and verify `participantCount: 1`

---

## Performance Monitoring

### Sentry Integration

Events are automatically tracked by Sentry:
- Client-side: Event page loads, join/leave actions
- Server-side: Convex mutations, query errors

**Check Sentry Dashboard**:
1. Login to sentry.io
2. Select "jrny-app-demo" project
3. View "Performance" tab
4. Filter by `/e/` route
5. Verify p95 response time <2s

### Convex Performance

**Dashboard Metrics**:
1. Go to Convex dashboard
2. Click "Logs" tab
3. View query execution times
4. Identify slow queries (>100ms)

**Optimization**:
- Ensure all queries use `.withIndex()` (not `.filter()`)
- Add `.take(50)` to limit results
- Consider pagination for large lists

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass (`bun test && bun test:e2e`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`tsc --noEmit`)
- [ ] Performance targets met (Lighthouse >90, event load <2s)
- [ ] Sentry configured in production (`VITE_SENTRY_DSN`, `SENTRY_DSN`)
- [ ] No console.log statements (use Sentry for logging)
- [ ] Database indexes deployed to Convex production
- [ ] Constitution compliance verified (see Phase 1 checklist in plan.md)

**Deploy**:
```bash
npm run deploy  # Deploys to Cloudflare Workers + Convex production
```

---

## Next Steps

After completing quickstart:
1. Review `tasks.md` for detailed implementation tasks (`/speckit.tasks`)
2. Start with P1 tasks (core functionality)
3. Move to P2 tasks (privacy features)
4. Complete P3 tasks (event management)

**Questions?** Consult:
- `spec.md` - Feature requirements
- `research.md` - Technical decisions
- `data-model.md` - Database schema
- `contracts/` - API contracts
- `CLAUDE.md` - Project guidelines
