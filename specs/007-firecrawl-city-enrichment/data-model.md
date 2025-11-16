# Data Model: Firecrawl City Enrichment

**Feature**: 007-firecrawl-city-enrichment
**Created**: 2025-11-16
**Phase**: 1 - Planning

## Extended Cities Table

The `cities` table is extended with enrichment fields and metadata. Core fields (name, country, coordinates, visitCount) remain unchanged; new enrichment fields are optional to support progressive enrichment.

### New Schema Definition

```typescript
// In convex/schema.ts - cities table extension
cities: defineTable({
  // Existing fields (unchanged)
  name: v.string(),
  slug: v.string(),
  shortSlug: v.string(),
  country: v.string(),
  countryCode: v.string(),
  countrySlug: v.string(),
  region: v.string(),
  latitude: v.string(),
  longitude: v.string(),
  image: v.optional(v.string()),
  visitCount: v.optional(v.number()),
  currentVisitorCount: v.optional(v.number()),

  // NEW: Enriched content fields (all optional)
  description: v.optional(v.string()),          // Lead section summary
  history: v.optional(v.string()),              // Historical overview
  geography: v.optional(v.string()),            // Geographic notes
  climate: v.optional(v.string()),              // Climate/weather info
  transportation: v.optional(v.string()),       // Transport options
  images: v.optional(v.array(v.string())),      // Array of image URLs from source

  // NEW: Tourism & culture data
  tourism: v.optional(
    v.object({
      overview: v.optional(v.string()),         // Tourism summary
      landmarks: v.optional(v.array(v.string())),   // Notable landmarks/POIs
      museums: v.optional(v.array(v.string())),     // Museums and galleries
      attractions: v.optional(v.array(v.string())), // General attractions
    })
  ),

  // NEW: Enrichment metadata & locking
  isEnriched: v.optional(v.boolean()),          // Whether enrichment has been completed
  lastEnrichedAt: v.optional(v.number()),       // Unix timestamp of last successful enrichment
  scrapedAt: v.optional(v.number()),            // Unix timestamp of scraped source
  sourceUrl: v.optional(v.string()),            // Wikipedia URL used for enrichment
  enrichmentInProgress: v.optional(v.boolean()), // Concurrency lock flag
  lockAcquiredAt: v.optional(v.number()),       // Timestamp when lock was acquired (for stale detection)
})
  .index('by_short_slug', ['shortSlug'])
  .index('by_slug', ['slug'])
  .index('by_country', ['country'])
  .index('by_region', ['region'])
  .index('by_visit_count', ['visitCount'])
  // NEW: Index for finding unenriched cities
  .index('by_enrichment_status', ['isEnriched', 'lastEnrichedAt'])
```

### Field Specifications

#### Enriched Content Fields

| Field | Type | MaxLength | Purpose | Source |
|-------|------|-----------|---------|--------|
| `description` | string (optional) | 5000 chars | Lead section summary from Wikipedia | Article intro paragraph |
| `history` | string (optional) | 3000 chars | Historical overview | "History" section |
| `geography` | string (optional) | 2000 chars | Geographic context | "Geography" section |
| `climate` | string (optional) | 2000 chars | Climate/weather patterns | "Climate" section |
| `transportation` | string (optional) | 2000 chars | Public transport options | "Transportation" section |
| `tourism.overview` | string (optional) | 1500 chars | Tourism highlights | "Tourism" section |
| `tourism.landmarks` | array (optional) | Max 20 items | Notable landmarks/POIs | "Landmarks"/"Points of Interest" |
| `tourism.museums` | array (optional) | Max 15 items | Museums and galleries | "Museums" section |
| `tourism.attractions` | array (optional) | Max 25 items | General attractions to visit | "Tourism"/"Attractions" sections |
| `images` | array of URLs (optional) | Max 10 URLs | High-quality images from Wikipedia | Infobox + article images |

#### Enrichment Metadata

| Field | Type | Purpose | Constraints |
|-------|------|---------|-------------|
| `isEnriched` | boolean (optional) | Flag indicating enrichment completion | Indexed for queries |
| `lastEnrichedAt` | number (optional) | Unix timestamp (milliseconds) of last successful enrichment | Used to detect stale data (>1 week = stale) |
| `scrapedAt` | number (optional) | Unix timestamp when source data was scraped | Part of intelligent merge logic |
| `sourceUrl` | string (optional) | Wikipedia URL used for enrichment | Enables manual verification, retry with same URL |
| `enrichmentInProgress` | boolean (optional) | Concurrency lock flag | Set to `true` during enrichment, `false` when complete |
| `lockAcquiredAt` | number (optional) | Unix timestamp when lock was acquired | Used to detect and clear stale locks (>5 minutes) |

