/**
 * Enrichment API Contracts
 *
 * This file defines TypeScript interfaces, Zod schemas, and API contracts for the
 * Firecrawl City Enrichment feature. It serves as the single source of truth for data
 * validation and type safety across the enrichment pipeline.
 *
 * Usage:
 * - Import schemas for runtime validation in Convex functions
 * - Import types for TypeScript interface checking in client code
 * - Extend these contracts as new enrichment fields are added
 */

import { z } from 'zod'

/**
 * ============================================================================
 * FIRECRAWL REQUEST & RESPONSE TYPES
 * ============================================================================
 */

/**
 * Firecrawl SDK Response Type (minimal)
 * The actual response may contain additional fields; these are the core fields we use
 */
export interface FirecrawlScrapeResponse {
  success: boolean
  data: {
    markdown?: string
    html?: string
    metadata?: Record<string, unknown>
    links?: string[]
    screenshot?: string
    pageStatusCode?: number
    [key: string]: unknown // Firecrawl may return additional fields
  }
}

/**
 * ============================================================================
 * ZOD SCHEMAS FOR VALIDATION
 * ============================================================================
 */

/**
 * Wikipedia Infobox data extracted via Firecrawl schema extraction
 * These are parsed from the Wikipedia settlement infobox template
 */
export const WikipediaInfoboxSchema = z
  .object({
    name: z.string().optional(),
    nickname: z.string().optional(),
    population: z.number().int().positive().optional(),
    area_km2: z.number().positive().optional(),
    elevation_m: z.number().optional(),
    timezone: z.string().optional(),
    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
      })
      .optional(),
    image_skyline: z.string().url().optional(),
    established_date: z.string().optional(),
  })
  .strict()

export type WikipediaInfobox = z.infer<typeof WikipediaInfoboxSchema>

/**
 * Tourism and culture data extracted from Wikipedia sections
 */
export const TourismDataSchema = z
  .object({
    overview: z.string().max(1500).optional(), // Tourism summary paragraph
    landmarks: z.array(z.string()).max(20).optional(), // Notable POIs
    museums: z.array(z.string()).max(15).optional(), // Museums and galleries
    attractions: z.array(z.string()).max(25).optional(), // General attractions
  })
  .strict()

export type TourismData = z.infer<typeof TourismDataSchema>

/**
 * Complete enriched city data from Wikipedia
 * Includes both structured infobox data and article content
 */
export const EnrichedCityDataSchema = z
  .object({
    // Structured infobox data
    infobox: WikipediaInfoboxSchema.optional(),

    // Article section content (prose)
    description: z.string().max(5000).optional(), // Lead section overview
    history: z.string().max(3000).optional(), // History section summary
    geography: z.string().max(2000).optional(), // Geography section
    climate: z.string().max(2000).optional(), // Climate section
    tourism: TourismDataSchema.optional(), // Tourism data
    transportation: z.string().max(2000).optional(), // Transportation section

    // Images from Wikipedia
    images: z.array(z.string().url()).max(10).optional(), // Hero images, landmarks, etc.

    // Source metadata
    source_url: z.string().url(), // Wikipedia page URL (required)
    scraped_at: z.number().int().positive(), // Unix timestamp when scraped (required)
  })
  .strict()

export type EnrichedCityData = z.infer<typeof EnrichedCityDataSchema>

/**
 * ============================================================================
 * CONVEX FUNCTION ARGUMENT SCHEMAS
 * ============================================================================
 */

/**
 * Arguments for checkEnrichmentStatus query
 * Checks if a city needs enrichment and returns the reason
 */
export const CheckEnrichmentStatusArgsSchema = z.object({
  cityId: z.string(), // Id<'cities'> - represented as string in validators
})

export type CheckEnrichmentStatusArgs = z.infer<
  typeof CheckEnrichmentStatusArgsSchema
>

/**
 * Response from checkEnrichmentStatus query
 */
export const EnrichmentStatusSchema = z.object({
  needsEnrichment: z.boolean(),
  reason: z.enum([
    'never_enriched', // City has never been enriched
    'stale_data', // lastEnrichedAt > 1 week ago
    'in_progress', // Enrichment currently running
    'up_to_date', // Recently enriched, no action needed
  ]),
})

export type EnrichmentStatus = z.infer<typeof EnrichmentStatusSchema>

/**
 * Arguments for enrichCity action
 * Triggers enrichment of a single city via Firecrawl
 */
export const EnrichCityArgsSchema = z.object({
  cityId: z.string(), // Id<'cities'>
})

export type EnrichCityArgs = z.infer<typeof EnrichCityArgsSchema>

/**
 * Response from enrichCity action
 * Success case includes duration; failure case includes error message
 */
export const EnrichmentResultSchema = z.union([
  z.object({
    success: z.literal(true),
    duration: z.number().int().positive(), // Milliseconds
    fieldsPopulated: z.number().int().nonnegative().optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    duration: z.number().int().nonnegative().optional(),
  }),
])

