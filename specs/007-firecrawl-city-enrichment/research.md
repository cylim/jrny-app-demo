# Research: Firecrawl City Enrichment

**Feature**: 007-firecrawl-city-enrichment
**Date**: 2025-11-16
**Researcher**: Planning Phase

## Overview

This document consolidates research findings for integrating Firecrawl's web scraping API to enrich city data automatically. The research addresses: Firecrawl API capabilities, Wikipedia as a data source, data extraction strategies, and integration patterns for Convex + TypeScript environments.

## Research Questions & Findings

### 1. Firecrawl API Capabilities

**Question**: What are Firecrawl's core capabilities for extracting structured city data from web sources?

**Decision**: Use Firecrawl's `/scrape` endpoint with schema-based extraction for structured city data.

**Rationale**:
- Firecrawl provides multiple endpoints: `/scrape` (single URL), `/crawl` (multi-page), `/search` (web search + scrape), `/extract` (AI-powered structured extraction)
- For city enrichment, `/scrape` is most appropriate:
  - Single-page Wikipedia articles contain all needed city information
  - Schema-based extraction ensures consistent data structure
  - Lower API cost than crawling multiple pages
  - Predictable latency (<30s per city)

**Alternatives Considered**:
1. `/crawl` endpoint - Rejected because city data is consolidated on single Wikipedia pages; crawling multiple subpages is unnecessary and expensive
2. `/extract` with natural language prompts - Rejected in favor of explicit schemas for better type safety and validation
3. `/search` endpoint - Useful for finding Wikipedia URLs but adds extra API call; can construct URLs directly from city names

**Firecrawl Features to Leverage**:
- **Format Options**: Request both `markdown` (for descriptions) and `json` (for structured infobox data)
- **JavaScript Rendering**: Enabled by default (handles dynamic Wikipedia content)
- **Anti-Bot Protection**: Automatic proxy rotation and bot detection bypass (Wikipedia rarely blocks but useful for other sources)
- **Rate Limiting**: Built into SDK (SDK handles 429 responses automatically)

**API Authentication**:
- Bearer token in `Authorization` header
- Token stored as `FIRECRAWL_API_KEY` in Convex environment variables
- Accessed via `process.env.FIRECRAWL_API_KEY` in Convex actions

**SDK Choice**: `@mendable/firecrawl-js` (official Node.js SDK)
- TypeScript support (though some types may need custom interfaces)
- Async/await pattern matches Convex action style
- Built-in retry logic and error handling

---

### 2. Wikipedia as Primary Data Source

**Question**: What structured data can be extracted from Wikipedia city pages, and how is it organized?

**Decision**: Target Wikipedia's infobox data and main article content using Firecrawl's structured extraction with Zod schemas.

**Rationale**:
- Wikipedia city pages follow consistent structure (WikiProject Cities guidelines)
- Infobox settlement template provides structured data: population, coordinates, timezone, area, elevation
- Article sections provide rich content: history, geography, climate, culture, tourism, economy
- Free, publicly available, multilingual (though focusing on English initially)
- High data quality with editorial review
- License-compatible (Creative Commons Attribution-ShareAlike)

**Wikipedia City Page Structure** (per WikiProject Cities):
1. **Lead Section**: Summary with infobox
2. **Infobox (Template:Infobox settlement)**: Structured metadata
3. **Article Sections**:
   - History
   - Geography
   - Climate
   - Demographics
   - Economy
   - Culture & Arts
   - Tourism / Landmarks / Points of Interest
   - Transportation
   - References & External Links

**Extractable Data Fields**:

