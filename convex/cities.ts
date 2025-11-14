import { v } from 'convex/values'
import { query } from './_generated/server'

const cityShape = v.object({
      _id: v.id('cities'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      shortSlug: v.string(),
      country: v.string(),
      countryCode: v.string(),
      countrySlug: v.string(),
      region: v.string(),
      latitude: v.string(),
      longitude: v.string(),
      image: v.optional(v.string()),
    })

/**
 * Get a city by its short slug (e.g., 'bangkok', 'chiang-mai')
 */
export const getCityByShortSlug = query({
  args: { shortSlug: v.string() },
  returns: v.union(
    cityShape,
    v.null(),
  ),
  handler: async (ctx, { shortSlug }) => {
    const city = await ctx.db
      .query('cities')
      .withIndex('by_short_slug', (q) => q.eq('shortSlug', shortSlug))
      .unique()

    return city
  },
})

/**
 * Get all cities
 */
export const getAllCities = query({
  args: {},
  returns: v.array(
    cityShape,
  ),
  handler: async (ctx) => {
    return await ctx.db.query('cities').collect()
  },
})

/**
 * Search cities by name
 */
export const searchCities = query({
  args: { searchTerm: v.string() },
  returns: v.array(
    cityShape,
  ),
  handler: async (ctx, { searchTerm }) => {
    // Get all cities and filter client-side
    // In production, you might want to use a text search index
    const allCities = await ctx.db.query('cities').collect()

    const searchLower = searchTerm.toLowerCase()
    return allCities.filter(
      (city) =>
        city.name.toLowerCase().includes(searchLower) ||
        city.country.toLowerCase().includes(searchLower),
    )
  },
})

/**
 * Get cities by region
 */
export const getCitiesByRegion = query({
  args: { region: v.string() },
  returns: v.array(
    cityShape,
  ),
  handler: async (ctx, { region }) => {
    return await ctx.db
      .query('cities')
      .withIndex('by_region', (q) => q.eq('region', region))
      .collect()
  },
})

/**
 * Get cities by country
 */
export const getCitiesByCountry = query({
  args: { country: v.string() },
  returns: v.array(
    cityShape,
  ),
  handler: async (ctx, { country }) => {
    return await ctx.db
      .query('cities')
      .withIndex('by_country', (q) => q.eq('country', country))
      .collect()
  },
})
