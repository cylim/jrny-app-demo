# Tasks: Kirby-Style UI Refactor

**Input**: Design documents from `/specs/002-kirby-ui-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This feature includes comprehensive testing per Constitution Principle II. Test tasks are included for all user stories.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a full-stack web application with:
- **Frontend**: `src/` (TanStack Start + React)
- **Backend**: `convex/` (Convex serverless functions)
- **Tests**: `tests/` (Vitest, React Testing Library, Playwright)
- **Static Assets**: `public/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create foundational project structure

- [x] T001 Install Framer Motion animation library via `bun add framer-motion`
- [x] T002 [P] Install Vitest testing framework via `bun add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event`
- [x] T003 [P] Install Playwright E2E testing via `bun add -D playwright @playwright/test` and run `bunx playwright install`
- [x] T004 [P] Create Vitest config file at `vitest.config.ts` with jsdom environment and coverage settings
- [x] T005 [P] Create Playwright config file at `playwright.config.ts` with browser configurations
- [x] T006 [P] Create test setup file at `tests/setup.ts` importing @testing-library/jest-dom
- [x] T007 [P] Create test directory structure: `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/contract/`
- [x] T008 [P] Add test scripts to package.json: `test`, `test:ui`, `test:coverage`, `test:e2e`, `test:e2e:ui`
- [x] T009 [P] Create city types file at `src/types/city.ts` with TypeScript types and Zod schemas
- [x] T010 [P] Add `FALLBACK_CITIES` constant to `src/types/city.ts` with 5 hardcoded cities (Tokyo, Paris, New York, London, Barcelona) for error resilience

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Create TypeScript types directory at `src/types/`
- [x] T012 [P] Create Kirby theme configuration file at `src/lib/kirby-theme.ts` with colors, border radius, and animation constants
- [x] T013 [P] Update Tailwind CSS with Kirby color palette in `src/styles/app.css` (@layer base with CSS custom properties)
- [x] T014 [P] Add Kirby utility classes to `src/styles/app.css` (@layer components for kirby-rounded, kirby-bubble)
- [x] T015 [P] Create animation utilities file at `src/lib/animations.ts` with motion helper functions
- [x] T016 Verify Convex schema has `by_visit_count` index on cities table in `convex/schema.ts`
- [x] T017 Create Convex cities query file at `convex/cities.ts`
- [x] T018 Run `bun audit` to check Framer Motion and all dependencies for security vulnerabilities

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Visual Experience Enhancement (Priority: P1) 🎯 MVP

**Goal**: Apply Kirby-style aesthetic (soft pastels, 16-24px rounded corners, bubble-like elements, bouncy animations) to all UI components for a playful, inviting interface

**Independent Test**: Load homepage and verify UI components display soft pastel colors (pinks, blues, purples), 16-24px rounded corners, bubble-like shapes, and bouncy animations. Design is visually consistent across mobile (320px), tablet (768px), and desktop (1920px) screen sizes.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T019 [P] [US1] Create unit test for Kirby theme constants at `tests/unit/lib/kirby-theme.test.ts` verifying color hex values and border radius values
- [x] T020 [P] [US1] Create E2E test for visual consistency at `tests/e2e/kirby-styling.spec.ts` checking rounded corners, pastel colors on homepage
- [x] T021 [P] [US1] Create E2E test for responsive design at `tests/e2e/responsive-kirby.spec.ts` verifying Kirby styling maintains across 320px, 768px, 1920px viewports

### Implementation for User Story 1

- [x] T022 [P] [US1] Refactor Button component at `src/components/ui/button.tsx` to add `kirby` variant with rounded corners and pastel background
- [x] T023 [P] [US1] Refactor Card component at `src/components/ui/card.tsx` to use kirby-rounded class and bubble-like styling
- [x] T024 [P] [US1] Refactor Avatar component at `src/components/ui/avatar.tsx` to use fully rounded kirby-bubble class
- [x] T025 [US1] Update root route layout at `src/routes/__root.tsx` to apply Kirby theme provider (if needed) and global Kirby styling
- [x] T026 [US1] Add bouncy easing animation variants using Framer Motion in `src/lib/animations.ts`
- [x] T027 [US1] Update existing routes to use refactored Kirby-styled components (verify at least 3 major routes)
- [x] T028 [US1] Add CSS animation keyframes for bounce-gentle utility in `src/styles/app.css`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. All UI components should display Kirby-style aesthetic consistently.

---

## Phase 4: User Story 4 - Loading State Transitions (Priority: P1)

**Goal**: Provide smooth, visually consistent loading transitions using pulsating dots (3-5 dots with wave animation) during data fetches and page navigation, appearing within 200ms

**Independent Test**: Trigger data fetch or page navigation, verify pulsating dots loading indicator appears within 200ms, animates smoothly at 60fps, respects prefers-reduced-motion, and transitions out smoothly when loading completes.

