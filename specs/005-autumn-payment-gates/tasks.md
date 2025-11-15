# Implementation Tasks: Autumn Payment Gates

**Feature**: 005-autumn-payment-gates
**Branch**: `005-autumn-payment-gates`
**Generated**: 2025-11-15
**Total Tasks**: 68

## Task Summary

| Phase | Tasks | User Story | Priority |
|-------|-------|------------|----------|
| Phase 1: Setup | 5 | - | Foundation |
| Phase 2: Foundational | 8 | - | Foundation |
| Phase 3: Free User Privacy | 10 | US1 | P1 |
| Phase 4: Pro Upgrade & Payment | 13 | US2 | P2 |
| Phase 5: Global Privacy | 9 | US3 | P3 |
| Phase 6: Individual Visit Privacy | 8 | US4 | P3 |
| Phase 7: Polish & Testing | 15 | - | Cross-cutting |

**Legend**:
- `[F]` = Foundation (no user story)
- `[US1]` = User Story 1 (Free User Privacy Controls)
- `[US2]` = User Story 2 (Pro Tier Upgrade and Payment)
- `[US3]` = User Story 3 (Pro User Global Privacy Control)
- `[US4]` = User Story 4 (Pro User Individual Visit Privacy)
- `[P1]` = Priority 1 (Must Have)
- `[P2]` = Priority 2 (Should Have)
- `[P3]` = Priority 3 (Nice to Have)

---

## Phase 1: Setup & Configuration (Foundation)

**Dependencies**: None
**Estimated Time**: 1-2 hours

### Environment & Dependencies

- [ ] T001 [F] Install Autumn dependencies: `npm install @useautumn/convex autumn-js`
- [ ] T002 [F] Create `autumn.config.js` in project root with tier and feature definitions (Free tier with profile_visits_hide and profile_events_hide features; Pro tier at $0.99/month with all features including global_visit_privacy and individual_visit_privacy)
- [ ] T003 [F] Set `AUTUMN_SECRET_KEY` environment variable in Convex: `npx convex env set AUTUMN_SECRET_KEY=am_sk_test_YOUR_KEY`
- [ ] T004 [F] Update `src/env.server.ts` to validate `AUTUMN_SECRET_KEY` (if needed for TanStack Start server functions)
- [ ] T005 [F] Update `wrangler.jsonc` with `VITE_AUTUMN_PUBLIC_KEY` if client-side Autumn calls are needed (check Autumn docs for requirement)

---

## Phase 2: Foundational Backend Setup (Foundation)

**Dependencies**: Phase 1 complete
**Estimated Time**: 2-3 hours

### Convex Configuration

- [ ] T006 [F] Update `convex/convex.config.ts` to register Autumn component: `app.use(autumn)` from `@useautumn/convex/convex.config`
- [ ] T007 [F] Create `convex/autumn.ts` with Autumn client initialization using `new Autumn({ secretKey, config, identify })` where `identify` extracts user ID from Better-Auth via `ctx.auth.getUserIdentity().subject`
- [ ] T008 [F] Export `autumnConfig` from `convex/autumn.ts` for use in other Convex functions

### Database Schema

- [ ] T009 [F] Update `convex/schema.ts` to add `privacySettings` object to users table with `hideProfileVisits`, `hideProfileEvents`, and `globalVisitPrivacy` boolean fields
- [ ] T010 [F] Update `convex/schema.ts` to add optional `subscription` object to users table with `tier`, `status`, `nextBillingDate`, `periodEndDate`, `autumnCustomerId`, and `lastSyncedAt` fields
- [ ] T011 [F] Add index `by_subscription_tier` on `users.subscription.tier` in `convex/schema.ts`
- [ ] T012 [F] Deploy schema changes: `npx convex dev` and verify in Convex dashboard
- [ ] T013 [F] Create migration script `convex/migrations/001_add_privacy_settings.ts` to backfill `privacySettings` and `subscription` fields for existing users (default all privacy to `false`, tier to `free`)

---

## Phase 3: Free User Privacy Controls (P1 - User Story 1)

