/**
 * API Contract: Subscription Management
 *
 * Convex functions for managing user subscriptions via Autumn payment platform.
 * All functions enforce authentication and validate user tier access.
 */

import { v } from "convex/values";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Subscription tier levels
 */
export type SubscriptionTier = "free" | "pro";

/**
 * Subscription status states
 */
export type SubscriptionStatus = "active" | "cancelled" | "pending_cancellation";

/**
 * Subscription metadata stored in user document
 */
export type SubscriptionMetadata = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  nextBillingDate?: number;  // Unix timestamp in milliseconds
  periodEndDate?: number;    // For cancelled subscriptions
  autumnCustomerId?: string;
  lastSyncedAt: number;      // Unix timestamp in milliseconds
};

// ============================================================================
// Convex Function Signatures
// ============================================================================

/**
 * Get current user's subscription status
 *
 * @returns Subscription metadata including tier, status, and billing dates
 * @throws Error if user not authenticated
 */
export const getMySubscription = {
  args: {},
  returns: v.union(
    v.object({
      tier: v.union(v.literal("free"), v.literal("pro")),
      status: v.union(
        v.literal("active"),
        v.literal("cancelled"),
        v.literal("pending_cancellation")
      ),
      nextBillingDate: v.optional(v.number()),
      periodEndDate: v.optional(v.number()),
      canUpgrade: v.boolean(),         // True if free tier
      canCancel: v.boolean(),          // True if active Pro
      daysUntilPeriodEnd: v.optional(v.number()),
    }),
    v.null()  // Null if no subscription data (new user)
  ),
};

/**
 * Initiate Pro tier upgrade checkout
 *
 * Creates Stripe Checkout session via Autumn and returns redirect URL.
 * User must be on free tier to upgrade.
 *
 * @returns Stripe Checkout URL to redirect user
 * @throws Error if user already has Pro tier
 * @throws Error if user not authenticated
 */
export const initiateUpgrade = {
  args: {
    successUrl: v.string(),  // URL to redirect after successful payment
    cancelUrl: v.string(),   // URL to redirect if user cancels
  },
  returns: v.object({
    checkoutUrl: v.string(),
    sessionId: v.string(),
  }),
};

/**
 * Cancel Pro subscription
 *
 * Cancels recurring billing but retains Pro access until end of current
 * billing period (per clarification: mid-month cancellation retains access).
 *
 * @returns Updated subscription status with period end date
 * @throws Error if user not on Pro tier
 * @throws Error if subscription already cancelled
 * @throws Error if user not authenticated
 */
export const cancelSubscription = {
  args: {},
  returns: v.object({
    tier: v.literal("pro"),
    status: v.literal("pending_cancellation"),
    periodEndDate: v.number(),  // When Pro access will end
    message: v.string(),        // Confirmation message for user
  }),
};

/**
 * Reactivate cancelled Pro subscription
 *
 * Re-enables recurring billing for user who previously cancelled.
 * Only works if subscription period hasn't ended yet.
 *
 * @returns Updated subscription status
 * @throws Error if subscription period already ended (must use initiateUpgrade)
 * @throws Error if user not authenticated
 */
export const reactivateSubscription = {
  args: {},
  returns: v.object({
    tier: v.literal("pro"),
    status: v.literal("active"),
    nextBillingDate: v.number(),
    message: v.string(),
  }),
};

/**
 * Sync subscription status with Autumn
 *
 * Fetches latest subscription state from Autumn API and updates user document.
 * Called periodically or when subscription data is stale (>1 hour old).
 *
 * @returns Updated subscription metadata
 * @throws Error if Autumn API call fails
 * @throws Error if user not authenticated
 */
export const syncSubscriptionStatus = {
  args: {},
  returns: v.object({
    tier: v.union(v.literal("free"), v.literal("pro")),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("pending_cancellation")
    ),
    lastSyncedAt: v.number(),
    changed: v.boolean(),  // True if tier or status changed during sync
  }),
};

/**
 * Check if user has access to specific feature
 *
 * Server-side feature gate check via Autumn API.
 * Caches result per-request to avoid redundant API calls.
 *
 * @param featureId - Feature identifier from Autumn dashboard
 * @returns True if user has access, false otherwise
 * @throws Error if user not authenticated
 */
export const checkFeatureAccess = {
  args: {
    featureId: v.string(),  // e.g., "global_visit_privacy", "individual_visit_privacy"
  },
  returns: v.object({
    hasAccess: v.boolean(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    reason: v.optional(v.string()),  // Why access was denied (for free users)
  }),
};

/**
 * Handle Autumn webhook events
 *
 * INTERNAL FUNCTION - Called by Autumn webhooks to notify subscription changes.
 * Updates user subscription status based on payment events.
 *
 * @param event - Webhook event type
 * @param customerId - Autumn customer ID
 * @param subscriptionData - Subscription state from webhook payload
 * @returns Success status
 */
export const handleSubscriptionWebhook = {
  args: {
    event: v.union(
      v.literal("subscription.created"),
      v.literal("subscription.updated"),
      v.literal("subscription.cancelled"),
      v.literal("payment.succeeded"),
      v.literal("payment.failed")
    ),
    customerId: v.string(),
    subscriptionData: v.object({
      tier: v.union(v.literal("free"), v.literal("pro")),
      status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("pending_cancellation")),
      nextBillingDate: v.optional(v.number()),
      periodEndDate: v.optional(v.number()),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.id("users")),
  }),
};

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: User clicks "Upgrade to Pro" button
 *
 * Frontend:
 *   const checkout = await initiateUpgrade({
 *     successUrl: "https://jrny.app/subscription/success",
 *     cancelUrl: "https://jrny.app/settings"
 *   });
 *   window.location.href = checkout.checkoutUrl;
 *
 * Backend (Convex function):
 *   - Verify user is on free tier
 *   - Call autumn.attach() to create Stripe Checkout session
 *   - Return checkout URL
 */

/**
 * Example: User cancels subscription mid-month
 *
 * Frontend:
 *   const result = await cancelSubscription();
 *   // result.periodEndDate = 1735689600000 (Unix timestamp)
 *   // Display: "Your Pro access will continue until Dec 31, 2024"
 *
 * Backend (Convex function):
 *   - Call autumn.cancelSubscription()
 *   - Update user document:
 *     - status: "pending_cancellation"
 *     - periodEndDate: Set to billing period end
 *   - Return confirmation with date
 */

/**
 * Example: Check if user can enable global visit privacy
 *
 * Frontend (before showing toggle):
 *   const access = await checkFeatureAccess({ featureId: "global_visit_privacy" });
 *   if (!access.hasAccess) {
 *     showUpgradePrompt();  // User is on free tier
 *   }
 *
 * Backend (Convex mutation to update privacy setting):
 *   const access = await autumn.check(ctx, {
 *     userId: identity.subject,
 *     featureId: "global_visit_privacy"
 *   });
 *   if (!access) throw new Error("Pro subscription required");
 *   // Proceed with privacy setting update...
 */

/**
 * Example: Subscription status display component
 *
 * Frontend:
 *   const subscription = await getMySubscription();
 *   if (subscription.tier === "pro" && subscription.status === "pending_cancellation") {
 *     return (
 *       <div>
 *         <Badge>Pro (Cancels {formatDate(subscription.periodEndDate)})</Badge>
 *         <Button onClick={() => reactivateSubscription()}>Keep Pro</Button>
 *       </div>
 *     );
 *   }
 */
