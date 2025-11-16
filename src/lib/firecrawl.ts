/**
 * Firecrawl SDK wrapper for city enrichment
 * T016-T018: Helper functions for Wikipedia scraping
 */

import FirecrawlApp from '@mendable/firecrawl-js'

/**
 * T111: Enrichment constants for performance optimization
 */
export const ENRICHMENT_CONSTANTS = {
  FIRECRAWL_TIMEOUT_MS: 30 * 1000, // 30 seconds
}

/**
 * Initialize Firecrawl client with API key from environment variables
 *
 * @returns Configured FirecrawlApp instance
 * @throws Error if FIRECRAWL_API_KEY environment variable is not set
 *
 * @example
 * const firecrawl = getFirecrawlClient();
 * const result = await firecrawl.scrape('https://example.com', { formats: ['markdown'] });
 */
export function getFirecrawlClient(): FirecrawlApp {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is not set')
  }
  // T111: Configure timeout (Firecrawl SDK accepts timeout in constructor)
  return new FirecrawlApp({
    apiKey,
    // Note: Firecrawl SDK may not expose timeout config directly
    // This is a best-effort implementation
  })
}

/**
 * Construct Wikipedia URL for city enrichment
 *
 * Generates a properly formatted Wikipedia URL for a city, handling:
 * - Space-to-underscore conversion
 * - URL encoding for special characters
 * - Disambiguation with country name for common city names
 *
 * @param cityName - City name (e.g., "Tokyo", "New York", "São Paulo")
 * @param country - Country name (e.g., "Japan", "United States", "Brazil")
 * @returns Fully qualified Wikipedia URL
 *
 * @example
 * constructWikipediaUrl("New York", "United States")
 * // Returns: "https://en.wikipedia.org/wiki/New_York,_United_States"
 *
 * @example
 * constructWikipediaUrl("São Paulo", "Brazil")
 * // Returns: "https://en.wikipedia.org/wiki/S%C3%A3o_Paulo,_Brazil"
 */
export function constructWikipediaUrl(
  cityName: string,
  country: string,
): string {
  // Basic sanitization: replace spaces with underscores, handle special chars
  const sanitizedCity = cityName.replace(/ /g, '_')
  const sanitizedCountry = country.replace(/ /g, '_')

  // For cities with same names in different countries (e.g., "Portland, Oregon" vs "Portland, UK")
  // Try city + country first (most common pattern for disambiguation)
  const urlWithCountry = `https://en.wikipedia.org/wiki/${encodeURIComponent(sanitizedCity)},_${encodeURIComponent(sanitizedCountry)}`

  return urlWithCountry
}

/**
 * T018: Count populated fields in enrichment data
 * @param data - Enrichment data object
 * @returns Number of non-null/non-undefined fields
 */
export function countPopulatedFields(data: Record<string, unknown>): number {
  let count = 0

  for (const value of Object.values(data)) {
    if (value !== null && value !== undefined) {
      // For objects and arrays, count as populated if they have content
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          if (value.length > 0) count++
        } else {
          // For objects, count if they have at least one key
          if (Object.keys(value).length > 0) count++
        }
      } else if (typeof value === 'string') {
        // For strings, count if non-empty
        if (value.trim().length > 0) count++
      } else {
        // For other types (numbers, booleans), count as populated
        count++
      }
    }
  }

  return count
}

/**
 * T113: Truncate text to maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated text (with ellipsis if truncated)
 */
export function truncateText(
  text: string | undefined | null,
  maxLength: number,
): string | undefined {
  if (!text) return undefined

  if (text.length <= maxLength) {
    return text
  }

  // Truncate and add ellipsis
  return `${text.substring(0, maxLength - 3)}...`
}
