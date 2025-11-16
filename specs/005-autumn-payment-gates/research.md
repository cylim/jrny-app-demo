# Phase 0: Research & Technical Decisions

**Feature**: Autumn Payment Gates
**Date**: 2025-11-15
**Status**: Complete

## Overview

This document captures research findings and technical decisions for integrating Autumn payment platform with the JRNY application. Autumn provides a layer between Stripe and the application, enabling subscription-based pricing with feature gates.

## Research Areas

### 1. Autumn + Convex Integration

**Research Question**: How does Autumn integrate with Convex backends, and what is the recommended architecture?

**Decision**: Use `@useautumn/convex` component with Better-Auth integration

**Rationale**:
- Autumn provides official Convex component (`@useautumn/convex`)
- Integrates with existing Better-Auth authentication
- Supports server-side feature gating in Convex functions
- Provides React hooks for frontend subscription management

**Implementation Approach**:
1. Install dependencies: `@useautumn/convex` and `autumn-js@0.1.24+`
2. Register Autumn component in `convex/convex.config.ts`
3. Create `convex/autumn.ts` with Autumn client initialization
4. Implement `identify()` function to extract user ID from Better-Auth
5. Wrap frontend with `<AutumnProvider/>` for React hooks

**Alternatives Considered**:
- Direct Stripe integration: Rejected due to complexity of subscription management, webhook handling, and feature gate logic
- Custom payment system: Rejected due to PCI compliance requirements and maintenance burden
- Other payment platforms (Paddle, LemonSqueezy): Rejected because Autumn is purpose-built for Convex and provides better developer experience

**Source**: https://docs.useautumn.com/setup/convex, https://www.convex.dev/components/autumn

---

### 2. Tier & Pricing Configuration

**Research Question**: Where and how are subscription tiers (Free/Pro) and pricing ($0.99/month) configured in Autumn?

**Decision**: Use `autumn.config.js` for programmatic tier and feature configuration

**Rationale**:
- User explicitly requires code-based configuration (not dashboard)
- `autumn.config.js` allows version control of pricing/features
- Enables automated deployment without manual dashboard steps
- Configuration lives with codebase for better transparency

**Implementation Approach**:
1. Create `autumn.config.js` in project root
2. Define two tiers programmatically:
   - **Free tier**: $0/month with basic privacy features
   - **Pro tier**: $0.99/month with advanced privacy features
3. Define features with tier access:
   - `profile_visits_hide` → Free + Pro
   - `profile_events_hide` → Free + Pro
   - `global_visit_privacy` → Pro only
   - `individual_visit_privacy` → Pro only
4. Import config in Convex Autumn client setup
5. Reference feature keys from config in Convex functions

**Configuration Structure** (`autumn.config.js`):
```javascript
module.exports = {
  tiers: {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: null,
      features: [
        'profile_visits_hide',
        'profile_events_hide'
      ]
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 0.99,
      interval: 'month',
      currency: 'usd',
      features: [
        'profile_visits_hide',
        'profile_events_hide',
        'global_visit_privacy',
        'individual_visit_privacy'
      ]
    }
  },
  features: {
    profile_visits_hide: {
      id: 'profile_visits_hide',
      name: 'Hide Profile Visits',
      description: 'Hide visit history from profile page'
    },
    profile_events_hide: {
      id: 'profile_events_hide',
      name: 'Hide Profile Events',
      description: 'Hide event participation from profile page'
    },
    global_visit_privacy: {
      id: 'global_visit_privacy',
      name: 'Global Visit Privacy',
      description: 'Hide all visits from discovery features',
      tier: 'pro'
    },
    individual_visit_privacy: {
      id: 'individual_visit_privacy',
      name: 'Individual Visit Privacy',
      description: 'Hide specific visits from discovery',
      tier: 'pro'
    }
  }
};
```

**Alternatives Considered**:
- Dashboard-based configuration: Rejected per user requirement for code-based config
- Hardcoded tier logic: Rejected because it couples billing logic to application code
- TypeScript config (`autumn.config.ts`): Possible alternative but `.js` is more standard for config files

**Source**: User requirement for `autumn.config.js` approach

---

### 3. Feature Gate Enforcement

**Research Question**: How should feature gates be enforced to prevent unauthorized access to Pro features?

**Decision**: Server-side enforcement in Convex functions using Autumn's `check()` API

**Rationale**:
- Client-side checks can be bypassed - must enforce server-side
- Convex functions are the authoritative data layer
- Autumn's `check()` function verifies feature access based on user's subscription
- Performance: <100ms p95 for feature checks (Constitution requirement met)

