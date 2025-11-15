# Implementation Plan: Autumn Payment Gates

**Branch**: `005-autumn-payment-gates` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-autumn-payment-gates/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate Autumn payment platform with Convex backend to implement two-tier subscription model (Free/$0.99 Pro monthly) with privacy feature gates. Free users can hide profile visits/events. Pro users unlock global visit privacy and individual visit privacy controls. Autumn manages subscription lifecycle, payment processing, and feature access verification. System preserves privacy settings across subscription state changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:
- `@useautumn/convex` (Convex component for Autumn integration)
- `autumn-js@0.1.24+` (Autumn SDK)
- Convex v1.25.0+ (existing)
- Better-Auth (existing - for user authentication)
- Zod (existing - for validation)

**Storage**: Convex (serverless database with real-time sync)
**Testing**: Vitest (unit), Playwright (E2E), `convex-test` (Convex function testing)
**Target Platform**: Cloudflare Workers (frontend), Convex Cloud (backend)
**Project Type**: Full-stack web application (TanStack Start + Convex)
**Performance Goals**:
- Payment checkout <2 minutes end-to-end
- Privacy toggle updates <5 seconds to reflect globally
- Feature gate checks <100ms p95

**Constraints**:
- Immediate subscription state updates (no grace period on payment failure)
- Preserve privacy flags indefinitely for re-subscription
- All feature gates must be enforced server-side (Convex functions)

**Scale/Scope**:
- 2 subscription tiers (Free, Pro at $0.99/month)
- 4 privacy features (2 profile-level, 2 Pro-only)
- ~10-15 new Convex functions
- 5-10 new React components/pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety & Validation ✅ PASS

- All Autumn integration points will use TypeScript with strict mode
- Convex functions will include `args` and `returns` validators
- Subscription tier and privacy settings will be validated with Zod schemas
- Environment variables (AUTUMN_SECRET_KEY) managed via t3env
- No `any` types - Autumn SDK provides full TypeScript support

### II. Testing Standards ✅ PASS

- Payment flow is critical path requiring integration tests
- Feature gate checks require unit tests (verify Pro-only access)
- Subscription state transitions require integration tests
- Privacy setting persistence across tier changes needs coverage

### III. Performance & Observability ✅ PASS

- Payment checkout target: <2 minutes (within SC-002)
- Feature gate checks: <100ms p95 (Convex query performance)
- Sentry will capture payment failures and subscription errors
- Privacy toggle updates: <5 seconds global reflection (within SC-004)

### IV. User Experience Consistency ✅ PASS

- Loading states for payment processing required
- Error states for payment failures required
- Optimistic UI updates for privacy toggle changes
- Upgrade prompts for free users accessing Pro features
- Pro badge/indicators for tier visibility

### V. Security & Privacy ✅ PASS

- Autumn API key stored in environment variables (AUTUMN_SECRET_KEY)
- All feature gates enforced server-side in Convex functions
- Payment processing handled by Autumn/Stripe (PCI compliant)
- Privacy settings validated before applying
- User identity verified via Better-Auth before subscription operations

**GATE STATUS**: ✅ PASS - No constitution violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-autumn-payment-gates/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── subscription.ts  # Subscription management API contracts
│   └── privacy.ts       # Privacy settings API contracts
├── checklists/          # Quality validation (existing)
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Structure Decision**: Full-stack web application (TanStack Start frontend + Convex backend). Follows existing JRNY project structure with Convex functions for backend logic and React components for frontend UI.

```text
autumn.config.js         # NEW: Tier and feature configuration (project root)

convex/
├── autumn.ts            # NEW: Autumn client initialization with identify() + config import
├── convex.config.ts     # MODIFIED: Register Autumn component
├── schema.ts            # MODIFIED: Add subscription & privacy fields to users table
├── subscriptions.ts     # NEW: Subscription management functions
├── privacy.ts           # NEW: Privacy settings functions
├── users.ts             # MODIFIED: Add subscription tier helpers
├── visits.ts            # MODIFIED: Filter by privacy settings
└── events.ts            # MODIFIED: Filter by privacy settings

src/
├── components/
│   ├── subscription/
│   │   ├── upgrade-button.tsx        # NEW: Initiate Pro upgrade
│   │   ├── subscription-status.tsx   # NEW: Show current tier & billing info
│   │   ├── cancel-subscription.tsx   # NEW: Cancel Pro subscription
│   │   └── pricing-card.tsx          # NEW: Display pricing tiers
│   ├── privacy/
│   │   ├── privacy-toggle.tsx        # NEW: Reusable privacy toggle component
│   │   ├── privacy-settings-panel.tsx # NEW: Settings page privacy controls
│   │   └── upgrade-prompt.tsx        # NEW: Prompt for Pro-only features
│   └── ui/
│       └── badge.tsx                 # NEW: Pro badge component (shadcn)
├── routes/
│   ├── settings.tsx                  # MODIFIED: Add subscription & privacy sections
│   ├── subscription/
│   │   ├── checkout.tsx              # NEW: Payment checkout flow
│   │   └── success.tsx               # NEW: Payment confirmation page
│   ├── u/
│   │   └── $username.tsx             # MODIFIED: Respect privacy settings
│   └── c/
│       └── $shortSlug.tsx            # MODIFIED: Filter visitors by privacy
├── lib/
│   ├── autumn-client.ts              # NEW: Frontend Autumn client wrapper
│   └── subscription-utils.ts         # NEW: Tier checking utilities
├── env.server.ts                     # MODIFIED: Add AUTUMN_SECRET_KEY
└── env.client.ts                     # MODIFIED: Add VITE_AUTUMN_PUBLIC_KEY (if needed)

tests/
├── integration/
│   ├── subscription-flow.test.ts     # NEW: End-to-end payment & upgrade
│   ├── privacy-settings.test.ts      # NEW: Privacy toggle functionality
│   └── feature-gates.test.ts         # NEW: Pro feature access enforcement
└── unit/
    ├── subscription-helpers.test.ts  # NEW: Tier checking logic
    └── privacy-filters.test.ts       # NEW: Privacy filtering logic
```

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected.** All constitution principles are satisfied.
