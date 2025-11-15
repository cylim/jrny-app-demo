# Phase 1: Data Model

**Feature**: Autumn Payment Gates
**Date**: 2025-11-15
**Status**: Complete

## Overview

This document defines the database schema changes required for subscription management and privacy feature gates. All changes are additive to the existing Convex schema - no breaking changes to current data structures.

## Schema Changes

### 1. Users Table Modifications

**File**: `convex/schema.ts`

**Changes**: Add privacy settings and subscription metadata to existing users table

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // === EXISTING FIELDS (unchanged) ===
    authUserId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    username: v.string(),
    settings: v.object({
      globalPrivacy: v.boolean(),
      hideVisitHistory: v.boolean(),
    }),
    socialLinks: v.optional(v.object({
      github: v.optional(v.string()),
      x: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      telegram: v.optional(v.string()),
    })),

    // === NEW FIELDS ===
    privacySettings: v.object({
      // Free + Pro tier features
      hideProfileVisits: v.boolean(),         // Hides visit list from profile page
      hideProfileEvents: v.boolean(),         // Hides event participation from profile page

      // Pro-only features (preserved on downgrade, disabled on free tier)
      globalVisitPrivacy: v.boolean(),        // Hides ALL visits from discovery features
    }),

    // Subscription metadata (cached from Autumn for quick checks)
    subscription: v.optional(v.object({
      tier: v.union(v.literal("free"), v.literal("pro")),
      status: v.union(
        v.literal("active"),                  // Active Pro subscription
        v.literal("cancelled"),               // Cancelled but still has access until period end
        v.literal("pending_cancellation")     // Cancelled mid-month, awaiting period end
      ),
      nextBillingDate: v.optional(v.number()), // Unix timestamp in milliseconds
      periodEndDate: v.optional(v.number()),   // For cancelled subscriptions
      autumnCustomerId: v.optional(v.string()), // Autumn customer ID for API calls
      lastSyncedAt: v.number(),                // Last time we synced with Autumn
    })),
  })
    .index("by_auth_user_id", ["authUserId"])
    .index("by_username", ["username"])
    // NEW INDEX: Query users by subscription tier
    .index("by_subscription_tier", ["subscription.tier"]),
});
```

**Field Descriptions**:

| Field | Type | Purpose | Access Level |
|-------|------|---------|--------------|
| `privacySettings.hideProfileVisits` | boolean | Hide visit history on profile page | Free + Pro |
| `privacySettings.hideProfileEvents` | boolean | Hide event participation on profile page | Free + Pro |
| `privacySettings.globalVisitPrivacy` | boolean | Hide all visits from city pages, overlaps, discovery | Pro only |
| `subscription.tier` | "free" \| "pro" | Current subscription tier | All users |
| `subscription.status` | enum | Subscription state (active/cancelled/pending) | Pro users |
| `subscription.nextBillingDate` | number? | Next charge date (Unix ms) | Active Pro |
| `subscription.periodEndDate` | number? | End of paid period (for cancelled subs) | Cancelled Pro |
| `subscription.autumnCustomerId` | string? | Autumn customer ID reference | Pro users |
| `subscription.lastSyncedAt` | number | Last sync timestamp | Pro users |

**Migration Notes**:
- Existing users without `privacySettings`: Default all booleans to `false` (content visible)
- Existing users without `subscription`: Default to `{ tier: "free" }`
- No data loss - all additive fields with safe defaults

---

### 2. Visits Table (No Changes Required)

**File**: `convex/schema.ts`

**No schema changes needed for visits table** - The existing `isPrivate` field already serves the individual visit privacy purpose.

**Existing visits schema** (unchanged):
```typescript
visits: defineTable({
  userId: v.id("users"),
  cityId: v.id("cities"),
  startDate: v.number(),
  endDate: v.optional(v.number()),
  notes: v.optional(v.string()),
  isPrivate: v.boolean(),  // EXISTING: Individual visit privacy (Pro-only feature)
})
  .index("by_user_id", ["userId"])
  .index("by_city_id", ["cityId"])
  .index("by_user_and_city", ["userId", "cityId"])
  .index("by_start_date", ["startDate"])
  .index("by_city_and_start", ["cityId", "startDate"])