**Note**: US4 is implemented before US2/US3 because it's P1 priority and provides loading infrastructure needed by other stories.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T029 [P] [US4] Create unit test for LoadingDots component at `tests/unit/components/loading-dots.test.tsx` verifying dot count, color variants, and reduced motion behavior
- [x] T030 [P] [US4] Create integration test for loading state timing at `tests/integration/loading-state.test.ts` verifying <200ms appearance threshold
- [x] T031 [P] [US4] Create E2E test for loading indicator performance at `tests/e2e/loading-performance.spec.ts` measuring frame rate during animation (target: ≥55fps)
- [x] T032 [P] [US4] Create E2E test for reduced motion at `tests/e2e/loading-accessibility.spec.ts` verifying static dots when prefers-reduced-motion is enabled

### Implementation for User Story 4

- [x] T033 [US4] Create Loading State TypeScript types at `src/types/loading.ts` with discriminated union (idle, loading, success, error)
- [x] T034 [US4] Create LoadingDots component at `src/components/ui/loading-dots.tsx` using Framer Motion with wave animation
- [x] T035 [US4] Implement pulsating dots animation with staggered delays (0.1s apart) in LoadingDots component
- [x] T036 [US4] Add useReducedMotion hook integration in LoadingDots to show static dots when motion is reduced
- [x] T037 [US4] Create custom hook `useLoadingState` at `src/hooks/useLoadingState.ts` managing loading state transitions and 200ms threshold
- [x] T038 [US4] Add Sentry performance marks for loading indicator display latency in `src/lib/performance.ts`
- [x] T039 [US4] Integrate LoadingDots into router loading transitions at `src/router.tsx` (if applicable)

**Checkpoint**: At this point, User Story 4 should be fully functional and testable independently. Loading indicators should appear within 200ms and animate smoothly.

---

## Phase 5: User Story 2 - Enhanced Landing Page with City Showcase (Priority: P2)

**Goal**: Display featured cities randomly selected from top 50 most-visited on landing page with city name, hero image, visitor count, prominent CTA button, and fallback to hardcoded cities on error

**Independent Test**: Visit landing page, verify CTA button is visible (≥90% viewport), featured cities load within 2 seconds displaying name + image + visitor count, cities are clickable, refreshing changes cities, and fallback cities appear if query fails.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T040 [P] [US2] Create contract test for getFeaturedCities query at `tests/contract/featured-cities.test.ts` verifying returns requested count, filters top 50, handles count>available
- [x] T041 [P] [US2] Create integration test for city showcase with fallback at `tests/integration/city-showcase.test.ts` verifying fallback cities appear on query error
- [x] T042 [P] [US2] Create E2E test for landing page load time at `tests/e2e/landing-page.spec.ts` verifying cities load within 2 seconds
- [x] T043 [P] [US2] Create E2E test for CTA visibility at `tests/e2e/landing-page.spec.ts` verifying CTA button achieves ≥90% viewport visibility
- [x] T044 [P] [US2] Create unit test for CityCard component at `tests/unit/components/city-card.test.tsx` verifying renders city data, onClick handler, and accessibility

### Implementation for User Story 2

- [x] T045 [US2] Create Featured City TypeScript types at `src/types/city.ts` with Zod schema and FALLBACK_CITIES constant
- [x] T046 [US2] Implement getFeaturedCities Convex query at `convex/cities.ts` with top 50 filtering, random shuffle, and validators
- [x] T047 [US2] Create CityCard component at `src/components/city-card.tsx` with Kirby styling, hero image, name, formatted visit count
- [x] T048 [US2] Add Framer Motion hover/tap effects to CityCard (scale 1.05 on hover, 0.95 on tap)
- [x] T049 [US2] Create CityShowcase component at `src/components/city-showcase.tsx` with responsive grid (3-4 mobile, 6-8 tablet, 9-12 desktop)
- [x] T050 [US2] Integrate LoadingDots into CityShowcase for query loading state (reuse from US4)
- [x] T051 [US2] Implement fallback logic in CityShowcase using FALLBACK_CITIES when query fails
- [x] T052 [US2] Add error boundary to CityShowcase with user-friendly fallback UI
- [x] T053 [US2] Update landing page at `src/routes/index.tsx` with hero section and CTA button
- [x] T054 [US2] Integrate CityShowcase component into landing page below CTA
- [x] T055 [US2] Style CTA button with Kirby theme (kirby-rounded, pastel pink background)
- [x] T056 [US2] Add click handler to CTA button navigating to cities explore page (or placeholder)
- [x] T057 [US2] Add Sentry performance tracking for city data fetch duration in CityShowcase

