/**
 * City enrichment actions (Node.js runtime)
 * Actions that require Node.js modules (Firecrawl SDK)
 */
'use node'

import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action } from './_generated/server'

/**
 * Custom error class for enrichment errors with typed error codes
 */
class EnrichmentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'EnrichmentError'
  }
}

/**
 * T074-T078: Map Firecrawl errors to specific error codes
 */
function getFirecrawlErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('404') || message.includes('not found')) {
      return 'WIKIPEDIA_NOT_FOUND'
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return 'FIRECRAWL_RATE_LIMITED'
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'FIRECRAWL_TIMEOUT'
    }
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('invalid api key')
    ) {
      return 'FIRECRAWL_AUTH_FAILED'
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR'
    }
  }
  return 'ENRICHMENT_ERROR'
}

/**
 * Core enrichment action - Fetches structured city data from Wikipedia via Firecrawl
 *
 * This action implements the complete enrichment flow using Firecrawl's extract API:
 * 1. Acquires lock to prevent concurrent enrichment
 * 2. Fetches Wikipedia content via Firecrawl extract API with JSON schema
 * 3. Extracts structured data including tourism landmarks, museums, and attractions
 * 4. Validates extracted data quality and completeness
 * 5. Updates city enrichment content in database with structured tourism data
 * 6. Logs enrichment attempt with success/failure details
 * 7. Releases lock (always, via finally block)
 *
 * The extract API uses AI to parse Wikipedia pages into structured JSON matching our schema,
 * providing richer data than markdown parsing, including:
 * - Detailed tourism information with landmarks (name + description)
 * - Museums and cultural institutions as structured objects
 * - Attractions with descriptions
 * - Wikipedia image URLs
 *
 * @param args.cityId - The ID of the city to enrich
 * @returns Object with success status, duration, and optional error message
 *
 * @throws EnrichmentError with typed error codes for all failure modes
 * All errors are caught, logged, and returned with consistent shape { success: false, duration, error }
 *
 * Error codes:
 * - CITY_NOT_FOUND: City doesn't exist in database
 * - LOCK_ACQUISITION_FAILED: Enrichment already in progress for this city
 * - WIKIPEDIA_NOT_FOUND: Wikipedia page doesn't exist
 * - FIRECRAWL_RATE_LIMITED: API rate limit exceeded
 * - FIRECRAWL_TIMEOUT: API request timed out
 * - FIRECRAWL_AUTH_FAILED: Invalid API key or permissions
 * - NETWORK_ERROR: Network connection issues
 * - VALIDATION_ERROR: No content extracted from Wikipedia
 * - ENRICHMENT_ERROR: Generic enrichment error (fallback)
 *
 * @example
 * const result = await ctx.runAction(api.enrichmentActions.enrichCity, {
 *   cityId: "j97h8f3k2n9d7s5t" as Id<"cities">
 * });
 * if (result.success) {
 *   console.log(`Enriched in ${result.duration}ms`);
 * }
 */
