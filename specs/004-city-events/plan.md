# Implementation Plan: City Events

**Branch**: `004-city-events` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-city-events/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add event creation and discovery functionality to enable travelers to organize and join social gatherings in cities. Users can create events with details (title, description, date/time, timezone, location, capacity), join events, and discover upcoming events on city pages. Event owners can control participant list visibility. Events are categorized as upcoming or past, with past events archived on user profiles.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode enabled)
**Primary Dependencies**:
  - Backend: Convex (serverless backend-as-a-service)
  - Frontend: TanStack Start (React meta-framework), TanStack Router
  - Data Fetching: @convex-dev/react-query, TanStack Query
  - Styling: Tailwind CSS v4, shadcn/ui components
  - Animations: Framer Motion v12+
  - Auth: Better-Auth with Google OAuth
  - Error Tracking: Sentry (@sentry/tanstackstart-react)

**Storage**: Convex built-in transactional database with real-time subscriptions

**Testing**:
  - Unit: Vitest v4+ with @testing-library/react
  - E2E: Playwright v1.56+
  - Convex Functions: convex-test package

**Target Platform**: Cloudflare Workers (edge deployment) + Convex cloud

**Project Type**: Web application (full-stack TypeScript)

**Performance Goals**:
  - Event pages load <2 seconds (SC-003)
  - Event creation <90 seconds (SC-001)
  - Event discovery/join <30 seconds (SC-002)
  - Support 100 concurrent users without degradation (SC-008)

**Constraints**:
  - Real-time event updates via Convex subscriptions
  - Timezone handling for international events
  - Capacity limits with "Event Full" state management
  - Privacy controls for participant list visibility

**Scale/Scope**:
  - New database tables: events, eventParticipants
  - New routes: `/e/$eventId` (event detail page)
  - Updated routes: City pages, user profiles
  - Estimated: 8-10 Convex functions, 3-5 new UI components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety & Validation
- ✅ **PASS** - All Convex functions will include `args` and `returns` validators
- ✅ **PASS** - No new environment variables needed (using existing stack)
- ✅ **PASS** - TypeScript strict mode already enabled
- ✅ **PASS** - Database schema changes will update generated types via `npx convex dev`

### II. Testing Standards
- ✅ **PASS** - Integration tests planned for event creation, joining, and discovery flows
- ✅ **PASS** - Convex query tests for index usage (by_city_and_start, by_user_id, etc.)
- ✅ **PASS** - Event deletion cascade (when owner deletes account) will include tests
- ⚠️  **DEFERRED** - Error boundary tests deferred to implementation phase

### III. Performance & Observability
- ✅ **PASS** - Event page load target <2s aligns with constitution's <2s requirement
- ✅ **PASS** - Sentry already configured for both client and server
- ✅ **PASS** - React Error Boundaries will handle event loading/joining errors
- ✅ **PASS** - TanStack Query provides loading states and optimistic updates

### IV. User Experience Consistency
- ✅ **PASS** - Loading states for all event queries (TanStack Query `isLoading`)
- ✅ **PASS** - Error states for failed event creation/joining
- ✅ **PASS** - Optimistic updates for join/leave actions
- ✅ **PASS** - Responsive design using Tailwind CSS (existing pattern)
- ✅ **PASS** - Real-time event updates via Convex subscriptions
- ✅ **PASS** - Kirby-style UI with Framer Motion animations (existing pattern)

### V. Security & Privacy
- ✅ **PASS** - Event creation requires authentication via `ctx.auth.getUserIdentity()`
- ✅ **PASS** - Authorization: Users can only edit/delete their own events
- ✅ **PASS** - Participant list visibility controlled by event owner
- ✅ **PASS** - Input validation with Convex validators (v.string(), v.number(), etc.)
- ✅ **PASS** - Anonymous users can view public events but not join (FR-025)
- ✅ **PASS** - Event deletion cascade when owner account deleted (FR-028, FR-029)

