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
    // Settings object - unified privacy features
    settings: v.optional(
      v.object({
        // Privacy features (mapped from legacy names)
        hideProfileVisits: v.optional(v.boolean()), // Hide visit list from profile page (Free + Pro) - was hideVisitHistory
        hideProfileEvents: v.optional(v.boolean()), // Hide event participation from profile page (Free + Pro)
        globalVisitPrivacy: v.optional(v.boolean()), // Hide ALL visits from discovery features (Pro only) - was globalPrivacy
        // Legacy fields for backward compatibility during migration
        hideVisitHistory: v.optional(v.boolean()), // DEPRECATED: Use hideProfileVisits
        globalPrivacy: v.optional(v.boolean()), // DEPRECATED: Use globalVisitPrivacy
      }),
    ),
    // Subscription metadata (cached from Autumn for quick checks)
    subscription: v.optional(
      v.object({
        tier: v.union(v.literal('free'), v.literal('pro')),
        status: v.union(
          v.literal('active'), // Active Pro subscription
          v.literal('cancelled'), // Cancelled but still has access until period end
          v.literal('pending_cancellation'), // Cancelled mid-month, awaiting period end
        ),
        nextBillingDate: v.optional(v.number()), // Unix timestamp in milliseconds
        periodEndDate: v.optional(v.number()), // For cancelled subscriptions
        autumnCustomerId: v.optional(v.string()), // Autumn customer ID for API calls
        lastSyncedAt: v.number(), // Last time we synced with Autumn
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
    // Test data marker (true for faker-generated seed data)
    isSeed: v.optional(v.boolean()),
    // Timestamps
    updatedAt: v.number(),
    lastSeen: v.number(),
  })
    .index('by_auth_user_id', ['authUserId'])
    .index('by_username', ['username'])
    .index('by_subscription_tier', ['subscription.tier'])
    .index('by_autumn_customer_id', ['subscription.autumnCustomerId']),
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
    // Cached current visitor count for performance (updated by background job)
    currentVisitorCount: v.optional(v.number()),
    // Enrichment metadata (T008)
    isEnriched: v.optional(v.boolean()),
    lastEnrichedAt: v.optional(v.number()),
    enrichmentInProgress: v.optional(v.boolean()),
    lockAcquiredAt: v.optional(v.number()),
  })
    .index('by_short_slug', ['shortSlug'])
    .index('by_slug', ['slug'])
    .index('by_country', ['country'])
    .index('by_region', ['region'])
    .index('by_visit_count', ['visitCount'])
    .index('by_enrichment_status', ['isEnriched', 'lastEnrichedAt']), // T009
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
    // Test data marker (true for faker-generated seed data)
    isSeed: v.optional(v.boolean()),
    // Timestamps
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_city_id', ['cityId'])
    .index('by_user_and_city', ['userId', 'cityId'])
    .index('by_start_date', ['startDate'])
    .index('by_city_and_start', ['cityId', 'startDate'])
    .index('by_city_and_end_date', ['cityId', 'endDate']),
  events: defineTable({
    // Event details
    title: v.string(),
    description: v.string(),
    // Time information (Unix timestamps in milliseconds)
    startTime: v.number(),
    endTime: v.optional(v.number()),
    timezone: v.string(), // IANA timezone (e.g., "America/New_York")
    // Location
    location: v.string(),
    // Foreign keys
    cityId: v.id('cities'),
    ownerId: v.id('users'),
    // Event settings
    maxCapacity: v.optional(v.number()), // Optional participant limit
    isParticipantListHidden: v.boolean(), // Privacy control for participant list
    isCancelled: v.boolean(), // Whether event is cancelled
  })
    .index('by_city', ['cityId'])
    .index('by_city_and_start', ['cityId', 'startTime'])
    .index('by_owner', ['ownerId']),
  eventParticipants: defineTable({
    // Foreign keys
    eventId: v.id('events'),
    userId: v.id('users'),
  })
    .index('by_event', ['eventId'])
    .index('by_user', ['userId'])
    .index('by_event_and_user', ['eventId', 'userId']),
  // T006: City enrichment content (separate table for performance)
  cityEnrichmentContent: defineTable({
    cityId: v.id('cities'),
    // Enriched content fields
    description: v.optional(v.string()),
    history: v.optional(v.string()),
    geography: v.optional(v.string()),
    climate: v.optional(v.string()),
    transportation: v.optional(v.string()),
    tourism: v.optional(
      v.object({
        overview: v.optional(v.string()),
        landmarks: v.optional(
          v.array(
            v.object({
              name: v.string(),
              description: v.string(),
            }),
          ),
        ),
        museums: v.optional(
          v.array(
            v.object({
              name: v.string(),
              description: v.string(),
            }),
          ),
        ),
        attractions: v.optional(
          v.array(
            v.object({
              name: v.string(),
              description: v.string(),
            }),
          ),
        ),
      }),
    ),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    sourceUrl: v.optional(v.string()),
    scrapedAt: v.optional(v.number()),
  }).index('by_city_id', ['cityId']), // T007: 1:1 relationship index
  // T010: Enrichment logs for monitoring and debugging
  enrichmentLogs: defineTable({
    cityId: v.id('cities'),
    success: v.boolean(),
    status: v.union(v.literal('completed'), v.literal('failed')),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    duration: v.number(),
    fieldsPopulated: v.optional(v.number()),
    error: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    initiatedBy: v.string(),
    createdAt: v.number(),
  })
    .index('by_city_id', ['cityId']) // T011
    .index('by_status', ['status']) // T012
    .index('by_created_at', ['createdAt']) // T013
    .index('by_city_and_created', ['cityId', 'createdAt']), // T014
})