| Field Category | Wikipedia Source | Firecrawl Extraction Method |
|----------------|------------------|---------------------------|
| **Basic Info** | Infobox | JSON schema extraction |
| Name (official) | `name` field | Text extraction |
| Nickname/Motto | `nickname`, `motto` | Text extraction |
| Country | `country` field | Text extraction |
| Coordinates | `coordinates` field | Regex parsing |
| Population | `population_total` | Number parsing |
| Area (km²) | `area_total_km2` | Number parsing |
| Timezone | `timezone` field | Text extraction |
| Elevation | `elevation_m` | Number parsing |
| Founded/Established | `established_date` | Date parsing |
| **Images** | Infobox + article | URL extraction |
| Hero image | `image_skyline` | Image URL |
| Flag/Seal | `image_flag`, `image_seal` | Image URLs |
| Photo gallery | Article `<img>` tags | Array of URLs |
| **Descriptions** | Article content | Markdown extraction |
| Overview | Lead section (first paragraph) | Text block |
| History summary | History section | Text block |
| Geography notes | Geography section | Text block |
| Climate description | Climate section | Text/table |
| **Tourism** | Tourism/Culture sections | List extraction |
| Landmarks | "Points of interest" lists | Bulleted list → array |
| Museums | Museums section | List extraction |
| Attractions | Tourism section | List extraction |
| Cultural notes | Culture section | Text block |
| **Practical Info** | Various sections | Structured extraction |
| Transportation | Transportation section | Text/list |
| Best time to visit | Climate + Tourism sections | Inferred from text |

**Wikipedia URL Construction**:
- Pattern: `https://en.wikipedia.org/wiki/{City_Name}[,_{State/Country}]`
- Examples:
  - `https://en.wikipedia.org/wiki/Paris` (unambiguous)
  - `https://en.wikipedia.org/wiki/Portland,_Oregon` (disambiguation)
  - `https://en.wikipedia.org/wiki/Portland,_Maine` (disambiguation)
- Disambiguation strategy:
  - Use `city.name + ", " + city.country` for initial URL
  - If 404 or disambiguation page, try `city.name + ", " + city.region`
  - Store successful URL pattern in database for future enrichments

**Alternatives Considered**:
1. **Wikidata API** - Rejected because it provides structured metadata only, lacks rich descriptions and tourism content
2. **DBpedia** - Rejected due to API complexity and less current data vs live Wikipedia
3. **TripAdvisor/Lonely Planet** - Rejected due to copyright restrictions, paid API access, and scraping ToS violations
4. **OpenStreetMap Nominatim** - Useful for geolocation but lacks rich content (Wikipedia is better for descriptions)

**License Compliance**:
- Wikipedia content: CC-BY-SA 3.0 (attribution required)
- Attribution: Add "Source: Wikipedia" note on enriched city pages
- Convex stores snapshots (derivative work), so attribution preserved in UI

---

### 3. Data Extraction & Parsing Strategy

**Question**: How should Firecrawl responses be parsed and validated for city enrichment?

**Decision**: Use Zod schemas to validate and transform Firecrawl JSON responses into typed City enrichment data.

**Rationale**:
- Firecrawl returns untyped JSON responses (schema depends on extraction prompt)
- Zod provides runtime validation + TypeScript type inference
- Prevents corrupt data from entering database
- Aligns with project constitution (Type Safety & Validation principle)
- Validation errors can be logged to Sentry with context (city ID, source URL, malformed fields)

**Zod Schema Design**:

```typescript
// Example schema for Wikipedia infobox data
const WikipediaInfoboxSchema = z.object({
  name: z.string().optional(),
  nickname: z.string().optional(),
  population: z.number().int().positive().optional(),
  area_km2: z.number().positive().optional(),
  elevation_m: z.number().optional(),
  timezone: z.string().optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }).optional(),
  image_skyline: z.string().url().optional(),
  established_date: z.string().optional(),
})

// Schema for full enrichment data (infobox + article content)
const EnrichedCityDataSchema = z.object({
  infobox: WikipediaInfoboxSchema.optional(),
  description: z.string().max(5000).optional(), // Lead section
  history: z.string().max(3000).optional(),
  geography: z.string().max(2000).optional(),
  climate: z.string().max(2000).optional(),
  tourism: z.object({
    overview: z.string().optional(),
    landmarks: z.array(z.string()).max(20).optional(),
    museums: z.array(z.string()).max(15).optional(),
    attractions: z.array(z.string()).max(25).optional(),
  }).optional(),
  transportation: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  source_url: z.string().url(), // Wikipedia page URL
  scraped_at: z.number(), // Unix timestamp
})

// Type inference
type EnrichedCityData = z.infer<typeof EnrichedCityDataSchema>
```

