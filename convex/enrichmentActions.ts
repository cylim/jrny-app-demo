/**
 * City enrichment actions (Node.js runtime)
 * Actions that require Node.js modules (Firecrawl SDK)
 */
'use node'

import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action } from './_generated/server'

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
 * @throws Error if lock acquisition fails (enrichment already in progress)
 * @throws Error if Firecrawl API call fails (network, auth, rate limit, etc.)
 * @throws Error if validation fails (missing required fields, no content extracted)
 *
 * Error codes:
 * - WIKIPEDIA_NOT_FOUND: Wikipedia page doesn't exist
 * - FIRECRAWL_RATE_LIMITED: API rate limit exceeded
 * - FIRECRAWL_TIMEOUT: API request timed out
 * - FIRECRAWL_AUTH_FAILED: Invalid API key or permissions
 * - NETWORK_ERROR: Network connection issues
 * - VALIDATION_ERROR: No content extracted from Wikipedia
 * - MISSING_REQUIRED_FIELDS: Required fields missing
 * - DATABASE_ERROR: Database operation failed
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

    // Get city data early to determine enrichment type
    const city = await ctx.runQuery(internal.enrichment.getCityById, {
      cityId: args.cityId,
    })

    if (!city) {
      throw new Error(`City ${args.cityId} not found`)
    }

    const isReenrichment = city.isEnriched === true

    try {
      // Acquire lock
      const lockAcquired = await ctx.runMutation(
        internal.enrichment.acquireLock,
        {
          cityId: args.cityId,
        },
      )

      if (!lockAcquired) {
        throw new Error(
          'Lock acquisition failed - enrichment already in progress',
        )
      }

      try {
        // Import Firecrawl helpers and schema (Node.js modules)
        const {
          constructWikipediaUrl,
          getFirecrawlClient,
          countPopulatedFields,
          ENRICHMENT_CONSTANTS,
        } = await import('../src/lib/firecrawl.js')
        const { cityEnrichmentSchema } = await import(
          '../src/lib/firecrawl-schema.js'
        )
        const wikipediaUrl = constructWikipediaUrl(city.name, city.country)

        // Call Firecrawl API with extract method for structured JSON data
        let extractResult: unknown
        try {
          const firecrawl = getFirecrawlClient()
          // T111: Use extract() method with JSON schema and timeout configuration
          extractResult = await firecrawl.extract({
            urls: [wikipediaUrl],
            schema: cityEnrichmentSchema,
            prompt:
              'Extract comprehensive city information from this Wikipedia page. Focus on providing detailed, accurate information for all sections.',
            timeout: ENRICHMENT_CONSTANTS.FIRECRAWL_TIMEOUT_MS,
          })
        } catch (firecrawlError) {
          const errorCode = getFirecrawlErrorCode(firecrawlError)
          throw new Error(
            `Firecrawl API error (${errorCode}): ${firecrawlError instanceof Error ? firecrawlError.message : String(firecrawlError)}`,
          )
        }

        // Check result - Firecrawl extract returns { success, data } or { success: false, error }
        // Type assertion needed since SDK types may be incomplete
        // biome-ignore lint/suspicious/noExplicitAny: Firecrawl SDK has incomplete types
        const result = extractResult as any

        if (!result || !result.success || result.error) {
          const errorMessage = result?.error || 'Unknown error'
          const errorCode = getFirecrawlErrorCode(new Error(errorMessage))
          throw new Error(
            `Firecrawl extract failed (${errorCode}): ${errorMessage}`,
          )
        }

        // Access extracted data directly from result
        const extractedData = result.data

        // T079-T082: Validate extracted data
        const scrapedAt = Date.now()

        // Check for required fields (name and description are required by schema)
        if (!wikipediaUrl) {
          throw new Error('(MISSING_REQUIRED_FIELDS): sourceUrl is missing')
        }
        if (!extractedData || !extractedData.description) {
          throw new Error(
            '(VALIDATION_ERROR): No description extracted from Wikipedia page',
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
          imageUrl: extractedData.image_url,
          sourceUrl: wikipediaUrl,
          scrapedAt,
        }

        // Validate that we got at least some content
        const fieldsPopulated = countPopulatedFields(enrichedData)
        if (fieldsPopulated === 0) {
          throw new Error(
            '(VALIDATION_ERROR): No content extracted from Wikipedia page',
          )
        }

        // Update city data
        await ctx.runMutation(internal.enrichment.updateCityData, {
          cityId: args.cityId,
          data: enrichedData,
        })

        const duration = Date.now() - startTime

        // Log success
        await ctx.runMutation(internal.enrichment.logEnrichment, {
          cityId: args.cityId,
          success: true,
          duration,
          sourceUrl: wikipediaUrl,
          fieldsPopulated,
          initiatedBy: isReenrichment ? 'stale_refresh' : 'user_visit',
        })

        return {
          success: true,
          duration,
        }
      } finally {
        // Always release lock
        await ctx.runMutation(internal.enrichment.releaseLock, {
          cityId: args.cityId,
        })
      }
    } catch (error) {
      // Error handling with logging
      const duration = Date.now() - startTime
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      // Extract error code
      let errorCode = 'ENRICHMENT_ERROR'
      const errorCodeMatch = errorMessage.match(/\(([A-Z_]+)\)/)
      if (errorCodeMatch) {
        errorCode = errorCodeMatch[1]
      } else {
        errorCode = getFirecrawlErrorCode(error)
      }

      // Console error for debugging
      console.error(`[Enrichment Error] City ${args.cityId}: ${errorMessage}`, {
        errorCode,
        duration,
        initiatedBy: isReenrichment ? 'stale_refresh' : 'user_visit',
      })

      await ctx.runMutation(internal.enrichment.logEnrichment, {
        cityId: args.cityId,
        success: false,
        duration,
        error: errorMessage,
        errorCode,
        initiatedBy: isReenrichment ? 'stale_refresh' : 'user_visit',
      })

      return {
        success: false,
        duration,
        error: errorMessage,
      }
    }
  },
})
