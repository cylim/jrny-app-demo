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
 * T026-T038: Core enrichment action
 * Fetches city data from Wikipedia via Firecrawl and updates database
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
        // Import Firecrawl helpers (Node.js modules)
        const {
          constructWikipediaUrl,
          getFirecrawlClient,
          countPopulatedFields,
          cleanWikipediaMarkdown,
          parseWikipediaSections,
        } = await import('../src/lib/firecrawl.js')
        const wikipediaUrl = constructWikipediaUrl(city.name, city.country)

        // Call Firecrawl API with error handling
        let scrapeResult: unknown
        try {
          const firecrawl = getFirecrawlClient()
          // Note: Firecrawl SDK v1.x uses `scrape` method instead of `scrapeUrl`
          scrapeResult = await firecrawl.scrape(wikipediaUrl, {
            formats: ['markdown'],
          })
        } catch (firecrawlError) {
          const errorCode = getFirecrawlErrorCode(firecrawlError)
          throw new Error(
            `Firecrawl API error (${errorCode}): ${firecrawlError instanceof Error ? firecrawlError.message : String(firecrawlError)}`,
          )
        }

        // Check result - Firecrawl v1.x returns { data: {...} } or { error: {...} }
        // Type assertion needed since SDK types may be incomplete
        // biome-ignore lint/suspicious/noExplicitAny: Firecrawl SDK has incomplete types
        const result = scrapeResult as any

        if (!result || result.error) {
          const errorMessage = result?.error || 'Unknown error'
          const errorCode = getFirecrawlErrorCode(new Error(errorMessage))
          throw new Error(
            `Firecrawl scrape failed (${errorCode}): ${errorMessage}`,
          )
        }

        // Parse response - access markdown from data object
        const rawMarkdown = result.data?.markdown || result.markdown || ''

        // Clean the Wikipedia markdown to remove banners, navigation, and metadata
        const cleanedMarkdown = cleanWikipediaMarkdown(rawMarkdown)

        // Parse sections from cleaned markdown
        const sections = parseWikipediaSections(cleanedMarkdown)

        const enrichedData = {
          description: sections.description,
          history: sections.history,
          geography: sections.geography,
          climate: sections.climate,
          transportation: sections.transportation,
          sourceUrl: wikipediaUrl,
          scrapedAt: Date.now(),
        }

        const fieldsPopulated = countPopulatedFields(enrichedData)

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
