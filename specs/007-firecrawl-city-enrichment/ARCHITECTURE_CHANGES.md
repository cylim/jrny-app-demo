# Architecture Change Summary: Separate cityEnrichmentContent Table

**Date**: 2025-11-16
**Reason**: Optimize database query performance by separating heavy enrichment content from lightweight city metadata

## What Changed

### Before (Original Design)
All enrichment data stored directly in `cities` table:
- cities.description
- cities.history
- cities.geography  
- cities.climate
- cities.transportation
- cities.tourism (object)
- cities.images (array)
- cities.sourceUrl
- cities.scrapedAt
- cities.isEnriched
- cities.lastEnrichedAt
- cities.enrichmentInProgress
- cities.lockAcquiredAt

**Problem**: Every query to the cities table (e.g., city discovery page showing 20 cities) would fetch heavy content fields even when only displaying name/country/coordinates.

### After (New Design)
Enrichment content split into separate `cityEnrichmentContent` table with 1:1 relationship:

**cities table** (lightweight):
- Basic city info: name, slug, country, coordinates, visitCount
- Enrichment metadata only: isEnriched, lastEnrichedAt, enrichmentInProgress, lockAcquiredAt

**cityEnrichmentContent table** (content):
- cityId (foreign key to cities table)
- description, history, geography, climate, transportation, tourism, images
- sourceUrl, scrapedAt

**Benefits**:
- City list queries are faster (no heavy content fields)
- Only fetch enrichmentContent when viewing individual city page
- Reduces database storage bloat (most cities remain unenriched)
- Better separation of concerns (metadata vs content)

## Files Updated

### tasks.md
- **Phase 2 Foundational**:
  - T006: Create cityEnrichmentContent table (was: extend cities table)
  - T007: Add by_city_id unique index to cityEnrichmentContent
  - T008: Add metadata-only fields to cities table (content moved)
  - Added T008a for by_enrichment_status index
  - Added T015-T019 (renumbered from T014-T018)

- **Phase 3 User Story 1**:
  - T025a-T025b: New getCityEnrichmentContent query
  - T040-T040a: Changed from ctx.db.patch(cities) to upsert cityEnrichmentContent
  - T041: Update cities metadata only (not content)
  - T046a: Fetch cityEnrichmentContent in city page loader
  - T049: Return enrichmentContent from loader
  - T058-T065: Display enrichmentContent.* instead of city.*

- **Phase 4 User Story 2**:
  - T070-T071: Intelligent merge works with cityEnrichmentContent table

- **Task Summary**:
  - Total tasks: 133 → 138 (+5 tasks)
  - Phase 2: 13 → 15 tasks
  - Phase 3: 47 → 50 tasks
  - MVP scope: 65 → 70 tasks

## Implementation Notes

### Key Query Pattern
```typescript
// In city page loader:
const city = await ctx.db.get(cityId) // Lightweight, has isEnriched flag
const enrichmentContent = city.isEnriched 
  ? await ctx.db.query('cityEnrichmentContent')
      .withIndex('by_city_id', q => q.eq('cityId', cityId))
      .unique()
  : null

// In city discovery (list):
const cities = await ctx.db.query('cities')
  .withIndex('by_visit_count')
  .order('desc')
  .take(20)
// No enrichmentContent fetched - fast query!
```

### Upsert Pattern
```typescript
// In updateCityData mutation:
const existing = await ctx.db.query('cityEnrichmentContent')
  .withIndex('by_city_id', q => q.eq('cityId', cityId))
  .unique()

if (existing) {
  await ctx.db.patch(existing._id, { /* content fields */ })
} else {
  await ctx.db.insert('cityEnrichmentContent', { cityId, /* content fields */ })
}

// Update metadata in cities table separately
await ctx.db.patch(cityId, { isEnriched: true, lastEnrichedAt: Date.now() })
```

## Migration Considerations

If any cities were already enriched with the old schema (unlikely as feature not yet implemented), would need migration:
1. Create cityEnrichmentContent records from existing cities with isEnriched=true
2. Remove content fields from cities table
3. Keep metadata fields in cities table

Since feature is not yet implemented, no migration needed.

## Related Documents to Update

The following planning documents should be updated to reflect this architecture (future work):
- [ ] data-model.md - Update schema definitions
- [ ] contracts/enrichment.ts - Update TypeScript types if needed
- [ ] research.md - Note the architectural decision
- [ ] plan.md - Update "Project Structure" section
