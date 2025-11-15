import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'

/**
 * Create a new visit
 */
export const createVisit = mutation({
  args: {
    cityId: v.id('cities'),
    startDate: v.number(),
    endDate: v.number(),
    notes: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    visitId: v.optional(v.id('visits')),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { cityId, startDate, endDate, notes, isPrivate }) => {
    // Auth check
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Verify city exists
    const city = await ctx.db.get(cityId)
    if (!city) {
      return { success: false, error: 'City not found' }
    }

    // Validate dates
    if (startDate >= endDate) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const now = Date.now()

    // Create visit
    const visitId = await ctx.db.insert('visits', {
      userId: user._id,
      cityId,
      startDate,
      endDate,
      notes,
      isPrivate: isPrivate ?? false,
      updatedAt: now,
    })

    // Update city visitCount
    const currentVisitCount = city.visitCount ?? 0
    await ctx.db.patch(cityId, {
      visitCount: currentVisitCount + 1,
    })

    return { success: true, visitId }
  },
})

/**
 * Update an existing visit
 */
export const updateVisit = mutation({
  args: {
    visitId: v.id('visits'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { visitId, startDate, endDate, notes, isPrivate }) => {
    // Auth check
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get visit
    const visit = await ctx.db.get(visitId)
    if (!visit) {
      return { success: false, error: 'Visit not found' }
    }

    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    if (!user || visit.userId !== user._id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate dates if provided
    const newStartDate = startDate ?? visit.startDate
    const newEndDate = endDate ?? visit.endDate

    if (newStartDate >= newEndDate) {
      return { success: false, error: 'Start date must be before end date' }
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    }
    if (startDate !== undefined) updates.startDate = startDate
    if (endDate !== undefined) updates.endDate = endDate
    if (notes !== undefined) updates.notes = notes
    if (isPrivate !== undefined) updates.isPrivate = isPrivate

    // Update visit
    await ctx.db.patch(visitId, updates)

    return { success: true }
  },
})

/**
 * Delete a visit
 */
export const deleteVisit = mutation({
  args: { visitId: v.id('visits') },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { visitId }) => {
    // Auth check
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get visit
    const visit = await ctx.db.get(visitId)
    if (!visit) {
      return { success: false, error: 'Visit not found' }
    }

    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    if (!user || visit.userId !== user._id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get city to update visitCount
    const city = await ctx.db.get(visit.cityId)
    if (city) {
      const currentVisitCount = city.visitCount ?? 0
      await ctx.db.patch(visit.cityId, {
        visitCount: Math.max(0, currentVisitCount - 1),
      })
    }

    // Delete visit
    await ctx.db.delete(visitId)

    return { success: true }
  },
})

/**
 * Get all visits for a specific user
 * Returns visits sorted by start date (most recent first)
 */
export const getVisitsByUser = query({
  args: { userId: v.id('users') },
  returns: v.array(
    v.object({
      _id: v.id('visits'),
      _creationTime: v.number(),
      userId: v.id('users'),
      cityId: v.id('cities'),
      startDate: v.number(),
      endDate: v.number(),
      notes: v.optional(v.string()),
      isPrivate: v.boolean(),
      updatedAt: v.number(),
      // Joined city data
      city: v.object({
        _id: v.id('cities'),
        name: v.string(),
        slug: v.string(),
        shortSlug: v.string(),
        country: v.string(),
        countryCode: v.string(),
        region: v.string(),
        image: v.optional(v.string()),
      }),
    }),
  ),
  handler: async (ctx, { userId }) => {
    // Get current viewer
    const authUser = await authComponent.getAuthUser(ctx)
    const viewer = authUser
      ? await ctx.db
          .query('users')
          .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
          .unique()
      : null

    const isOwnProfile = viewer?._id === userId

    // Get all visits for user
    const visits = await ctx.db
      .query('visits')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .collect()

    // Filter private visits if not own profile
    const filteredVisits = visits.filter(
      (visit) => isOwnProfile || !visit.isPrivate,
    )

    // Sort by start date descending (most recent first)
    const sortedVisits = filteredVisits.sort(
      (a, b) => b.startDate - a.startDate,
    )

    // Join with city data
    const visitsWithCities = await Promise.all(
      sortedVisits.map(async (visit) => {
        const city = await ctx.db.get(visit.cityId)
        if (!city) {
          throw new Error(`City not found for visit ${visit._id}`)
        }
        return {
          ...visit,
          city: {
            _id: city._id,
            name: city.name,
            slug: city.slug,
            shortSlug: city.shortSlug,
            country: city.country,
            countryCode: city.countryCode,
            region: city.region,
            image: city.image,
          },
        }
      }),
    )

    return visitsWithCities
  },
})

/**
 * Get overlapping visitors for a specific visit
 * Returns users who were in the same city during overlapping dates
 */
export const getOverlappingVisitors = query({
  args: { visitId: v.id('visits') },
  returns: v.array(
    v.object({
      user: v.object({
        _id: v.id('users'),
        name: v.string(),
        username: v.optional(v.string()),
        image: v.optional(v.string()),
      }),
      visit: v.object({
        _id: v.id('visits'),
        startDate: v.number(),
        endDate: v.number(),
      }),
      overlapDays: v.number(),
    }),
  ),
  handler: async (ctx, { visitId }) => {
    // Get the visit
    const visit = await ctx.db.get(visitId)
    if (!visit || visit.isPrivate) {
      return []
    }

    // Get all visits to the same city (excluding private ones)
    const cityVisits = await ctx.db
      .query('visits')
      .withIndex('by_city_id', (q) => q.eq('cityId', visit.cityId))
      .collect()

    // Filter out private visits
    const publicCityVisits = cityVisits.filter((v) => !v.isPrivate)

    // Helper function to calculate overlap in days
    // Dates are stored as midnight timestamps (start of day), but should be
    // treated as inclusive of the entire day. Add 1 day to end dates to ensure
    // visits that share a boundary day (e.g., one ends Jan 15, another starts Jan 15)
    // are correctly counted as overlapping.
    const calculateOverlap = (
      start1: number,
      end1: number,
      start2: number,
      end2: number,
    ): number => {
      const DAY_MS = 24 * 60 * 60 * 1000

      // Treat end dates as inclusive by adding one full day
      const inclusiveEnd1 = end1 + DAY_MS
      const inclusiveEnd2 = end2 + DAY_MS

      const overlapStart = Math.max(start1, start2)
      const overlapEnd = Math.min(inclusiveEnd1, inclusiveEnd2)

      if (overlapStart >= overlapEnd) {
        return 0 // No overlap
      }

      // Convert milliseconds to days (round up)
      return Math.ceil((overlapEnd - overlapStart) / DAY_MS)
    }

    // Find overlapping visits
    const overlappingVisits = publicCityVisits
      .filter((otherVisit) => {
        // Exclude same visit and same user
        if (otherVisit._id === visitId || otherVisit.userId === visit.userId) {
          return false
        }

        // Check for overlap
        const overlap = calculateOverlap(
          visit.startDate,
          visit.endDate,
          otherVisit.startDate,
          otherVisit.endDate,
        )

        return overlap > 0
      })
      .map((otherVisit) => ({
        visit: otherVisit,
        overlapDays: calculateOverlap(
          visit.startDate,
          visit.endDate,
          otherVisit.startDate,
          otherVisit.endDate,
        ),
      }))

    // Sort by overlap days (descending)
    overlappingVisits.sort((a, b) => b.overlapDays - a.overlapDays)

    // Join with user data and filter out users with globalPrivacy enabled
    const results = await Promise.all(
      overlappingVisits.map(
        async ({ visit: overlappingVisit, overlapDays }) => {
          const user = await ctx.db.get(overlappingVisit.userId)
          if (!user) {
            throw new Error(`User not found for visit ${overlappingVisit._id}`)
          }

          // Filter out users who have globalPrivacy enabled
          const typedUser = user as Doc<'users'> & {
            settings?: { globalPrivacy: boolean; hideVisitHistory: boolean }
          }
          if (typedUser.settings?.globalPrivacy === true) {
            return null
          }

          return {
            user: {
              _id: user._id,
              name: user.name,
              username: user.username,
              image: user.image,
            },
            visit: {
              _id: overlappingVisit._id,
              startDate: overlappingVisit.startDate,
              endDate: overlappingVisit.endDate,
            },
            overlapDays,
          }
        },
      ),
    )

    // Filter out null values (users with globalPrivacy enabled)
    return results.filter((r): r is NonNullable<typeof r> => r !== null)
  },
})