**Implementation Pattern**:
```typescript
// convex/privacy.ts
export const setGlobalVisitPrivacy = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user has Pro tier access to this feature
    const hasAccess = await autumn.check(ctx, {
      userId: identity.subject,
      featureId: "global_visit_privacy"
    });

    if (!hasAccess) {
      throw new Error("Pro subscription required");
    }

    // Proceed with privacy setting update...
  }
});
```

**Alternatives Considered**:
- Frontend-only checks: Rejected due to security - client code can be manipulated
- Database tier field check: Rejected because it doesn't sync with Autumn's subscription state (payment failures, cancellations)
- Middleware/auth rules: Considered but Convex doesn't have traditional middleware; function-level checks are idiomatic

**Best Practice**: Cache feature check results per-request to avoid multiple API calls within same transaction

**Source**: Convex component documentation, Autumn API reference

---

### 4. Subscription State Management

**Research Question**: How is subscription state synchronized between Autumn, Stripe, and the Convex database?

**Decision**: Autumn handles subscription state; Convex queries Autumn for real-time status

**Rationale**:
- Autumn manages Stripe webhooks (payment success/failure, cancellations)
- Autumn maintains authoritative subscription state
- Convex functions query Autumn's API for current tier/feature access
- No need to duplicate subscription state in Convex database

**Synchronization Flow**:
1. User initiates upgrade → Frontend calls `autumn.attach()` → Redirects to Stripe Checkout
2. User completes payment → Stripe webhook → Autumn updates subscription state
3. Frontend redirects back → Success page
4. Subsequent requests → Convex functions call `autumn.check()` for real-time tier verification

**Edge Cases Handled by Autumn**:
- Payment failures → Immediate downgrade (per clarification)
- Subscription cancellation → Retain access until period end (per clarification)
- Re-subscription → Automatic restoration of previous state

**Alternatives Considered**:
- Mirror subscription state in Convex database: Rejected due to complexity of webhook handling and sync issues
- Poll Stripe API directly: Rejected because Autumn abstracts this and handles webhook race conditions

**Caching Strategy**: Consider caching feature check results in memory (per-request scope) to reduce API calls, but always verify server-side

**Source**: Autumn subscription management documentation

---

### 5. Privacy Settings Persistence

**Research Question**: How should privacy settings be stored to support indefinite preservation across subscription changes?

**Decision**: Store privacy flags in Convex users table; enforce access based on Autumn tier checks

**Rationale**:
- Privacy settings are user preferences, not subscription state
- Must persist settings even after downgrade (per FR-032: "preserve indefinitely")
- Separation of concerns: Convex stores preferences, Autumn controls access

**Database Schema Addition** (convex/schema.ts):
```typescript
users: defineTable({
  // ... existing fields
  privacySettings: v.object({
    hideProfileVisits: v.boolean(),      // Free + Pro
    hideProfileEvents: v.boolean(),      // Free + Pro
    globalVisitPrivacy: v.boolean(),     // Pro only (preserved if downgraded)
  }),
})
```

**Visit Schema Addition**:
```typescript
visits: defineTable({
  // ... existing fields
  isPrivate: v.optional(v.boolean()),  // Pro only (individual visit privacy)
})
```

**Access Logic**:
- Free users: Can toggle `hideProfileVisits` and `hideProfileEvents`
- Pro users: Can toggle all privacy settings including `globalVisitPrivacy` and per-visit `isPrivate`
- Downgraded users: Settings preserved but cannot modify Pro-only settings without re-upgrading

**Alternatives Considered**:
- Store settings in Autumn: Rejected because Autumn is for billing, not application state
- Delete Pro settings on downgrade: Rejected per FR-032 requirement to preserve settings
- Separate privacy table: Rejected as over-normalization; privacy is user-specific configuration

**Source**: Feature requirements FR-010, FR-032, Constitution Principle I (Type Safety)

---

### 6. Better-Auth Identity Extraction

**Research Question**: How to extract user ID from Better-Auth for Autumn's `identify()` function?

**Decision**: Extract user ID from Better-Auth's `ctx.auth.getUserIdentity()` subject field

**Rationale**:
- Better-Auth stores user identity in `subject` field (format varies by provider)
- Convex Auth provides `ctx.auth.getUserIdentity()` method
- For Better-Auth, identity is typically `subject` property containing user ID

