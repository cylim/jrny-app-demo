import { v } from 'convex/values'
import { query } from './_generated/server'

/**
 * Get featured cities for the landing page
 * Randomly selects N cities from the top 50 most-visited cities
 */
export const getFeaturedCities = query({
  args: { count: v.number() },
  returns: v.array(
    v.object({
      _id: v.id('cities'),
      name: v.string(),
      shortSlug: v.string(),
      image: v.union(v.string(), v.null()),
      visitCount: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    // Get top 50 cities by visit count
    // Note: If visitCount is null/undefined, those cities will be at the end
    const topCities = await ctx.db
      .query('cities')
      .withIndex('by_visit_count')
      .order('desc')
      .take(50)

    // Filter out cities with no visit count (optional field)
    const citiesWithVisits = topCities.filter((city) => city.visitCount != null)

    // If we have fewer than requested, return what we have
    if (citiesWithVisits.length === 0) {
      // No cities with visit counts, return empty array
      // Frontend will use fallback cities
      return []
    }

    // Fisher-Yates shuffle algorithm for random selection
    const shuffled = [...citiesWithVisits]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Return requested count (or fewer if not enough cities)
    const selected = shuffled.slice(0, Math.min(args.count, shuffled.length))

    return selected.map((city) => ({
      _id: city._id,
      name: city.name,
      shortSlug: city.shortSlug,
      image: city.image ?? null,
      visitCount: city.visitCount ?? 0,
    }))
  },
})

/**
 * Get a city by its short slug (used for city detail pages)
 */
export const getCityByShortSlug = query({
  args: { shortSlug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('cities'),
      name: v.string(),
      slug: v.string(),
      shortSlug: v.string(),
      country: v.string(),
      countryCode: v.string(),
      countrySlug: v.string(),
      region: v.string(),
      latitude: v.string(),
      longitude: v.string(),
      image: v.union(v.string(), v.null()),
      visitCount: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const city = await ctx.db
      .query('cities')
      .withIndex('by_short_slug', (q) => q.eq('shortSlug', args.shortSlug))
      .unique()

    if (!city) {
      return null
    }

    return {
      _id: city._id,
      name: city.name,
      slug: city.slug,
      shortSlug: city.shortSlug,
      country: city.country,
      countryCode: city.countryCode,
      countrySlug: city.countrySlug,
      region: city.region,
      latitude: city.latitude,
      longitude: city.longitude,
      image: city.image ?? null,
      visitCount: city.visitCount ?? null,
    }
  },
})

/**
 * Get all cities for the discover page
 * Returns all cities ordered by visit count (descending)
 */
export const getAllCities = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('cities'),
      name: v.string(),
      slug: v.string(),
      shortSlug: v.string(),
      country: v.string(),
      countryCode: v.string(),
      region: v.string(),
      image: v.union(v.string(), v.null()),
      visitCount: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    // Get all cities ordered by visit count (descending)
    const cities = await ctx.db
      .query('cities')
      .withIndex('by_visit_count')
      .order('desc')
      .collect()

    return cities.map((city) => ({
      _id: city._id,
      name: city.name,
      slug: city.slug,
      shortSlug: city.shortSlug,
      country: city.country,
      countryCode: city.countryCode,
      region: city.region,
      image: city.image ?? null,
      visitCount: city.visitCount ?? null,
    }))
  },
})