**Parsing Strategy**:
1. **Firecrawl Request**: POST `/scrape` with extraction schema describing desired Wikipedia data
2. **Response Validation**: Parse with `EnrichedCityDataSchema.safeParse()`
3. **Error Handling**:
   - Invalid schema → log to Sentry, skip enrichment, keep existing city data
   - Missing optional fields → partial enrichment (update only fields present)
   - Network errors → retry once with exponential backoff, then fail gracefully
4. **Data Transformation**:
   - Convert markdown to plain text for descriptions (strip formatting)
   - Normalize image URLs (ensure HTTPS, handle relative paths)
   - Sanitize HTML entities from Wikipedia content
   - Extract first paragraph for short description field

**Field Length Limits** (to prevent database bloat):
- Short description: 500 chars
- Long description: 5000 chars
- History/Geography/Climate: 2000-3000 chars each
- Arrays (landmarks, museums): 10-25 items max
- Images: 10 URLs max

**Intelligent Merge Logic**:
- Compare `scraped_at` timestamp with existing `lastEnrichedAt`
- Update field only if:
  1. Field is currently null/undefined (first enrichment)
  2. New data is non-null AND source timestamp > last enrichment timestamp
  3. New data differs from existing data (content changed)
- Preserve user-edited data (future enhancement: add `userEdited` flag per field)

---

### 4. Convex Integration Patterns

**Question**: How should Firecrawl API calls integrate with Convex's serverless function architecture?

**Decision**: Implement enrichment as Convex actions (for external API calls) with supporting queries/mutations for lock management and status updates.

**Rationale**:
- **Actions** for Firecrawl calls: Actions support external API requests via `"use node"` directive and can import npm packages
- **Mutations** for database updates: Separate mutation for applying enriched data (allows transaction isolation)
- **Queries** for trigger checks: City page loader queries city + checks enrichment status to decide if trigger needed
- Separation of concerns: API integration logic isolated from database logic

**Convex Function Structure**:

