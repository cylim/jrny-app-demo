/**
 * Privacy Settings Management
 *
 * Convex functions for managing user privacy settings and enforcing
 * feature gates based on subscription tier.
 */

import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { autumn } from './autumn'
import { hasFeatureAccess } from './autumn-types'

/**
 * Get current user's privacy settings
 *
 * Returns privacy configuration with tier-specific access flags.
 */
export const getMyPrivacySettings = query({
  args: {},
  returns: v.object({
    settings: v.object({
      hideProfileVisits: v.optional(v.boolean()),
      hideProfileEvents: v.optional(v.boolean()),
      globalVisitPrivacy: v.optional(v.boolean()),
    }),
    tier: v.union(v.literal('free'), v.literal('pro')),
    canModify: v.object({
      hideProfileVisits: v.boolean(), // Always true
      hideProfileEvents: v.boolean(), // Always true
      globalVisitPrivacy: v.boolean(), // True only for Pro
    }),
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

    // Get privacy settings from settings object
    const settings = user.settings ?? {
      hideProfileVisits: false,
      hideProfileEvents: false,
      globalVisitPrivacy: false,
    }

    const tier = user.subscription?.tier ?? 'free'
    const isPro = tier === 'pro'

    return {
      settings: {
        hideProfileVisits: settings.hideProfileVisits,
        hideProfileEvents: settings.hideProfileEvents,
        globalVisitPrivacy: settings.globalVisitPrivacy,
      },
      tier,
      canModify: {
        hideProfileVisits: true, // Free + Pro
        hideProfileEvents: true, // Free + Pro
        globalVisitPrivacy: isPro, // Pro only
      },
    }
  },
})

/**
 * Update profile-level privacy setting (Free + Pro)
 *
 * Toggle hideProfileVisits or hideProfileEvents.
 * Available to all users regardless of tier.
 */
export const updateProfilePrivacy = mutation({
  args: {
    setting: v.union(
      v.literal('hideProfileVisits'),
      v.literal('hideProfileEvents'),
    ),
    enabled: v.boolean(),
  },
  returns: v.object({
    settings: v.object({
      hideProfileVisits: v.optional(v.boolean()),
      hideProfileEvents: v.optional(v.boolean()),
      globalVisitPrivacy: v.optional(v.boolean()),
    }),
    message: v.string(),
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

    // Get current settings
    const currentSettings = user.settings ?? {
      hideProfileVisits: false,
      hideProfileEvents: false,
      globalVisitPrivacy: false,
    }

    // Update the specified setting in the settings object
    const updatedSettings = {
      ...currentSettings,
      [args.setting]: args.enabled,
    }

    await ctx.db.patch(user._id, {
      settings: updatedSettings,
    })

    const settingNames = {
      hideProfileVisits: 'profile visits',
      hideProfileEvents: 'profile events',
    }

    return {
      settings: {
        hideProfileVisits: updatedSettings.hideProfileVisits,
        hideProfileEvents: updatedSettings.hideProfileEvents,
        globalVisitPrivacy: updatedSettings.globalVisitPrivacy,
      },
      message: `${settingNames[args.setting]} ${args.enabled ? 'hidden' : 'visible'}`,
    }
  },
})

/**
 * Update global visit privacy setting (Pro only)
 *
 * Toggle globalVisitPrivacy to hide ALL visits from discovery features.
 * Requires Pro subscription - throws error for free users.
 */
export const updateGlobalVisitPrivacy = mutation({
  args: {
    enabled: v.boolean(),
  },
  returns: v.object({
    settings: v.object({
      hideProfileVisits: v.optional(v.boolean()),
      hideProfileEvents: v.optional(v.boolean()),
      globalVisitPrivacy: v.optional(v.boolean()),
    }),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Check Pro tier access via Autumn customer.features
    const result = await autumn.customers.get(ctx)
    const hasAccess = hasFeatureAccess(result.data, 'global_visit_privacy')

    if (!hasAccess) {
      throw new Error('Pro subscription required for global visit privacy')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Get current settings
    const currentSettings = user.settings ?? {
      hideProfileVisits: false,
      hideProfileEvents: false,
      globalVisitPrivacy: false,
    }

    const updatedSettings = {
      ...currentSettings,
      globalVisitPrivacy: args.enabled,
    }

    await ctx.db.patch(user._id, {
      settings: updatedSettings,
    })

    return {
      settings: {
        hideProfileVisits: updatedSettings.hideProfileVisits,
        hideProfileEvents: updatedSettings.hideProfileEvents,
        globalVisitPrivacy: updatedSettings.globalVisitPrivacy,
      },
      message: `Global visit privacy ${args.enabled ? 'enabled' : 'disabled'}`,
    }
  },
})

/**
 * Update individual visit privacy flag (Pro only)
 *
 * Mark specific visit as private/public using the existing `isPrivate` field.
 * Requires Pro subscription - throws error for free users.
 */
export const updateVisitPrivacy = mutation({
  args: {
    visitId: v.id('visits'),
    isPrivate: v.boolean(),
  },
  returns: v.object({
    visitId: v.id('visits'),
    isPrivate: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Check Pro tier access via Autumn customer.features
    const result = await autumn.customers.get(ctx)
    const hasAccess = hasFeatureAccess(result.data, 'individual_visit_privacy')

    if (!hasAccess) {
      throw new Error('Pro subscription required for individual visit privacy')
    }

    const visit = await ctx.db.get(args.visitId)
    if (!visit) {
      throw new Error('Visit not found')
    }

    // Verify ownership
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user || visit.userId !== user._id) {
      throw new Error('You can only update privacy for your own visits')
    }

    await ctx.db.patch(args.visitId, {
      isPrivate: args.isPrivate,
    })

    return {
      visitId: args.visitId,
      isPrivate: args.isPrivate,
      message: `Visit ${args.isPrivate ? 'hidden' : 'visible'}`,
    }
  },
})

/**
 * Get privacy-filtered visits for a user profile
 *
 * Returns list of visits for a user's profile page, filtered by privacy settings.
 * If profile owner has hideProfileVisits enabled and viewer is not the owner,
 * returns hidden status.
 */
export const getUserProfileVisits = query({
  args: {
    username: v.string(),
    viewerId: v.optional(v.id('users')),
  },
  returns: v.union(
    v.array(
      v.object({
        visitId: v.id('visits'),
        cityId: v.id('cities'),
        cityName: v.string(),
        citySlug: v.string(),
        startDate: v.number(),
        endDate: v.optional(v.number()),
        notes: v.optional(v.string()),
        isPrivate: v.boolean(),
      }),
    ),
    v.object({
      hidden: v.literal(true),
      message: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    // Find the profile owner
    const profileOwner = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique()

    if (!profileOwner) {
      throw new Error('User not found')
    }

    // Check privacy settings from settings object
    const settings = profileOwner.settings ?? {
      hideProfileVisits: false,
      hideProfileEvents: false,
      globalVisitPrivacy: false,
    }

    // Determine if viewer is the profile owner
    const isOwner = args.viewerId === profileOwner._id

    // If hideProfileVisits is enabled and viewer is not owner, hide visits
    if (settings.hideProfileVisits && !isOwner) {
      return {
        hidden: true as const,
        message: "This user's visit history is private",
      }
    }

    // Get all visits for this user
    const visits = await ctx.db
      .query('visits')
      .withIndex('by_user_id', (q) => q.eq('userId', profileOwner._id))
      .collect()

    // Get city information for each visit
    const visitsWithCities = await Promise.all(
      visits.map(async (visit) => {
        // Filter out private visits for non-owners
        if (visit.isPrivate && !isOwner) {
          return null
        }

        const city = await ctx.db.get(visit.cityId)
        if (!city) return null

        return {
          visitId: visit._id,
          cityId: visit.cityId,
          cityName: city.name,
          citySlug: city.shortSlug,
          startDate: visit.startDate,
          endDate: visit.endDate !== undefined ? visit.endDate : undefined,
          notes: visit.notes,
          isPrivate: visit.isPrivate,
        } as const
      }),
    )

    // Filter out null entries (deleted cities and private visits) with type guard
    type VisitWithCity = {
      visitId: Id<'visits'>
      cityId: Id<'cities'>
      cityName: string
      citySlug: string
      startDate: number
      endDate: number | undefined
      notes: string | undefined
      isPrivate: boolean
    }

    return visitsWithCities.filter((v): v is VisitWithCity => v !== null)
  },
})

/**
 * Get privacy-filtered events for a user profile
 *
 * Returns list of events for a user's profile page, filtered by privacy settings.
 * If profile owner has hideProfileEvents enabled and viewer is not the owner,
 * returns hidden status.
 */
export const getUserProfileEvents = query({
  args: {
    username: v.string(),
    viewerId: v.optional(v.id('users')),
  },
  returns: v.union(
    v.array(
      v.object({
        eventId: v.id('events'),
        title: v.string(),
        cityId: v.id('cities'),
        cityName: v.string(),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        isOrganizer: v.boolean(),
      }),
    ),
    v.object({
      hidden: v.literal(true),
      message: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    // Find the profile owner
    const profileOwner = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique()

    if (!profileOwner) {
      throw new Error('User not found')
    }

    // Check privacy settings from settings object
    const settings = profileOwner.settings ?? {
      hideProfileVisits: false,
      hideProfileEvents: false,
      globalVisitPrivacy: false,
    }

    // Determine if viewer is the profile owner
    const isOwner = args.viewerId === profileOwner._id

    // If hideProfileEvents is enabled and viewer is not owner, hide events
    if (settings.hideProfileEvents && !isOwner) {
      return {
        hidden: true as const,
        message: "This user's event participation is private",
      }
    }

    // Get all event participations for this user
    const participations = await ctx.db
      .query('eventParticipants')
      .withIndex('by_user', (q) => q.eq('userId', profileOwner._id))
      .collect()

    // Get event and city information for each participation
    const eventsWithDetails = await Promise.all(
      participations.map(async (participation) => {
        const event = await ctx.db.get(participation.eventId)
        if (!event || event.isCancelled) return null // Skip cancelled events

        const city = await ctx.db.get(event.cityId)
        if (!city) return null

        return {
          eventId: event._id,
          title: event.title,
          cityId: event.cityId,
          cityName: city.name,
          startTime: event.startTime,
          endTime: event.endTime,
          isOrganizer: event.ownerId === profileOwner._id,
        }
      }),
    )

    // Filter out null entries (deleted/cancelled events)
    return eventsWithDetails.filter((e) => e !== null)
  },
})
