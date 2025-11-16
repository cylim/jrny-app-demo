import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
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
      currentVisitorCount: v.optional(v.number()),
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

    // Map to response format with denormalized currentVisitorCount
    return selected.map((city) => ({
      _id: city._id,
      name: city.name,
      shortSlug: city.shortSlug,
      image: city.image ?? null,
      visitCount: city.visitCount ?? 0,
      currentVisitorCount: city.currentVisitorCount ?? 0,
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
      currentVisitorCount: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    // Get all cities ordered by visit count (descending)
    const cities = await ctx.db
      .query('cities')
      .withIndex('by_visit_count')
      .order('desc')
      .collect()

    // Map to response format with denormalized currentVisitorCount
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
      currentVisitorCount: city.currentVisitorCount ?? 0,
    }))
  },
})

/**
 * Get paginated cities with server-side filtering
 * Supports region, country filters and multiple sort options
 */
export const getCitiesPaginated = query({
  args: {
    region: v.optional(v.string()),
    country: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    sortBy: v.union(
      v.literal('most-visited'),
      v.literal('least-visited'),
      v.literal('alphabetical-asc'),
      v.literal('alphabetical-desc'),
    ),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    cities: v.array(
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
        currentVisitorCount: v.optional(v.number()),
      }),
    ),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    // Collect results based on filters
    let cities: Array<Doc<'cities'>>

    // Apply filters using indexes when possible
    if (args.region) {
      cities = await ctx.db
        .query('cities')
        .withIndex('by_region', (q) => q.eq('region', args.region!))
        .collect()
    } else if (args.country) {
      cities = await ctx.db
        .query('cities')
        .withIndex('by_country', (q) => q.eq('country', args.country!))
        .collect()
    } else {
      // Default: use visit count index for sorting
      if (args.sortBy === 'most-visited') {
        cities = await ctx.db
          .query('cities')
          .withIndex('by_visit_count')
          .order('desc')
          .collect()
      } else if (args.sortBy === 'least-visited') {
        cities = await ctx.db
          .query('cities')
          .withIndex('by_visit_count')
          .collect()
      } else {
        // For alphabetical sorts, we'll collect all and sort in memory
        cities = await ctx.db
          .query('cities')
          .withIndex('by_visit_count')
          .order('desc')
          .collect()
      }
    }

    // Apply country filter if region is also specified
    if (args.region && args.country) {
      cities = cities.filter((city) => city.country === args.country)
    }

    // Apply search filter
    if (args.searchQuery && args.searchQuery.trim() !== '') {
      const query = args.searchQuery.toLowerCase()
      cities = cities.filter((city) => city.name.toLowerCase().includes(query))
    }

    // Apply sorting for non-index-based sorts
    if (!args.region && !args.country) {
      if (args.sortBy === 'alphabetical-asc') {
        cities.sort((a, b) => a.name.localeCompare(b.name))
      } else if (args.sortBy === 'alphabetical-desc') {
        cities.sort((a, b) => b.name.localeCompare(a.name))
      }
    } else {
      // For filtered results, apply sorting
      if (args.sortBy === 'most-visited') {
        cities.sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0))
      } else if (args.sortBy === 'least-visited') {
        cities.sort((a, b) => (a.visitCount ?? 0) - (b.visitCount ?? 0))
      } else if (args.sortBy === 'alphabetical-asc') {
        cities.sort((a, b) => a.name.localeCompare(b.name))
      } else if (args.sortBy === 'alphabetical-desc') {
        cities.sort((a, b) => b.name.localeCompare(a.name))
      }
    }

    // Pagination logic
    const total = cities.length
    let startIndex = 0

    if (args.cursor) {
      // Find the index of the cursor
      const cursorIndex = cities.findIndex((city) => city._id === args.cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }

    const paginatedCities = cities.slice(startIndex, startIndex + args.limit)
    const hasMore = startIndex + args.limit < total
    const nextCursor = hasMore
      ? paginatedCities[paginatedCities.length - 1]._id
      : null

    // Map to response format
    return {
      cities: paginatedCities.map((city) => ({
        _id: city._id,
        name: city.name,
        slug: city.slug,
        shortSlug: city.shortSlug,
        country: city.country,
        countryCode: city.countryCode,
        region: city.region,
        image: city.image ?? null,
        visitCount: city.visitCount ?? null,
        currentVisitorCount: city.currentVisitorCount ?? 0,
      })),
      nextCursor,
      hasMore,
      total,
    }
  },
})

/**
 * Get unique regions from all cities
 * Returns sorted list of regions for filter dropdown
 */
export const getRegions = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const cities = await ctx.db.query('cities').collect()
    const regions = new Set(cities.map((city) => city.region))
    return Array.from(regions).sort()
  },
})

/**
 * Get unique countries from cities, optionally filtered by region
 * Returns sorted list of countries for filter dropdown
 */
export const getCountries = query({
  args: {
    region: v.optional(v.string()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    let cities = await ctx.db.query('cities').collect()

    if (args.region) {
      cities = cities.filter((city) => city.region === args.region)
    }

    const countries = new Set(cities.map((city) => city.country))
    return Array.from(countries).sort()
  },
})
