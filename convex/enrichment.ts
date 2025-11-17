/**
 * City enrichment functions using Firecrawl and Wikipedia
 * T019: Enrichment actions, queries, and mutations
 * Note: 'use node' removed - only actions can use Node.js runtime
 */

import { v } from 'convex/values'
import { internalMutation, internalQuery, query } from './_generated/server'

// Constants
const FIVE_MINUTES_MS = 5 * 60 * 1000
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000 // Cooldown period for failed enrichments

/**
 * Helper to check if a value is considered "empty" (missing data)
 * Empty means: null, undefined, empty string, empty array, or empty object
 * This prevents data loss when re-enrichment scrapes fail to extract certain fields.
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    return Object.keys(value as object).length === 0
  }
  return false
}

/**
 * T068-T069: Intelligent merge helper for re-enrichment
 * Determines if a field should be updated during re-enrichment
 * Only updates if:
 * 1. Existing value is empty (null/undefined/empty string/empty array/empty object)
 * 2. New value is NOT empty AND newer than existing
 *
 * This prevents data loss when a re-enrichment scrape fails to extract certain fields.
 * Empty strings, empty arrays, and empty objects are treated as missing data and will
 * NOT overwrite existing populated content.
 *
 * @param existingValue - Current value in database
 * @param newValue - New value from scraping
 * @param existingScrapedAt - When existing value was scraped (optional)
 * @param newScrapedAt - When new value was scraped
 * @returns true if field should be updated, false if existing value should be preserved
 */
function shouldUpdateField(
  existingValue: unknown,
  newValue: unknown,
  existingScrapedAt: number | undefined,
  newScrapedAt: number,
): boolean {
  // Update if existing value is empty (missing data)
  if (isEmpty(existingValue)) {
    return true
  }

  // Only update if new value is NOT empty AND newer than existing
  if (!isEmpty(newValue)) {
    // If we don't have existingScrapedAt, assume new data is better
    if (!existingScrapedAt) {
      return true
    }
    // Only update if new data is newer
    return newScrapedAt > existingScrapedAt
  }

  // Keep existing value if new value is empty (prevents data loss)
  return false
}

// Error mapping helper moved to enrichmentActions.ts (Node.js runtime)

/**
 * T020: Acquire lock for enrichment with stale lock detection
 * Returns true if lock acquired, false if already locked
 *
 * IMPORTANT: This uses a read-then-write pattern which has a race condition window.
 * To prevent duplicate enrichments, we also check enrichmentLogs for recent attempts.
 */
export const acquireLock = internalMutation({
  args: { cityId: v.id('cities') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId)
    if (!city) {
      throw new Error(`City ${args.cityId} not found`)
    }

    // CRITICAL: Check for recent enrichment attempts (last 30 seconds)
    // This prevents race conditions when multiple users visit simultaneously
    const recentLogs = await ctx.db
      .query('enrichmentLogs')
      .withIndex('by_city_and_created', (q) => q.eq('cityId', args.cityId))
      .order('desc')
      .take(1)

    const lastLog = recentLogs[0]
    if (lastLog) {
      const timeSinceLastAttempt = Date.now() - lastLog.startedAt
      // If enrichment started in last 30 seconds, don't acquire lock
      if (timeSinceLastAttempt < 30 * 1000) {
        console.log(
          `[Lock] Recent enrichment attempt detected (${timeSinceLastAttempt}ms ago) for city ${args.cityId}, rejecting lock`,
        )
        return false
      }
    }

    // Check if there's an existing lock
    if (city.enrichmentInProgress) {
      // Check if lock is stale (>5 minutes old)
      if (
        city.lockAcquiredAt &&
        Date.now() - city.lockAcquiredAt > FIVE_MINUTES_MS
      ) {
        // Stale lock - clear it and acquire new lock
        await ctx.db.patch(args.cityId, {
          enrichmentInProgress: true,
          lockAcquiredAt: Date.now(),
        })
        return true
      }
      // Lock is still valid - cannot acquire
      return false
    }

    // No existing lock - acquire it
    await ctx.db.patch(args.cityId, {
      enrichmentInProgress: true,
      lockAcquiredAt: Date.now(),
    })
    return true
  },
})

