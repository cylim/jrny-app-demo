import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { internalMutation, internalQuery } from './_generated/server'

/**
 * Helper function to atomically calculate visitCount for a city
 * Imported pattern from convex/visits.ts for atomic updates
 */
async function getVisitCountForCity(
  ctx: MutationCtx | QueryCtx,
  cityId: Id<'cities'>,
): Promise<number> {
  const visits = await ctx.db
    .query('visits')
    .withIndex('by_city_id', (q) => q.eq('cityId', cityId))
    .collect()

  return visits.length
}

/**
 * Internal queries and mutations for database seeding
 * These functions are called from the seed script (scripts/seed-database.mjs)
 * using the Convex admin key for security
 */

export const getUserCount = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users.length
  },
})

export const getVisitCount = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const visits = await ctx.db.query('visits').collect()
    return visits.length
  },
})

export const getAllUsers = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
    }))
  },
})

export const getTopCities = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      _id: v.id('cities'),
      name: v.string(),
      visitCount: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { limit }) => {
    const cities = await ctx.db
      .query('cities')
      .withIndex('by_visit_count')
      .order('desc')
      .take(limit)

    return cities.map((city) => ({
      _id: city._id,
      name: city.name,
      visitCount: city.visitCount,
    }))
  },
})

export const insertUsers = internalMutation({
  args: {
    users: v.array(
      v.object({
        authUserId: v.string(),
        name: v.string(),
        email: v.string(),
        image: v.optional(v.string()),
        username: v.optional(v.string()),
        bio: v.optional(v.string()),
        settings: v.object({
          globalPrivacy: v.boolean(),
          hideVisitHistory: v.boolean(),
        }),
        socialLinks: v.optional(
          v.object({
            github: v.optional(v.string()),
            x: v.optional(v.string()),
            linkedin: v.optional(v.string()),
            telegram: v.optional(v.string()),
          }),
        ),
        isSeed: v.boolean(),
        updatedAt: v.number(),
        lastSeen: v.number(),
      }),
    ),
  },
  returns: v.object({
    inserted: v.number(),
    userIds: v.array(v.id('users')),
  }),
  handler: async (ctx, { users }) => {
    const userIds: Id<'users'>[] = []

    for (const user of users) {
      const userId = await ctx.db.insert('users', user)
      userIds.push(userId)
    }

    return {
      inserted: userIds.length,
      userIds,
    }
  },
})

export const insertVisits = internalMutation({
  args: {
    visits: v.array(
      v.object({
        userId: v.id('users'),
        cityId: v.id('cities'),
        startDate: v.number(),
        endDate: v.number(),
        notes: v.optional(v.string()),
        isPrivate: v.boolean(),
        isSeed: v.boolean(),
        updatedAt: v.number(),
      }),
    ),
  },
  returns: v.object({
    inserted: v.number(),
    visitIds: v.array(v.id('visits')),
    citiesUpdated: v.number(),
  }),
  handler: async (ctx, { visits }) => {
    const visitIds: Id<'visits'>[] = []
    const affectedCities = new Set<Id<'cities'>>()

    // Insert all visits and track affected cities
    for (const visit of visits) {
      const visitId = await ctx.db.insert('visits', visit)
      visitIds.push(visitId)
      affectedCities.add(visit.cityId)
    }

    // Atomically update visitCount for all affected cities
    for (const cityId of affectedCities) {
      const count = await getVisitCountForCity(ctx, cityId)
      await ctx.db.patch(cityId, { visitCount: count })
    }

    return {
      inserted: visitIds.length,
      visitIds,
      citiesUpdated: affectedCities.size,
    }
  },
})