**Dependencies**: Phase 2 complete
**Estimated Time**: 3-4 hours

### Backend Privacy Functions

- [ ] T014 [P1] [US1] Create `convex/privacy.ts` with query `getMyPrivacySettings` that returns user's privacy settings, tier, and `canModify` flags (hideProfileVisits and hideProfileEvents always true for all users, globalVisitPrivacy only true for Pro)
- [ ] T015 [P1] [US1] Implement mutation `updateProfilePrivacy` in `convex/privacy.ts` to toggle `hideProfileVisits` or `hideProfileEvents` (available to all users, no feature gate check needed)
- [ ] T016 [P1] [US1] Update existing query `getUserProfileVisits` in `convex/visits.ts` to check `user.privacySettings.hideProfileVisits` and return `{ hidden: true, message: "This user's visit history is private" }` if enabled and viewer is not owner
- [ ] T017 [P1] [US1] Create query `getUserProfileEvents` in `convex/events.ts` (or `convex/privacy.ts`) to filter events by `user.privacySettings.hideProfileEvents` similar to profile visits logic

### Frontend Privacy Components

- [ ] T018 [P1] [US1] Install shadcn/ui Switch component if not already present: `bunx shadcn@latest add switch`
- [ ] T019 [P1] [US1] Create `src/components/privacy/privacy-toggle.tsx` reusable component with props for `setting`, `label`, `description`, `value`, `canModify`, and `onUpgradeRequired` callback
- [ ] T020 [P1] [US1] Create `src/components/privacy/privacy-settings-panel.tsx` component that uses `useSuspenseQuery(convexQuery(api.privacy.getMyPrivacySettings))` and renders PrivacyToggle for hideProfileVisits and hideProfileEvents
- [ ] T021 [P1] [US1] Update `src/routes/settings.tsx` to add Privacy Settings section with PrivacySettingsPanel component
- [ ] T022 [P1] [US1] Update `src/routes/u/$username.tsx` profile page to handle `{ hidden: true }` response from getUserProfileVisits and show privacy message
- [ ] T023 [P1] [US1] Add similar privacy handling for events in profile page if getUserProfileEvents returns `{ hidden: true }`

---

## Phase 4: Pro Tier Upgrade & Payment (P2 - User Story 2)

**Dependencies**: Phase 2 complete
**Estimated Time**: 4-5 hours

### Subscription Backend Functions

- [ ] T024 [P2] [US2] Create `convex/subscriptions.ts` with query `getMySubscription` that returns user's subscription tier, status, billing dates, and `canUpgrade`/`canCancel` flags
- [ ] T025 [P2] [US2] Implement mutation `initiateUpgrade` in `convex/subscriptions.ts` that calls `autumn.attach()` with Pro product ID and returns Stripe Checkout URL with `successUrl` and `cancelUrl` parameters
- [ ] T026 [P2] [US2] Implement mutation `cancelSubscription` in `convex/subscriptions.ts` that calls Autumn API to cancel subscription and updates user document with `status: "pending_cancellation"` and `periodEndDate`
- [ ] T027 [P2] [US2] Implement mutation `reactivateSubscription` in `convex/subscriptions.ts` to re-enable billing for cancelled-but-active subscriptions
- [ ] T028 [P2] [US2] Implement mutation `syncSubscriptionStatus` in `convex/subscriptions.ts` to fetch latest state from Autumn API and update user document (check `lastSyncedAt` timestamp, re-sync if >1 hour old)
- [ ] T029 [P2] [US2] Implement query `checkFeatureAccess` in `convex/subscriptions.ts` that calls `autumn.check()` for given featureId and returns hasAccess boolean and tier
- [ ] T030 [P2] [US2] Implement internal mutation `handleSubscriptionWebhook` in `convex/subscriptions.ts` to handle Autumn webhook events (subscription.created, subscription.updated, subscription.cancelled, payment.succeeded, payment.failed)

### Subscription Frontend Components

