# Implementation Plan: Kirby-Style UI Refactor

**Branch**: `002-kirby-ui-refactor` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-kirby-ui-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the JRNY application's user interface to adopt a playful, engaging "Kirby-style" aesthetic featuring soft pastel colors (pinks, blues, purples), pronounced rounded corners (16-24px border radius), bubble-like UI elements, and bouncy easing animations. The refactor includes: (1) comprehensive visual design system update across all components, (2) enhanced landing page with featured cities randomly selected from top 50 most-visited, displaying city name + hero image + visitor count with fallback to 3-5 hardcoded cities, (3) animated backgrounds using React Spring or Framer Motion, and (4) pulsating dots loading indicators (3-5 dots with wave animation) for all data fetches and page transitions. The implementation must maintain 60fps performance, respect prefers-reduced-motion accessibility settings, and ensure page load time increases by no more than 15% compared to baseline.

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode enabled
**Primary Dependencies**:
  - **Frontend Framework**: React 19.1+ with TanStack Start (SSR meta-framework)
  - **Router**: TanStack Router v1.132+ (file-based routing)
  - **Backend**: Convex v1.29+ (serverless backend-as-a-service)
  - **Styling**: Tailwind CSS v4.1+ (via @tailwindcss/vite plugin)
  - **Animation Library**: NEEDS CLARIFICATION (React Spring vs Framer Motion - requires research for best fit)
  - **UI Components**: Radix UI primitives (shadcn/ui pattern)
  - **State Management**: TanStack Query v5.89+ with @convex-dev/react-query bridge
  - **Validation**: Zod v4.1+ for runtime validation, t3env for environment variables

**Storage**: Convex built-in transactional database with indexed queries
**Testing**: NEEDS CLARIFICATION (testing framework not yet established - requires research on best practices for TanStack Start + Convex integration testing)
**Target Platform**:
  - **Development**: Node.js via Vite dev server
  - **Production**: Cloudflare Workers (edge deployment)
  - **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge latest 2 versions)

**Project Type**: Full-stack web application (frontend: TanStack Start + React; backend: Convex)
**Performance Goals**:
  - **Animation Frame Rate**: 60fps for all animations and transitions
  - **Loading Indicator Response**: <200ms to display loading state
  - **Initial City Load**: <2 seconds for featured cities on landing page
  - **Page Load Budget**: ≤15% increase from pre-refactor baseline

**Constraints**:
  - **Accessibility**: Must respect prefers-reduced-motion CSS media query
  - **Bundle Size**: Animation library must not increase bundle by >50KB gzipped
  - **Performance**: 60fps animations on standard modern devices (no performance degradation)
  - **Compatibility**: Graceful degradation for browsers without animation support
  - **Responsive**: Full functionality across 320px (mobile) to 1920px+ (desktop) widths

**Scale/Scope**:
  - **UI Components**: ~15-20 existing components to refactor (buttons, cards, forms, navigation)
  - **Routes**: 5-8 major pages to apply Kirby-style theming
  - **City Data**: Query optimization for top 50 cities by visit count
  - **Fallback Assets**: 3-5 hardcoded city images for error resilience

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety & Validation ✅ PASS

**Assessment**: This feature maintains strict type safety requirements.
- All new Convex queries (featured cities query) will include `args` and `returns` validators
- Tailwind CSS theming changes are compile-time safe (CSS utility classes)
- Animation library (React Spring/Framer Motion) will be strongly typed with TypeScript
- No `any` types will be introduced; all components will maintain strict typing
- Fallback city data will be typed as `const` arrays with explicit type annotations

**Action Items**:
- Define Zod schema for Featured City entity (name, heroImage, visitorCount)
- Ensure city query returns type matches Featured City schema
- Type animation component props strictly (e.g., `AnimatedBackground` component)

### II. Testing Standards ⚠️ REQUIRES ATTENTION

**Assessment**: Testing framework not yet established for this project.
- **BLOCKER**: Constitution requires tests for critical paths, but project lacks testing infrastructure
- UI refactor affects all user-facing components (authentication flows, navigation, data display)
- Visual regression testing recommended for design system changes
- Integration tests needed for city showcase feature (query + fallback behavior)

**Action Items** (Phase 0 Research Required):
- Research testing frameworks compatible with TanStack Start + Convex
  - Options: Vitest + React Testing Library, Playwright for E2E
- Establish test structure in `tests/` directory (unit, integration, contract)
- Write integration tests for:
  - Featured cities query with top 50 filtering
  - Fallback behavior when city query fails
  - Loading state transitions (<200ms requirement)
- Consider visual regression testing for Kirby-style components (Percy, Chromatic)

### III. Performance & Observability ✅ PASS

