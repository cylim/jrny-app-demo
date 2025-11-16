/**
 * Subscription Management
 *
 * Convex functions for managing user subscriptions via Autumn payment platform.
 */

import { v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
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
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      return null
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
 * Internal mutation to update user subscription data
 */
export const updateSubscriptionData = internalMutation({
  args: {
    userId: v.id('users'),
    tier: v.union(v.literal('free'), v.literal('pro')),
    status: v.union(
      v.literal('active'),
      v.literal('cancelled'),
      v.literal('pending_cancellation'),
    ),
    nextBillingDate: v.optional(v.number()),
    periodEndDate: v.optional(v.number()),
    autumnCustomerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      subscription: {
        tier: args.tier,
        status: args.status,
        nextBillingDate: args.nextBillingDate,
        periodEndDate: args.periodEndDate,
        autumnCustomerId: args.autumnCustomerId,
        lastSyncedAt: Date.now(),
      },
    })
  },
})

/**
 * Sync subscription status with Autumn
 *
 * Fetches latest subscription state from Autumn API and updates user document.
 */
export const syncSubscriptionStatus = action({
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

    // Get user from database via query
    const user = await ctx.runQuery((internal as any).subscriptions.getUserForSync, {
      authUserId: identity.subject,
    })

    if (!user) {
      throw new Error('User not found')
    }

    const oldTier = user.subscription?.tier ?? 'free'

    // Get customer data from Autumn API
    console.log('[syncSubscriptionStatus] Fetching customer data for user:', identity.subject)
    const customerResult = await autumn.customers.get(ctx)

    if (customerResult.error) {
      console.error('[syncSubscriptionStatus] Failed to get customer:', customerResult.error)
      throw new Error(`Failed to sync subscription: ${customerResult.error.message || 'Unknown error'}`)
    }

    const customer = customerResult.data
    if (!customer) {
      console.error('[syncSubscriptionStatus] No customer data returned')
      throw new Error('Failed to sync subscription: No customer data')
    }

    console.log('[syncSubscriptionStatus] Customer products:', customer.products)

    // Find the 'pro' product in the customer's products
    const proProduct = customer.products?.find((product) => product.id === 'pro')
    const hasPro = proProduct && proProduct.status === 'active'

    const tier: 'free' | 'pro' = hasPro ? 'pro' : 'free'

    // Determine status based on product state
    let status: 'active' | 'cancelled' | 'pending_cancellation' = 'active'
    let nextBillingDate: number | undefined
    let periodEndDate: number | undefined

    if (proProduct) {
      // If canceled_at is set but status is still active, subscription will end at period_end
      if (proProduct.canceled_at && proProduct.status === 'active') {
        status = 'pending_cancellation'
      } else if (proProduct.status === 'expired') {
        // Expired means the subscription has ended
        status = 'cancelled'
      }

      // Handle null values from Autumn API
      nextBillingDate = proProduct.current_period_end ?? undefined
      periodEndDate = proProduct.current_period_end ?? undefined
    }

    console.log(`[syncSubscriptionStatus] Setting tier to ${tier}, status to ${status}`)

    // Update database via internal mutation
    await ctx.runMutation(internal.subscriptions.updateSubscriptionData, {
      userId: user._id,
      tier,
      status,
      nextBillingDate,
      periodEndDate,
      autumnCustomerId: identity.subject,
    })

    return {
      tier,
      status,
      lastSyncedAt: Date.now(),
      changed: oldTier !== tier,
    }
  },
})

/**
 * Internal query to get user for sync
 */
export const getUserForSync = internalQuery({
  args: {
    authUserId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      subscription: v.optional(
        v.object({
          tier: v.union(v.literal('free'), v.literal('pro')),
          status: v.union(
            v.literal('active'),
            v.literal('cancelled'),
            v.literal('pending_cancellation'),
          ),
          nextBillingDate: v.optional(v.number()),
          periodEndDate: v.optional(v.number()),
          autumnCustomerId: v.optional(v.string()),
          lastSyncedAt: v.optional(v.number()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', args.authUserId))
      .unique()

    if (!user) {
      return null
    }

    return {
      _id: user._id,
      subscription: user.subscription,
    }
  },
})

/**
 * Cancel Pro subscription
 *
 * Note: This function only updates the local database state.
 * Actual subscription cancellation must be handled via:
 * 1. Client-side: Import `cancel` from `convex/autumn` and call via useAction
 * 2. Webhooks: Autumn/Stripe webhooks will sync the final cancellation status
 *
 * For now, this is a placeholder that marks the subscription as pending cancellation.
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

    // Calculate period end date - 30 days from now (assuming monthly subscription)
    // In production, this should come from Stripe's subscription.current_period_end via webhook
    const periodEndDate = Date.now() + 30 * 24 * 60 * 60 * 1000

    // Update user document with pending_cancellation status
    // TODO: Call Autumn cancel API from client-side or via webhook
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
 * Uses Autumn's real-time feature access verification.
 */
export const checkFeatureAccess = action({
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

    // Get user to determine tier
    const user = await ctx.runQuery((internal as any).subscriptions.getUserForSync, {
      authUserId: identity.subject,
    })

    if (!user) {
      throw new Error('User not found')
    }

    const tier = user.subscription?.tier ?? 'free'

    // Check feature access via Autumn API
    const featureCheck = await autumn.check(ctx, { featureId: args.featureId })
    const hasAccess = featureCheck.data?.allowed || false

    return {
      hasAccess,
      tier,
      reason: hasAccess ? undefined : 'Pro subscription required',
    }
  },
})