export type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>

/**
 * Arguments for acquireLock internal mutation
 * Acquires concurrency lock for enrichment
 */
export const AcquireLockArgsSchema = z.object({
  cityId: z.string(), // Id<'cities'>
})

export type AcquireLockArgs = z.infer<typeof AcquireLockArgsSchema>

/**
 * Arguments for releaseLock internal mutation
 */
export const ReleaseLockArgsSchema = z.object({
  cityId: z.string(), // Id<'cities'>
})

export type ReleaseLockArgs = z.infer<typeof ReleaseLockArgsSchema>

/**
 * Arguments for updateCityData internal mutation
 * Updates city record with enriched data
 */
export const UpdateCityDataArgsSchema = z.object({
  cityId: z.string(), // Id<'cities'>
  data: EnrichedCityDataSchema,
})

export type UpdateCityDataArgs = z.infer<typeof UpdateCityDataArgsSchema>

/**
 * Arguments for logEnrichment internal mutation
 * Creates audit log entry for enrichment attempt
 */
export const LogEnrichmentArgsSchema = z.object({
  cityId: z.string(), // Id<'cities'>
  success: z.boolean(),
  duration: z.number().int().nonnegative(),
  error: z.string().optional(), // Error message if failed
  errorCode: z.string().optional(), // Machine-readable error code
  sourceUrl: z.string().optional(),
  fieldsPopulated: z.number().int().nonnegative().optional(),
})

export type LogEnrichmentArgs = z.infer<typeof LogEnrichmentArgsSchema>

/**
 * ============================================================================
 * ERROR TYPES & CODES
 * ============================================================================
 */

/**
 * Machine-readable error codes for enrichment failures
 * Used for monitoring, alerting, and debugging
 */
export enum EnrichmentErrorCode {
  // Firecrawl API errors
  FIRECRAWL_API_ERROR = 'FIRECRAWL_API_ERROR', // General API error
  FIRECRAWL_TIMEOUT = 'FIRECRAWL_TIMEOUT', // Request timed out (>30s)
  FIRECRAWL_RATE_LIMITED = 'FIRECRAWL_RATE_LIMITED', // 429 Too Many Requests
  FIRECRAWL_INVALID_URL = 'FIRECRAWL_INVALID_URL', // URL not accessible
  FIRECRAWL_AUTH_FAILED = 'FIRECRAWL_AUTH_FAILED', // API key invalid/expired

  // Data validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR', // Zod schema validation failed
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS', // Critical fields missing

  // Data source errors
  WIKIPEDIA_NOT_FOUND = 'WIKIPEDIA_NOT_FOUND', // City page not found on Wikipedia
  WIKIPEDIA_DISAMBIGUATION = 'WIKIPEDIA_DISAMBIGUATION', // Ambiguous city name
  WIKIPEDIA_REDIRECT = 'WIKIPEDIA_REDIRECT', // Page redirected (disambiguation)

  // System errors
  CITY_NOT_FOUND = 'CITY_NOT_FOUND', // City ID doesn't exist in database
  LOCK_ACQUISITION_FAILED = 'LOCK_ACQUISITION_FAILED', // Could not acquire concurrency lock
  DATABASE_ERROR = 'DATABASE_ERROR', // Convex database error
  UNKNOWN_ERROR = 'UNKNOWN_ERROR', // Unclassified error
}

/**
 * Error context object for enrichment failures
 * Provides additional debugging information
 */
export interface EnrichmentErrorContext {
  sourceUrl?: string // URL being scraped when error occurred
  validationErrors?: string[] // Zod validation failure messages
  retryCount?: number // Number of retry attempts
  firecrawlStatusCode?: number // HTTP status from Firecrawl API
  timestamp?: number // When error occurred
}

/**
 * Standard error response structure
 */
export interface EnrichmentError {
  code: EnrichmentErrorCode
  message: string
  context?: EnrichmentErrorContext
}

/**
 * ============================================================================
 * DATABASE SCHEMA TYPES (for TypeScript type safety)
 * ============================================================================
 */

/**
 * Enriched city record as stored in Convex database
 * This is the actual data structure in the cities table
 */
export interface EnrichedCity {
  _id: string // Doc ID (Id<'cities'>)
  _creationTime: number

  // Core fields (unchanged)
  name: string
  slug: string
  shortSlug: string
  country: string
  countryCode: string
  countrySlug: string
  region: string
  latitude: string
  longitude: string
  image?: string
  visitCount?: number
  currentVisitorCount?: number

  // Enriched content fields (all optional)
  description?: string
  history?: string
  geography?: string
  climate?: string
  transportation?: string
  tourism?: TourismData
  images?: string[]

  // Enrichment metadata
  isEnriched?: boolean
  lastEnrichedAt?: number // Unix timestamp (milliseconds)
  scrapedAt?: number // Unix timestamp (milliseconds)
  sourceUrl?: string
  enrichmentInProgress?: boolean
  lockAcquiredAt?: number // Unix timestamp
}