### Validation Rules

#### Content Constraints

1. **Length Limits**: All string fields enforce maximum character counts to prevent database bloat:
   - description, history, geography: Max 3000-5000 chars
   - transportation, tourism.overview: Max 2000 chars
   - Array items: Max 20-25 items per array

2. **URL Validation**: Image URLs must be valid HTTPS URLs
   - Pattern: `https://...`
   - Relative Wikipedia paths normalized to full URLs

3. **Timestamp Validation**: All timestamp fields are Unix milliseconds
   - Range: 0 to `Date.now() + 1 year` (future-proofing)
   - `lastEnrichedAt` > `scrapedAt` after enrichment

#### Concurrency Constraints

1. **Lock Acquisition**:
   - `enrichmentInProgress` must be checked before setting
   - Only one process can hold lock at a time
   - Lock must have corresponding `lockAcquiredAt` timestamp

2. **Stale Lock Detection**:
   - Locks held for >5 minutes are considered stale
   - Stale locks are automatically cleared (enables graceful recovery)
   - Formula: `lockAcquiredAt + (5 * 60 * 1000) < Date.now()`

3. **Freshness Threshold**:
   - Re-enrichment triggered when: `lastEnrichedAt < Date.now() - (7 * 24 * 60 * 60 * 1000)`
   - One week = 604,800,000 milliseconds

---

## New EnrichmentLogs Table

Tracks all enrichment attempts for monitoring, debugging, and audit purposes.

### Schema Definition

```typescript
// In convex/schema.ts - new table
enrichmentLogs: defineTable({
  // References
  cityId: v.id('cities'),                       // City being enriched

  // Enrichment execution details
  success: v.boolean(),                         // Whether enrichment succeeded
  status: v.union(
    v.literal('pending'),                       // Enrichment queued
    v.literal('in_progress'),                   // Currently processing
    v.literal('completed'),                     // Successfully completed
    v.literal('failed'),                        // Failed (see error)
    v.literal('skipped'),                       // Skipped (already fresh)
  ),

  // Timing information
  startedAt: v.number(),                        // Unix timestamp when enrichment started
  completedAt: v.optional(v.number()),          // Unix timestamp when enrichment finished
  durationMs: v.optional(v.number()),           // Total duration in milliseconds

  // Data quality metrics
  fieldsPopulated: v.optional(v.number()),      // Count of successfully populated fields
  fieldsAttempted: v.optional(v.number()),      // Count of fields attempted

  // Error tracking
  error: v.optional(v.string()),                // Error message if failed (max 1000 chars)
  errorCode: v.optional(v.string()),            // Machine-readable error code
  errorContext: v.optional(v.object({
    sourceUrl: v.optional(v.string()),          // URL being scraped when error occurred
    validationErrors: v.optional(v.array(v.string())), // Zod validation failures
    retryCount: v.optional(v.number()),         // Number of retry attempts
  })),

  // Source information
  sourceUrl: v.optional(v.string()),            // Wikipedia URL scraped (for logging)
  userAgent: v.optional(v.string()),            // Firecrawl user agent used

  // Metadata
  initiatedBy: v.union(
    v.literal('user_visit'),                    // User visited city page
    v.literal('stale_refresh'),                 // Re-enrichment triggered (>1 week old)
    v.literal('manual_trigger'),                // Future: admin manual trigger
    v.literal('cron_job'),                      // Future: scheduled job
  ),

  // Timestamps
  createdAt: v.number(),                        // Log creation timestamp
  note: v.optional(v.string()),                 // Optional operational notes
})
  .index('by_city_id', ['cityId'])              // Find all logs for a city
  .index('by_status', ['status'])               // Find pending/failed enrichments
  .index('by_created_at', ['createdAt'])        // Chronological queries
  .index('by_city_and_created', ['cityId', 'createdAt']) // Recent activity for city
```

### Field Specifications

#### Execution Tracking

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `cityId` | id('cities') | Reference to enriched city | Auto-generated |
| `success` | boolean | Whether enrichment succeeded | true/false |
| `status` | enum | Enrichment state | 'completed', 'failed', 'skipped' |
| `startedAt` | number | ISO timestamp when started | 1731638400000 |
| `completedAt` | number (optional) | ISO timestamp when finished | 1731638425000 |
| `durationMs` | number (optional) | Enrichment duration | 25000 (25 seconds) |