```typescript
// convex/enrichment.ts

// QUERY: Check if city needs enrichment (called by city page loader)
export const checkEnrichmentStatus = query({
  args: { cityId: v.id('cities') },
  returns: v.object({
    needsEnrichment: v.boolean(),
    reason: v.union(
      v.literal('never_enriched'),
      v.literal('stale_data'),
      v.literal('in_progress'),
      v.literal('up_to_date')
    ),
  }),
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId)
    if (!city) throw new Error('City not found')

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    if (city.enrichmentInProgress) {
      return { needsEnrichment: false, reason: 'in_progress' }
    }
    if (!city.isEnriched) {
      return { needsEnrichment: true, reason: 'never_enriched' }
    }
    if (city.lastEnrichedAt && city.lastEnrichedAt < oneWeekAgo) {
      return { needsEnrichment: true, reason: 'stale_data' }
    }
    return { needsEnrichment: false, reason: 'up_to_date' }
  },
})

// ACTION: Trigger enrichment (calls Firecrawl API)
export const enrichCity = action({
  args: { cityId: v.id('cities') },
  returns: v.union(
    v.object({ success: v.literal(true), duration: v.number() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const startTime = Date.now()

    // 1. Acquire lock
    const acquired = await ctx.runMutation(internal.enrichment.acquireLock, {
      cityId: args.cityId,
    })
    if (!acquired) {
      return { success: false, error: 'Lock acquisition failed (concurrent enrichment)' }
    }

    try {
      // 2. Fetch city data
      const city = await ctx.runQuery(internal.enrichment.getCity, {
        cityId: args.cityId,
      })

      // 3. Call Firecrawl API
      const scraped Data = await scrapeWikipedia(city.name, city.country)

      // 4. Validate & transform
      const validated = EnrichedCityDataSchema.safeParse(scrapedData)
      if (!validated.success) {
        throw new Error(`Validation failed: ${validated.error.message}`)
      }

      // 5. Update database
      await ctx.runMutation(internal.enrichment.updateCityData, {
        cityId: args.cityId,
        data: validated.data,
      })

      // 6. Log success
      await ctx.runMutation(internal.enrichment.logEnrichment, {
        cityId: args.cityId,
        success: true,
        duration: Date.now() - startTime,
      })

      return { success: true, duration: Date.now() - startTime }
    } catch (error) {
      // Log failure
      await ctx.runMutation(internal.enrichment.logEnrichment, {
        cityId: args.cityId,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      })

      return { success: false, error: error.message }
    } finally {
      // Always release lock
      await ctx.runMutation(internal.enrichment.releaseLock, {
        cityId: args.cityId,
      })
    }
  },
})

// MUTATION: Acquire enrichment lock
export const acquireLock = internalMutation({
  args: { cityId: v.id('cities') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId)
    if (!city) return false
    if (city.enrichmentInProgress) {
      // Check if lock is stale (>5 minutes old)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      if (city.lockAcquiredAt && city.lockAcquiredAt < fiveMinutesAgo) {
        // Clear stale lock
        await ctx.db.patch(args.cityId, {
          enrichmentInProgress: false,
          lockAcquiredAt: undefined,
        })
      } else {
        return false // Lock held by another process
      }
    }

    // Acquire lock
    await ctx.db.patch(args.cityId, {
      enrichmentInProgress: true,
      lockAcquiredAt: Date.now(),
    })
    return true
  },
})

// MUTATION: Release enrichment lock
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

// MUTATION: Update city with enriched data
export const updateCityData = internalMutation({
  args: {
    cityId: v.id('cities'),
    data: v.any(), // Validated by Zod before calling
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cityId, {
      // Apply enriched fields
      description: args.data.description,
      history: args.data.history,
      geography: args.data.geography,
      climate: args.data.climate,
      tourism: args.data.tourism,
      transportation: args.data.transportation,
      images: args.data.images,
      sourceUrl: args.data.source_url,
      // Update metadata
      isEnriched: true,
      lastEnrichedAt: Date.now(),
      scrapedAt: args.data.scraped_at,
    })
    return null
  },
})
```

**Client-Side Integration** (TanStack Router city page):

```typescript
// src/routes/c/$shortSlug.tsx
import { createFileRoute } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/c/$shortSlug')({
  loader: async ({ params, context }) => {
    // Fetch city data
    const city = await context.queryClient.ensureQueryData(
      convexQuery(api.cities.getCityBySlug, { slug: params.shortSlug })
    )

    // Check enrichment status
    const status = await context.queryClient.ensureQueryData(
      convexQuery(api.enrichment.checkEnrichmentStatus, { cityId: city._id })
    )

    // Trigger enrichment if needed (fire-and-forget)
    if (status.needsEnrichment) {
      context.convexClient.action(api.enrichment.enrichCity, { cityId: city._id })
        .catch(err => console.error('Enrichment trigger failed:', err))
    }

    return { city, enrichmentStatus: status }
  },
  component: CityPage,
})

function CityPage() {
  const { city, enrichmentStatus } = Route.useLoaderData()

  return (
    <div>
      <h1>{city.name}</h1>

      {/* Show enrichment message if in progress or stale */}
      {enrichmentStatus.needsEnrichment && (
        <div className="bg-blue-100 p-4 rounded">
          📡 Fetching latest city information... Refresh the page in a moment to see updates.
        </div>
      )}

      {/* Display enriched data if available */}
      {city.description && <p>{city.description}</p>}
      {city.tourism && (
        <section>
          <h2>Things to Do</h2>
          <ul>
            {city.tourism.landmarks?.map(landmark => <li key={landmark}>{landmark}</li>)}
          </ul>
        </section>
      )}
    </div>
  )
}
```