**Pre-Phase 0 Assessment**: ✅ **READY TO PROCEED**
**Violations Requiring Justification**: None

---

**Post-Phase 1 Design Re-Check** (2025-11-15):

### I. Type Safety & Validation
- ✅ **CONFIRMED** - All Convex functions in contracts use explicit `args` and `returns` validators
- ✅ **CONFIRMED** - No environment variables added
- ✅ **CONFIRMED** - Schema strictly typed with Convex validators (v.string(), v.number(), v.id(), etc.)
- ✅ **CONFIRMED** - Generated types will be used (`Id<'events'>`, `Id<'eventParticipants'>`)

### II. Testing Standards
- ✅ **CONFIRMED** - Integration test plan in quickstart.md covers all critical paths
- ✅ **CONFIRMED** - Unit tests planned for all Convex functions
- ✅ **CONFIRMED** - Cascade delete tests specified for event/user deletion
- ✅ **CONFIRMED** - Index usage tests specified in data-model.md

### III. Performance & Observability
- ✅ **CONFIRMED** - Performance targets documented in contracts (queries <200ms, mutations <300ms)
- ✅ **CONFIRMED** - Sentry integration in place (no changes needed)
- ✅ **CONFIRMED** - Error boundaries planned for event pages
- ✅ **CONFIRMED** - Loading states documented in quickstart.md

### IV. User Experience Consistency
- ✅ **CONFIRMED** - Loading states using TanStack Query `isLoading`
- ✅ **CONFIRMED** - Error states using Error Boundaries
- ✅ **CONFIRMED** - Optimistic updates planned for join/leave actions
- ✅ **CONFIRMED** - Responsive design using Tailwind CSS
- ✅ **CONFIRMED** - Real-time updates via Convex live queries
- ✅ **CONFIRMED** - Kirby-style UI with Framer Motion animations planned

### V. Security & Privacy
- ✅ **CONFIRMED** - Authentication checks in all mutations (ctx.auth.getUserIdentity())
- ✅ **CONFIRMED** - Authorization matrix documented in data-model.md
- ✅ **CONFIRMED** - Input validation in all mutations (length, timezone, capacity checks)
- ✅ **CONFIRMED** - Participant list privacy logic documented in contracts
- ✅ **CONFIRMED** - Cascade delete security (only owner can delete events)

**Post-Phase 1 Assessment**: ✅ **DESIGN COMPLETE - READY FOR IMPLEMENTATION**
**Violations**: None

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
convex/
├── schema.ts            # UPDATE: Add events and eventParticipants tables
├── events.ts            # NEW: Event queries and mutations
└── _generated/
    └── dataModel.ts     # AUTO-GENERATED: Updated types

src/
├── routes/
│   ├── e/
│   │   └── $eventId.tsx # NEW: Event detail page
│   ├── c/
│   │   └── $shortSlug.tsx # UPDATE: Add event list to city page
│   └── u/
│       └── $username.tsx  # UPDATE: Add events tabs to user profile
├── components/
│   ├── events/
│   │   ├── event-card.tsx           # NEW: Event display card
│   │   ├── event-form.tsx           # NEW: Create/edit event form
│   │   ├── event-participant-list.tsx # NEW: Participant list with privacy
│   │   └── event-actions.tsx        # NEW: Join/leave/edit buttons
│   └── ui/
│       └── [existing shadcn/ui components]

tests/
├── integration/
│   └── events.spec.ts   # NEW: Event creation, joining, discovery tests
└── unit/
    └── events.test.ts   # NEW: Convex function tests
```

**Structure Decision**: This is a web application using TanStack Start (frontend) and Convex (backend). The codebase follows a unified monorepo structure with `src/` for frontend code and `convex/` for backend functions. New event functionality spans both directories with file-based routing for pages (`src/routes/e/$eventId.tsx`) and feature-based organization for Convex functions (`convex/events.ts`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations - this section is not applicable.