/**
 * Start enrichment - creates a log entry immediately after lock acquisition
 * This prevents race conditions by creating a database record that concurrent
 * requests can detect
 */
export const startEnrichment = internalMutation({
  args: {
    cityId: v.id('cities'),
    sourceUrl: v.string(),
    initiatedBy: v.string(),
  },
  returns: v.id('enrichmentLogs'),
  handler: async (ctx, args) => {
    const now = Date.now()

    // Create log entry with status 'in_progress'
    const logId = await ctx.db.insert('enrichmentLogs', {
      cityId: args.cityId,
      success: false, // Will be updated on completion
      status: 'failed', // Will be updated on completion
      startedAt: now,
      completedAt: now, // Will be updated on completion
      duration: 0, // Will be updated on completion
      sourceUrl: args.sourceUrl,
      initiatedBy: args.initiatedBy,
      createdAt: now,
    })

    return logId
  },
})

/**
 * Update enrichment log with final result
 */
export const updateEnrichmentLog = internalMutation({
  args: {
    logId: v.id('enrichmentLogs'),
    success: v.boolean(),
    duration: v.number(),
    fieldsPopulated: v.optional(v.number()),
    error: v.optional(v.string()),
    errorCode: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      success: args.success,
      status: args.success ? 'completed' : 'failed',
      completedAt: Date.now(),
      duration: args.duration,
      fieldsPopulated: args.fieldsPopulated,
      error: args.error,
      errorCode: args.errorCode,
    })
    return null
  },
})

/**
 * T021: Release lock after enrichment completes or fails
 */
export const releaseLock = internalMutation({
  args: { cityId: v.id('cities') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cityId, {
      enrichmentInProgress: false,
      lockAcquiredAt: undefined,
    })
    return null
  },
})

/**
 * T105-T107: Clean stale locks (for cron job)
 * Finds and clears locks that are older than 5 minutes
 */
export const cleanStaleLocks = internalMutation({
  args: {},
  returns: v.object({
    clearedCount: v.number(),
  }),
  handler: async (ctx) => {
    // T106: Find cities with stale locks (>5 minutes old)
    const staleThreshold = Date.now() - FIVE_MINUTES_MS

    const staleCities = await ctx.db
      .query('cities')
      .filter((q) =>
        q.and(
          q.eq(q.field('enrichmentInProgress'), true),
          q.lt(q.field('lockAcquiredAt'), staleThreshold),
        ),
      )
      .collect()

    // T107: Clear stale locks
    for (const city of staleCities) {
      await ctx.db.patch(city._id, {
        enrichmentInProgress: false,
        lockAcquiredAt: undefined,
      })
    }

    return { clearedCount: staleCities.length }
  },
})

/**
 * T021-T025: Check enrichment status for a city
 * Returns whether enrichment is needed and the reason
 * Includes cooldown logic to prevent excessive API usage
 */
export const checkEnrichmentStatus = query({
  args: { cityId: v.id('cities') },
  returns: v.object({
    needsEnrichment: v.boolean(),
    reason: v.union(
      v.literal('never_enriched'),
      v.literal('stale_data'),
      v.literal('in_progress'),
      v.literal('up_to_date'),
      v.literal('cooldown'), // New: waiting for cooldown after failure
    ),
  }),
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId)
    if (!city) {
      throw new Error(`City ${args.cityId} not found`)
    }

    // T023: Check if enrichment is in progress
    if (city.enrichmentInProgress) {
      return {
        needsEnrichment: false, // Changed: don't trigger if already in progress
        reason: 'in_progress' as const,
      }
    }

    // Check recent enrichment attempts for cooldown logic
    const recentLogs = await ctx.db
      .query('enrichmentLogs')
      .withIndex('by_city_and_created', (q) => q.eq('cityId', args.cityId))
      .order('desc')
      .take(1)

    const lastAttempt = recentLogs[0]

    // If last attempt was recent and failed, apply cooldown
    if (lastAttempt && !lastAttempt.success) {
      const timeSinceLastAttempt = Date.now() - lastAttempt.createdAt
      if (timeSinceLastAttempt < ONE_HOUR_MS) {
        return {
          needsEnrichment: false,
          reason: 'cooldown' as const,
        }
      }
    }

    // T022: Check if never enriched
    if (!city.isEnriched || !city.lastEnrichedAt) {
      return {
        needsEnrichment: true,
        reason: 'never_enriched' as const,
      }
    }

    // T024: Check if data is stale (>1 week old)
    if (Date.now() - city.lastEnrichedAt > ONE_WEEK_MS) {
      return {
        needsEnrichment: true,
        reason: 'stale_data' as const,
      }
    }

    // T025: Data is up to date
    return {
      needsEnrichment: false,
      reason: 'up_to_date' as const,
    }
  },
})