```

**Privacy Logic**:
- **`visit.isPrivate`**: Pro users can toggle this per-visit to hide individual trips
- Free users **cannot set `isPrivate = true`** (server-side validation required)
- Existing visits with `isPrivate = true` created by users who later downgrade: Remain hidden (privacy flags preserved per FR-032)

**Migration Notes**:
- No migration needed - existing field already serves this purpose
- Free users attempting to set `isPrivate = true`: Throw "Pro subscription required" error

---

### 3. Events Table (No Changes Required)

**File**: `convex/schema.ts`

**No schema changes needed** - Event privacy is controlled via existing `hideProfileEvents` setting in user's privacy settings. Events themselves don't need individual privacy flags.

**Privacy Enforcement Logic**:
- When querying events for a user's profile: Check `user.privacySettings.hideProfileEvents`
- If true and viewer is not the profile owner: Exclude events from results
- No changes to event documents themselves

---

## Data Model Diagrams

### Entity Relationship

```
┌─────────────────────────┐
│ User                    │
├─────────────────────────┤
│ • privacySettings       │──┐
│   - hideProfileVisits   │  │
│   - hideProfileEvents   │  │
│   - globalVisitPrivacy  │  │
│ • subscription          │  │  Privacy
│   - tier (free|pro)     │  │  Controls
│   - status              │  │
│   - nextBillingDate     │  │
└─────────────────────────┘  │
         │                   │
         │ 1:N               │
         ▼                   │
┌─────────────────────────┐  │
│ Visit                   │  │
├─────────────────────────┤  │
│ • userId (FK)           │  │
│ • cityId (FK)           │  │
│ • startDate             │  │
│ • endDate               │  │
│ • isPrivateVisit (Pro)  │◀─┘
└─────────────────────────┘

┌─────────────────────────┐
│ Autumn (External)       │  ← Source of truth
├─────────────────────────┤     for subscription
│ • Customer ID           │     state
│ • Subscription Status   │
│ • Payment History       │
│ • Feature Access        │
└─────────────────────────┘
```

### Privacy Decision Tree

```
Is visit visible to viewer?
│
├─ Is viewer the visit owner?
│  └─ YES → Always visible ✓
│
└─ NO → Check privacy settings:
   │
   ├─ User has globalVisitPrivacy enabled?
   │  └─ YES → Hidden ✗
   │
   ├─ Visit has isPrivate = true? (Pro-only feature)
   │  └─ YES → Hidden ✗
   │
   ├─ User has hideProfileVisits enabled AND viewing profile page?
   │  └─ YES → Hidden ✗
   │
   └─ Otherwise → Visible ✓
```

---

## Index Strategy

### Existing Indexes (No Changes)

- `users.by_auth_user_id`: Lookup user by Better-Auth ID
- `users.by_username`: Lookup user by username (profile URLs)
- `visits.by_user_id`: Get all visits for a user
- `visits.by_city_id`: Get all visits to a city
- `visits.by_user_and_city`: Check if user visited specific city
- `visits.by_start_date`: Query visits by time range
- `visits.by_city_and_start`: City visitor lists sorted by date

### New Indexes

**`users.by_subscription_tier`** - Query users by subscription tier
- **Use case**: Admin dashboards, analytics on Free vs Pro distribution
- **Query**: `ctx.db.query("users").withIndex("by_subscription_tier", q => q.eq("subscription.tier", "pro"))`
- **Performance**: O(log n) for tier-based queries vs O(n) table scan

**Considered but rejected**:
- `visits.by_privacy_status`: Rejected because privacy checks are user-specific, not global
- `users.by_privacy_settings`: Rejected because privacy is per-setting, not a single index key

---

## Type Definitions

**Generated Types** (from `convex/_generated/dataModel.ts`):

```typescript
// After schema changes, Convex generates:

import { Id, Doc } from "./_generated/dataModel";

// User with subscription and privacy
type UserWithSubscription = Doc<"users"> & {
  privacySettings: {
    hideProfileVisits: boolean;
    hideProfileEvents: boolean;
    globalVisitPrivacy: boolean;
  };
  subscription?: {
    tier: "free" | "pro";
    status: "active" | "cancelled" | "pending_cancellation";
    nextBillingDate?: number;
    periodEndDate?: number;
    autumnCustomerId?: string;
    lastSyncedAt: number;
  };
};

// Visit with individual privacy flag
type VisitWithPrivacy = Doc<"visits"> & {
  isPrivateVisit: boolean;
};

