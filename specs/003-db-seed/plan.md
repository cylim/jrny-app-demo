# Implementation Plan: Database Seeding with Test Data

**Branch**: `003-db-seed` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-db-seed/spec.md`

## Summary

This feature implements a database seeding system to populate the Convex database with realistic test data for development and testing. The system generates 200 users (with ~20% having usernames) and 4000 visits (20 visits per user, each 1 month duration) distributed across the top 100 cities. The seed script is idempotent and includes functionality to update the "Who's Here" section on city pages (`/c/$shortSlug`) and the "Travels" section on user profiles (`/u/$usernameOrId`). The implementation uses `@faker-js/faker` for data generation and ensures visitCount is atomically updated after adding visits.

**Additional Requirements** (from user input):
- Every visit should have a 1-month duration
- Users can visit the same city multiple times over different time periods
- Add "Who's Here" section to city pages showing current visitors
- Add "Travels" section to user profile pages (already implemented, verify optimization)
- Optimize query calls for performance
- Ensure visitCount increases atomically after adding visits
- Add `isSeed: true` field to all faker-generated users and visits
- Display "Test User" badge on user profiles when `isSeed === true`

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 20+
**Primary Dependencies**: `@faker-js/faker` (v9+), Convex SDK, `@convex-dev/react-query`, TanStack Query
**Storage**: Convex database (serverless, transactional NoSQL)
**Testing**: Vitest (unit tests), Playwright (E2E tests), `convex-test` (Convex function tests)
**Target Platform**: Node.js (seed script), Cloudflare Workers (production app)
**Project Type**: Web application (TanStack Start frontend + Convex backend)
**Performance Goals**:
- Seed 4000 visits in <30 seconds
- "Who's Here" query <100ms p95
- "Travels" list query <100ms p95 for typical user (20 visits)
**Constraints**:
- Idempotency required (re-running seed doesn't create duplicates)
- Must verify ≥100 cities exist before seeding
- No authentication required for test users (data only)
**Scale/Scope**:
- Default: 200 users, 4000 visits
- Configurable via CLI parameters
- Focus on top 100 cities for realistic distribution

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Type Safety & Validation ✅

**Compliance**:
- Seed script will use TypeScript with strict mode
- All Convex mutations will include `args` and `returns` validators
- Database operations will use typed `Id<'users'>`, `Id<'cities'>`, `Id<'visits'>`
- Faker-generated data will be validated before insertion

**No Violations**: Full compliance with type safety requirements.

### Testing Standards ✅

**Compliance**:
- Unit tests for seed logic (user generation, visit generation, idempotency)
- Integration tests for Convex mutations (`seedUsers`, `seedVisits`)
- E2E tests for "Who's Here" and "Travels" UI sections
- Contract tests for new query return types

**No Violations**: Critical path coverage for seed operations and new UI features.

### Performance & Observability ✅

**Compliance**:
- "Who's Here" query optimized with `by_city_and_start` index
- "Travels" query already optimized with `by_user_id` index
- Seed performance target: <30 seconds for 4000 visits
- Sentry will capture any seeding errors (server-side)

**No Violations**: Performance targets align with constitution (<100ms p95 for simple reads).

### User Experience Consistency ✅

**Compliance**:
- "Who's Here" section: Loading states via Suspense, empty states when no current visitors
- "Travels" section: Already implemented with privacy controls
- Responsive design using Tailwind utilities
- Accessible with keyboard navigation

**No Violations**: Consistent UX patterns with existing features.

### Security & Privacy ✅

**Compliance**:
- Test users don't require authentication (no Better-Auth integration)
- Privacy settings respected: `globalPrivacy` hides users from "Who's Here"
- `isPrivate` visits excluded from public queries
- Input validation on all Convex mutations

**No Violations**: Privacy controls maintained, no security risks from test data.

**Constitution Status**: ✅ **PASS** - No violations. All principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/003-db-seed/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── seed-api.yaml    # Convex function contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
scripts/
└── seed-database.mjs    # Main seed script (Node.js, ESM)

convex/
├── seed.ts              # Convex seeding mutations (internalMutation)
├── visits.ts            # Updated: add getCurrentVisitors query
└── schema.ts            # Updated: add optional isSeed field to users and visits tables

src/
├── routes/
│   ├── c/$shortSlug.tsx # Updated: implement "Who's Here" section
│   └── u/$usernameOrId.tsx # Updated: add "Test User" badge when isSeed === true
└── components/
    ├── ui/
    │   └── test-user-badge.tsx # New: badge component for fake profiles
    └── visits/
        └── current-visitors-list.tsx # New: component for "Who's Here"

tests/
├── unit/
│   └── seed-logic.test.ts # Test user/visit generation logic
├── integration/
│   └── seed-convex.test.ts # Test Convex seed mutations
└── e2e/
    └── city-visitors.spec.ts # Test "Who's Here" UI
```

