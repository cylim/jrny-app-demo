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
      isEnriched: v.optional(v.boolean()),
      lastEnrichedAt: v.optional(v.number()),
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
      isEnriched: city.isEnriched,
      lastEnrichedAt: city.lastEnrichedAt,
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
 * Uses .paginate() for efficient database-level pagination
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
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
        id: v.union(v.id('cities'), v.null()),
      }),
    ),
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
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Build query based on filters - use indexes when possible
    // biome-ignore lint/suspicious/noImplicitAnyLet: queryBuilder is assigned in all branches below
    let queryBuilder

    // Priority: Use most specific index first
    if (args.region) {
      queryBuilder = ctx.db
        .query('cities')
        .withIndex('by_region', (q) => q.eq('region', args.region!))
    } else if (args.country) {
      queryBuilder = ctx.db
        .query('cities')
        .withIndex('by_country', (q) => q.eq('country', args.country!))
    } else if (
      args.sortBy === 'most-visited' ||
      args.sortBy === 'least-visited'
    ) {
      // Use visit count index for visit-based sorting
      queryBuilder = ctx.db
        .query('cities')
        .withIndex('by_visit_count')
        .order(args.sortBy === 'most-visited' ? 'desc' : 'asc')
    } else {
      // For alphabetical sorting without filters, we need to collect all
      // This is a limitation - alphabetical sorting requires in-memory sort
      // because Convex doesn't support ordering by non-indexed fields with .paginate()
      // We'll handle this case separately below
      queryBuilder = ctx.db.query('cities')
    }

    // For alphabetical sorting or when we have search/complex filters,
    // we unfortunately need to collect and sort in memory
    // This is a tradeoff - we can optimize later with a search index
    const needsInMemoryProcessing =
      args.sortBy === 'alphabetical-asc' ||
      args.sortBy === 'alphabetical-desc' ||
      (args.searchQuery && args.searchQuery.trim() !== '') ||
      (args.region && args.country) // Combined region+country filter

    if (needsInMemoryProcessing) {
      // Fall back to collect() for these cases
      let cities = await queryBuilder.collect()

      // Apply combined region+country filter
      if (args.region && args.country) {
        cities = cities.filter((city) => city.country === args.country)
      }

      // Apply search filter
      if (args.searchQuery && args.searchQuery.trim() !== '') {
        const query = args.searchQuery.toLowerCase()
        cities = cities.filter((city) =>
          city.name.toLowerCase().includes(query),
        )
      }

      // Apply sorting
      if (args.sortBy === 'alphabetical-asc') {
        cities.sort((a, b) => a.name.localeCompare(b.name))
      } else if (args.sortBy === 'alphabetical-desc') {
        cities.sort((a, b) => b.name.localeCompare(a.name))
      } else if (args.sortBy === 'most-visited') {
        cities.sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0))
      } else if (args.sortBy === 'least-visited') {
        cities.sort((a, b) => (a.visitCount ?? 0) - (b.visitCount ?? 0))
      }

      // Manual pagination
      // Parse cursor to get the offset (startIndex)
      const startIndex = args.paginationOpts?.cursor
        ? Number.parseInt(args.paginationOpts.cursor, 10)
        : 0
      const paginatedCities = cities.slice(startIndex, startIndex + args.limit)
      const isDone = startIndex + args.limit >= cities.length

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
        continueCursor: isDone ? null : `${startIndex + args.limit}`,
        isDone,
      }
    }

    // Use efficient .paginate() for simple cases (region, country, or visit-based sorting)
    const result = await queryBuilder.paginate(
      args.paginationOpts ?? { numItems: args.limit, cursor: null },
    )

    return {
      cities: result.page.map((city) => ({
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
      continueCursor: result.continueCursor,
      isDone: result.isDone,
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
