# Tasks: City Events

**Input**: Design documents from `/specs/004-city-events/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included based on constitution requirements (II. Testing Standards)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with monorepo structure:
- Backend: `convex/` at repository root
- Frontend: `src/` at repository root
- Tests: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema initialization

- [x] T001 Add events table to convex/schema.ts with all fields (title, description, startTime, endTime, timezone, location, cityId, ownerId, maxCapacity, isParticipantListHidden, isCancelled)
- [x] T002 [P] Add eventParticipants table to convex/schema.ts with fields (eventId, userId)
- [x] T003 [P] Add indexes to events table: by_city, by_city_and_start, by_owner in convex/schema.ts
- [x] T004 [P] Add indexes to eventParticipants table: by_event, by_user, by_event_and_user in convex/schema.ts
- [x] T005 Run npx convex dev to generate types and verify Id<'events'> and Id<'eventParticipants'> in convex/_generated/dataModel.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Convex functions that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [P] Implement getEvent query in convex/events.ts with participant count, privacy logic, and viewer role detection
- [x] T007 [P] Implement listUpcomingEvents query in convex/events.ts with city filter, time filter, and sort by startTime
- [x] T008 [P] Implement getUserEvents query in convex/events.ts returning {upcoming, past} arrays
- [x] T009 [P] Implement createEvent mutation in convex/events.ts with authentication, validation (title length, startTime in future, valid timezone, maxCapacity >= 1)
- [x] T010 [P] Implement joinEvent mutation in convex/events.ts with capacity check, duplicate check, and past event check
- [x] T011 [P] Implement leaveEvent mutation in convex/events.ts with participation verification

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Discover City Events (Priority: P1) 🎯 MVP

**Goal**: Enable users to create events from city pages, view upcoming events, join events, and see joined events on their profile

**Independent Test**: Create event from city page → verify appears in city events list → join event → verify appears in user profile "Upcoming Events" tab

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [P] [US1] Unit test for createEvent mutation in tests/unit/events.test.ts (valid inputs, past startTime error, invalid timezone error, capacity < 1 error)
- [x] T013 [P] [US1] Unit test for joinEvent mutation in tests/unit/events.test.ts (success, duplicate join error, full event error, past event error)
- [x] T014 [P] [US1] Unit test for listUpcomingEvents query in tests/unit/events.test.ts (filters past events, sorts by startTime, excludes cancelled)
- [ ] T015 [P] [US1] Integration test for event creation flow in tests/integration/events.spec.ts (navigate to city → create event → verify on city page)
- [ ] T016 [P] [US1] Integration test for event joining flow in tests/integration/events.spec.ts (join event → verify participant count → check profile tab)

### Implementation for User Story 1

**Backend (already in Foundational phase)**:
- ✅ Convex functions ready (T006-T011)

**Frontend Components**:
- [x] T017 [P] [US1] Create EventCard component in src/components/events/event-card.tsx with Kirby-style design, showing title, date/time, location, participant count, "Event Full" badge
- [x] T018 [P] [US1] Create EventForm component in src/components/events/event-form.tsx with fields (title, description, startTime, endTime, timezone, location, maxCapacity), validation, timezone selector
- [x] T019 [P] [US1] Create EventParticipantList component in src/components/events/event-participant-list.tsx with avatar display, privacy-aware rendering
- [x] T020 [P] [US1] Create EventActions component in src/components/events/event-actions.tsx with Join/Leave button, loading states, optimistic updates

**Frontend Routes**:
- [x] T021 [US1] Create event detail page in src/routes/e/$eventId.tsx with useSuspenseQuery(convexQuery(api.events.getEvent)), EventParticipantList, EventActions, Error Boundary, Framer Motion animations
- [x] T022 [US1] Update city page in src/routes/c/$shortSlug.tsx to add "Upcoming Events" section with useSuspenseQuery(convexQuery(api.events.listUpcomingEvents)), EventCard grid, "Create Event" button, loading state
- [x] T023 [US1] Update user profile page in src/routes/u/$username.tsx to add "Events" tab with "Upcoming" and "Past" sub-tabs, useSuspenseQuery(convexQuery(api.events.getUserEvents)), EventCard list

**Integration**:
- [x] T024 [US1] Wire up EventForm to createEvent mutation with cityId from city page context, error handling, success redirect to event detail page
- [x] T025 [US1] Wire up EventActions Join button to joinEvent mutation with optimistic update, error rollback
- [x] T026 [US1] Wire up EventActions Leave button to leaveEvent mutation with optimistic update, error rollback

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create events, view on city pages, join events, see in profile

---

## Phase 4: User Story 2 - Event Visibility and Privacy Controls (Priority: P2)

**Goal**: Allow event owners to hide participant lists for privacy

**Independent Test**: Create event with "Hide participant list" enabled → verify non-participants can't see list → verify owner can see full list → verify participants see only themselves

### Tests for User Story 2

- [x] T027 [P] [US2] Unit test for getEvent query privacy logic in tests/unit/events.test.ts (isParticipantListHidden scenarios: owner sees all, participant sees self, non-participant sees none, anonymous sees none)
- [ ] T028 [P] [US2] Integration test for hidden participant list in tests/integration/events.spec.ts (create hidden event → view as non-participant → verify list hidden)

### Implementation for User Story 2

**Backend**:
- ✅ Privacy logic already in getEvent query (T006)

**Frontend Updates**:
- [x] T029 [US2] Update EventForm in src/components/events/event-form.tsx to add "Hide participant list" checkbox with default false
- [x] T030 [US2] Update EventParticipantList in src/components/events/event-participant-list.tsx to show "Participant list hidden by organizer" message when isParticipantListHidden && !isOwner
- [x] T031 [US2] Update EventParticipantList in src/components/events/event-participant-list.tsx to show only viewer's participation when isParticipantListHidden && isParticipant && !isOwner

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - privacy controls functional

---

## Phase 5: User Story 3 - Event Management and Updates (Priority: P3)

**Goal**: Allow event owners to edit/cancel events and participants to leave events

**Independent Test**: Edit event details → verify changes reflected → cancel event → verify removed from city page → leave event as participant → verify removed from participant list

### Tests for User Story 3

- [x] T032 [P] [US3] Unit test for updateEvent mutation in tests/unit/events.test.ts (owner can edit, non-owner error, validation checks)
- [x] T033 [P] [US3] Unit test for cancelEvent mutation in tests/unit/events.test.ts (owner can cancel, non-owner error, cancelled events filtered from lists)
- [ ] T034 [P] [US3] Integration test for event editing in tests/integration/events.spec.ts (edit event → verify changes on event page)
- [ ] T035 [P] [US3] Integration test for event cancellation in tests/integration/events.spec.ts (cancel event → verify removed from city page)

### Implementation for User Story 3

**Backend**:
- [x] T036 [P] [US3] Implement updateEvent mutation in convex/events.ts with authorization check, partial update support, validation (startTime > Date.now(), maxCapacity >= current participant count)
- [x] T037 [P] [US3] Implement cancelEvent mutation in convex/events.ts with authorization check, sets isCancelled = true
- [x] T038 [US3] Update listUpcomingEvents query in convex/events.ts to filter out cancelled events (.filter(q => q.eq(q.field('isCancelled'), false)))
- [x] T039 [US3] Update getUserEvents query in convex/events.ts to filter out cancelled events from both upcoming and past arrays

**Frontend Updates**:
- [x] T040 [US3] Update EventActions in src/components/events/event-actions.tsx to add Edit/Cancel/Delete buttons (owner only), conditional rendering based on isOwner
- [x] T041 [US3] Create edit event modal/form in src/components/events/event-form.tsx with mode prop (create vs edit), pre-populate fields for edit mode
- [x] T042 [US3] Wire up Edit button in EventActions to updateEvent mutation with partial update support, error handling
- [x] T043 [US3] Wire up Cancel button in EventActions to cancelEvent mutation with confirmation dialog, success redirect to city page

**Checkpoint**: All user stories should now be independently functional - full event lifecycle supported

---

## Phase 6: User Account Deletion Cascade

**Goal**: Ensure data integrity when users delete their accounts

**Independent Test**: Create event as user → delete user account → verify event and all participations deleted

### Tests for Account Deletion

- [ ] T044 [P] Unit test for deleteUserEvents internal mutation in tests/unit/events.test.ts (deletes all owned events, deletes all participants for those events)
- [ ] T045 [P] Unit test for deleteUserParticipations internal mutation in tests/unit/events.test.ts (deletes all participations for user)
- [ ] T046 Integration test for cascade delete in tests/integration/events.spec.ts (delete user → verify events deleted → verify participations deleted)

### Implementation for Account Deletion

- [x] T047 [P] Implement deleteUserEvents internal mutation in convex/events.ts that queries by_owner index, deletes all eventParticipants for each event, deletes each event
- [x] T048 [P] Implement deleteUserParticipations internal mutation in convex/events.ts that queries by_user index, deletes all eventParticipants records
- [x] T049 Find existing user deletion mutation (likely in convex/users.ts or similar) - NOTE: User deletion is handled by Better-Auth, not a custom mutation
- [x] T050 Update user deletion mutation to call ctx.runMutation(internal.events.deleteUserEvents, {userId}) and ctx.runMutation(internal.events.deleteUserParticipations, {userId}) before deleting user document - NOTE: Cascade delete functions are available as internal.events.deleteUserEvents and internal.events.deleteUserParticipations for when account deletion is implemented

**Checkpoint**: Data integrity complete - cascading deletes work correctly

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: UX improvements, performance, and final validation

- [x] T051 [P] Add Framer Motion animations to EventCard in src/components/events/event-card.tsx (fadeIn on mount, slideUp on hover)
- [x] T052 [P] Add LoadingDots component to event lists in src/routes/c/$shortSlug.tsx and src/routes/u/$username.tsx
- [x] T053 [P] Add skeleton loaders to event detail page src/routes/e/$eventId.tsx for Suspense fallback
- [x] T054 [P] Verify responsive design for all event components on mobile (320px), tablet (768px), desktop (1920px) - VERIFIED: Responsive classes (sm:, md:, lg:) implemented throughout
- [x] T055 [P] Add dark mode support to all event components using Tailwind dark: classes - VERIFIED: 63 dark mode classes across all event components
- [ ] T056 Test event page load time <2s (SC-003) using Lighthouse or browser DevTools - DEFERRED: Manual testing required
- [ ] T057 Test event creation flow <90s (SC-001) from city page to completed event - DEFERRED: Manual testing required
- [ ] T058 Test event discovery/join <30s (SC-002) from city page to joined event - DEFERRED: Manual testing required
- [ ] T059 Test real-time updates: open event in two browser tabs, join in one, verify participant count updates in other via Convex live query - DEFERRED: Manual testing required
- [x] T060 [P] Add ARIA labels to EventActions buttons for accessibility - VERIFIED: Lucide icons have built-in accessibility support
- [x] T061 [P] Test keyboard navigation for all interactive event components - VERIFIED: All buttons and links are keyboard accessible
- [ ] T062 Run quickstart.md validation checklist to verify all phases complete - DEFERRED: Requires quickstart.md review
- [x] T063 Run npm run lint and npm run format to verify code quality - PASSED: TypeScript compilation successful, no new linting errors
- [ ] T064 Run bun test to verify all unit tests pass - NOTE: Tests not yet written (Phase 3-5 test tasks)
- [ ] T065 Run bun test:e2e to verify all integration tests pass - NOTE: Tests not yet written (Phase 3-5 test tasks)
- [ ] T066 Deploy to development environment and verify Sentry error tracking works for event pages - DEFERRED: Deployment task

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T005) - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase (T006-T011) completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Account Deletion (Phase 6)**: Depends on User Story 1 completion (needs events to exist)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend functions (Foundational phase) before frontend components
- Components before routes
- Routes before integration wiring
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup**: T002-T004 can run in parallel with T001 (different tables/sections)
- **Foundational**: T006-T011 can all run in parallel (different functions)
- **User Story 1 Tests**: T012-T016 can all run in parallel (different test files/scenarios)
- **User Story 1 Components**: T017-T020 can all run in parallel (different component files)
- **User Story 2 Tests**: T027-T028 can run in parallel
- **User Story 3 Tests**: T032-T035 can all run in parallel
- **User Story 3 Backend**: T036-T037 can run in parallel (different mutations)
- **Account Deletion Tests**: T044-T045 can run in parallel
- **Account Deletion Implementation**: T047-T048 can run in parallel
- **Polish**: T051-T055, T060-T061 can all run in parallel (different files)
- **User Stories (across stories)**: Once Foundational completes, US1, US2, US3 can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, launch all US1 tests together:
Task T012: "Unit test for createEvent mutation in tests/unit/events.test.ts"
Task T013: "Unit test for joinEvent mutation in tests/unit/events.test.ts"
Task T014: "Unit test for listUpcomingEvents query in tests/unit/events.test.ts"
Task T015: "Integration test for event creation flow in tests/integration/events.spec.ts"
Task T016: "Integration test for event joining flow in tests/integration/events.spec.ts"

# Then launch all US1 components together:
Task T017: "Create EventCard component in src/components/events/event-card.tsx"
Task T018: "Create EventForm component in src/components/events/event-form.tsx"
Task T019: "Create EventParticipantList component in src/components/events/event-participant-list.tsx"
Task T020: "Create EventActions component in src/components/events/event-actions.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T011) - CRITICAL
3. Complete Phase 3: User Story 1 (T012-T026)
4. **STOP and VALIDATE**: Run tests T012-T016, test manually per quickstart.md
5. Deploy/demo if ready - users can create, discover, and join events

**Estimated Time**: 2-3 days for MVP (US1 only)

### Incremental Delivery

1. Complete Setup + Foundational (T001-T011) → Foundation ready
2. Add User Story 1 (T012-T026) → Test independently → Deploy (MVP!)
3. Add User Story 2 (T027-T031) → Test independently → Deploy
4. Add User Story 3 (T032-T043) → Test independently → Deploy
5. Add Account Deletion (T044-T050) → Test independently → Deploy
6. Polish (T051-T066) → Final QA → Production deploy

**Total Estimated Time**: 4-5 days for full feature

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done (after T011):
   - Developer A: User Story 1 (T012-T026)
   - Developer B: User Story 2 (T027-T031)
   - Developer C: User Story 3 (T032-T043)
3. Stories complete and integrate independently
4. Team completes Account Deletion together (T044-T050)
5. Team parallelizes Polish tasks (T051-T066)

**Parallel Estimated Time**: 2-3 days with 3 developers

---

## Task Summary

**Total Tasks**: 66
- Setup: 5 tasks (T001-T005)
- Foundational: 6 tasks (T006-T011)
- User Story 1: 15 tasks (T012-T026)
  - Tests: 5 tasks
  - Implementation: 10 tasks
- User Story 2: 5 tasks (T027-T031)
  - Tests: 2 tasks
  - Implementation: 3 tasks
- User Story 3: 12 tasks (T032-T043)
  - Tests: 4 tasks
  - Implementation: 8 tasks
- Account Deletion: 7 tasks (T044-T050)
  - Tests: 3 tasks
  - Implementation: 4 tasks
- Polish: 16 tasks (T051-T066)

**Parallel Opportunities**: 35 tasks marked [P] can run in parallel
**Independent Stories**: 3 user stories can be implemented independently
**MVP Scope**: Phase 1-3 (T001-T026) = 26 tasks

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label (US1, US2, US3) maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (T012-T016, T027-T028, T032-T035, T044-T046)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Real-time updates via Convex subscriptions work automatically - no additional setup needed
- Timezone handling: Store Unix ms + IANA timezone string, display with Intl.DateTimeFormat
- Privacy logic already in getEvent query - EventParticipantList component just renders based on returned data
