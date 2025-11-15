# Quickstart Guide: Autumn Payment Gates Implementation

**Feature**: 005-autumn-payment-gates
**Estimated Time**: 8-12 hours (experienced developer)
**Prerequisites**: Autumn account, Stripe test account

## Overview

This guide provides step-by-step instructions for implementing Autumn-based subscription management with privacy feature gates in the JRNY application.

## Phase 1: Autumn Setup (15 minutes)

### 1.1 Create Autumn Account

1. Go to https://app.useautumn.com/
2. Sign up for free account
3. Navigate to "Connect Stripe" page
4. Paste Stripe Test Secret Key (get from https://dashboard.stripe.com/test/apikeys)
5. Copy **Test Secret Key** (format: `am_sk_test_...`)

### 1.2 Create Configuration File

**File**: `autumn.config.js` (NEW - project root)

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

**Benefits**:
- ✅ No manual dashboard configuration required
- ✅ Version controlled pricing/features
- ✅ Single source of truth for tier definitions
- ✅ Easy to update pricing without dashboard access

---

## Phase 2: Convex Backend Setup (2-3 hours)

### 2.1 Install Dependencies

```bash
npm install @useautumn/convex autumn-js
```

### 2.2 Set Environment Variable

```bash
npx convex env set AUTUMN_SECRET_KEY=am_sk_test_YOUR_KEY_HERE
```

### 2.3 Update Convex Config

**File**: `convex/convex.config.ts`

```typescript
import { defineApp } from "convex/server";
import autumn from "@useautumn/convex/convex.config";

const app = defineApp();
app.use(autumn);  // ← Add this line
export default app;
```

### 2.4 Create Autumn Client

**File**: `convex/autumn.ts` (NEW)

```typescript
import { Autumn } from "@useautumn/convex";
import autumnConfig from "../autumn.config";

export const autumn = new Autumn({
  secretKey: process.env.AUTUMN_SECRET_KEY!,
  config: autumnConfig,  // Load tiers and features from config file
  identify: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return identity.subject;  // Better-Auth user ID
  },
});

// Export config for use in other Convex functions
export { autumnConfig };
```

**Note**: Autumn client now uses the `autumn.config.js` file for tier/feature definitions. No manual dashboard configuration needed!

### 2.5 Update Database Schema

**File**: `convex/schema.ts`

Add to `users` table:
```typescript
privacySettings: v.object({
  hideProfileVisits: v.boolean(),
  hideProfileEvents: v.boolean(),
  globalVisitPrivacy: v.boolean(),
}),
subscription: v.optional(v.object({
  tier: v.union(v.literal("free"), v.literal("pro")),
  status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("pending_cancellation")),
  nextBillingDate: v.optional(v.number()),
  periodEndDate: v.optional(v.number()),
  autumnCustomerId: v.optional(v.string()),
  lastSyncedAt: v.number(),
})),
```

**Note**: Visits table already has `isPrivate` field - no changes needed. This existing field is the Pro-only individual visit privacy feature.

Add index:
```typescript
.index("by_subscription_tier", ["subscription.tier"])
```

Deploy schema:
```bash
npx convex dev  # In separate terminal
```

### 2.6 Create Subscription Functions

**File**: `convex/subscriptions.ts` (NEW)

See `contracts/subscription.ts` for complete API signatures. Key functions:

- `getMySubscription()` - Get current user's subscription status
- `initiateUpgrade()` - Create Stripe Checkout session
- `cancelSubscription()` - Cancel Pro subscription
- `checkFeatureAccess()` - Verify feature access via Autumn

**Example Implementation**:
```typescript
export const getMySubscription = query({
  args: {},
  returns: /* see contract */,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", q => q.eq("authUserId", identity.subject))
      .unique();

    if (!user?.subscription) {
      return {
        tier: "free",
        canUpgrade: true,
        canCancel: false,
      };
    }

    return {
      ...user.subscription,
      canUpgrade: user.subscription.tier === "free",
      canCancel: user.subscription.tier === "pro" && user.subscription.status === "active",
    };
  },
});
```

### 2.7 Create Privacy Functions

**File**: `convex/privacy.ts` (NEW)

See `contracts/privacy.ts` for complete API signatures. Key functions:

- `getMyPrivacySettings()` - Get user's privacy config
- `updateProfilePrivacy()` - Toggle profile-level privacy (Free + Pro)
- `updateGlobalVisitPrivacy()` - Toggle global privacy (Pro only)
- `updateVisitPrivacy()` - Toggle individual visit privacy (Pro only)

**Example Feature Gate**:
```typescript
export const updateGlobalVisitPrivacy = mutation({
  args: { enabled: v.boolean() },
  returns: /* see contract */,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check Pro tier access
    const hasAccess = await autumn.check(ctx, {
      userId: identity.subject,
      featureId: "global_visit_privacy",
    });

    if (!hasAccess) {
      throw new Error("Pro subscription required for global visit privacy");
    }

    // Update user's privacy settings
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", q => q.eq("authUserId", identity.subject))
      .unique();

    await ctx.db.patch(user._id, {
      "privacySettings.globalVisitPrivacy": args.enabled,
    });

    return {
      settings: user.privacySettings,
      message: `Global visit privacy ${args.enabled ? "enabled" : "disabled"}`,
    };
  },
});
```

---

## Phase 3: Frontend Implementation (4-5 hours)

### 3.1 Install shadcn/ui Badge Component

```bash
bunx shadcn@latest add badge
```

### 3.2 Create Subscription Components

**File**: `src/components/subscription/upgrade-button.tsx` (NEW)

```tsx
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";

export function UpgradeButton() {
  const initiateUpgrade = useMutation(api.subscriptions.initiateUpgrade);

  const handleUpgrade = async () => {
    const result = await initiateUpgrade({
      successUrl: `${window.location.origin}/subscription/success`,
      cancelUrl: `${window.location.origin}/settings`,
    });
    window.location.href = result.checkoutUrl;
  };

  return (
    <Button onClick={handleUpgrade} size="lg">
      Upgrade to Pro - $0.99/month
    </Button>
  );
}
```

**File**: `src/components/subscription/subscription-status.tsx` (NEW)

```tsx
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Badge } from "@/components/ui/badge";

export function SubscriptionStatus() {
  const subscription = useQuery(api.subscriptions.getMySubscription);

  if (!subscription) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={subscription.tier === "pro" ? "default" : "secondary"}>
        {subscription.tier === "pro" ? "Pro" : "Free"}
      </Badge>
      {subscription.status === "pending_cancellation" && (
        <span className="text-sm text-muted-foreground">
          (Cancels {new Date(subscription.periodEndDate!).toLocaleDateString()})
        </span>
      )}
    </div>
  );
}
```

### 3.3 Create Privacy Components

**File**: `src/components/privacy/privacy-toggle.tsx` (NEW)

```tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type PrivacyToggleProps = {
  setting: "hideProfileVisits" | "hideProfileEvents" | "globalVisitPrivacy";
  label: string;
  description: string;
  value: boolean;
  canModify: boolean;
  onUpgradeRequired?: () => void;
};

export function PrivacyToggle({
  setting,
  label,
  description,
  value,
  canModify,
  onUpgradeRequired,
}: PrivacyToggleProps) {
  const [loading, setLoading] = useState(false);

  const updateProfile = useMutation(api.privacy.updateProfilePrivacy);
  const updateGlobal = useMutation(api.privacy.updateGlobalVisitPrivacy);

  const handleToggle = async (checked: boolean) => {
    if (!canModify) {
      onUpgradeRequired?.();
      return;
    }

    setLoading(true);
    try {
      if (setting === "globalVisitPrivacy") {
        await updateGlobal({ enabled: checked });
      } else {
        await updateProfile({ setting, enabled: checked });
      }
    } catch (err) {
      console.error("Failed to update privacy setting:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="space-y-0.5">
        <Label htmlFor={setting}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={setting}
        checked={value}
        onCheckedChange={handleToggle}
        disabled={!canModify || loading}
      />
    </div>
  );
}
```

### 3.4 Update Settings Page

**File**: `src/routes/settings.tsx` (MODIFY)

Add privacy and subscription sections:

```tsx
import { UpgradeButton } from "~/components/subscription/upgrade-button";
import { SubscriptionStatus } from "~/components/subscription/subscription-status";
import { PrivacyToggle } from "~/components/privacy/privacy-toggle";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

// In component:
const privacySettings = useQuery(api.privacy.getMyPrivacySettings);
const subscription = useQuery(api.subscriptions.getMySubscription);

return (
  <div>
    {/* Subscription Section */}
    <section>
      <h2>Subscription</h2>
      <SubscriptionStatus />
      {subscription?.canUpgrade && <UpgradeButton />}
    </section>

    {/* Privacy Settings Section */}
    <section>
      <h2>Privacy Settings</h2>
      <PrivacyToggle
        setting="hideProfileVisits"
        label="Hide Profile Visits"
        description="Other users won't see your visit history on your profile"
        value={privacySettings?.settings.hideProfileVisits ?? false}
        canModify={privacySettings?.canModify.hideProfileVisits ?? false}
      />
      <PrivacyToggle
        setting="hideProfileEvents"
        label="Hide Profile Events"
        description="Other users won't see your event participation"
        value={privacySettings?.settings.hideProfileEvents ?? false}
        canModify={privacySettings?.canModify.hideProfileEvents ?? false}
      />
      <PrivacyToggle
        setting="globalVisitPrivacy"
        label="Global Visit Privacy"
        description="Hide all your visits from city pages and discovery (Pro)"
        value={privacySettings?.settings.globalVisitPrivacy ?? false}
        canModify={privacySettings?.canModify.globalVisitPrivacy ?? false}
        onUpgradeRequired={() => {/* Show upgrade modal */}}
      />
    </section>
  </div>
);
```

### 3.5 Create Checkout Success Page

**File**: `src/routes/subscription/success.tsx` (NEW)

```tsx
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";

export function SubscriptionSuccess() {
  const syncSubscription = useMutation(api.subscriptions.syncSubscriptionStatus);
  const navigate = useNavigate();

  useEffect(() => {
    syncSubscription().then(() => {
      setTimeout(() => navigate({ to: "/settings" }), 2000);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1>Welcome to Pro!</h1>
      <p>Your subscription is now active. Redirecting to settings...</p>
    </div>
  );
}
```

---

## Phase 4: Privacy Filtering (2-3 hours)

### 4.1 Update Visit Queries

**File**: `convex/visits.ts` (MODIFY)

Update queries to respect privacy settings:

```typescript
// Filter visits by privacy rules
export const getCityVisits = query({
  args: { cityId: v.id("cities"), viewerId: v.optional(v.id("users")) },
  returns: /* see contract */,
  handler: async (ctx, args) => {
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_city_id", q => q.eq("cityId", args.cityId))
      .collect();

    // Filter out private visits
    const visibleVisits = [];
    for (const visit of visits) {
      const user = await ctx.db.get(visit.userId);
      if (!user) continue;

      // Always show to visit owner
      if (args.viewerId && visit.userId === args.viewerId) {
        visibleVisits.push(visit);
        continue;
      }

      // Apply privacy rules
      const isHidden =
        user.privacySettings?.globalVisitPrivacy ||
        visit.isPrivate;  // Pro-only individual visit privacy

      if (!isHidden) {
        visibleVisits.push(visit);
      }
    }

    return visibleVisits;
  },
});
```

### 4.2 Update Profile Pages

**File**: `src/routes/u/$username.tsx` (MODIFY)

Check privacy before showing visits/events:

```tsx
const profileVisits = useQuery(api.privacy.getUserProfileVisits, {
  username: params.username,
  viewerId: currentUser?._id,
});

if (profileVisits && "hidden" in profileVisits) {
  return <div>{profileVisits.message}</div>;
}
```

---

## Phase 5: Testing & Deployment (1-2 hours)

### 5.1 Test Subscription Flow

1. **Upgrade Flow**:
   - Click "Upgrade to Pro"
   - Complete Stripe Checkout with test card `4242 4242 4242 4242`
   - Verify redirect to success page
   - Confirm Pro badge appears in settings

2. **Feature Gates**:
   - As free user, try enabling global privacy → Should show upgrade prompt
   - Upgrade to Pro → Now can toggle global privacy
   - Verify setting persists across page refreshes

3. **Privacy Filtering**:
   - Enable global privacy as Pro user
   - View city page from different account → Your visits should be hidden
   - View own profile → Visits still visible

### 5.2 Deploy to Production

1. **Get Production Keys**:
   - Autumn: https://app.useautumn.com/ (production mode)
   - Stripe: https://dashboard.stripe.com/apikeys (live keys)

2. **Set Production Environment**:
   ```bash
   npx convex env set AUTUMN_SECRET_KEY=am_sk_live_YOUR_KEY --prod
   ```

3. **Update Autumn Dashboard**:
   - Change to production mode
   - Create same products/features
   - Connect live Stripe keys

4. **Deploy**:
   ```bash
   npm run deploy
   ```

---

## Troubleshooting

**Issue**: "Autumn API key invalid"
- **Fix**: Check that `AUTUMN_SECRET_KEY` starts with `am_sk_` and is set in Convex environment

**Issue**: Free users can access Pro features
- **Fix**: Ensure `autumn.check()` is called BEFORE feature logic, not after

**Issue**: Privacy settings not persisting
- **Fix**: Verify schema migration completed - check Convex dashboard for new fields

**Issue**: Stripe Checkout redirect fails
- **Fix**: Ensure `successUrl` and `cancelUrl` use full URLs (https://...), not relative paths

---

## Next Steps

- Run `/speckit.tasks` to generate implementation task breakdown
- Set up integration tests for subscription flow
- Configure Sentry to track payment failures
- Add analytics events for subscription upgrades

**Implementation Ready** ✅