**Checkpoint**: At this point, User Stories 1, 2, and 4 should be fully functional and testable independently. Landing page displays featured cities with Kirby styling and loading indicators.

---

## Phase 6: User Story 3 - Animated Background Experience (Priority: P3)

**Goal**: Add dynamic animated backgrounds using React Spring or Framer Motion on landing page and major sections, respecting prefers-reduced-motion, maintaining 60fps, and not interfering with content readability

**Independent Test**: Load landing page and major sections, verify animated background effects are visible, do not interfere with foreground content, respect prefers-reduced-motion (disable when enabled), and maintain ≥55fps performance.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T058 [P] [US3] Create unit test for AnimatedBackground component at `tests/unit/components/animated-background.test.tsx` verifying variant props, intensity levels, reduced motion behavior
- [x] T059 [P] [US3] Create E2E test for background animation performance at `tests/e2e/background-animation.spec.ts` measuring frame rate (target: ≥55fps)
- [x] T060 [P] [US3] Create E2E test for background accessibility at `tests/e2e/background-animation.spec.ts` verifying animations disable with prefers-reduced-motion
- [x] T061 [P] [US3] Create E2E test for content readability at `tests/e2e/background-animation.spec.ts` verifying foreground content remains readable and interactive

### Implementation for User Story 3

- [x] T062 [P] [US3] Create AnimatedBackground component at `src/components/animated-background.tsx` with Framer Motion
- [x] T063 [US3] Implement "bubbles" variant in AnimatedBackground with floating circular shapes and gentle up/down motion
- [x] T064 [US3] Implement "waves" variant in AnimatedBackground with flowing gradient waves and horizontal motion
- [x] T065 [US3] Implement "particles" variant in AnimatedBackground with small dots and random drift motion
- [x] T066 [US3] Add intensity prop (subtle/moderate/prominent) controlling animation speed and element count
- [x] T067 [US3] Integrate useReducedMotion hook to disable animations when prefers-reduced-motion is set
- [x] T068 [US3] Style AnimatedBackground with z-index: -1 and pointer-events: none to keep behind content
- [x] T069 [US3] Integrate AnimatedBackground into landing page at `src/routes/index.tsx` with "bubbles" variant and "subtle" intensity
- [ ] T070 [US3] Add AnimatedBackground to city detail pages (if applicable) or other major sections
- [x] T071 [US3] Add Sentry performance tracking for animation initialization time

**Checkpoint**: All user stories should now be independently functional. Landing page has full Kirby styling, loading indicators, city showcase, and animated background.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality assurance

- [ ] T072 [P] Run full test suite (`bun run test` and `bun run test:e2e`) and ensure all tests pass
- [ ] T073 [P] Run Lighthouse performance audit on landing page and verify Performance score ≥90
- [ ] T074 [P] Measure page load time increase from baseline and verify ≤15% increase per SC-007
- [x] T075 [P] Verify bundle size increase is ≤50KB gzipped (check Framer Motion impact)
- [ ] T076 [P] Test all features with prefers-reduced-motion enabled in browser settings
- [ ] T077 [P] Test responsive design across mobile (375px iPhone), tablet (768px iPad), desktop (1920px)
- [ ] T078 [P] Verify all animations maintain ≥55fps using Chrome DevTools Performance tab
- [x] T079 [P] Add ARIA labels to interactive elements (CTA button, city cards) for accessibility
- [x] T080 [P] Add keyboard navigation support to city cards (Enter key to activate)
- [x] T081 Run `bun run lint` and fix any TypeScript or Biome linting errors
- [x] T082 Run `bun run format` to ensure consistent code formatting
- [ ] T083 Update CLAUDE.md with Kirby theme constants and component usage patterns (if needed)
- [x] T084 [P] Add JSDoc comments to exported functions and components
- [ ] T085 [P] Validate quickstart.md instructions by following setup steps
- [ ] T086 Run E2E visual regression tests (if Playwright screenshots configured)
- [ ] T087 Manual QA: Test complete user journey (land on page → see cities → click city → navigate)
- [ ] T088 Deploy to staging environment and verify all features work in production-like environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T010) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T011-T018)
- **User Story 4 (Phase 4)**: Depends on Foundational (T011-T018)
- **User Story 2 (Phase 5)**: Depends on Foundational (T011-T018) and US4 (T033-T039) for LoadingDots
- **User Story 3 (Phase 6)**: Depends on Foundational (T011-T018)
- **Polish (Phase 7)**: Depends on all user stories (T019-T071)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 4 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US4 for LoadingDots component, otherwise independent
- **User Story 3 (P3)**: Can start after Foundational - No dependencies on other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- TypeScript types before components
- Components before integration
- Core implementation before performance optimization
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T001-T010 can all run in parallel (independent installations and file creations)

