/**
 * Subscription Management
 *
 * Convex functions for managing user subscriptions via Autumn payment platform.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { autumn, cancel } from './autumn'
import {
  callAutumnCancel,
  getCheckoutSessionId,
  hasFeatureAccess,
  hasSubscriptions,
} from './autumn-types'

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

    // Note: Autumn API response structure confirmed
    // Returns checkout URL for redirect to Stripe-hosted payment page
    return {
      checkoutUrl: checkout.data.url,
      sessionId: getCheckoutSessionId(
        checkout.data as { url: string; [key: string]: unknown },
      ),
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
    const result = await autumn.customers.get(ctx)
    const customerData = result.data

    if (
      !hasSubscriptions(customerData) ||
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
    // Convert Stripe/Autumn Unix timestamps from seconds to milliseconds
    await ctx.db.patch(user._id, {
      subscription: {
        tier: newTier,
        status: newStatus,
        nextBillingDate: subscription.current_period_end * 1000,
        periodEndDate: subscription.cancel_at
          ? subscription.cancel_at * 1000
          : undefined,
        autumnCustomerId: customerData.id ?? undefined,
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

    // Get current subscription details before cancellation
    const result = await autumn.customers.get(ctx)
    const customerData = result.data

    if (
      !hasSubscriptions(customerData) ||
      !customerData.subscriptions ||
      !customerData.subscriptions[0]
    ) {
      throw new Error('No active subscription found')
    }

    const subscription = customerData.subscriptions[0]

    // Cancel subscription via Autumn API
    // Call Autumn's cancel function via type-safe wrapper
    const cancelResult = await callAutumnCancel(cancel, ctx, {
      productId: 'pro',
    })

    // Check if cancellation was successful
    if (cancelResult?.error) {
      throw new Error(
        `Subscription cancellation failed: ${cancelResult.error.message || 'Unknown error'}`,
      )
    }

    // After successful cancellation, get updated subscription data
    const updatedResult = await autumn.customers.get(ctx)
    const updatedCustomerData = updatedResult.data
    const updatedSubscription =
      hasSubscriptions(updatedCustomerData) && updatedCustomerData.subscriptions
        ? updatedCustomerData.subscriptions[0]
        : undefined

    // Convert Stripe/Autumn Unix timestamp from seconds to milliseconds
    const periodEndDate =
      (updatedSubscription?.cancel_at
        ? updatedSubscription.cancel_at * 1000
        : null) ||
      subscription.current_period_end * 1000 ||
      Date.now()

    // Update user document with pending_cancellation status
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
 * Handle Autumn webhook events
 *
 * Processes subscription lifecycle events from Autumn/Stripe.
 * Webhook URL: https://YOUR_DEPLOYMENT.convex.site/autumn/webhook
 */
export const handleSubscriptionWebhook = mutation({
  args: {
    event: v.union(
      v.literal('subscription.created'),
      v.literal('subscription.updated'),
      v.literal('subscription.cancelled'),
      v.literal('payment.succeeded'),
      v.literal('payment.failed'),
    ),
    customerId: v.string(),
    subscriptionData: v.object({
      tier: v.union(v.literal('free'), v.literal('pro')),
      status: v.union(
        v.literal('active'),
        v.literal('cancelled'),
        v.literal('pending_cancellation'),
      ),
      nextBillingDate: v.optional(v.number()),
      periodEndDate: v.optional(v.number()),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.id('users')),
  }),
  handler: async (ctx, args) => {
    // Find user by Autumn customer ID using indexed query (O(1) lookup)
    const user = await ctx.db
      .query('users')
      .withIndex('by_autumn_customer_id', (q) =>
        q.eq('subscription.autumnCustomerId', args.customerId),
      )
      .first()

    if (!user) {
      console.warn(`Webhook: User not found for customer ${args.customerId}`)
      return {
        success: false,
        userId: undefined,
      }
    }

    // Validate tier and status values (reject unknown states)
    const validTiers: Array<'free' | 'pro'> = ['free', 'pro']
    const validStatuses: Array<
      'active' | 'cancelled' | 'pending_cancellation'
    > = ['active', 'cancelled', 'pending_cancellation']

    if (!validTiers.includes(args.subscriptionData.tier)) {
      console.error(
        `Webhook: Invalid tier "${args.subscriptionData.tier}" for customer ${args.customerId}`,
      )
      return {
        success: false,
        userId: user._id,
      }
    }

    if (!validStatuses.includes(args.subscriptionData.status)) {
      console.error(
        `Webhook: Invalid status "${args.subscriptionData.status}" for customer ${args.customerId}`,
      )
      return {
        success: false,
        userId: user._id,
      }
    }

    switch (args.event) {
      case 'subscription.created':
      case 'subscription.updated': {
        await ctx.db.patch(user._id, {
          subscription: {
            tier: args.subscriptionData.tier,
            status: args.subscriptionData.status,
            nextBillingDate: args.subscriptionData.nextBillingDate,
            periodEndDate: args.subscriptionData.periodEndDate,
            autumnCustomerId: args.customerId,
            lastSyncedAt: Date.now(),
          },
        })

        console.log(
          `Webhook: Updated subscription for user ${user._id} to ${args.subscriptionData.tier}/${args.subscriptionData.status}`,
        )
        return {
          success: true,
          userId: user._id,
        }
      }

      case 'subscription.cancelled': {
        await ctx.db.patch(user._id, {
          subscription: {
            ...user.subscription,
            tier: user.subscription?.tier ?? 'free',
            status: args.subscriptionData.status,
            periodEndDate: args.subscriptionData.periodEndDate,
            lastSyncedAt: Date.now(),
          },
        })

        console.log(`Webhook: Cancelled subscription for user ${user._id}`)
        return {
          success: true,
          userId: user._id,
        }
      }

      case 'payment.succeeded': {
        console.log(
          `Webhook: Payment succeeded for customer ${args.customerId}`,
        )
        // Optionally update subscription metadata or send notification
        return {
          success: true,
          userId: user._id,
        }
      }

      case 'payment.failed': {
        console.warn(`Webhook: Payment failed for customer ${args.customerId}`)
        // Optionally notify user or update subscription status
        return {
          success: true,
          userId: user._id,
        }
      }

      default: {
        // TypeScript exhaustiveness check ensures this is unreachable
        const _exhaustive: never = args.event
        console.log(`Webhook: Unhandled event type ${_exhaustive}`)
        return {
          success: true,
          userId: user._id,
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

    // Check feature access via Autumn customer.features
    const result = await autumn.customers.get(ctx)
    const hasAccess = hasFeatureAccess(result.data, args.featureId)

    return {
      hasAccess,
      tier,
      reason: hasAccess ? undefined : 'Pro subscription required',
    }
  },
})