**Cron Job for Stale Lock Cleanup** (optional, but recommended):

```typescript
// convex/crons.ts
import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Clean up stale enrichment locks every hour
crons.interval(
  'clean-stale-locks',
  { hours: 1 },
  internal.enrichment.cleanStaleLocks
)

export default crons
```

---

## Technology Stack Summary

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Web Scraping** | Firecrawl `/scrape` endpoint | Handles JavaScript rendering, anti-bot protection, structured extraction |
| **Data Source** | Wikipedia (English) | Free, structured, high-quality, license-compatible |
| **SDK** | `@mendable/firecrawl-js` | Official Node.js SDK with TypeScript support |
| **Validation** | Zod schemas | Runtime validation + type inference for Firecrawl responses |
| **Storage** | Convex (extend `cities` table) | Existing database, real-time subscriptions |
| **Backend Logic** | Convex actions + mutations | Actions for external API calls, mutations for database updates |
| **Frontend Trigger** | TanStack Router loader | Async enrichment trigger on city page visit |
| **Error Tracking** | Sentry | Capture Firecrawl failures, validation errors, timeout issues |
| **Rate Limiting** | Firecrawl SDK built-in | SDK handles 429 responses automatically |
| **Lock Management** | Convex optimistic updates | In-progress flag + timestamp for concurrency control |

---

## Open Questions & Future Research

1. **Firecrawl Pricing**: Exact API costs per scrape request (depends on plan tier)
   - Mitigation: Start with pay-as-you-go plan, monitor costs in Firecrawl dashboard
   - Budget estimate: Assuming $0.01/scrape, enriching 1000 cities = $10 one-time + $10/week for re-enrichments

2. **Wikipedia Disambiguation**: Handling cities with identical names (e.g., Portland, OR vs Portland, ME)
   - Mitigation: Store successful Wikipedia URL in database after first enrichment
   - Fallback: Use OpenStreetMap Nominatim API to resolve lat/long → correct Wikipedia page

3. **Multilingual Support**: Enriching non-English city names from non-English Wikipedia
   - Deferred: Focus on English Wikipedia initially
   - Future: Use Wikidata to find interlanguage links (e.g., `https://es.wikipedia.org/wiki/París` for Spanish)

4. **Image Hosting**: Wikipedia images are hotlinked; should we download and host ourselves?
   - Decision: Hotlink for now (Wikipedia's CDN is reliable)
   - Future: Upload to Cloudflare R2 or Convex file storage for reliability

5. **Data Freshness**: How often does Wikipedia city data change?
   - Observation: Infobox data changes infrequently (population updates annually), descriptions change occasionally
   - Current decision: 1-week re-enrichment threshold balances freshness vs API cost
   - Future: Adjust threshold based on observability data (track how often scraped data differs from cached data)

---

## Conclusion

Firecrawl + Wikipedia provides a robust, cost-effective solution for automatic city enrichment. The integration leverages existing project infrastructure (Convex, TypeScript, Zod) while maintaining constitution compliance (type safety, testing, observability). Key technical decisions:

1. Use Firecrawl's `/scrape` endpoint with schema-based extraction
2. Target Wikipedia city pages for structured data + rich content
3. Validate all scraped data with Zod schemas before database writes
4. Implement enrichment as Convex actions (external API) + mutations (database updates)
5. Trigger enrichment asynchronously on city page visits (non-blocking UX)
6. Handle concurrency with lock acquisition + stale lock cleanup

Next steps: Proceed to Phase 1 (data model design, contracts, quickstart guide).
