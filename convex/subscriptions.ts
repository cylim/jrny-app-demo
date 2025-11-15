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
 * TODO: Fix Autumn API integration
 */
/* TEMPORARILY DISABLED - AUTUMN API INTEGRATION NEEDS FIX
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
			cancelUrl: args.cancelUrl,
		})

		if (!checkout.data) {
			throw new Error('Failed to create checkout session')
		}

		return {
			checkoutUrl: checkout.data.url,
			sessionId: checkout.data.session_id,
		}
	},
})
*/

/**
 * Sync subscription status with Autumn
 *
 * Fetches latest subscription state from Autumn API and updates user document.
 * TODO: Fix Autumn API integration
 */
/* TEMPORARILY DISABLED - AUTUMN API INTEGRATION NEEDS FIX
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

		// Get customer from Autumn (includes subscription status)
		const customer = await autumn.customers.get(ctx)

		if (!customer.data) {
			// No customer record yet - user is on free tier
			const newTier = 'free'
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

		// Extract subscription info from customer data
		const subscription = customer.data.subscriptions?.[0]
		const newTier = subscription?.product_id === 'pro' ? 'pro' : 'free'
		const newStatus = subscription?.status === 'active' ? 'active' : subscription?.status === 'canceled' ? 'cancelled' : 'active'
		const oldTier = user.subscription?.tier ?? 'free'

		// Update user subscription in database
		await ctx.db.patch(user._id, {
			subscription: {
				tier: newTier as 'free' | 'pro',
				status: newStatus as 'active' | 'cancelled' | 'pending_cancellation',
				nextBillingDate: subscription?.current_period_end,
				periodEndDate: subscription?.cancel_at,
				autumnCustomerId: customer.data.id,
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
*/

/**
 * Cancel Pro subscription
 *
 * Cancels recurring billing but retains Pro access until end of current billing period.
 * TODO: Fix Autumn API integration
 */
/* TEMPORARILY DISABLED - AUTUMN API INTEGRATION NEEDS FIX
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

		// Cancel subscription via Autumn using api().cancel() action
		const result = await ctx.runAction(autumn.api().cancel, {})

		if (!result.data) {
			throw new Error('Failed to cancel subscription')
		}

		const periodEndDate = result.data.cancel_at || Date.now()

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
*/

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
