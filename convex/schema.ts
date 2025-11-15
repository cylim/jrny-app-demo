import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  users: defineTable({
    // Better-Auth user ID (from the auth system)
    authUserId: v.string(),
    // User profile information from Google OAuth
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    // Username for profile URLs (e.g., u/:username)
    username: v.optional(v.string()),
    // Profile customization
    bio: v.optional(v.string()),
    // Settings object (defaults to false for both)
    settings: v.optional(
      v.object({
        globalPrivacy: v.boolean(), // Hide from overlap visits and city page (default: false)
        hideVisitHistory: v.boolean(), // Hide visit history on profile (default: false)
      }),
    ),
    // Social links
    socialLinks: v.optional(
      v.object({
        github: v.optional(v.string()),
        x: v.optional(v.string()), // formerly twitter
        linkedin: v.optional(v.string()),
        telegram: v.optional(v.string()),
      }),
    ),
    // Timestamps
    updatedAt: v.number(),
    lastSeen: v.number(),
  })
    .index('by_auth_user_id', ['authUserId'])
    .index('by_username', ['username']),
  cities: defineTable({
    // Basic city information
    name: v.string(),
    slug: v.string(),
    shortSlug: v.string(),
    // Geographic data
    country: v.string(),
    countryCode: v.string(),
    countrySlug: v.string(),
    region: v.string(),
    latitude: v.string(),
    longitude: v.string(),
    // Visual (this image serves as the hero image for city showcase)
    image: v.optional(v.string()),
    // Cached visit count for performance (updated by background job)
    visitCount: v.optional(v.number()),
  })
    .index('by_short_slug', ['shortSlug'])
    .index('by_slug', ['slug'])
    .index('by_country', ['country'])
    .index('by_region', ['region'])
    .index('by_visit_count', ['visitCount']),
  visits: defineTable({
    // Foreign keys
    userId: v.id('users'),
    cityId: v.id('cities'),
    // Date information (Unix timestamps in milliseconds)
    startDate: v.number(),
    endDate: v.number(),
    // Optional metadata
    notes: v.optional(v.string()),
    isPrivate: v.boolean(),
    // Timestamps
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_city_id', ['cityId'])
    .index('by_user_and_city', ['userId', 'cityId'])
    .index('by_start_date', ['startDate'])
    .index('by_city_and_start', ['cityId', 'startDate']),
})