**Phase 2 (Foundational)**: T012-T015, T017-T018 can run in parallel (different files)

**User Story 1**:
- Tests T019-T021 can run in parallel
- Component refactors T022-T024 can run in parallel

**User Story 4**:
- Tests T029-T032 can run in parallel
- T033 (types) and T034 (component) can run in parallel after tests

**User Story 2**:
- Tests T040-T044 can run in parallel
- T045 (types) and T046 (Convex query) and T047 (CityCard) can run in parallel after tests

**User Story 3**:
- Tests T058-T061 can run in parallel
- T062 (component skeleton) before T063-T065 (variants)

**Polish Phase**: T072-T088 many can run in parallel (independent validations)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create unit test for Kirby theme constants at tests/unit/lib/kirby-theme.test.ts"
Task: "Create E2E test for visual consistency at tests/e2e/kirby-styling.spec.ts"
Task: "Create E2E test for responsive design at tests/e2e/responsive-kirby.spec.ts"

# Launch all component refactors for User Story 1 together:
Task: "Refactor Button component at src/components/ui/button.tsx"
Task: "Refactor Card component at src/components/ui/card.tsx"
Task: "Refactor Avatar component at src/components/ui/avatar.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Create contract test for getFeaturedCities query at tests/contract/featured-cities.test.ts"
Task: "Create integration test for city showcase with fallback at tests/integration/city-showcase.test.ts"
Task: "Create E2E test for landing page load time at tests/e2e/landing-page.spec.ts"
Task: "Create E2E test for CTA visibility at tests/e2e/landing-page.spec.ts"
Task: "Create unit test for CityCard component at tests/unit/components/city-card.test.tsx"

# Launch foundational components for User Story 2 together:
Task: "Create Featured City TypeScript types at src/types/city.ts"
Task: "Implement getFeaturedCities Convex query at convex/cities.ts"
Task: "Create CityCard component at src/components/city-card.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T018) - CRITICAL
3. Complete Phase 3: User Story 1 (T019-T028)
4. Complete Phase 4: User Story 4 (T029-T039)
5. **STOP and VALIDATE**: Test US1 + US4 independently
6. Deploy/demo if ready (Kirby-styled UI with loading states)

**MVP Scope**: This gives you a fully functional Kirby-styled interface with loading indicators, which are the P1 priority items.

### Incremental Delivery

1. **Foundation Ready** (Phase 1 + 2): Framer Motion installed, Kirby theme configured, tests set up
2. **MVP** (+ Phase 3 + 4): Kirby styling applied, loading dots working → Deploy/Demo
3. **Enhanced Landing** (+ Phase 5): Featured cities showcase added → Deploy/Demo
4. **Full Experience** (+ Phase 6): Animated backgrounds added → Deploy/Demo
5. **Production Ready** (+ Phase 7): All polish and QA complete → Deploy to Production

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T018)
2. **Once Foundational is done**, split work:
   - **Developer A**: User Story 1 (Visual Enhancement) - T019-T028
   - **Developer B**: User Story 4 (Loading States) - T029-T039
   - **Developer C**: Start on User Story 3 (Animations) - T058-T071
3. **After US1 + US4 complete**:
   - **Developer A**: User Story 2 (City Showcase) - T040-T057
   - **Developer B**: Help with US2 or start Polish
   - **Developer C**: Continue US3
4. **All developers**: Phase 7 Polish & QA together

---

## Notes

- **[P] tasks** = different files, no dependencies - safe to run in parallel
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Verify tests fail before implementing** (TDD approach per Constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **US4 before US2**: Although US2 is listed later, US4 (P1) must complete before US2 can use LoadingDots
- **Bundle budget**: Monitor during Phase 7 - Framer Motion should add ~35KB gzipped
- **Performance critical**: All animations must maintain 60fps (≥55fps acceptable in tests)
- **Accessibility critical**: prefers-reduced-motion MUST be respected (Constitution requirement)

---

## Task Count Summary

- **Phase 1 (Setup)**: 10 tasks
- **Phase 2 (Foundational)**: 8 tasks
- **Phase 3 (User Story 1)**: 10 tasks (3 tests + 7 implementation)
- **Phase 4 (User Story 4)**: 11 tasks (4 tests + 7 implementation)
- **Phase 5 (User Story 2)**: 18 tasks (5 tests + 13 implementation)
- **Phase 6 (User Story 3)**: 14 tasks (4 tests + 10 implementation)
- **Phase 7 (Polish)**: 17 tasks
- **Total**: 88 tasks

**Parallel Opportunities**: 42 tasks marked [P] (47.7% parallelizable)

**Independent Test Criteria**:
- US1: Visual consistency check across viewport sizes
- US4: Loading indicator timing and performance check
- US2: Landing page city showcase functionality check
- US3: Background animation performance and accessibility check
