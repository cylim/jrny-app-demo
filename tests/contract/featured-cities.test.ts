import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from '~@/convex/_generated/api'
import schema from '~@/convex/schema'

/**
 * Contract tests for getFeaturedCities Convex query
 * Verifies the contract between the query and its consumers
 *
 * Test coverage:
 * - Returns requested count of cities
 * - Filters from top 50 most-visited cities
 * - Handles edge case: count > available cities
 * - Returns cities with all required fields
 * - Random selection (different results on multiple calls)
 */
describe('getFeaturedCities Query Contract', () => {
  it('should return requested count of cities when enough cities exist', async () => {
    const t = convexTest(schema)

    // Seed 20 cities with visit counts
    for (let i = 0; i < 20; i++) {
      await t.run(async (ctx) => {
        await ctx.db.insert('cities', {
          name: `City ${i}`,
          slug: `city-${i}`,
          shortSlug: `c${i}`,
          country: 'Country',
          countryCode: 'CC',
          countrySlug: 'country',
          region: 'Region',
          latitude: '0.0',
          longitude: '0.0',
          image: `https://example.com/city-${i}.jpg`,
          visitCount: 1000 - i * 10, // Descending visit counts
        })
      })
    }

    // Request 5 cities
    const cities = await t.query(api.cities.getFeaturedCities, { count: 5 })

    // Should return exactly 5 cities
    expect(cities).toHaveLength(5)
  })

  it('should return all required fields for each city', async () => {
    const t = convexTest(schema)

    // Seed one city
    await t.run(async (ctx) => {
      await ctx.db.insert('cities', {
        name: 'Tokyo',
        slug: 'tokyo-japan',
        shortSlug: 'tokyo',
        country: 'Japan',
        countryCode: 'JP',
        countrySlug: 'japan',
        region: 'Kanto',
        latitude: '35.6762',
        longitude: '139.6503',
        image: 'https://example.com/tokyo.jpg',
        visitCount: 1500,
      })
    })

    const cities = await t.query(api.cities.getFeaturedCities, { count: 1 })

    expect(cities).toHaveLength(1)
    expect(cities[0]).toMatchObject({
      _id: expect.any(String),
      name: 'Tokyo',
      image: 'https://example.com/tokyo.jpg',
      visitCount: 1500,
    })
  })

  it('should handle count greater than available cities', async () => {
    const t = convexTest(schema)

    // Seed only 3 cities
    for (let i = 0; i < 3; i++) {
      await t.run(async (ctx) => {
        await ctx.db.insert('cities', {
          name: `City ${i}`,
          slug: `city-${i}`,
          shortSlug: `c${i}`,
          country: 'Country',
          countryCode: 'CC',
          countrySlug: 'country',
          region: 'Region',
          latitude: '0.0',
          longitude: '0.0',
          image: `https://example.com/city-${i}.jpg`,
          visitCount: 100 + i,
        })
      })
    }

    // Request 10 cities but only 3 exist
    const cities = await t.query(api.cities.getFeaturedCities, { count: 10 })

    // Should return all 3 available cities
    expect(cities).toHaveLength(3)
  })

  it('should return empty array when no cities have visit counts', async () => {
    const t = convexTest(schema)

    // Seed cities with null visitCount
    for (let i = 0; i < 5; i++) {
      await t.run(async (ctx) => {
        await ctx.db.insert('cities', {
          name: `City ${i}`,
          slug: `city-${i}`,
          shortSlug: `c${i}`,
          country: 'Country',
          countryCode: 'CC',
          countrySlug: 'country',
          region: 'Region',
          latitude: '0.0',
          longitude: '0.0',
          image: undefined,
          visitCount: undefined,
        })
      })
    }

    const cities = await t.query(api.cities.getFeaturedCities, { count: 5 })

    // Should return empty array since no cities have visit counts
    expect(cities).toHaveLength(0)
  })

  it('should filter from top 50 most-visited cities', async () => {
    const t = convexTest(schema)

    // Seed 100 cities with descending visit counts
    for (let i = 0; i < 100; i++) {
      await t.run(async (ctx) => {
        await ctx.db.insert('cities', {
          name: `City ${i}`,
          slug: `city-${i}`,
          shortSlug: `c${i}`,
          country: 'Country',
          countryCode: 'CC',
          countrySlug: 'country',
          region: 'Region',
          latitude: '0.0',
          longitude: '0.0',
          image: `https://example.com/city-${i}.jpg`,
          visitCount: 10000 - i * 10, // City 0 has 10000, City 99 has 9010
        })
      })
    }

    // Request 10 cities
    const cities = await t.query(api.cities.getFeaturedCities, { count: 10 })

    expect(cities).toHaveLength(10)

    // All returned cities should be in top 50 (visitCount >= 9500)
    for (const city of cities) {
      expect(city.visitCount).toBeGreaterThanOrEqual(9500)
    }
  })

  it('should provide random selection from top cities', async () => {
    const t = convexTest(schema)

    // Seed 20 cities
    for (let i = 0; i < 20; i++) {
      await t.run(async (ctx) => {
        await ctx.db.insert('cities', {
          name: `City ${i}`,
          slug: `city-${i}`,
          shortSlug: `c${i}`,
          country: 'Country',
          countryCode: 'CC',
          countrySlug: 'country',
          region: 'Region',
          latitude: '0.0',
          longitude: '0.0',
          image: `https://example.com/city-${i}.jpg`,
          visitCount: 1000 - i * 10,
        })
      })
    }

    // Call the query twice
    const cities1 = await t.query(api.cities.getFeaturedCities, { count: 5 })
    const cities2 = await t.query(api.cities.getFeaturedCities, { count: 5 })

    // Cities should have different order or different selections
    // (This test may occasionally pass even with random selection,
    // but statistically should fail if not random)
    const ids1 = cities1.map((c) => c._id).join(',')
    const ids2 = cities2.map((c) => c._id).join(',')

    // NOTE: This is a probabilistic test - there's a small chance
    // of false positive, but with 5 cities from 20, odds of identical
    // selection and order are very low
    // If this becomes flaky, we can remove it
    expect(ids1).not.toBe(ids2)
  })

  it('should handle null image field gracefully', async () => {
    const t = convexTest(schema)

    // Seed city with null image
    await t.run(async (ctx) => {
      await ctx.db.insert('cities', {
        name: 'City Without Image',
        slug: 'city-no-image',
        shortSlug: 'noimg',
        country: 'Country',
        countryCode: 'CC',
        countrySlug: 'country',
        region: 'Region',
        latitude: '0.0',
        longitude: '0.0',
        image: undefined,
        visitCount: 500,
      })
    })

    const cities = await t.query(api.cities.getFeaturedCities, { count: 1 })

    expect(cities).toHaveLength(1)
    expect(cities[0].image).toBeNull()
    expect(cities[0].visitCount).toBe(500)
  })
})