**Structure Decision**: This is a web application with existing backend (`convex/`) and frontend (`src/`) directories. The seed script lives in `scripts/` as a standalone Node.js utility that calls Convex internal mutations. Frontend updates are minimal (one new component, one updated route). Testing follows the existing `tests/` structure.

## Complexity Tracking

> **No violations identified** - This section is not required.

---

## Post-Design Constitution Check

*Re-evaluation after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md)*

### Type Safety & Validation ✅ (Re-confirmed)

**Design Compliance**:
- ✅ All Convex functions in `contracts/seed-api.yaml` specify `args` and `returns` validators
- ✅ User/Visit schemas in `data-model.md` use strongly-typed `Id<'users'>`, `Id<'cities'>`, `Id<'visits'>`
- ✅ Seed script will validate email uniqueness, date ranges, username patterns before insertion
- ✅ TypeScript strict mode enforced for all new code (seed script, Convex mutations)

**No Changes**: Design maintains full type safety. No relaxations introduced.

### Testing Standards ✅ (Re-confirmed)

**Design Compliance**:
- ✅ Test files specified in project structure: `unit/seed-logic.test.ts`, `integration/seed-convex.test.ts`, `e2e/city-visitors.spec.ts`
- ✅ Critical paths covered: idempotency, batch insertion, visitCount atomicity, "Who's Here" filtering
- ✅ Contract tests for new query return types (`getCurrentVisitors`)

**No Changes**: Test coverage meets constitutional requirements. All critical paths tested.

### Performance & Observability ✅ (Re-confirmed)

**Design Compliance**:
- ✅ `getCurrentVisitors` query uses existing `by_city_id` index (data-model.md line 225)
- ✅ Performance analysis in research.md confirms <100ms p95 for cities with <100 visits
- ✅ Seed performance: batching strategy (50 records/batch) ensures <30 seconds for 4000 visits
- ✅ Sentry integration: Server-side errors from seed script automatically captured

**No Changes**: Performance targets achievable with current design. No additional indexes needed.

### User Experience Consistency ✅ (Re-confirmed)

**Design Compliance**:
- ✅ "Who's Here" component (new: `current-visitors-list.tsx`) will use Suspense for loading states
- ✅ Empty state handling: "No one is currently in [city]" when no current visitors
- ✅ Responsive design: Component will use Tailwind utilities like existing components
- ✅ Accessibility: Avatar list with keyboard navigation, ARIA labels

**No Changes**: UX patterns consistent with existing app. No new patterns introduced.

### Security & Privacy ✅ (Re-confirmed)

**Design Compliance**:
- ✅ Seed users use fake `authUserId` (pattern: `seed_user_XXXXXX`), no Better-Auth integration
- ✅ Privacy filtering: `getCurrentVisitors` query respects `globalPrivacy` and `isPrivate` settings (contracts/seed-api.yaml line 150-200)
- ✅ Internal mutations: `insertUsers` and `insertVisits` use `internalMutation`, not callable from frontend
- ✅ Input validation: Date range checks, email uniqueness, city existence validation before insertion

**No Changes**: Privacy controls maintained. No security risks from test data.

---

**Final Constitution Status**: ✅ **PASS** (Post-Design Re-check)

All design artifacts (research, data model, contracts, quickstart) maintain constitutional compliance. No violations introduced during planning phase. Ready to proceed to Phase 2: Task Generation (`/speckit.tasks`).