export const enrichCity = action({
  args: { cityId: v.id('cities') },
  returns: v.object({
    success: v.boolean(),
    duration: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now()
    let isReenrichment = false

    try {
      // Get city data early to determine enrichment type
      const city = await ctx.runQuery(internal.enrichment.getCityById, {
        cityId: args.cityId,
      })

      if (!city) {
        const duration = Date.now() - startTime
        const errorMessage = `City ${args.cityId} not found`

        // Log the city not found error
        await ctx.runMutation(internal.enrichment.logEnrichment, {
          cityId: args.cityId,
          success: false,
          duration,
          error: errorMessage,
          errorCode: 'CITY_NOT_FOUND',
          initiatedBy: 'user_visit',
        })

        return {
          success: false,
          duration,
          error: errorMessage,
        }
      }

      isReenrichment = city.isEnriched === true

      // Acquire lock
      const lockAcquired = await ctx.runMutation(
        internal.enrichment.acquireLock,
        {
          cityId: args.cityId,
        },
      )

      if (!lockAcquired) {
        throw new EnrichmentError(
          'Lock acquisition failed - enrichment already in progress',
          'LOCK_ACQUISITION_FAILED',
        )
      }

      // Import Firecrawl helpers and schema (Node.js modules)
      const {
        constructWikipediaUrl,
        getFirecrawlClient,
        countPopulatedFields,
      } = await import('../src/lib/firecrawl.js')
      const { cityEnrichmentSchema } = await import(
        '../src/lib/firecrawl-schema.js'
      )
      const wikipediaUrl = constructWikipediaUrl(city.name, city.country)

      // CRITICAL: Create enrichment log immediately after lock acquisition
      // This prevents race conditions by creating a database record
      const logId = await ctx.runMutation(internal.enrichment.startEnrichment, {
        cityId: args.cityId,
        sourceUrl: wikipediaUrl,
        initiatedBy: isReenrichment ? 'stale_refresh' : 'user_visit',
      })

      try {
        // Call Firecrawl API with extract method for AI-powered structured JSON data
        let extractResult: unknown
        try {
          const firecrawl = getFirecrawlClient()
          // Use extract() with JSON schema for AI-powered data extraction
          extractResult = await firecrawl.extract({
            urls: [wikipediaUrl],
            schema: cityEnrichmentSchema,
          })
        } catch (firecrawlError) {
          const errorCode = getFirecrawlErrorCode(firecrawlError)
          const errorMessage =
            firecrawlError instanceof Error
              ? firecrawlError.message
              : String(firecrawlError)
          throw new EnrichmentError(
            `Firecrawl API error: ${errorMessage}`,
            errorCode,
          )
        }

        // Check result - Firecrawl extract returns { success, data } with data containing extracted data
        // Type assertion needed since SDK types may be incomplete
        // biome-ignore lint/suspicious/noExplicitAny: Firecrawl SDK has incomplete types
        const result = extractResult as any

        if (!result || !result.success || result.error) {
          const errorMessage = result?.error || 'Unknown error'
          const errorCode = getFirecrawlErrorCode(new Error(errorMessage))
          throw new EnrichmentError(
            `Firecrawl extract failed: ${errorMessage}`,
            errorCode,
          )
        }

        // Access extracted data directly from result.data (extract API)
        const extractedData = result.data

        // T079-T082: Validate extracted data
        const scrapedAt = Date.now()

        // Check for required fields (name and description are required by schema)
        if (!extractedData || !extractedData.description) {
          throw new EnrichmentError(
            'No description extracted from Wikipedia page',
            'VALIDATION_ERROR',
          )
        }

        // Build enriched data object matching database schema
        const enrichedData = {
          description: extractedData.description,
          history: extractedData.history,
          geography: extractedData.geography,
          climate: extractedData.climate,
          transportation: extractedData.transportation,
          tourism: extractedData.tourism
            ? {
                overview: extractedData.tourism.overview,
                landmarks: extractedData.tourism.landmarks || [],
                museums: extractedData.tourism.museums || [],
                attractions: extractedData.tourism.attractions || [],
              }
            : undefined,
          sourceUrl: wikipediaUrl,
          scrapedAt,
        }

        // Validate that we got at least some content
        const fieldsPopulated = countPopulatedFields(enrichedData)
        if (fieldsPopulated === 0) {
          throw new EnrichmentError(
            'No content extracted from Wikipedia page',
            'VALIDATION_ERROR',
          )
        }

        // Update city data
        await ctx.runMutation(internal.enrichment.updateCityData, {
          cityId: args.cityId,
          data: enrichedData,
        })

        const duration = Date.now() - startTime

        // Update log with success
        await ctx.runMutation(internal.enrichment.updateEnrichmentLog, {
          logId,
          success: true,
          duration,
          fieldsPopulated,
        })

        return {
          success: true,
          duration,
        }
      } catch (innerError) {
        // Update log with failure
        const duration = Date.now() - startTime
        const errorMessage =
          innerError instanceof Error ? innerError.message : String(innerError)
        const errorCode =
          innerError instanceof EnrichmentError
            ? innerError.code
            : getFirecrawlErrorCode(innerError)

        await ctx.runMutation(internal.enrichment.updateEnrichmentLog, {
          logId,
          success: false,
          duration,
          error: errorMessage,
          errorCode,
        })

        // Re-throw to be caught by outer catch
        throw innerError
      } finally {
        // Always release lock
        await ctx.runMutation(internal.enrichment.releaseLock, {
          cityId: args.cityId,
        })
      }
    } catch (error) {
      // Error handling - logging already done in inner catch or via logEnrichment
      const duration = Date.now() - startTime
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      // Extract error code
      let errorCode: string
      if (error instanceof EnrichmentError) {
        errorCode = error.code
      } else {
        errorCode = getFirecrawlErrorCode(error)
      }

      // Console error for debugging
      console.error(`[Enrichment Error] City ${args.cityId}: ${errorMessage}`, {
        errorCode,
        duration,
        initiatedBy: isReenrichment ? 'stale_refresh' : 'user_visit',
      })

      // Only log if this is a lock failure or early error (before startEnrichment was called)
      if (
        errorCode === 'LOCK_ACQUISITION_FAILED' ||
        errorCode === 'CITY_NOT_FOUND'
      ) {
        await ctx.runMutation(internal.enrichment.logEnrichment, {
          cityId: args.cityId,
          success: false,
          duration,
          error: errorMessage,
          errorCode,
          initiatedBy: isReenrichment ? 'stale_refresh' : 'user_visit',
        })
      }

      return {
        success: false,
        duration,
        error: errorMessage,
      }
    }
  },
})
