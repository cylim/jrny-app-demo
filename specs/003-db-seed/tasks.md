# Tasks: Database Seeding with Test Data

**Input**: Design documents from `/specs/003-db-seed/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/seed-api.yaml

**Tests**: Test tasks are included per constitutional requirements (Testing Standards mandate coverage for critical paths).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with:
- Backend: `convex/` (Convex serverless functions)
- Frontend: `src/` (TanStack Start + React)
- Scripts: `scripts/` (Node.js utilities)
- Tests: `tests/` (Vitest unit/integration, Playwright E2E)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project dependencies and schema updates

- [X] T001 [P] Install @faker-js/faker dependency via bun add @faker-js/faker
- [X] T002 [P] Add isSeed field to users table in convex/schema.ts
- [X] T003 [P] Add isSeed field to visits table in convex/schema.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Convex functions and shared components that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create seed.ts file with internal query stubs in convex/seed.ts
- [X] T005 [P] Implement getUserCount internal query in convex/seed.ts
- [X] T006 [P] Implement getVisitCount internal query in convex/seed.ts
- [X] T007 [P] Implement getAllUsers internal query in convex/seed.ts
- [X] T008 [P] Implement getTopCities internal query with limit parameter in convex/seed.ts
- [X] T009 Implement insertUsers internal mutation with args validators in convex/seed.ts
- [X] T010 Implement insertVisits internal mutation with atomic visitCount updates in convex/seed.ts
- [X] T011 [P] Implement getCurrentVisitors public query in convex/visits.ts
- [X] T012 [P] Create TestUserBadge component in src/components/ui/test-user-badge.tsx
- [X] T013 [P] Create CurrentVisitorsList component with loading/empty states in src/components/visits/current-visitors-list.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Developer Database Initialization (Priority: P1) 🎯 MVP

**Goal**: Enable developers to populate their local database with 200 realistic test users and 4000 visits using a single command-line script

**Independent Test**: Run `node scripts/seed-database.mjs` on empty database, verify 200 users and 4000 visits created with realistic data, then run again to verify idempotency (no duplicates, no errors)

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T014 [P] [US1] Unit test for generateUser function in tests/unit/seed-logic.test.ts
- [X] T015 [P] [US1] Unit test for generateVisit function with 1-month duration in tests/unit/seed-logic.test.ts
- [X] T016 [P] [US1] Unit test for idempotency logic (count checking) in tests/unit/seed-logic.test.ts
- [X] T017 [P] [US1] Integration test for insertUsers mutation in tests/integration/seed-convex.test.ts
- [X] T018 [P] [US1] Integration test for insertVisits mutation with visitCount updates in tests/integration/seed-convex.test.ts
- [X] T019 [P] [US1] Integration test for idempotent re-runs in tests/integration/seed-convex.test.ts

### Implementation for User Story 1

- [X] T020 [US1] Create seed-database.mjs file structure with CLI argument parsing in scripts/seed-database.mjs
- [X] T021 [US1] Implement ConvexHttpClient initialization in scripts/seed-database.mjs
- [X] T022 [US1] Implement generateUser function with 20% username probability in scripts/seed-database.mjs
- [X] T023 [US1] Implement generateVisit function with 1-month duration in scripts/seed-database.mjs
- [X] T024 [US1] Implement seedUsers function with idempotency check and batch insertion in scripts/seed-database.mjs
- [X] T025 [US1] Implement seedVisits function with top 100 cities selection in scripts/seed-database.mjs
- [X] T026 [US1] Add city count validation (require ≥100 cities) in scripts/seed-database.mjs
- [X] T027 [US1] Add progress logging for batch operations in scripts/seed-database.mjs
- [X] T028 [US1] Add error handling with clear error messages in scripts/seed-database.mjs
- [X] T029 [US1] Add CLI parameters --users and --visits-per-user with defaults (200, 20) in scripts/seed-database.mjs
- [X] T030 [US1] Set isSeed: true for all generated users in scripts/seed-database.mjs
- [X] T031 [US1] Set isSeed: true for all generated visits in scripts/seed-database.mjs
- [X] T032 [US1] Implement main execution flow with pre-flight checks in scripts/seed-database.mjs

**Checkpoint**: At this point, developers can run seed script to populate database with 200 users and 4000 visits. Script is fully functional, idempotent, and testable independently.

---

## Phase 4: User Story 2 - Testing Different Data Scenarios (Priority: P2)

**Goal**: Ensure generated data includes diverse configurations (privacy settings all false, social link variations, 1-month visit durations) to enable comprehensive feature testing

**Independent Test**: Run seed script, query database to verify: all users have globalPrivacy=false and hideVisitHistory=false, social links follow distribution (60% GitHub, 50% X, 30% LinkedIn, 40% Telegram), all visits have exactly 30-day duration, 25% visits are private

### Tests for User Story 2

- [ ] T033 [P] [US2] Unit test for privacy setting generation (all false) in tests/unit/seed-logic.test.ts
- [ ] T034 [P] [US2] Unit test for social links distribution in tests/unit/seed-logic.test.ts
- [ ] T035 [P] [US2] Unit test for visit date range validation (1 month) in tests/unit/seed-logic.test.ts
- [ ] T036 [P] [US2] Integration test verifying generated data diversity in tests/integration/seed-convex.test.ts

### Implementation for User Story 2

- [X] T037 [P] [US2] Update generateUser to set globalPrivacy: false in scripts/seed-database.mjs
- [X] T038 [P] [US2] Update generateUser to set hideVisitHistory: false in scripts/seed-database.mjs
- [X] T039 [P] [US2] Update generateUser for social link probabilities (60% GitHub, 50% X, 30% LinkedIn, 40% Telegram) in scripts/seed-database.mjs
- [X] T040 [P] [US2] Update generateVisit to ensure isPrivate has 25% probability in scripts/seed-database.mjs
- [X] T041 [P] [US2] Add validation that endDate = startDate + 30 days in scripts/seed-database.mjs
- [ ] T042 [P] [US2] Add data verification logging to show diversity stats after seeding in scripts/seed-database.mjs

**Checkpoint**: Generated data now has verified diversity patterns. All privacy settings are false, social links follow specified distribution, visits are exactly 1 month, and 25% visits are private.

---

## Phase 5: User Story 3 - Performance Testing with Realistic Data Volume (Priority: P3)

**Goal**: Enable developers to configure data volume via CLI parameters and verify seed performance meets <30 second target for 4000 visits

**Independent Test**: Run `node scripts/seed-database.mjs --users 500 --visits-per-user 10` and verify: (1) 500 users and 5000 visits created, (2) seed completes in reasonable time, (3) re-running with same params is idempotent

### Tests for User Story 3

- [ ] T043 [P] [US3] Unit test for CLI parameter parsing in tests/unit/seed-logic.test.ts
- [ ] T044 [P] [US3] Integration test for configurable volume seeding in tests/integration/seed-convex.test.ts
- [ ] T045 [P] [US3] Performance test for 4000 visits seed time in tests/integration/seed-convex.test.ts

### Implementation for User Story 3

- [X] T046 [P] [US3] Add help text for CLI parameters in scripts/seed-database.mjs
- [X] T047 [P] [US3] Add performance timing measurement and logging in scripts/seed-database.mjs
- [X] T048 [P] [US3] Add batch size configuration (default 50) for performance tuning in scripts/seed-database.mjs
- [X] T049 [P] [US3] Add final summary report (users created, visits created, time elapsed) in scripts/seed-database.mjs

**Checkpoint**: Seed script now supports configurable volumes, logs performance metrics, and provides summary reports. Developers can test with custom data sizes.

---

## Phase 6: UI Integration - "Who's Here" Feature

**Goal**: Display current visitors on city pages (`/c/$shortSlug`) with privacy filtering and loading states

**Independent Test**: Navigate to any city page, verify "Who's Here" section shows users currently in that city (based on visit dates), respects privacy settings (globalPrivacy filters out users), shows loading state during fetch

### Tests for UI Integration

- [ ] T050 [P] E2E test for "Who's Here" section display in tests/e2e/city-visitors.spec.ts
- [ ] T051 [P] E2E test for privacy filtering in "Who's Here" in tests/e2e/city-visitors.spec.ts
- [ ] T052 [P] E2E test for empty state when no current visitors in tests/e2e/city-visitors.spec.ts

### Implementation for UI Integration

- [X] T053 [P] Update city page route to use getCurrentVisitors query in src/routes/c/$shortSlug.tsx
- [X] T054 [P] Integrate CurrentVisitorsList component into city page in src/routes/c/$shortSlug.tsx
- [X] T055 [P] Add Suspense wrapper for loading states in src/routes/c/$shortSlug.tsx
- [X] T056 [P] Update user profile route to conditionally show TestUserBadge in src/routes/u/$usernameOrId.tsx
- [X] T057 [P] Style TestUserBadge with subtle design (small icon, muted color) in src/components/ui/test-user-badge.tsx
- [X] T058 [P] Implement CurrentVisitorsList with avatar grid and empty state in src/components/visits/current-visitors-list.tsx

**Checkpoint**: City pages now show current visitors, user profiles show test user badges, all UI components are accessible and responsive.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [X] T059 [P] Add package.json script "seed:db" pointing to seed-database.mjs
- [X] T060 [P] Update README.md with seeding instructions from quickstart.md
- [X] T061 [P] Verify all TypeScript types are strict (no any types) across all new files
- [X] T062 [P] Run biome format on all modified files
- [X] T063 [P] Run biome lint and fix any errors
- [ ] T064 [P] Verify Sentry integration captures seed script errors
- [ ] T065 Manually run through quickstart.md validation steps
- [ ] T066 Verify constitution compliance (type safety, tests, performance, UX, security)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP delivery milestone
- **User Story 2 (Phase 4)**: Depends on Foundational - Can run parallel to US1 if staffed, but builds on US1 implementation
- **User Story 3 (Phase 5)**: Depends on Foundational - Can run parallel to US1/US2 if staffed, but builds on US1 implementation
- **UI Integration (Phase 6)**: Depends on Foundational - Can run parallel to US1/US2/US3 if staffed
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational complete → Core seeding functionality (REQUIRED for MVP)
- **User Story 2 (P2)**: Foundational complete → Builds on US1 generateUser/generateVisit functions
- **User Story 3 (P3)**: Foundational complete → Builds on US1 CLI parameter handling
- **UI Integration (Phase 6)**: Foundational complete → Uses getCurrentVisitors query from Phase 2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Test files can run in parallel within a story
- Implementation tasks run sequentially unless marked [P]
- Core functions (generateUser, generateVisit) before seed orchestration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All 3 tasks can run in parallel
- T001 (install faker), T002 (users schema), T003 (visits schema)

**Phase 2 (Foundational)**: Parallel groups
- Group 1: T005, T006, T007, T008 (all internal queries)
- Group 2: T011 (getCurrentVisitors), T012 (TestUserBadge), T013 (CurrentVisitorsList)
- Sequential: T004 → T009, T010 (file creation then mutations)

**Phase 3 (US1)**: Parallel groups
- Tests: T014, T015, T016, T017, T018, T019 (all can run together)
- Implementation: T020-T032 run sequentially (same file)

**Phase 4 (US2)**: Parallel groups
- Tests: T033, T034, T035, T036 (all can run together)
- Implementation: T037-T042 (all can run in parallel, updating different functions)

**Phase 5 (US3)**: Parallel groups
- Tests: T043, T044, T045 (all can run together)
- Implementation: T046-T049 (all can run in parallel, updating different sections)

**Phase 6 (UI)**: Parallel groups
- Tests: T050, T051, T052 (all can run together)
- Implementation: T053-T058 (all can run in parallel, different files)

**Phase 7 (Polish)**: All tasks T059-T064 can run in parallel, then T065-T066 sequentially

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for generateUser function in tests/unit/seed-logic.test.ts"
Task: "Unit test for generateVisit function with 1-month duration in tests/unit/seed-logic.test.ts"
Task: "Unit test for idempotency logic (count checking) in tests/unit/seed-logic.test.ts"
Task: "Integration test for insertUsers mutation in tests/integration/seed-convex.test.ts"
Task: "Integration test for insertVisits mutation with visitCount updates in tests/integration/seed-convex.test.ts"
Task: "Integration test for idempotent re-runs in tests/integration/seed-convex.test.ts"

# After tests fail, implement sequentially (same file):
# T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029 → T030 → T031 → T032
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all internal queries together (different functions):
Task: "Implement getUserCount internal query in convex/seed.ts"
Task: "Implement getVisitCount internal query in convex/seed.ts"
Task: "Implement getAllUsers internal query in convex/seed.ts"
Task: "Implement getTopCities internal query with limit parameter in convex/seed.ts"

# Launch all UI components together (different files):
Task: "Implement getCurrentVisitors public query in convex/visits.ts"
Task: "Create TestUserBadge component in src/components/ui/test-user-badge.tsx"
Task: "Create CurrentVisitorsList component with loading/empty states in src/components/visits/current-visitors-list.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T013) - CRITICAL
3. Complete Phase 3: User Story 1 (T014-T032)
4. **STOP and VALIDATE**: Test seed script independently
   - Run on empty database → verify 200 users, 4000 visits
   - Run again → verify idempotency
   - Check data quality (realistic names, valid emails, 1-month visits)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Deploy/Demo (MVP!)**
   - Developers can now seed their local databases
3. Add User Story 2 → Test independently → Deploy/Demo
   - Data diversity verified (privacy settings, social links, visit patterns)
4. Add User Story 3 → Test independently → Deploy/Demo
   - Configurable volumes for performance testing
5. Add UI Integration → Test independently → Deploy/Demo
   - "Who's Here" and test user badges live
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T013)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T014-T032) - Core seeding
   - **Developer B**: User Story 2 (T033-T042) - Data diversity
   - **Developer C**: User Story 3 (T043-T049) - Performance tuning
   - **Developer D**: UI Integration (T050-T058) - "Who's Here" feature
3. Stories complete and integrate independently
4. Team finalizes with Polish tasks (T059-T066)

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to parallelize
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story is independently completable and testable**
- **Verify tests fail before implementing** (TDD approach per constitution)
- **Commit after each task** or logical group of parallel tasks
- **Stop at any checkpoint** to validate story independently
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Constitution compliance**: Type safety (strict mode), test coverage (critical paths), performance (<30s seed, <100ms queries), UX (loading states), privacy (filtering)

---

## Task Count Summary

- **Total Tasks**: 66
- **Setup Phase**: 3 tasks
- **Foundational Phase**: 10 tasks
- **User Story 1 (P1 - MVP)**: 19 tasks (6 tests + 13 implementation)
- **User Story 2 (P2)**: 10 tasks (4 tests + 6 implementation)
- **User Story 3 (P3)**: 7 tasks (3 tests + 4 implementation)
- **UI Integration**: 9 tasks (3 tests + 6 implementation)
- **Polish Phase**: 8 tasks

**Parallel Opportunities Identified**: 32 tasks marked [P] (48% of total)

**Independent Test Criteria**:
- US1: Run seed script on empty DB, verify 200 users + 4000 visits, re-run for idempotency
- US2: Query DB after seeding, verify all privacy=false, social links match distribution, visits=1 month
- US3: Run with custom params (--users 500 --visits-per-user 10), verify counts and performance
- UI: Navigate to city page, verify "Who's Here" shows current visitors with privacy filtering

**Suggested MVP Scope**: Setup + Foundational + User Story 1 (24 tasks total)