/**
 * Enrichment log record
 */
export interface EnrichmentLog {
  _id: string // Doc ID (Id<'enrichmentLogs'>)
  _creationTime: number

  // References & status
  cityId: string // Id<'cities'>
  success: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

  // Timing
  startedAt: number // Unix timestamp
  completedAt?: number // Unix timestamp
  durationMs?: number

  // Metrics
  fieldsPopulated?: number
  fieldsAttempted?: number

  // Error info
  error?: string
  errorCode?: EnrichmentErrorCode
  errorContext?: EnrichmentErrorContext

  // Source
  sourceUrl?: string
  userAgent?: string
  initiatedBy: 'user_visit' | 'stale_refresh' | 'manual_trigger' | 'cron_job'

  // Metadata
  createdAt: number
  note?: string
}

/**
 * ============================================================================
 * VALIDATION HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Validates enriched city data against schema
 * @param data - Raw data from Firecrawl
 * @returns Parsed data or validation error
 */
export function validateEnrichedData(
  data: unknown,
):
  | { success: true; data: EnrichedCityData }
  | { success: false; error: z.ZodError } {
  const result = EnrichedCityDataSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Checks if enrichment status indicates data is stale
 * @param lastEnrichedAt - Unix timestamp of last enrichment (milliseconds)
 * @returns true if older than 1 week
 */
export function isEnrichmentStale(lastEnrichedAt?: number): boolean {
  if (!lastEnrichedAt) return true
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
  return Date.now() - lastEnrichedAt > ONE_WEEK_MS
}

/**
 * Checks if enrichment lock is stale
 * @param lockAcquiredAt - Unix timestamp when lock was acquired (milliseconds)
 * @returns true if lock held for >5 minutes
 */
export function isLockStale(lockAcquiredAt?: number): boolean {
  if (!lockAcquiredAt) return false
  const FIVE_MINUTES_MS = 5 * 60 * 1000
  return Date.now() - lockAcquiredAt > FIVE_MINUTES_MS
}

/**
 * Formats enrichment error for logging/display
 * @param error - Error object
 * @returns Formatted error message
 */
export function formatEnrichmentError(error: EnrichmentError): string {
  let message = `[${error.code}] ${error.message}`
  if (error.context?.sourceUrl) {
    message += ` (URL: ${error.context.sourceUrl})`
  }
  return message
}

/**
 * ============================================================================
 * CONSTANTS
 * ============================================================================
 */

export const ENRICHMENT_CONSTANTS = {
  // Freshness thresholds
  STALE_AFTER_MS: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
  LOCK_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes for stale lock detection
  MAX_DURATION_MS: 30 * 1000, // Max expected enrichment time (30 seconds)

  // API limits
  MAX_ERROR_MESSAGE_LENGTH: 1000,
  FIRECRAWL_TIMEOUT_MS: 30 * 1000, // 30 seconds

  // Retry strategy
  MAX_RETRIES: 2,
  RETRY_BACKOFF_MS: [1000, 2000], // [first retry, second retry]
} as const

/**
 * ============================================================================
 * EXAMPLES & TEST DATA
 * ============================================================================
 */

export const EXAMPLE_ENRICHED_CITY_DATA: EnrichedCityData = {
  description: 'Paris is the capital and most populous city of France.',
  history: 'The area around Paris has been inhabited for thousands of years.',
  geography: 'Paris is located in the north-central part of France.',
  climate:
    'Paris has a temperate maritime climate with cool winters and warm summers.',
  tourism: {
    overview: "Paris is one of the world's leading tourist destinations.",
    landmarks: [
      'Eiffel Tower',
      'Notre-Dame',
      'Arc de Triomphe',
      'Louvre Museum',
    ],
    museums: ['Louvre', "Musée d'Orsay", 'Musée Rodin'],
    attractions: [
      'Latin Quarter',
      'Champs-Élysées',
      'Montmartre',
      'Sacré-Cœur',
    ],
  },
  transportation:
    'Paris has an extensive public transport system including metro, buses, and trains.',
  images: [
    'https://upload.wikimedia.org/wikipedia/commons/8/85/Paris_2008.jpg',
  ],
  source_url: 'https://en.wikipedia.org/wiki/Paris',
  scraped_at: Date.now(),
}

export const EXAMPLE_ENRICHMENT_LOG: Omit<
  EnrichmentLog,
  '_id' | '_creationTime'
> = {
  cityId: 'city_12345',
  success: true,
  status: 'completed',
  startedAt: Date.now() - 25000,
  completedAt: Date.now(),
  durationMs: 25000,
  fieldsPopulated: 8,
  fieldsAttempted: 9,
  sourceUrl: 'https://en.wikipedia.org/wiki/Paris',
  initiatedBy: 'user_visit',
  createdAt: Date.now(),
}