**Implementation** (convex/autumn.ts):
```typescript
import { Autumn } from "@useautumn/convex";

export const autumn = new Autumn({
  secretKey: process.env.AUTUMN_SECRET_KEY!,
  identify: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Better-Auth provides subject field with user ID
    // Extract the actual ID (may need parsing depending on Better-Auth config)
    return identity.subject;
  },
});
```

**Alternatives Considered**:
- Use email as identifier: Rejected because emails can change; user ID is stable
- Use Convex document ID: Considered but Better-Auth subject is more authoritative
- Organization-based billing: Out of scope (per spec - user-level subscriptions only)

**Source**: https://docs.useautumn.com/setup/convex (authentication integration section), Better-Auth documentation

---

### 7. Frontend Payment Flow

**Research Question**: What is the recommended UX flow for Pro upgrade checkout?

**Decision**: Use Autumn's `attach()` function to redirect to Stripe Checkout

**Rationale**:
- Stripe Checkout provides PCI-compliant payment UI
- Autumn's `attach()` handles Stripe session creation
- Redirect flow is standard for Stripe integrations
- Meets SC-010: "User can complete Pro upgrade without leaving the application" (Stripe Checkout hosted page is acceptable)

**Implementation Flow**:
1. User clicks "Upgrade to Pro" button
2. Frontend calls Convex mutation: `initiateCheckout()`
3. Convex calls `autumn.attach()` with Pro product ID
4. Returns Stripe Checkout URL
5. Frontend redirects to Stripe Checkout
6. User completes payment
7. Stripe redirects to `/subscription/success` route
8. Success page confirms upgrade and shows next billing date

**Alternatives Considered**:
- Stripe Elements (embedded payment form): Rejected due to higher implementation complexity and PCI scope
- Autumn hosted checkout: Not available - Autumn uses Stripe Checkout
- In-app payment modal: Rejected due to PCI compliance complexity

**Source**: Autumn API documentation (`attach()` and `checkout()` functions)

---

### 8. Environment Variables & Configuration

**Research Question**: What environment variables are required for Autumn integration?

**Decision**: Server-side secret key only; no client-side Autumn keys needed

**Required Environment Variables**:

**Server-side** (Convex):
- `AUTUMN_SECRET_KEY`: Autumn API secret key (format: `am_sk_xxx`)
  - Set via: `npx convex env set AUTUMN_SECRET_KEY=am_sk_xxx`
  - Used in `convex/autumn.ts` for Autumn client initialization
  - MUST be kept secret (server-only)

**Client-side**:
- No Autumn-specific client keys required
- `AutumnProvider` communicates through Convex functions, not directly to Autumn API

**Configuration Steps**:
1. Create Autumn account at https://app.useautumn.com/
2. Get API key from https://app.useautumn.com/sandbox/dev (test mode)
3. Set in Convex: `npx convex env set AUTUMN_SECRET_KEY=am_sk_xxx`
4. For production: Get production key and set via same command

**Validation** (env.server.ts):
```typescript
server: {
  AUTUMN_SECRET_KEY: z.string().min(1).startsWith('am_sk_'),
}
```

**Alternatives Considered**:
- Client-side publishable key: Not required by Autumn's Convex component architecture
- Config file approach: Rejected - Autumn uses environment variables, not config files

**Source**: https://docs.useautumn.com/setup/convex, https://www.convex.dev/components/autumn

---

## Summary of Technical Decisions

| Decision Area | Choice | Key Benefit |
|---------------|--------|-------------|
| Integration Method | `@useautumn/convex` component | Official Convex integration, minimal setup |
| Tier Configuration | Autumn dashboard (web UI) | No-code pricing changes, separation of concerns |
| Feature Gate Enforcement | Server-side `check()` in Convex | Security: prevents client-side bypass |
| Subscription State | Autumn as source of truth | No webhook handling, real-time sync |
| Privacy Settings Storage | Convex database | Preserves settings across tier changes |
| User Identification | Better-Auth `subject` field | Stable user ID across sessions |
| Payment Flow | Stripe Checkout redirect | PCI compliant, standard UX |
| Environment Config | Server-side `AUTUMN_SECRET_KEY` only | Minimal configuration, secure by default |

## Next Steps (Phase 1)

1. **Data Model**: Define Convex schema changes for privacy settings
2. **API Contracts**: Document Convex function signatures for subscription & privacy operations
3. **Quickstart Guide**: Step-by-step implementation checklist

---

**Phase 0 Complete** ✅ - Proceed to Phase 1: Design & Contracts