- [ ] T031 [P2] [US2] Install shadcn/ui Badge component: `bunx shadcn@latest add badge`
- [ ] T032 [P2] [US2] Create `src/components/subscription/upgrade-button.tsx` component that calls `useMutation(api.subscriptions.initiateUpgrade)` and redirects to Stripe Checkout URL
- [ ] T033 [P2] [US2] Create `src/components/subscription/subscription-status.tsx` component that displays Pro/Free badge using shadcn Badge and shows cancellation date if `status === "pending_cancellation"`
- [ ] T034 [P2] [US2] Create `src/components/subscription/cancel-subscription.tsx` component with confirmation dialog that calls `useMutation(api.subscriptions.cancelSubscription)`
- [ ] T035 [P2] [US2] Create `src/components/subscription/pricing-card.tsx` component to display Free vs Pro tier comparison with features list from `autumn.config.js`
- [ ] T036 [P2] [US2] Update `src/routes/settings.tsx` to add Subscription section with SubscriptionStatus, UpgradeButton (if canUpgrade), and CancelSubscription (if canCancel) components

### Payment Flow Pages

- [ ] T037 [P2] [US2] Create `src/routes/subscription/checkout.tsx` route component for initiating payment (optional - can just use UpgradeButton from settings)
- [ ] T038 [P2] [US2] Create `src/routes/subscription/success.tsx` route that calls `syncSubscriptionStatus` mutation on mount and redirects to settings after 2 seconds with success message
- [ ] T039 [P2] [US2] Update `src/routes/__root.tsx` or header component to show Pro badge next to user avatar if `subscription.tier === "pro"`

---

## Phase 5: Pro User Global Privacy Control (P3 - User Story 3)

**Dependencies**: Phase 3 and Phase 4 complete
**Estimated Time**: 2-3 hours

### Global Privacy Backend

- [ ] T040 [P3] [US3] Implement mutation `updateGlobalVisitPrivacy` in `convex/privacy.ts` that checks Pro tier access via `autumn.check(ctx, { userId, featureId: "global_visit_privacy" })` before updating `user.privacySettings.globalVisitPrivacy`
- [ ] T041 [P3] [US3] Update query `getCityVisits` in `convex/visits.ts` to filter out visits where `user.privacySettings.globalVisitPrivacy === true` (unless viewer is visit owner)
- [ ] T042 [P3] [US3] Ensure `getUserProfileVisits` query respects `globalVisitPrivacy` setting (should already be hidden by `hideProfileVisits`, but double-check both settings)
- [ ] T043 [P3] [US3] Update any "overlap detection" or "current visitors" queries to filter by `globalVisitPrivacy` setting

### Global Privacy Frontend

- [ ] T044 [P3] [US3] Add PrivacyToggle for `globalVisitPrivacy` in PrivacySettingsPanel component with `canModify={canModify.globalVisitPrivacy}` prop
- [ ] T045 [P3] [US3] Create `src/components/privacy/upgrade-prompt.tsx` modal/dialog component that shows when free user tries to enable Pro-only feature, with UpgradeButton
- [ ] T046 [P3] [US3] Wire `onUpgradeRequired` callback in PrivacyToggle for `globalVisitPrivacy` to show UpgradePrompt dialog
- [ ] T047 [P3] [US3] Update city page visitor lists to ensure global privacy filtering is applied (verify `getCityVisits` query is used)
- [ ] T048 [P3] [US3] Add UI indicator in settings panel showing which features are Pro-only (lock icon or "Pro" badge next to globalVisitPrivacy toggle)

---

## Phase 6: Pro User Individual Visit Privacy (P3 - User Story 4)

**Dependencies**: Phase 4 complete
**Estimated Time**: 2-3 hours

### Individual Visit Privacy Backend

- [ ] T049 [P3] [US4] Implement mutation `updateVisitPrivacy` in `convex/privacy.ts` that checks Pro tier access via `autumn.check()` before updating `visit.isPrivate` field (existing field in visits table)
- [ ] T050 [P3] [US4] Add ownership check in `updateVisitPrivacy` to ensure user can only update their own visits
- [ ] T051 [P3] [US4] Update `getCityVisits` query to filter out visits where `visit.isPrivate === true` (unless viewer is visit owner)
- [ ] T052 [P3] [US4] Ensure `getUserProfileVisits` query returns `isPrivate` field only to visit owner (already in contract, verify implementation)

