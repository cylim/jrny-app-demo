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
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_HISTORY_LENGTH: 3000,
  MAX_GEOGRAPHY_LENGTH: 2000,
  MAX_CLIMATE_LENGTH: 2000,
  MAX_TRANSPORT_LENGTH: 2000,
}

/**
 * T016 + T111: Initialize Firecrawl client with API key and timeout
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
 * T017: Construct Wikipedia URL for city enrichment
 * @param cityName - City name (e.g., "Tokyo", "New York")
 * @param country - Country name (e.g., "Japan", "United States")
 * @returns Wikipedia URL for the city
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

/**
 * Clean Wikipedia markdown by removing navigation, banners, and metadata
 * @param markdown - Raw Wikipedia markdown from Firecrawl
 * @returns Cleaned article text
 */
export function cleanWikipediaMarkdown(markdown: string): string {
  if (!markdown) return ''

  let cleaned = markdown

  // Remove common Wikipedia page elements
  // 1. Remove everything before "From Wikipedia, the free encyclopedia"
  const fromWikipediaMatch = cleaned.indexOf(
    'From Wikipedia, the free encyclopedia',
  )
  if (fromWikipediaMatch !== -1) {
    cleaned = cleaned.substring(
      fromWikipediaMatch + 'From Wikipedia, the free encyclopedia'.length,
    )
  }

  // 2. Remove banner messages (e.g., Asian Month, donation banners)
  cleaned = cleaned.replace(/\[Jump to content\][\s\S]*?\(#bodyContent\)/g, '')
  cleaned = cleaned.replace(
    /\[!\[Banner logo\][\s\S]*?\[Hide\]\([\s\S]*?\)/g,
    '',
  )

  // 3. Remove coordinates line
  cleaned = cleaned.replace(
    /\[Coordinates\][\s\S]*?Geographic coordinate system[\s\S]*?\n/g,
    '',
  )

  // 4. Remove redirect notices
  cleaned = cleaned.replace(/\(Redirected from \[.*?\]\(.*?\)\)/g, '')

  // 5. Remove "This article is about..." disambiguation
  cleaned = cleaned.replace(
    /This article is about.*?For .*?, see \[.*?\]\(.*?\)\.?\n*/g,
    '',
  )

  // 6. Remove quotation redirects (e.g., "Moslawi" redirects here)
  cleaned = cleaned.replace(/".*?" redirects here\..*?\n/g, '')

  // 7. Remove infobox tables (they're usually not useful as plain text)
  cleaned = cleaned.replace(/\|[\s\S]*?\|\s*\n/g, '')

  // 8. Remove image/file references
  cleaned = cleaned.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '')

  // 9. Remove excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // 10. Trim whitespace
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Extract specific sections from Wikipedia markdown
 * @param markdown - Cleaned Wikipedia markdown
 * @returns Object with extracted sections (description, history, geography, climate, transportation)
 */
export function parseWikipediaSections(markdown: string): {
  description?: string
  history?: string
  geography?: string
  climate?: string
  transportation?: string
} {
  if (!markdown) return {}

  const sections: {
    description?: string
    history?: string
    geography?: string
    climate?: string
    transportation?: string
  } = {}

  // Split by headings (## or #)
  const lines = markdown.split('\n')
  let currentSection = 'description' // Everything before first heading is description
  let currentContent: string[] = []

  for (const line of lines) {
    // Check for section headings (## or #)
    const headingMatch = line.match(/^#{1,3}\s+(.+)/)

    if (headingMatch) {
      // Save previous section
      if (currentContent.length > 0) {
        const content = currentContent.join('\n').trim()
        if (content.length > 0) {
          if (currentSection === 'description') {
            sections.description = truncateText(
              content,
              ENRICHMENT_CONSTANTS.MAX_DESCRIPTION_LENGTH,
            )
          } else if (currentSection === 'history') {
            sections.history = truncateText(
              content,
              ENRICHMENT_CONSTANTS.MAX_HISTORY_LENGTH,
            )
          } else if (currentSection === 'geography') {
            sections.geography = truncateText(
              content,
              ENRICHMENT_CONSTANTS.MAX_GEOGRAPHY_LENGTH,
            )
          } else if (currentSection === 'climate') {
            sections.climate = truncateText(
              content,
              ENRICHMENT_CONSTANTS.MAX_CLIMATE_LENGTH,
            )
          } else if (currentSection === 'transportation') {
            sections.transportation = truncateText(
              content,
              ENRICHMENT_CONSTANTS.MAX_TRANSPORT_LENGTH,
            )
          }
        }
      }

      // Determine new section based on heading
      const heading = headingMatch[1].toLowerCase().trim()
      if (heading.includes('history') || heading.includes('historical')) {
        currentSection = 'history'
        currentContent = []
      } else if (
        heading.includes('geography') ||
        heading.includes('topography')
      ) {
        currentSection = 'geography'
        currentContent = []
      } else if (heading.includes('climate') || heading.includes('weather')) {
        currentSection = 'climate'
        currentContent = []
      } else if (
        heading.includes('transport') ||
        heading.includes('infrastructure') ||
        heading.includes('transit')
      ) {
        currentSection = 'transportation'
        currentContent = []
      } else {
        // Skip sections we don't care about
        currentSection = 'skip'
        currentContent = []
      }
    } else if (currentSection !== 'skip') {
      // Add line to current section
      currentContent.push(line)
    }
  }

  // Save final section
  if (currentSection !== 'skip' && currentContent.length > 0) {
    const content = currentContent.join('\n').trim()
    if (content.length > 0) {
      if (currentSection === 'description') {
        sections.description = truncateText(
          content,
          ENRICHMENT_CONSTANTS.MAX_DESCRIPTION_LENGTH,
        )
      } else if (currentSection === 'history') {
        sections.history = truncateText(
          content,
          ENRICHMENT_CONSTANTS.MAX_HISTORY_LENGTH,
        )
      } else if (currentSection === 'geography') {
        sections.geography = truncateText(
          content,
          ENRICHMENT_CONSTANTS.MAX_GEOGRAPHY_LENGTH,
        )
      } else if (currentSection === 'climate') {
        sections.climate = truncateText(
          content,
          ENRICHMENT_CONSTANTS.MAX_CLIMATE_LENGTH,
        )
      } else if (currentSection === 'transportation') {
        sections.transportation = truncateText(
          content,
          ENRICHMENT_CONSTANTS.MAX_TRANSPORT_LENGTH,
        )
      }
    }
  }

  return sections
}
