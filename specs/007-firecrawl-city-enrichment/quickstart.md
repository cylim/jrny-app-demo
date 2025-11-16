# Quickstart: Firecrawl City Enrichment

**Feature**: 007-firecrawl-city-enrichment
**Created**: 2025-11-16
**Phase**: 1 - Planning

This guide covers setup and testing of the Firecrawl City Enrichment feature for local development and production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [API Setup](#api-setup)
3. [Local Development](#local-development)
4. [Testing Enrichment](#testing-enrichment)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Debugging](#monitoring--debugging)

---

## Prerequisites

- Node.js 20+ (already installed)
- `npm` or `bun` (project uses bun)
- Convex account with active project
- Firecrawl account (free or paid plan)
- TypeScript knowledge

### Required Packages

These should be installed in the project dependencies:

```bash
# Web scraping
npm install @mendable/firecrawl-js

# Data validation (already installed)
npm install zod

# Already installed in project
# - Convex
# - TanStack React Query
# - Zod
```

---

## API Setup

### 1. Firecrawl Account & API Key

#### Create Firecrawl Account

1. Go to [firecrawl.dev](https://firecrawl.dev)
2. Sign up (free tier available for testing)
3. Navigate to **API Keys** section in dashboard
4. Create a new API key

#### Get API Key

Your Firecrawl API key will look like:
```
fc_sk_prod_abc123def456...  (production)
fc_sk_test_xyz789...         (testing)
```

#### Set Environment Variable

Add to your `.env.local` file in the project root:

```bash
# Local development
FIRECRAWL_API_KEY=fc_sk_test_your_key_here
```

Deploy to Convex:

```bash
# Set in Convex environment
npx convex env set FIRECRAWL_API_KEY "fc_sk_prod_your_key_here"

# Verify it was set
npx convex env list
```

**Note**: Environment variables in Convex functions are accessed via `process.env.FIRECRAWL_API_KEY` directly (not through t3env).

---

### 2. Update Convex Schema

The cities table needs to be extended with enrichment fields. See `/specs/007-firecrawl-city-enrichment/data-model.md` for the complete schema changes.

Add to `convex/schema.ts`:

```typescript
// Add these fields to the cities table definition
cities: defineTable({
  // ... existing fields ...

  // NEW enrichment fields
  description: v.optional(v.string()),
  history: v.optional(v.string()),
  geography: v.optional(v.string()),
  climate: v.optional(v.string()),
  transportation: v.optional(v.string()),
  images: v.optional(v.array(v.string())),
  tourism: v.optional(
    v.object({
      overview: v.optional(v.string()),
      landmarks: v.optional(v.array(v.string())),
      museums: v.optional(v.array(v.string())),
      attractions: v.optional(v.array(v.string())),
    })
  ),

  // NEW enrichment metadata
  isEnriched: v.optional(v.boolean()),
  lastEnrichedAt: v.optional(v.number()),
  scrapedAt: v.optional(v.number()),
  sourceUrl: v.optional(v.string()),
  enrichmentInProgress: v.optional(v.boolean()),
  lockAcquiredAt: v.optional(v.number()),
})
  // Add index for enrichment status queries
  .index('by_enrichment_status', ['isEnriched', 'lastEnrichedAt'])
```

Also add the new `enrichmentLogs` table:

```typescript
enrichmentLogs: defineTable({
  cityId: v.id('cities'),
  success: v.boolean(),
  status: v.union(
    v.literal('pending'),
    v.literal('in_progress'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('skipped'),
  ),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  durationMs: v.optional(v.number()),
  fieldsPopulated: v.optional(v.number()),
  fieldsAttempted: v.optional(v.number()),
  error: v.optional(v.string()),
  errorCode: v.optional(v.string()),
  errorContext: v.optional(v.object({
    sourceUrl: v.optional(v.string()),
    validationErrors: v.optional(v.array(v.string())),
    retryCount: v.optional(v.number()),
  })),
  sourceUrl: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  initiatedBy: v.union(
    v.literal('user_visit'),
    v.literal('stale_refresh'),
    v.literal('manual_trigger'),
    v.literal('cron_job'),
  ),
  createdAt: v.number(),
  note: v.optional(v.string()),
})
  .index('by_city_id', ['cityId'])
  .index('by_status', ['status'])
  .index('by_created_at', ['createdAt'])
  .index('by_city_and_created', ['cityId', 'createdAt'])
```

Deploy schema changes:

```bash
npx convex dev
# Schema is automatically synced to your Convex project
```

---

## Local Development

### Starting the Development Server

```bash
# Full stack (Convex backend + Vite frontend)
npm run dev

# Or just the web dev server (without Convex)
npm run dev:web

# Or just Convex backend (without Vite)
npm run dev:convex
```

You should see:
```
Convex backend URL: https://your-deployment.convex.cloud
Frontend dev server: http://localhost:3000
```

### Creating Enrichment Functions

Create a new file: `convex/enrichment.ts`

```typescript
"use node"

import { v } from 'convex/values'
import { query, internalMutation, action } from './_generated/server'
import { internal } from './_generated/api'
import { EnrichedCityDataSchema, EnrichmentErrorCode } from '../specs/007-firecrawl-city-enrichment/contracts/enrichment'
import FirecrawlApp from '@mendable/firecrawl-js'

/**
 * Query: Check if a city needs enrichment
 * Called by city page loader to decide if enrichment trigger is needed
 */
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

    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()

    if (city.enrichmentInProgress) {
      return { needsEnrichment: false, reason: 'in_progress' }
    }

    if (!city.isEnriched) {
      return { needsEnrichment: true, reason: 'never_enriched' }
    }

    if (city.lastEnrichedAt && now - city.lastEnrichedAt > ONE_WEEK_MS) {
      return { needsEnrichment: true, reason: 'stale_data' }
    }

    return { needsEnrichment: false, reason: 'up_to_date' }
  },
})

/**
 * Action: Trigger enrichment via Firecrawl
 * This is an external action that calls the Firecrawl API
 */
export const enrichCity = action({
  args: { cityId: v.id('cities') },
  returns: v.union(
    v.object({ success: v.literal(true), duration: v.number() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const startTime = Date.now()

    try {
      // 1. Acquire lock
      const acquired = await ctx.runMutation(internal.enrichment.acquireLock, {
        cityId: args.cityId,
      })

      if (!acquired) {
        return {
          success: false,
          error: 'Lock acquisition failed (concurrent enrichment)',
        }
      }

      // 2. Get city data
      const city = await ctx.db.get(args.cityId)
      if (!city) throw new Error('City not found')

      // 3. Construct Wikipedia URL
      const wikipediaUrl = constructWikipediaUrl(city.name, city.country)

      // 4. Call Firecrawl
      const firecrawl = new FirecrawlApp({
        apiKey: process.env.FIRECRAWL_API_KEY,
      })

      const scrapeResult = await firecrawl.scrapeUrl(wikipediaUrl, {
        formats: ['markdown', 'json'],
        // Add custom Zod schema for structured extraction
        // (Detailed schema configuration for Wikipedia infobox + content extraction)
      })

      if (!scrapeResult.success) {
        throw new Error(`Firecrawl failed: ${scrapeResult.error}`)
      }

      // 5. Parse and validate
      const parsed = JSON.parse(scrapeResult.data.markdown || '{}')
      const validated = EnrichedCityDataSchema.safeParse({
        ...parsed,
        source_url: wikipediaUrl,
        scraped_at: Date.now(),
      })

      if (!validated.success) {
        throw new Error(`Validation failed: ${validated.error.message}`)
      }

      // 6. Update database
      await ctx.runMutation(internal.enrichment.updateCityData, {
        cityId: args.cityId,
        data: validated.data,
      })

      // 7. Log success
      await ctx.runMutation(internal.enrichment.logEnrichment, {
        cityId: args.cityId,
        success: true,
        duration: Date.now() - startTime,
        sourceUrl: wikipediaUrl,
        fieldsPopulated: countPopulatedFields(validated.data),
      })

      return {
        success: true,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      // Log failure
      await ctx.runMutation(internal.enrichment.logEnrichment, {
        cityId: args.cityId,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: EnrichmentErrorCode.UNKNOWN_ERROR,
      }).catch(logErr => {
        console.error('Failed to log enrichment error:', logErr)
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      // Always release lock
      await ctx.runMutation(internal.enrichment.releaseLock, {
        cityId: args.cityId,
      })
    }
  },
})

/**
 * Mutation: Acquire enrichment lock
 * Prevents concurrent enrichment of the same city
 */
export const acquireLock = internalMutation({
  args: { cityId: v.id('cities') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId)
    if (!city) return false

    const FIVE_MINUTES_MS = 5 * 60 * 1000
    const now = Date.now()

    // Check if lock is stale
    if (city.enrichmentInProgress && city.lockAcquiredAt) {
      if (now - city.lockAcquiredAt > FIVE_MINUTES_MS) {
        // Clear stale lock
        await ctx.db.patch(args.cityId, {
          enrichmentInProgress: false,
          lockAcquiredAt: undefined,
        })
      } else {
        return false // Lock still held
      }
    }

    // Acquire lock
    await ctx.db.patch(args.cityId, {
      enrichmentInProgress: true,
      lockAcquiredAt: now,
    })

    return true
  },
})

/**
 * Mutation: Release enrichment lock
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
 * Mutation: Update city with enriched data
 */
export const updateCityData = internalMutation({
  args: {
    cityId: v.id('cities'),
    data: v.any(), // Pre-validated by Zod
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cityId, {
      description: args.data.description,
      history: args.data.history,
      geography: args.data.geography,
      climate: args.data.climate,
      tourism: args.data.tourism,
      transportation: args.data.transportation,
      images: args.data.images,
      sourceUrl: args.data.source_url,
      isEnriched: true,
      lastEnrichedAt: Date.now(),
      scrapedAt: args.data.scraped_at,
    })
    return null
  },
})

/**
 * Mutation: Log enrichment attempt
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('enrichmentLogs', {
      cityId: args.cityId,
      success: args.success,
      status: args.success ? 'completed' : 'failed',
      startedAt: Date.now() - args.duration,
      completedAt: Date.now(),
      durationMs: args.duration,
      error: args.error,
      errorCode: args.errorCode,
      sourceUrl: args.sourceUrl,
      fieldsPopulated: args.fieldsPopulated,
      initiatedBy: 'user_visit',
      createdAt: Date.now(),
    })
    return null
  },
})

// ============================================================================
// HELPERS
// ============================================================================

function constructWikipediaUrl(cityName: string, country: string): string {
  // Simple URL construction; improve with disambiguation handling later
  const encodedCity = encodeURIComponent(cityName)
  const encodedCountry = encodeURIComponent(country)
  return `https://en.wikipedia.org/wiki/${encodedCity},_${encodedCountry}`
}

function countPopulatedFields(data: Record<string, unknown>): number {
  return Object.values(data).filter(v => v !== null && v !== undefined).length
}
```

### Trigger Enrichment from City Page

Update your city page route to trigger enrichment:

```typescript
// src/routes/c/$shortSlug.tsx
import { createFileRoute } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from '~/convex/_generated/api'

export const Route = createFileRoute('/c/$shortSlug')({
  loader: async ({ params, context }) => {
    // Load city data
    const city = await context.queryClient.ensureQueryData(
      convexQuery(api.cities.getCityBySlug, { slug: params.shortSlug })
    )

    // Check enrichment status
    const status = await context.queryClient.ensureQueryData(
      convexQuery(api.enrichment.checkEnrichmentStatus, { cityId: city._id })
    )

    // Trigger enrichment (fire-and-forget, non-blocking)
    if (status.needsEnrichment && status.reason !== 'in_progress') {
      context.convexClient
        .action(api.enrichment.enrichCity, { cityId: city._id })
        .catch(err => console.error('Enrichment trigger failed:', err))
    }

    return { city, enrichmentStatus: status }
  },

  component: CityPage,
})

function CityPage() {
  const { city, enrichmentStatus } = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">{city.name}</h1>

      {/* Show enrichment message if in progress or stale */}
      {enrichmentStatus.needsEnrichment && enrichmentStatus.reason !== 'up_to_date' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">
            📡 Fetching latest city information...{' '}
            {enrichmentStatus.reason === 'in_progress' ? (
              'This may take a moment.'
            ) : (
              <>Refresh the page to see updated data.</>
            )}
          </p>
        </div>
      )}

      {/* Display enriched content */}
      {city.description && (
        <section>
          <h2 className="text-2xl font-semibold mb-2">Overview</h2>
          <p className="text-gray-700">{city.description}</p>
        </section>
      )}

      {city.tourism?.landmarks && (
        <section>
          <h2 className="text-2xl font-semibold mb-2">Landmarks</h2>
          <ul className="list-disc list-inside space-y-1">
            {city.tourism.landmarks.map(landmark => (
              <li key={landmark} className="text-gray-700">{landmark}</li>
            ))}
          </ul>
        </section>
      )}

      {/* More sections... */}
    </div>
  )
}
```

---

## Testing Enrichment

### Manual Test in Development

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Visit an unenriched city page**:
   - Go to `http://localhost:3000/c/[city-slug]`
   - You should see the "Fetching latest city information..." message

3. **Check Convex dashboard**:
   - Visit [https://dashboard.convex.dev](https://dashboard.convex.dev)
   - Select your project
   - Go to **Data** tab → **cities** table
   - Verify enrichment fields are being populated

4. **Check enrichment logs**:
   - In Convex dashboard, view **enrichmentLogs** table
   - Verify entries with `success: true`

5. **Refresh city page**:
   - Once enrichment completes, refresh the page
   - You should see enriched content (description, landmarks, etc.)

### Test Script (Optional)

Create a test file to directly test enrichment functions:

```typescript
// scripts/test-enrichment.ts
import { ConvexClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const client = new ConvexClient(process.env.VITE_CONVEX_URL!)

async function testEnrichment() {
  console.log('Testing city enrichment...')

  // Find an unenriched city
  const cities = await client.query(api.cities.listCities)
  const testCity = cities.find((c: any) => !c.isEnriched)

  if (!testCity) {
    console.log('No unenriched cities found')
    return
  }

  console.log(`Enriching city: ${testCity.name}`)

  // Check status
  const status = await client.query(api.enrichment.checkEnrichmentStatus, {
    cityId: testCity._id,
  })
  console.log('Status:', status)

  // Trigger enrichment
  if (status.needsEnrichment) {
    const result = await client.action(api.enrichment.enrichCity, {
      cityId: testCity._id,
    })
    console.log('Enrichment result:', result)
  }
}

testEnrichment().catch(console.error)
```

Run with:
```bash
npx ts-node scripts/test-enrichment.ts
```

### Test Scenarios

#### Scenario 1: Enrich Unenriched City
- Expected: City is enriched successfully
- Verify: `isEnriched = true`, enrichment fields populated

#### Scenario 2: Visit Recently Enriched City
- Setup: Enrich a city, then visit its page immediately
- Expected: No re-enrichment triggered
- Verify: `enrichmentStatus.reason = 'up_to_date'`

#### Scenario 3: Re-enrich Stale Data
- Setup: Enrich a city, manually set `lastEnrichedAt` to 8 days ago
- Expected: Re-enrichment triggered on page visit
- Verify: `enrichmentStatus.reason = 'stale_data'`

#### Scenario 4: Concurrent Enrichment
- Setup: Open multiple browser tabs with same city page
- Expected: Only first tab triggers enrichment, others skip
- Verify: Only one enrichment log entry for the city

#### Scenario 5: Firecrawl API Failure
- Setup: Provide invalid `FIRECRAWL_API_KEY`
- Expected: Enrichment fails gracefully, error logged, page still loads
- Verify: `enrichmentLogs` entry with `success = false`

---

## Production Deployment

### 1. Set Production API Key

```bash
npx convex env set FIRECRAWL_API_KEY "fc_sk_prod_your_production_key"
```

Verify it was set:
```bash
npx convex env list
```

### 2. Deploy Updated Schema

Your schema changes are automatically deployed when running:
```bash
npm run deploy
# or
npx convex deploy
```

### 3. Deploy Convex Functions

Convex functions are deployed automatically with the schema. Verify deployment:

```bash
npx convex status
# Output: Your deployment is up to date
```

### 4. Monitor Enrichment in Production

Use Sentry for error tracking:

```typescript
// In convex/enrichment.ts, add Sentry logging
import * as Sentry from "@sentry/node"

export const enrichCity = action({
  // ...
  handler: async (ctx, args) => {
    try {
      // ... enrichment logic ...
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          feature: 'city-enrichment',
          cityId: args.cityId,
        },
      })
      // ... error handling ...
    }
  },
})
```

---

## Monitoring & Debugging

### Viewing Enrichment Logs

#### In Convex Dashboard

1. Go to [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Data** → **enrichmentLogs**
4. Filter by `status: 'failed'` to see failures

#### Query Enrichment History

```typescript
// convex/enrichment.ts
export const getEnrichmentHistory = query({
  args: { cityId: v.id('cities') },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('enrichmentLogs')
      .withIndex('by_city_and_created', q => q.eq('cityId', args.cityId))
      .order('desc')
      .take(10)
  },
})
```

### Common Issues & Solutions

#### Issue: "FIRECRAWL_API_KEY not set"
- **Solution**: Verify env var is set: `npx convex env list`
- **Local**: Add to `.env.local`
- **Production**: Set via `npx convex env set`

#### Issue: "Wikipedia page not found"
- **Cause**: City name/country combination doesn't match Wikipedia URL
- **Solution**: Improve `constructWikipediaUrl()` with disambiguation handling
- **Debug**: Check `enrichmentLogs.sourceUrl` for the URL being scraped

#### Issue: "Validation failed"
- **Cause**: Firecrawl response doesn't match Zod schema
- **Solution**: Update extraction schema in Firecrawl scrape request
- **Debug**: Log `validationErrors` in enrichmentLogs

#### Issue: "Lock acquisition failed"
- **Cause**: Another enrichment is already running
- **Solution**: Wait for ongoing enrichment or clear stale lock
- **Debug**: Check `city.enrichmentInProgress` in Convex dashboard

### Performance Monitoring

Track enrichment metrics:

```typescript
// Example: Calculate success rate
export const getEnrichmentStats = query({
  args: { hours: v.number() },
  returns: v.object({
    total: v.number(),
    successful: v.number(),
    failed: v.number(),
    avgDuration: v.number(),
  }),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query('enrichmentLogs')
      .filter(q => q.gt(q.field('createdAt'), Date.now() - args.hours * 3600 * 1000))
      .collect()

    const successful = logs.filter((l: any) => l.success).length
    const avgDuration = logs.reduce((sum: number, l: any) => sum + (l.durationMs || 0), 0) / logs.length

    return {
      total: logs.length,
      successful,
      failed: logs.length - successful,
      avgDuration,
    }
  },
})
```

---

## Next Steps

After Phase 1 (planning), Phase 2 will implement:
1. Full enrichment.ts file with Firecrawl integration
2. Wikipedia URL disambiguation handling
3. E2E tests for enrichment flow
4. Performance optimization for concurrent enrichments

---

## Environment Variables Checklist

- [ ] `FIRECRAWL_API_KEY` set in `.env.local`
- [ ] `FIRECRAWL_API_KEY` deployed to Convex: `npx convex env set FIRECRAWL_API_KEY "..."`
- [ ] Schema updated in `convex/schema.ts`
- [ ] `convex/enrichment.ts` functions created
- [ ] City page routes updated to trigger enrichment
- [ ] Tests passing locally

---

## Resources

- **Firecrawl Docs**: [firecrawl.dev/docs](https://firecrawl.dev/docs)
- **Convex Docs**: [docs.convex.dev](https://docs.convex.dev)
- **Wikipedia API Docs**: [en.wikipedia.org/w/api.php](https://en.wikipedia.org/w/api.php)
- **Zod Docs**: [zod.dev](https://zod.dev)