### Individual Visit Privacy Frontend

- [ ] T053 [P3] [US4] Add privacy toggle to visit card/list item component in user profile showing individual visit privacy status (if viewing own profile)
- [ ] T054 [P3] [US4] Wire privacy toggle to call `useMutation(api.privacy.updateVisitPrivacy)` with visitId and isPrivate boolean
- [ ] T055 [P3] [US4] Show UpgradePrompt dialog if free user tries to enable individual visit privacy
- [ ] T056 [P3] [US4] Add visual indicator (lock icon) on visit cards when `isPrivate === true` (only visible to owner)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Dependencies**: Phases 3-6 complete
**Estimated Time**: 4-6 hours

### Testing

- [ ] T057 Create integration test `tests/integration/subscription-flow.test.ts` to test Free → Pro upgrade flow using Stripe test card 4242424242424242
- [ ] T058 Create integration test `tests/integration/privacy-settings.test.ts` to verify privacy toggles work for Free and Pro users
- [ ] T059 Create integration test `tests/integration/feature-gates.test.ts` to verify Pro-only features throw errors for free users
- [ ] T060 Create unit test `tests/unit/subscription-helpers.test.ts` for tier checking logic
- [ ] T061 Create unit test `tests/unit/privacy-filters.test.ts` for privacy filtering logic in getCityVisits and getUserProfileVisits
- [ ] T062 Add E2E test in Playwright for full subscription upgrade flow (signup → settings → upgrade → payment → success)

### Error Handling & UX

- [ ] T063 Add Sentry error tracking for payment failures and Autumn API errors in subscription functions
- [ ] T064 Add loading states to UpgradeButton component during Stripe Checkout redirect
- [ ] T065 Add error toast notifications for privacy update failures (e.g., "Pro subscription required")
- [ ] T066 Add optimistic UI updates for privacy toggle changes (update local state immediately, rollback on error)
- [ ] T067 Create `src/components/subscription/billing-history.tsx` component to show past payments (optional - use Autumn customer portal)

### Documentation & Deployment

- [ ] T068 Update `CLAUDE.md` with Autumn integration details, subscription tier checking patterns, and privacy filtering examples
- [ ] T069 Create end-user documentation for subscription management and privacy features (optional - can use in-app help text)
- [ ] T070 Deploy to production with live Autumn and Stripe keys: `wrangler secret put AUTUMN_SECRET_KEY` with production key
- [ ] T071 Verify Autumn webhook endpoint is configured to point to production Convex deployment
- [ ] T072 Test full payment flow in production with real $0.99 charge (use personal card or test user)

---

## Implementation Notes

### Critical Path

**Must complete in order**:
1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (Free Privacy P1)
2. Phase 4 (Pro Upgrade P2) must complete before Phase 5 (Global Privacy P3) and Phase 6 (Individual Privacy P3)

### Key Technical Decisions

1. **Config-Based Tiers**: Use `autumn.config.js` for tier definitions (NOT dashboard) per user requirement
2. **Existing Field Reuse**: Use existing `visits.isPrivate` field for individual visit privacy (no new field needed)
3. **Server-Side Enforcement**: All feature gates enforced via `autumn.check()` in Convex functions
4. **Privacy Preservation**: Settings preserved indefinitely across subscription changes (FR-032)
5. **Better-Auth Integration**: Extract user ID via `ctx.auth.getUserIdentity().subject` for Autumn identify function

### Performance Targets

- Payment checkout: <2 minutes end-to-end (SC-010)
- Privacy toggle updates: <5 seconds global reflection (SC-004)
- Feature gate checks: <100ms p95 (SC-007)

### Testing Strategy

- **Unit Tests**: Privacy filtering logic, tier checking helpers
- **Integration Tests**: Subscription flows, feature gates, privacy settings
- **E2E Tests**: Full payment flow with Stripe test card

---

**Tasks Generated**: 72
**Ready for `/speckit.implement`**: ✅

Run `/speckit.implement` to begin automated task execution.