#### Data Quality Metrics

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| `fieldsPopulated` | number (optional) | Count of successfully extracted fields | Out of total possible fields |
| `fieldsAttempted` | number (optional) | Total fields attempted | Enables success rate calculation |

#### Error Information

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `error` | string (optional) | Human-readable error message | "Failed to parse Wikipedia infobox" |
| `errorCode` | string (optional) | Machine-readable error identifier | 'FIRECRAWL_TIMEOUT', 'VALIDATION_ERROR' |
| `errorContext.sourceUrl` | string (optional) | URL being scraped when error occurred | Helps debug disambiguation issues |
| `errorContext.validationErrors` | array (optional) | Zod validation failures | ["description exceeds max length"] |
| `errorContext.retryCount` | number (optional) | How many times enrichment was retried | Tracks resilience |

#### Source & Context

| Field | Type | Purpose |
|-------|------|---------|
| `sourceUrl` | string (optional) | Final URL scraped (after disambiguation resolution) |
| `userAgent` | string (optional) | Firecrawl/browser UA used in request |
| `initiatedBy` | enum | Reason enrichment was triggered |

---

## Migration Path

### Phase 1 (Current)
- Add all new fields as **optional** to cities table
- Create enrichmentLogs table for tracking

### Phase 2 (Implementation)
- Populate fields via Firecrawl as cities are visited
- Log all enrichment attempts

### Phase 3 (Optimization)
- Monitor `fieldsPopulated` rates to identify broken Wikipedia URLs
- Use enrichmentLogs to detect patterns (e.g., which error codes are most common)

---

## Indexes

### Cities Table Indexes

```typescript
.index('by_enrichment_status', ['isEnriched', 'lastEnrichedAt'])
// Used by: checkEnrichmentStatus query
// Query: Find all unenriched cities OR cities enriched >1 week ago
```

### EnrichmentLogs Table Indexes

```typescript
.index('by_city_id', ['cityId'])           // Find all enrichment history for a city
.index('by_status', ['status'])             // Monitor pending/failed enrichments
.index('by_created_at', ['createdAt'])      // Chronological queries, recent logs first
.index('by_city_and_created', ['cityId', 'createdAt'])  // Latest attempt for each city
```

---

## Backward Compatibility

All new fields on the `cities` table are **optional** to maintain backward compatibility:
- Existing city records continue to work
- Queries checking `city.isEnriched` must use optional chaining: `city.isEnriched ?? false`
- No data migration required; enrichment is purely additive

---

## Constraints & Limits

1. **Data Size**: Total enrichment per city should not exceed ~50KB (description + all content)
2. **Concurrency**: Only one enrichment allowed per city at a time (enforced via `enrichmentInProgress` lock)
3. **Lock Timeout**: Stale locks automatically cleared after 5 minutes
4. **Freshness**: Cities enriched within past week are not re-enriched (1-week threshold)
5. **Rate Limiting**: Firecrawl SDK handles API rate limits automatically; Convex enforces at-most-once semantics per enrichment attempt

---

## Example: City Record After Enrichment

```json
{
  "_id": "city_id_123",
  "name": "Paris",
  "country": "France",
  "slug": "paris-france",
  "shortSlug": "paris",
  "latitude": "48.8566",
  "longitude": "2.3522",
  "image": "https://example.com/paris.jpg",
  "visitCount": 42,

  "isEnriched": true,
  "lastEnrichedAt": 1731638400000,
  "scrapedAt": 1731638400000,
  "sourceUrl": "https://en.wikipedia.org/wiki/Paris",
  "enrichmentInProgress": false,
  "lockAcquiredAt": null,

  "description": "Paris is the capital and most populous city of France...",
  "history": "The area around Paris has been inhabited since ancient times...",
  "geography": "Paris is located in the north-central part of France...",
  "climate": "Paris has a temperate maritime climate...",
  "tourism": {
    "overview": "Paris is one of the world's leading tourist destinations...",
    "landmarks": ["Eiffel Tower", "Notre-Dame", "Louvre Museum"],
    "museums": ["Louvre", "Musée d'Orsay"],
    "attractions": ["Latin Quarter", "Champs-Élysées", "Arc de Triomphe"]
  },
  "transportation": "Paris has an extensive public transport system...",
  "images": [
    "https://upload.wikimedia.org/wikipedia/commons/..."
  ]
}
```