/**
 * T025a-T025b: Get city enrichment content
 * Returns enrichment content for a city or null if not enriched
 */
export const getCityEnrichmentContent = query({
  args: { cityId: v.id('cities') },
  returns: v.union(
    v.object({
      _id: v.id('cityEnrichmentContent'),
      _creationTime: v.number(),
      cityId: v.id('cities'),
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
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    // T025b: Query with index and return null if not found
    const content = await ctx.db
      .query('cityEnrichmentContent')
      .withIndex('by_city_id', (q) => q.eq('cityId', args.cityId))
      .unique()

    return content ?? null
  },
})

/**
 * Helper: Get city by ID for actions
 */
export const getCityById = internalQuery({
  args: { cityId: v.id('cities') },
  returns: v.union(
    v.object({
      _id: v.id('cities'),
      name: v.string(),
      country: v.string(),
      isEnriched: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId)
    if (!city) return null
    return {
      _id: city._id,
      name: city.name,
      country: city.country,
      isEnriched: city.isEnriched,
    }
  },
})

/**
 * T039-T041: Update city data with enrichment content
 * Upserts enrichment content and updates city metadata
 */
export const updateCityData = internalMutation({
  args: {
    cityId: v.id('cities'),
    data: v.object({
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
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // T070: Fetch existing content
    const existing = await ctx.db
      .query('cityEnrichmentContent')
      .withIndex('by_city_id', (q) => q.eq('cityId', args.cityId))
      .unique()

    // T083-T084: Wrap database operations in try/catch
    try {
      // T040a + T071: Intelligent upsert with field preservation
      if (existing) {
        // T071: Build update object with intelligent merge
        const existingScrapedAt = existing.scrapedAt
        const newScrapedAt = args.data.scrapedAt || Date.now()

        const updates: Record<string, unknown> = {}

        // Simple string fields
        if (
          shouldUpdateField(
            existing.description,
            args.data.description,
            existingScrapedAt,
            newScrapedAt,
          )
        ) {
          updates.description = args.data.description
        }
        if (
          shouldUpdateField(
            existing.history,
            args.data.history,
            existingScrapedAt,
            newScrapedAt,
          )
        ) {
          updates.history = args.data.history
        }
        if (
          shouldUpdateField(
            existing.geography,
            args.data.geography,
            existingScrapedAt,
            newScrapedAt,
          )
        ) {
          updates.geography = args.data.geography
        }
        if (
          shouldUpdateField(
            existing.climate,
            args.data.climate,
            existingScrapedAt,
            newScrapedAt,
          )
        ) {
          updates.climate = args.data.climate
        }
        if (
          shouldUpdateField(
            existing.transportation,
            args.data.transportation,
            existingScrapedAt,
            newScrapedAt,
          )
        ) {
          updates.transportation = args.data.transportation
        }

        // Complex fields (tourism object, images array)
        if (
          shouldUpdateField(
            existing.tourism,
            args.data.tourism,
            existingScrapedAt,
            newScrapedAt,
          )
        ) {
          updates.tourism = args.data.tourism
        }
        if (
          shouldUpdateField(
            existing.images,
            args.data.images,
            existingScrapedAt,
            newScrapedAt,
          )
        ) {
          updates.images = args.data.images
        }

        // Always update metadata fields
        updates.sourceUrl = args.data.sourceUrl
        updates.scrapedAt = newScrapedAt

        await ctx.db.patch(existing._id, updates)
      } else {
        // Initial enrichment - insert all data
        await ctx.db.insert('cityEnrichmentContent', {
          cityId: args.cityId,
          ...args.data,
        })
      }

      await ctx.db.patch(args.cityId, {
        isEnriched: true,
        lastEnrichedAt: Date.now(),
      })
    } catch (dbError) {
      // T083-T084: Database error handling
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError)
      console.error(
        `[Database Error] Failed to update city data for ${args.cityId}:`,
        errorMessage,
      )
      throw new Error(`DATABASE_ERROR: ${errorMessage}`)
    }

    return null
  },
})

/**
 * T042-T045: Log enrichment attempt
 * Records success/failure, duration, and error details
 */
export const logEnrichment = internalMutation({
  args: {
    cityId: v.id('cities'),
    success: v.boolean(),
    duration: v.number(),
    error: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    fieldsPopulated: v.optional(v.number()),
    initiatedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()

    // T085: Wrap insert in try/catch with console.error fallback
    try {
      // T043-T045: Insert log with all fields
      await ctx.db.insert('enrichmentLogs', {
        cityId: args.cityId,
        success: args.success,
        status: args.success ? 'completed' : 'failed', // T044
        startedAt: now - args.duration, // T045: Calculate start time
        completedAt: now, // T045
        duration: args.duration,
        fieldsPopulated: args.fieldsPopulated,
        error: args.error,
        errorCode: args.errorCode,
        sourceUrl: args.sourceUrl,
        initiatedBy: args.initiatedBy, // T043
        createdAt: now, // T045
      })
    } catch (logError) {
      // T085: If logging fails, console.error as fallback
      console.error(
        '[Enrichment Log Error] Failed to log enrichment attempt:',
        {
          cityId: args.cityId,
          success: args.success,
          error: args.error,
          errorCode: args.errorCode,
          logError:
            logError instanceof Error ? logError.message : String(logError),
        },
      )
      // Don't throw - logging failure shouldn't crash enrichment
    }

    return null
  },
})

// enrichCity action moved to enrichmentActions.ts (Node.js runtime required for Firecrawl SDK)

/**
 * T089-T091: Get enrichment history for a city
 * Returns latest 10 enrichment attempts for monitoring
 */
export const getEnrichmentHistory = query({
  args: { cityId: v.id('cities') },
  returns: v.array(
    v.object({
      _id: v.id('enrichmentLogs'),
      _creationTime: v.number(),
      success: v.boolean(),
      status: v.union(v.literal('completed'), v.literal('failed')),
      duration: v.number(),
      error: v.optional(v.string()),
      errorCode: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
      initiatedBy: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    // T090: Query logs using by_city_and_created index
    const logs = await ctx.db
      .query('enrichmentLogs')
      .withIndex('by_city_and_created', (q) => q.eq('cityId', args.cityId))
      .order('desc') // T091: Descending order (newest first)
      .take(10) // T091: Latest 10 logs

    // Return minimal fields for display
    return logs.map((log) => ({
      _id: log._id,
      _creationTime: log._creationTime,
      success: log.success,
      status: log.status,
      duration: log.duration,
      error: log.error,
      errorCode: log.errorCode,
      sourceUrl: log.sourceUrl,
      initiatedBy: log.initiatedBy,
      createdAt: log.createdAt,
    }))
  },
})

/**
 * T092-T095: Get enrichment statistics for monitoring dashboard
 * @param hours - Number of hours to look back (default: 24)
 * @returns Aggregated stats: total, successful, failed, avgDuration, successRate
 */
export const getEnrichmentStats = query({
  args: { hours: v.optional(v.number()) },
  returns: v.object({
    total: v.number(),
    successful: v.number(),
    failed: v.number(),
    avgDuration: v.number(),
    successRate: v.number(),
  }),
  handler: async (ctx, args) => {
    const hours = args.hours || 24
    // T093: Calculate time threshold
    const threshold = Date.now() - hours * 60 * 60 * 1000

    // Query all logs within time window
    const logs = await ctx.db
      .query('enrichmentLogs')
      .withIndex('by_created_at', (q) => q.gt('createdAt', threshold))
      .collect()

    const total = logs.length
    const successful = logs.filter((log) => log.success).length
    const failed = total - successful

    // T094: Calculate success rate
    const successRate = total > 0 ? successful / total : 0

    // T095: Calculate average duration
    const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0)
    const avgDuration = total > 0 ? totalDuration / total : 0

    return {
      total,
      successful,
      failed,
      avgDuration,
      successRate,
    }
  },
})