**Assessment**: Performance targets well-defined and observable.
- 60fps animation target measurable via Chrome DevTools Performance tab
- Loading indicator <200ms requirement enforced by Sentry performance traces
- Sentry already configured (client: VITE_SENTRY_DSN, server: SENTRY_DSN)
- Page load budget (≤15% increase) measurable via Lighthouse CI

**Action Items**:
- Add custom Sentry performance marks for:
  - Animation initialization time
  - City data fetch duration
  - Loading indicator display latency
- Monitor bundle size increase via build output (target: <50KB for animation library)
- Set up Lighthouse CI baseline before refactor begins

### IV. User Experience Consistency ✅ PASS

**Assessment**: UX consistency maintained with enhanced visual design.
- Loading states: Pulsating dots component will wrap all async operations
- Error states: Fallback cities provide graceful degradation
- Optimistic updates: Not required for this feature (read-heavy city showcase)
- Responsive design: Tailwind responsive utilities maintain 320px-1920px+ support
- Accessibility: `prefers-reduced-motion` support explicitly required in FR-007

**Action Items**:
- Create reusable `<LoadingDots>` component respecting reduced motion
- Create reusable `<AnimatedBackground>` component with motion toggle
- Implement responsive city grid (3-4 mobile, 6-8 tablet, 9-12 desktop)
- Add ARIA labels to interactive city cards

### V. Security & Privacy ✅ PASS (LOW RISK)

**Assessment**: UI refactor poses minimal security risk; existing protections maintained.
- No new authentication/authorization logic introduced
- City data is public (no privacy concerns)
- Animation libraries (React Spring/Framer Motion) are widely-used, audited packages
- No new secrets or environment variables required (uses existing Convex config)

**Action Items**:
- Run `bun audit` after installing animation library to check for vulnerabilities
- Ensure fallback city images are served from trusted CDN or local assets
- Validate city query inputs with Zod (even though no user input, defensive programming)

### Gate Summary

| Principle | Status | Blocker? | Action Required |
|-----------|--------|----------|-----------------|
| Type Safety | ✅ PASS | No | Define schemas in Phase 1 |
| Testing | ⚠️ REQUIRES ATTENTION | **YES** | Research & establish testing framework in Phase 0 |
| Performance | ✅ PASS | No | Set up monitoring in Phase 1 |
| UX Consistency | ✅ PASS | No | Build reusable components in Phase 1 |
| Security | ✅ PASS | No | Audit dependencies in Phase 0 |

**GATE DECISION**: ⚠️ CONDITIONAL PASS - Proceed to Phase 0 with MANDATORY testing framework research. Cannot proceed to implementation without established testing strategy per Constitution Principle II.

---

## Constitution Check (Post-Phase 1 Re-evaluation)

*Re-evaluated after Phase 0 research and Phase 1 design completion.*

### I. Type Safety & Validation ✅ PASS (Maintained)

**Updated Assessment**: All type safety requirements addressed in design phase.
- ✅ Zod schemas defined for Featured City, Kirby Theme, Loading State
- ✅ Convex query validators specified (`args` and `returns`)
- ✅ TypeScript strict mode maintained (no `any` types)
- ✅ All component props strictly typed with TypeScript interfaces

**Evidence**:
- `data-model.md`: Complete Zod schemas for all entities
- `contracts/convex-api.md`: Explicit Convex validators for `getFeaturedCities`
- All React component props use TypeScript interfaces

**Status**: ✅ GATE PASSED

---

### II. Testing Standards ✅ PASS (Resolved)

**Updated Assessment**: Testing framework established, strategy defined.
- ✅ **Decision**: Vitest + React Testing Library + Playwright
- ✅ **Test Structure**: Defined in `research.md` and `quickstart.md`
- ✅ **Coverage Plan**:
  - Unit tests: Component rendering, animation logic, utilities
  - Integration tests: Convex query behavior, fallback logic
  - E2E tests: Full user journeys, performance (60fps, <200ms)
  - Contract tests: API signatures, component props
- ✅ **Setup Commands**: Documented in `quickstart.md`

**Evidence**:
- `research.md`: Comprehensive testing framework selection rationale
- `contracts/convex-api.md`: Contract test examples for all APIs
- `quickstart.md`: Complete setup and test implementation guide

**Status**: ✅ GATE PASSED (blocker resolved)

---

### III. Performance & Observability ✅ PASS (Maintained)

**Updated Assessment**: Performance monitoring strategy defined.
- ✅ Sentry custom performance marks documented (`research.md`)
- ✅ Lighthouse CI baseline setup in quickstart workflow
- ✅ Bundle size budget: Framer Motion +35KB < 50KB limit
- ✅ Animation performance targets: 60fps with GPU-accelerated transforms

