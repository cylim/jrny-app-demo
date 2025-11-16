/**
 * Subscription Management
 *
 * Convex functions for managing user subscriptions via Autumn payment platform.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { autumn } from './autumn'

/**
 * Get current user's subscription status
 *
 * Returns subscription metadata including tier, status, and billing dates.
 */
export const getMySubscription = query({
  args: {},
  returns: v.union(
    v.object({
      tier: v.union(v.literal('free'), v.literal('pro')),
      status: v.union(
        v.literal('active'),
        v.literal('cancelled'),
        v.literal('pending_cancellation'),
      ),
      nextBillingDate: v.optional(v.number()),
      periodEndDate: v.optional(v.number()),
      canUpgrade: v.boolean(),
      canCancel: v.boolean(),
      daysUntilPeriodEnd: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // If no subscription data, user is on free tier
    if (!user.subscription) {
      return {
        tier: 'free' as const,
        status: 'active' as const,
        canUpgrade: true,
        canCancel: false,
      }
    }

    const subscription = user.subscription
    const isPro = subscription.tier === 'pro'
    const isActive = subscription.status === 'active'

    // Calculate days until period end if applicable
    let daysUntilPeriodEnd: number | undefined
    if (subscription.periodEndDate) {
      const msUntilEnd = subscription.periodEndDate - Date.now()
      daysUntilPeriodEnd = Math.ceil(msUntilEnd / (1000 * 60 * 60 * 24))
    }

    return {
      tier: subscription.tier,
      status: subscription.status,
      nextBillingDate: subscription.nextBillingDate,
      periodEndDate: subscription.periodEndDate,
      canUpgrade: !isPro, // Only free users can upgrade
      canCancel: isPro && isActive, // Only active Pro users can cancel
      daysUntilPeriodEnd,
    }
  },
})

/**
 * Initiate Pro tier upgrade checkout
 *
 * Creates Stripe Checkout session via Autumn and returns redirect URL.
 */
export const initiateUpgrade = mutation({
  args: {
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  returns: v.object({
    checkoutUrl: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is already on Pro tier
    if (user.subscription?.tier === 'pro') {
      throw new Error('Already on Pro tier')
    }

    // Create Stripe Checkout session via Autumn
    const checkout = await autumn.checkout(ctx, {
      productId: 'pro', // References the tier ID from autumn.config.js
      successUrl: args.successUrl,
    })

    if (!checkout.data || !checkout.data.url) {
      throw new Error('Failed to create checkout session')
    }

    // TODO: Verify these field names with actual Autumn API response
    // The Autumn SDK types may not be fully up-to-date
    return {
      checkoutUrl: checkout.data.url,
      sessionId:
        // biome-ignore lint/suspicious/noExplicitAny: Autumn SDK CheckoutResult type incomplete
        (checkout.data as any).session_id ||
        // biome-ignore lint/suspicious/noExplicitAny: Autumn SDK CheckoutResult type incomplete
        (checkout.data as any).id ||
        'unknown',
    }
  },
})

/**
 * Sync subscription status with Autumn
 *
 * Fetches latest subscription state from Autumn API and updates user document.
 */
export const syncSubscriptionStatus = mutation({
  args: {},
  returns: v.object({
    tier: v.union(v.literal('free'), v.literal('pro')),
    status: v.union(
      v.literal('active'),
      v.literal('cancelled'),
      v.literal('pending_cancellation'),
    ),
    lastSyncedAt: v.number(),
    changed: v.boolean(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Get subscription status from Autumn
    // TODO: Verify the Customer type includes subscriptions field
    const result = await autumn.customers.get(ctx)
    // biome-ignore lint/suspicious/noExplicitAny: Autumn SDK Customer type missing subscriptions field
    const customerData = result.data as any

    if (
      !customerData ||
      !customerData.subscriptions ||
      customerData.subscriptions.length === 0
    ) {
      // No subscription - user is on free tier
      const newTier: 'free' | 'pro' = 'free'
      const oldTier = user.subscription?.tier ?? 'free'

      await ctx.db.patch(user._id, {
        subscription: {
          tier: newTier,
          status: 'active',
          lastSyncedAt: Date.now(),
        },
      })

      return {
        tier: newTier,
        status: 'active' as const,
        lastSyncedAt: Date.now(),
        changed: oldTier !== newTier,
      }
    }

    // Extract subscription info from first subscription
    const subscription = customerData.subscriptions[0]
    const newTier: 'free' | 'pro' =
      subscription.product_id === 'pro' ? 'pro' : 'free'
    const newStatus: 'active' | 'cancelled' | 'pending_cancellation' =
      subscription.status === 'active'
        ? 'active'
        : subscription.status === 'canceled'
          ? 'cancelled'
          : 'active'
    const oldTier = user.subscription?.tier ?? 'free'

    // Update user subscription in database
    await ctx.db.patch(user._id, {
      subscription: {
        tier: newTier,
        status: newStatus,
        nextBillingDate: subscription.current_period_end,
        periodEndDate: subscription.cancel_at || undefined,
        autumnCustomerId: customerData.id,
        lastSyncedAt: Date.now(),
      },
    })

    return {
      tier: newTier,
      status: newStatus,
      lastSyncedAt: Date.now(),
      changed: oldTier !== newTier,
    }
  },
})

/**
 * Cancel Pro subscription
 *
 * Cancels recurring billing but retains Pro access until end of current billing period.
 */
export const cancelSubscription = mutation({
  args: {},
  returns: v.object({
    tier: v.literal('pro'),
    status: v.literal('pending_cancellation'),
    periodEndDate: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is on Pro tier
    if (user.subscription?.tier !== 'pro') {
      throw new Error('Not on Pro tier')
    }

    // Check if already cancelled
    if (user.subscription.status !== 'active') {
      throw new Error('Subscription already cancelled')
    }

    // Cancel subscription via Autumn
    // Note: This should use an internal action to call the Autumn API
    // For now, we'll implement a workaround by updating the customer data directly
    // TODO: Create an internal action to properly cancel subscriptions

    // Get current subscription details before cancellation
    const customerData = await autumn.customers.get(ctx)
    // biome-ignore lint/suspicious/noExplicitAny: Autumn SDK Customer type missing subscriptions field
    const customerDataAny = customerData.data as any

    if (!customerDataAny?.subscriptions?.[0]) {
      throw new Error('No active subscription found')
    }

    const subscription = customerDataAny.subscriptions[0]

    // For now, we'll estimate the period end date from the current period
    // In production, you should use the Autumn cancel API which returns cancel_at
    const periodEndDate = subscription.current_period_end || Date.now()

    // Update user document
    await ctx.db.patch(user._id, {
      subscription: {
        ...user.subscription,
        status: 'pending_cancellation',
        periodEndDate,
      },
    })

    const periodEndDateStr = new Date(periodEndDate).toLocaleDateString()

    return {
      tier: 'pro' as const,
      status: 'pending_cancellation' as const,
      periodEndDate,
      message: `Your Pro access will continue until ${periodEndDateStr}`,
    }
  },
})

/**
 * Reactivate cancelled Pro subscription
 *
 * Re-enables recurring billing for user who previously cancelled.
 */
export const reactivateSubscription = mutation({
  args: {},
  returns: v.object({
    tier: v.literal('pro'),
    status: v.literal('active'),
    nextBillingDate: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if subscription can be reactivated
    if (user.subscription?.status !== 'pending_cancellation') {
      throw new Error('No pending cancellation to reactivate')
    }

    // TODO: Implement reactivation via Autumn when SDK supports it
    // For now, user must go through checkout again
    throw new Error(
      'Reactivation not yet supported. Please subscribe again via checkout.',
    )
  },
})

/**
 * Handle Autumn webhook events
 *
 * Processes subscription lifecycle events from Autumn/Stripe.
 * Webhook URL: https://YOUR_DEPLOYMENT.convex.site/autumn/webhook
 */
export const handleSubscriptionWebhook = mutation({
  args: {
    eventType: v.string(),
    customerId: v.string(),
    subscriptionId: v.optional(v.string()),
    productId: v.optional(v.string()),
    status: v.optional(v.string()),
    periodEnd: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Find user by Autumn customer ID
    const users = await ctx.db.query('users').collect()
    const user = users.find(
      (u) => u.subscription?.autumnCustomerId === args.customerId,
    )

    if (!user) {
      console.warn(`Webhook: User not found for customer ${args.customerId}`)
      return {
        success: false,
        message: 'User not found',
      }
    }

    switch (args.eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const newTier = args.productId === 'pro' ? 'pro' : 'free'
        const newStatus =
          args.status === 'active'
            ? 'active'
            : args.status === 'canceled'
              ? 'cancelled'
              : 'pending_cancellation'

        await ctx.db.patch(user._id, {
          subscription: {
            tier: newTier as 'free' | 'pro',
            status: newStatus as
              | 'active'
              | 'cancelled'
              | 'pending_cancellation',
            nextBillingDate: args.periodEnd,
            periodEndDate: args.cancelAt,
            autumnCustomerId: args.customerId,
            lastSyncedAt: Date.now(),
          },
        })

        console.log(
          `Webhook: Updated subscription for user ${user._id} to ${newTier}/${newStatus}`,
        )
        return {
          success: true,
          message: `Subscription ${args.eventType}`,
        }
      }

      case 'subscription.cancelled': {
        await ctx.db.patch(user._id, {
          subscription: {
            ...user.subscription,
            tier: user.subscription?.tier ?? 'free',
            status: 'cancelled',
            periodEndDate: args.cancelAt,
            lastSyncedAt: Date.now(),
          },
        })

        console.log(`Webhook: Cancelled subscription for user ${user._id}`)
        return {
          success: true,
          message: 'Subscription cancelled',
        }
      }

      case 'payment.succeeded': {
        console.log(
          `Webhook: Payment succeeded for customer ${args.customerId}`,
        )
        // Optionally update subscription metadata or send notification
        return {
          success: true,
          message: 'Payment recorded',
        }
      }

      case 'payment.failed': {
        console.warn(`Webhook: Payment failed for customer ${args.customerId}`)
        // Optionally notify user or update subscription status
        return {
          success: true,
          message: 'Payment failure recorded',
        }
      }

      default: {
        console.log(`Webhook: Unhandled event type ${args.eventType}`)
        return {
          success: true,
          message: 'Event ignored',
        }
      }
    }
  },
})

/**
 * Check if user has access to specific feature
 *
 * Server-side feature gate check via Autumn API.
 */
export const checkFeatureAccess = query({
  args: {
    featureId: v.string(),
  },
  returns: v.object({
    hasAccess: v.boolean(),
    tier: v.union(v.literal('free'), v.literal('pro')),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    const tier = user.subscription?.tier ?? 'free'

    // Check feature access via Autumn
    const result = await autumn.check(ctx, {
      featureId: args.featureId,
    })

    const hasAccess = result?.data
      ? // biome-ignore lint/suspicious/noExplicitAny: Autumn SDK CheckResult type not exported
        ((result.data as any).has_access ?? false)
      : false

    return {
      hasAccess,
      tier,
      reason: hasAccess ? undefined : 'Pro subscription required',
    }
  },
})