// Helper type for subscription tiers
type SubscriptionTier = "free" | "pro";
type SubscriptionStatus = "active" | "cancelled" | "pending_cancellation";
```

---

## Data Integrity Rules

### Validation Rules

1. **Privacy Settings Consistency**:
   - Free users can toggle `hideProfileVisits` and `hideProfileEvents`
   - Free users CANNOT enable `globalVisitPrivacy` (server-side validation)
   - Pro users can toggle all privacy settings
   - Downgraded users: Settings preserved but cannot modify Pro-only settings

2. **Subscription State Transitions**:
   - `free` → `pro` (active): Valid (after payment)
   - `pro` (active) → `pro` (cancelled): Valid (user cancels)
   - `pro` (cancelled) → `free`: Valid (period ends)
   - `pro` (active) → `free`: Valid (payment failure)
   - `free` → `pro` (cancelled): Invalid (cannot cancel non-existent subscription)

3. **Visit Privacy Flags**:
   - `isPrivate` can only be set to `true` by Pro users
   - Free users attempting to set `isPrivate = true`: Throw error "Pro subscription required"
   - If user downgrades: Existing `isPrivate = true` visits remain hidden (preserved per FR-032)

4. **Subscription Sync**:
   - `subscription.lastSyncedAt` must be updated on every Autumn API call
   - If `lastSyncedAt` is >1 hour old: Re-sync with Autumn before feature gate check
   - Cache feature check results per-request to avoid redundant API calls

### Cascade Behavior

**User Deletion**:
- Delete user → CASCADE delete all user's visits (existing behavior)
- Delete user → Cancel Autumn subscription via API
- Privacy settings deleted with user document

**Subscription Cancellation**:
- Cancel subscription → Preserve `subscription` object with `status: "cancelled"`
- Cancel subscription → Preserve all `privacySettings` (per FR-032)
- Cancel subscription → Set `periodEndDate` to billing period end
- Periodic job: Check expired `periodEndDate` and downgrade to `tier: "free"`

---

## Performance Considerations

### Query Optimization

**Problem**: Privacy filtering on large city visitor lists
**Solution**: Apply privacy filters in Convex query, not in client

```typescript
// BAD: Fetch all, filter in client
const allVisits = await ctx.db.query("visits").collect();
const visibleVisits = allVisits.filter(v => !isPrivate(v));  // ❌ O(n) in client

// GOOD: Filter in query
const visibleVisits = await ctx.db.query("visits")
  .withIndex("by_city_id", q => q.eq("cityId", cityId))
  .filter(q => {
    // Apply privacy logic server-side
    return q.and(
      q.neq(q.field("isPrivateVisit"), true),
      // ... other privacy checks
    );
  })
  .collect();  // ✅ Filtered in database
```

**Estimated Impact**:
- 1000 visits to a city: ~10ms query time with index
- Privacy filtering adds ~2-3ms per visit check
- Total: ~30ms for 1000 visits (well under 100ms p95 target)

### Caching Strategy

**Feature Gate Checks**:
- Cache Autumn `check()` results per-request (in-memory)
- TTL: Request lifetime only (no cross-request caching to ensure real-time accuracy)
- Invalidation: Not needed - cache cleared on request end

**Subscription Status**:
- Cache in user document (`subscription` field)
- TTL: 1 hour (via `lastSyncedAt` timestamp)
- Invalidation: Re-sync with Autumn if stale

---

## Migration Plan

### Phase 1: Schema Deployment

1. **Update schema** (`convex/schema.ts`):
   - Add `privacySettings` to users table
   - Add `subscription` to users table
   - Add `isPrivateVisit` to visits table
   - Add new index `by_subscription_tier`

2. **Deploy schema changes**:
   ```bash
   npx convex dev  # Generates types and pushes schema
   ```

3. **Verify migration**:
   - Check Convex dashboard for new fields
   - Confirm existing data unchanged

### Phase 2: Data Backfill

**User Privacy Settings Backfill**:
```typescript
// Migration script: convex/migrations/001_add_privacy_settings.ts
export const backfillPrivacySettings = internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      if (!user.privacySettings) {
        await ctx.db.patch(user._id, {
          privacySettings: {
            hideProfileVisits: user.settings?.hideVisitHistory || false,
            hideProfileEvents: false,  // New feature, default false
            globalVisitPrivacy: false, // Pro feature, default false
          },
          subscription: {
            tier: "free",  // All existing users start on free tier
          },
        });
      }
    }
  },
});
```

**No Visit Privacy Backfill Needed**:
- Visits table already has `isPrivate` field
- No new fields added to visits
- Existing `isPrivate` values preserved

### Phase 3: Rollout

1. Deploy schema changes (non-breaking)
2. Run backfill migrations
3. Deploy new Convex functions with privacy filtering
4. Deploy frontend with subscription UI
5. Enable Autumn integration

**Rollback Plan**: If issues occur, privacy features can be disabled via feature flag without data loss

---

**Phase 1 Data Model Complete** ✅