**Evidence**:
- `research.md`: Sentry custom span implementation
- `quickstart.md`: Performance checklist with verification steps
- Bundle impact analysis: 35KB gzipped (30% under budget)

**Status**: ✅ GATE PASSED

---

### IV. User Experience Consistency ✅ PASS (Maintained)

**Updated Assessment**: UX consistency components designed.
- ✅ `<LoadingDots>` component with `useReducedMotion()` hook
- ✅ `<AnimatedBackground>` with accessibility toggle
- ✅ Responsive city grid (3-4/6-8/9-12 breakpoints)
- ✅ Fallback city data for error resilience

**Evidence**:
- `contracts/convex-api.md`: Complete component API contracts
- `quickstart.md`: Implementation code with accessibility features
- `data-model.md`: Responsive grid logic documented

**Status**: ✅ GATE PASSED

---

### V. Security & Privacy ✅ PASS (Maintained)

**Updated Assessment**: Security considerations addressed.
- ✅ No new authentication/authorization logic
- ✅ City data is public (no privacy risk)
- ✅ Framer Motion security audit planned (`bun audit` in quickstart)
- ✅ Fallback city images served from trusted local assets

**Evidence**:
- `research.md`: Dependency security mentioned
- `quickstart.md`: `bun audit` in pre-commit checklist
- No new secrets or environment variables required

**Status**: ✅ GATE PASSED

---

### Final Gate Summary (Post-Phase 1)

| Principle | Phase 0 Status | Phase 1 Status | Resolution |
|-----------|----------------|----------------|------------|
| Type Safety | ✅ PASS | ✅ PASS | Zod schemas + TypeScript strict types |
| Testing | ⚠️ BLOCKER | ✅ PASS | **Vitest + RTL + Playwright** selected & documented |
| Performance | ✅ PASS | ✅ PASS | Monitoring strategy defined, bundle <50KB |
| UX Consistency | ✅ PASS | ✅ PASS | Accessible components designed |
| Security | ✅ PASS | ✅ PASS | Audit plan established |

**FINAL GATE DECISION**: ✅ **FULL PASS** - All constitution requirements satisfied. Ready to proceed to Phase 2 (Task Generation via `/speckit.tasks`).

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
# Frontend (TanStack Start + React)
src/
├── routes/                    # File-based routing
│   ├── __root.tsx            # Root layout - REFACTOR: Kirby theme provider
│   ├── index.tsx             # Landing page - MAJOR CHANGES: CTA + city showcase
│   └── [other routes]        # Existing routes - REFACTOR: Apply Kirby styling
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx        # REFACTOR: Kirby-style button (rounded, pastel)
│   │   ├── card.tsx          # REFACTOR: Bubble-like cards
│   │   ├── avatar.tsx        # REFACTOR: Rounded avatars
│   │   └── [new] loading-dots.tsx  # NEW: Pulsating dots loader
│   ├── [new] animated-background.tsx  # NEW: React Spring/Framer Motion bg
│   ├── [new] city-showcase.tsx      # NEW: Featured cities grid
│   └── [new] city-card.tsx          # NEW: Individual city card component
├── lib/
│   ├── utils.ts              # Existing utilities (cn function)
│   └── [new] animations.ts   # NEW: Animation helper utilities
├── styles/
│   └── app.css               # REFACTOR: Tailwind theme with Kirby colors
├── env.client.ts             # NO CHANGES: Existing env validation
├── env.server.ts             # NO CHANGES: Existing env validation
└── router.tsx                # MINOR CHANGES: May add loading transitions

# Backend (Convex)
convex/
├── schema.ts                 # VERIFY: Ensure cities table has visit count index
├── [new] cities.ts           # NEW: City queries (top 50, random selection)
├── [existing files]          # NO CHANGES: Existing Convex functions
└── _generated/               # Auto-generated (DO NOT EDIT)

# Testing (to be established in Phase 0)
tests/
├── unit/                     # NEW: Component unit tests
│   ├── loading-dots.test.tsx
│   ├── city-card.test.tsx
│   └── animated-background.test.tsx
├── integration/              # NEW: Feature integration tests
│   ├── city-showcase.test.ts
│   └── fallback-cities.test.ts
└── visual/                   # NEW: Visual regression tests (optional)

# Static Assets
public/
└── [new] fallback-cities/    # NEW: 3-5 hardcoded city images for error fallback
```

**Structure Decision**: This is a full-stack web application using TanStack Start (frontend) + Convex (backend). The project follows Option 2 pattern but with Convex serverless backend instead of traditional backend directory. Frontend code lives in `src/`, backend functions in `convex/`. The refactor primarily affects `src/` (UI components, routes, styling) with minor backend additions for city queries.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No Constitution Violations**: This feature does not violate any constitution principles. The conditional pass on Testing Standards is not a violation but rather a gap to be filled in Phase 0 research.
