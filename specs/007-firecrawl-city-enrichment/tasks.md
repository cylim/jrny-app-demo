# Tasks: Firecrawl City Enrichment

**Input**: Design documents from `/specs/007-firecrawl-city-enrichment/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No dedicated test tasks (TDD not requested in spec). Tests will be written ad-hoc during implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**⚠️ ARCHITECTURAL NOTE**: Enrichment content fields (description, history, geography, climate, transportation, tourism, images, sourceUrl, scrapedAt) are stored in a **separate `cityEnrichmentContent` table** with 1:1 relationship to cities via `cityId` foreign key. This optimizes query performance for city lists (which don't need heavy content fields) and reduces database bloat. Only the city page loader fetches enrichmentContent when needed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `convex/`, `tests/` at repository root
- Frontend routes: `src/routes/`
- Convex backend: `convex/`
- Components: `src/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package installation and environment configuration

- [X] T001 [P] Install Firecrawl SDK package: `npm install @mendable/firecrawl-js`
- [X] T002 [P] Verify Zod is installed in package.json (already in project)
- [X] T003 Create Firecrawl account and obtain API key from firecrawl.dev dashboard
- [X] T004 Add FIRECRAWL_API_KEY to .env.local for local development
- [X] T005 Deploy FIRECRAWL_API_KEY to Convex production: `npx convex env set FIRECRAWL_API_KEY "fc_sk_prod_..."`

**Checkpoint**: Development environment ready with Firecrawl access

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema and helper infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create cityEnrichmentContent table schema in convex/schema.ts with cityId foreign key and all enrichment content fields (description, history, geography, climate, transportation, tourism, images, sourceUrl, scrapedAt)
- [X] T007 Add by_city_id unique index to cityEnrichmentContent table in convex/schema.ts for 1:1 relationship with cities
- [X] T008 Add enrichment metadata fields to cities table in convex/schema.ts (isEnriched, lastEnrichedAt, enrichmentInProgress, lockAcquiredAt)
- [X] T009 Add by_enrichment_status index to cities table in convex/schema.ts: `['isEnriched', 'lastEnrichedAt']`
- [X] T010 Create enrichmentLogs table schema in convex/schema.ts with all fields per data-model.md
- [X] T011 [P] Add by_city_id index to enrichmentLogs table in convex/schema.ts
- [X] T012 [P] Add by_status index to enrichmentLogs table in convex/schema.ts
- [X] T013 [P] Add by_created_at index to enrichmentLogs table in convex/schema.ts
- [X] T014 [P] Add by_city_and_created index to enrichmentLogs table in convex/schema.ts
- [X] T015 Deploy schema changes to Convex dev environment: `npx convex dev` (wait for sync confirmation)
- [X] T016 Create src/lib/firecrawl.ts wrapper module with FirecrawlApp initialization using process.env.FIRECRAWL_API_KEY
- [X] T017 Add Wikipedia URL construction helper function in src/lib/firecrawl.ts (constructWikipediaUrl with city name and country)
- [X] T018 Add countPopulatedFields helper function in src/lib/firecrawl.ts to count non-null enrichment fields
- [X] T019 Create convex/enrichment.ts file with "use node" directive at top

**Checkpoint**: Foundation ready - schema deployed, helpers created, enrichment.ts initialized

---

## Phase 3: User Story 1 (P1) - Automated City Data Enrichment 🎯 MVP

**Goal**: Users visiting a city page automatically trigger background enrichment to fetch detailed city information from Wikipedia via Firecrawl

**Independent Test**: Visit an unenriched city page → verify enrichment triggers → refresh page → verify enriched content displays

### Lock Management (Foundational for US1)

- [ ] T020 [US1] Implement acquireLock internal mutation in convex/enrichment.ts with stale lock detection (5-minute timeout)
- [ ] T021 [US1] Implement releaseLock internal mutation in convex/enrichment.ts to clear enrichmentInProgress and lockAcquiredAt

### Enrichment Status Check (Foundational for US1)

- [ ] T021 [US1] Implement checkEnrichmentStatus query in convex/enrichment.ts with args validator cityId and returns validator per contracts/enrichment.ts
- [ ] T022 [US1] Add logic to checkEnrichmentStatus to detect 'never_enriched' (isEnriched is falsy)
- [ ] T023 [US1] Add logic to checkEnrichmentStatus to detect 'in_progress' (enrichmentInProgress is true)
- [ ] T024 [US1] Add logic to checkEnrichmentStatus to detect 'stale_data' (lastEnrichedAt > 1 week ago)
- [ ] T025 [US1] Add logic to checkEnrichmentStatus to return 'up_to_date' as default case
- [ ] T025a [P] [US1] Implement getCityEnrichmentContent query in convex/enrichment.ts with args: cityId, returns: cityEnrichmentContent | null
- [ ] T025b [US1] Add query logic to getCityEnrichmentContent using ctx.db.query('cityEnrichmentContent').withIndex('by_city_id', q => q.eq('cityId', cityId)).unique() with null fallback

### Core Enrichment Action

- [ ] T026 [US1] Implement enrichCity action skeleton in convex/enrichment.ts with args and returns validators per contracts/enrichment.ts
- [ ] T027 [US1] Add lock acquisition logic to enrichCity action using ctx.runMutation(internal.enrichment.acquireLock)
- [ ] T028 [US1] Add early return to enrichCity if lock acquisition fails with error 'Lock acquisition failed'
- [ ] T029 [US1] Add city fetch logic to enrichCity using ctx.runQuery to get city data by cityId
- [ ] T030 [US1] Add Wikipedia URL construction in enrichCity using constructWikipediaUrl(city.name, city.country)
- [ ] T031 [US1] Add Firecrawl API call in enrichCity using FirecrawlApp.scrapeUrl with wikipediaUrl and formats: ['markdown', 'json']
- [ ] T032 [US1] Add Firecrawl response success check in enrichCity; throw error if scrapeResult.success is false
- [ ] T033 [US1] Add Zod validation of Firecrawl response using EnrichedCityDataSchema.safeParse in enrichCity
- [ ] T034 [US1] Add validation failure handling in enrichCity; throw error with Zod error message
- [ ] T035 [US1] Add updateCityData mutation call in enrichCity using ctx.runMutation(internal.enrichment.updateCityData) with validated data
- [ ] T036 [US1] Add success logging in enrichCity using ctx.runMutation(internal.enrichment.logEnrichment) with success: true, duration, fieldsPopulated
- [ ] T037 [US1] Add try/catch error handling in enrichCity with failure logging (success: false, error, errorCode)
- [ ] T038 [US1] Add finally block to enrichCity to always release lock via ctx.runMutation(internal.enrichment.releaseLock)

### Database Update Mutations

- [ ] T039 [US1] Implement updateCityData internal mutation in convex/enrichment.ts with args: cityId, data (EnrichedCityData)
- [ ] T040 [US1] Add upsert logic to updateCityData: check if cityEnrichmentContent exists for cityId using ctx.db.query('cityEnrichmentContent').withIndex('by_city_id', q => q.eq('cityId', cityId)).unique()
- [ ] T040a [US1] Add ctx.db.insert('cityEnrichmentContent') if no existing content found, ctx.db.patch() if content exists, setting description, history, geography, climate, tourism, transportation, images, sourceUrl, scrapedAt
- [ ] T041 [US1] Add metadata updates to cities table in updateCityData: ctx.db.patch(cityId, { isEnriched: true, lastEnrichedAt: Date.now() })

### Enrichment Logging

- [ ] T042 [US1] Implement logEnrichment internal mutation in convex/enrichment.ts with args per LogEnrichmentArgsSchema (cityId, success, duration, error, errorCode, sourceUrl, fieldsPopulated)
- [ ] T043 [US1] Add ctx.db.insert logic to logEnrichment to create enrichmentLogs entry with all fields including initiatedBy: 'user_visit'
- [ ] T044 [US1] Add status field to logEnrichment: 'completed' if success is true, 'failed' if false
- [ ] T045 [US1] Add calculated fields to logEnrichment: startedAt = Date.now() - duration, completedAt = Date.now(), createdAt = Date.now()

### City Page Enrichment Trigger

- [ ] T046 [US1] Update src/routes/c/$shortSlug.tsx loader to fetch enrichment status using convexQuery(api.enrichment.checkEnrichmentStatus, { cityId })
- [ ] T046a [US1] Add query in city page loader to fetch cityEnrichmentContent using convexQuery(api.enrichment.getCityEnrichmentContent, { cityId }) if city.isEnriched is true
- [ ] T047 [US1] Add enrichment trigger logic to city page loader: if needsEnrichment && reason !== 'in_progress', call context.convexClient.action(api.enrichment.enrichCity) as fire-and-forget
- [ ] T048 [US1] Add error catch handler to enrichment trigger to console.error without blocking page load
- [ ] T049 [US1] Return enrichmentStatus and enrichmentContent from city page loader alongside city data

### Enrichment Status UI Component

- [ ] T050 [P] [US1] Create src/components/city/enrichment-status.tsx component file
- [ ] T051 [US1] Implement EnrichmentStatus component in src/components/city/enrichment-status.tsx accepting enrichmentStatus prop
- [ ] T052 [US1] Add conditional rendering to EnrichmentStatus: show message only if needsEnrichment is true
- [ ] T053 [US1] Add enrichment in-progress message with blue background styling when reason is 'in_progress'
- [ ] T054 [US1] Add stale data re-enrichment message when reason is 'stale_data' or 'never_enriched'
- [ ] T055 [US1] Add "Refresh the page to see updates" instruction text to enrichment message

### City Page Enriched Content Display

- [ ] T056 [US1] Add EnrichmentStatus component import to src/routes/c/$shortSlug.tsx
- [ ] T057 [US1] Render EnrichmentStatus component in city page before main content with enrichmentStatus prop
- [ ] T058 [US1] Add description section to city page component: render if enrichmentContent?.description is present
- [ ] T059 [P] [US1] Add tourism landmarks section to city page component: render if enrichmentContent?.tourism?.landmarks is present
- [ ] T060 [P] [US1] Add tourism museums section to city page component: render if enrichmentContent?.tourism?.museums is present
- [ ] T061 [P] [US1] Add tourism attractions section to city page component: render if enrichmentContent?.tourism?.attractions is present
- [ ] T062 [P] [US1] Add history section to city page component: render if enrichmentContent?.history is present
- [ ] T063 [P] [US1] Add geography section to city page component: render if enrichmentContent?.geography is present
- [ ] T064 [P] [US1] Add climate section to city page component: render if enrichmentContent?.climate is present
- [ ] T065 [P] [US1] Add transportation section to city page component: render if enrichmentContent?.transportation is present

**Checkpoint**: User Story 1 complete - users can visit city pages, enrichment triggers automatically, enriched content displays after refresh

---

## Phase 4: User Story 2 (P2) - Enrichment Freshness Management

**Goal**: System automatically re-enriches cities with stale data (>1 week old) when users visit them, keeping information current

**Independent Test**: Enrich a city → manually set lastEnrichedAt to 8 days ago in Convex dashboard → visit city page → verify re-enrichment triggers

### Stale Data Detection (Already Implemented in US1)

- [ ] T066 [US2] Verify checkEnrichmentStatus query correctly calculates stale data threshold (1 week = 7 * 24 * 60 * 60 * 1000 ms)
- [ ] T067 [US2] Verify checkEnrichmentStatus returns 'stale_data' when Date.now() - lastEnrichedAt > ONE_WEEK_MS

### Intelligent Merge Logic

- [ ] T068 [US2] Add intelligent merge helper function in convex/enrichment.ts: shouldUpdateField(existingValue, newValue, existingScrapedAt, newScrapedAt)
- [ ] T069 [US2] Implement shouldUpdateField logic: update if existingValue is null/undefined OR (newValue !== null AND newScrapedAt > existingScrapedAt)
- [ ] T070 [US2] Update updateCityData mutation to fetch existing cityEnrichmentContent record before upserting
- [ ] T071 [US2] Add preservation logic to updateCityData: only update fields in cityEnrichmentContent where shouldUpdateField returns true, keeping existing scrapedAt value where appropriate

### Re-enrichment Logging

- [ ] T072 [US2] Update logEnrichment to distinguish between initial enrichment and re-enrichment via initiatedBy field
- [ ] T073 [US2] Add logic to enrichCity to set initiatedBy: 'stale_refresh' when re-enriching stale data (check if city.isEnriched is true before enrichment)

**Checkpoint**: User Story 2 complete - stale city data automatically refreshes when users visit, preserving unchanged fields

---

## Phase 5: User Story 3 (P3) - Error Handling and Data Quality

**Goal**: Enrichment process handles errors gracefully, validates data quality, and ensures city pages remain functional even when enrichment fails

**Independent Test**: Simulate Firecrawl API failure (invalid API key) → visit unenriched city page → verify page loads with basic city info → verify error logged in enrichmentLogs table

### Firecrawl Error Handling

- [ ] T074 [US3] Add try/catch around Firecrawl API call in enrichCity to catch network errors and timeouts
- [ ] T075 [US3] Add error code mapping in enrichCity: map Firecrawl 404 errors to WIKIPEDIA_NOT_FOUND
- [ ] T076 [US3] Add error code mapping in enrichCity: map Firecrawl 429 errors to FIRECRAWL_RATE_LIMITED
- [ ] T077 [US3] Add error code mapping in enrichCity: map Firecrawl timeout errors to FIRECRAWL_TIMEOUT
- [ ] T078 [US3] Add error code mapping in enrichCity: map Firecrawl auth errors to FIRECRAWL_AUTH_FAILED

### Validation Error Handling

- [ ] T079 [US3] Update Zod validation failure handling in enrichCity to extract specific validation errors from result.error
- [ ] T080 [US3] Add errorContext.validationErrors field to logEnrichment call when Zod validation fails
- [ ] T081 [US3] Add error code VALIDATION_ERROR to logEnrichment when safeParse returns success: false
- [ ] T082 [US3] Add MISSING_REQUIRED_FIELDS error code when source_url or scraped_at are missing from validated data

### Database Error Handling

- [ ] T083 [US3] Add try/catch around ctx.db.patch in updateCityData mutation to catch database write errors
- [ ] T084 [US3] Add error code DATABASE_ERROR when ctx.db operations fail in updateCityData
- [ ] T085 [US3] Add try/catch around ctx.db.insert in logEnrichment mutation with console.error fallback if logging fails

### City Page Error Resilience

- [ ] T086 [US3] Verify city page loader doesn't await enrichment trigger (fire-and-forget pattern already implemented in T047)
- [ ] T087 [US3] Add error boundary component import to src/routes/c/$shortSlug.tsx to catch rendering errors
- [ ] T088 [US3] Verify city page displays basic city info (name, country, coordinates) even when enrichment fields are missing

### Enrichment Monitoring Query

- [ ] T089 [P] [US3] Implement getEnrichmentHistory query in convex/enrichment.ts with args: cityId, returns: array of enrichment logs
- [ ] T090 [US3] Add query logic to getEnrichmentHistory using ctx.db.query('enrichmentLogs').withIndex('by_city_and_created', q => q.eq('cityId', cityId))
- [ ] T091 [US3] Add .order('desc') and .take(10) to getEnrichmentHistory query to return latest 10 logs
- [ ] T092 [P] [US3] Implement getEnrichmentStats query in convex/enrichment.ts with args: hours (number), returns: total, successful, failed, avgDuration
- [ ] T093 [US3] Add aggregation logic to getEnrichmentStats to filter logs by createdAt > Date.now() - hours * 3600 * 1000
- [ ] T094 [US3] Calculate success rate in getEnrichmentStats: successful.length / total.length
- [ ] T095 [US3] Calculate average duration in getEnrichmentStats: sum(durationMs) / count

### Error Logging Integration

- [ ] T096 [US3] Add Sentry error capture to enrichCity action catch block with tags: feature='city-enrichment', cityId
- [ ] T097 [US3] Add Sentry error context with sourceUrl, errorCode, and validationErrors when available
- [ ] T098 [US3] Add console.error with formatted error message in enrichCity catch block for local debugging

**Checkpoint**: User Story 3 complete - enrichment handles errors gracefully, city pages remain functional, errors are logged for debugging

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, documentation, and performance optimization

### Wikipedia URL Disambiguation

- [ ] T099 [P] Add disambiguation detection helper in src/lib/firecrawl.ts: detectDisambiguationPage(firecrawlResponse)
- [ ] T100 [P] Add fallback URL construction in src/lib/firecrawl.ts: try city + region if city + country returns disambiguation
- [ ] T101 Update constructWikipediaUrl in src/lib/firecrawl.ts to handle city name special characters (spaces, accents, apostrophes)
- [ ] T102 Add URL encoding to constructWikipediaUrl to properly escape Wikipedia URL characters
- [ ] T103 Add successful URL caching to updateCityData: store sourceUrl in city record for future enrichments

### Stale Lock Cleanup Cron

- [ ] T104 [P] Create convex/crons.ts file with cronJobs import from 'convex/server'
- [ ] T105 Implement cleanStaleLocks internal mutation in convex/enrichment.ts to query cities with stale locks
- [ ] T106 Add logic to cleanStaleLocks to find cities where enrichmentInProgress is true AND lockAcquiredAt < Date.now() - 5 minutes
- [ ] T107 Add bulk update logic to cleanStaleLocks to clear enrichmentInProgress and lockAcquiredAt for stale locks
- [ ] T108 Register cleanStaleLocks cron in convex/crons.ts to run every hour: `crons.interval('clean-stale-locks', { hours: 1 }, internal.enrichment.cleanStaleLocks)`
- [ ] T109 Export crons as default export from convex/crons.ts

### Performance Optimization

- [ ] T110 [P] Add caching header to Firecrawl API request in src/lib/firecrawl.ts to leverage Wikipedia's CDN
- [ ] T111 [P] Add timeout configuration to FirecrawlApp initialization: 30 seconds per ENRICHMENT_CONSTANTS.FIRECRAWL_TIMEOUT_MS
- [ ] T112 Add response size limit to Firecrawl scrape request to prevent oversized Wikipedia pages from bloating storage
- [ ] T113 Add text truncation helper in src/lib/firecrawl.ts to enforce max length constraints per ENRICHMENT_CONSTANTS
- [ ] T114 Update updateCityData to truncate text fields before patching: description (5000), history (3000), geography/climate/transport (2000)

### Data Quality Improvements

- [ ] T115 [P] Add image URL validation helper in src/lib/firecrawl.ts: filterValidImageUrls(urls: string[])
- [ ] T116 Add HTTPS enforcement to filterValidImageUrls: reject non-HTTPS URLs
- [ ] T117 Add Wikipedia URL normalization to filterValidImageUrls: convert relative paths to absolute URLs
- [ ] T118 Update updateCityData to filter images through filterValidImageUrls before patching city record

### Documentation

- [ ] T119 [P] Add JSDoc comments to all exported functions in convex/enrichment.ts with parameter descriptions and return types
- [ ] T120 [P] Add JSDoc comments to all helper functions in src/lib/firecrawl.ts
- [ ] T121 [P] Update quickstart.md with final implementation notes and troubleshooting section
- [ ] T122 Add inline code comments in enrichCity action explaining enrichment flow steps (lock → fetch → scrape → validate → update → log → release)

### Code Cleanup

- [ ] T123 Remove example/placeholder code from convex/enrichment.ts if any remains
- [ ] T124 Verify all Convex functions have explicit args and returns validators per constitution
- [ ] T125 Run npm run lint to check for code quality issues
- [ ] T126 Run npm run format to ensure consistent code formatting
- [ ] T127 Remove unused imports from convex/enrichment.ts and src/lib/firecrawl.ts

### Validation & Testing

- [ ] T128 Manually test full enrichment flow: visit unenriched city → verify trigger → check Convex dashboard → refresh page → verify display
- [ ] T129 Test concurrent enrichment: open 2 tabs to same unenriched city → verify only 1 enrichment runs
- [ ] T130 Test stale data re-enrichment: enrich city → manually set lastEnrichedAt to 8 days ago → visit page → verify re-enrichment
- [ ] T131 Test error handling: set invalid FIRECRAWL_API_KEY → visit city → verify page loads with basic info → verify error in enrichmentLogs
- [ ] T132 Test Wikipedia disambiguation: visit city with ambiguous name (e.g., Portland) → verify enrichment handles disambiguation
- [ ] T133 Run quickstart.md instructions end-to-end to validate setup guide accuracy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T005) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion (T006-T018)
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (T019-T065) - uses existing enrichment infrastructure
- **User Story 3 (Phase 5)**: Depends on User Story 1 completion (T019-T065) - adds error handling to existing flow
- **Polish (Phase 6)**: Depends on at least User Story 1 completion; ideally all stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Requires User Story 1 core enrichment flow (T026-T045) for intelligent merge logic
- **User Story 3 (P3)**: Requires User Story 1 core enrichment flow (T026-T045) to add error handling

### Within Each User Story

**User Story 1**:
- Lock management (T019-T020) before enrichment action (T026-T038)
- Enrichment status check (T021-T025) before city page trigger (T046-T049)
- Database mutations (T039-T045) before enrichment action completes (T026-T038)
- Enrichment action complete before UI components (T050-T065)

**User Story 2**:
- Stale detection verification (T066-T067) before intelligent merge (T068-T071)
- Intelligent merge helpers (T068-T069) before updateCityData modification (T070-T071)

**User Story 3**:
- Firecrawl error handling (T074-T078) and validation error handling (T079-T082) can run in parallel
- Database error handling (T083-T085) depends on updateCityData existing (T039-T041)
- Monitoring queries (T089-T095) can run independently

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks T001-T002 marked [P] can run in parallel (package install tasks)

**Phase 2 (Foundational)**:
- Schema indexes T010-T013 can run in parallel (all in convex/schema.ts, different indexes)
- Helper functions T015-T017 can run in parallel (all in src/lib/firecrawl.ts, independent functions)

**Phase 3 (User Story 1)**:
- Enrichment status UI component T050-T055 can run in parallel with city page content display T059-T065
- City page content sections T059-T065 marked [P] can all run in parallel (different sections, independent rendering)

**Phase 6 (Polish)**:
- Documentation tasks T119-T122 marked [P] can run in parallel
- Data quality improvements T115-T118 can run in parallel with performance optimization T110-T114
- Cron setup T104-T109 can run independently of other polish tasks

---

## Parallel Example: User Story 1 Content Display

```bash
# Launch all city page content sections together (T059-T065):
Task: "Add tourism landmarks section to city page component: render if city.tourism?.landmarks is present"
Task: "Add tourism museums section to city page component: render if city.tourism?.museums is present"
Task: "Add tourism attractions section to city page component: render if city.tourism?.attractions is present"
Task: "Add history section to city page component: render if city.history is present"
Task: "Add geography section to city page component: render if city.geography is present"
Task: "Add climate section to city page component: render if city.climate is present"
Task: "Add transportation section to city page component: render if city.transportation is present"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T018) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T019-T065)
4. **STOP and VALIDATE**: Test enrichment by visiting an unenriched city page
5. Verify enriched content displays after page refresh
6. Check enrichmentLogs in Convex dashboard for success entries
7. **MVP COMPLETE** - Deploy and demo

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T018)
2. Add User Story 1 → Test independently → **MVP Deploy/Demo** (T019-T065)
3. Add User Story 2 → Test stale data re-enrichment → Deploy (T066-T073)
4. Add User Story 3 → Test error scenarios → Deploy (T074-T098)
5. Add Polish improvements → Final production deployment (T099-T133)

### Parallel Team Strategy

With multiple developers:

1. **All developers together**: Complete Setup + Foundational (T001-T018)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 core enrichment (T019-T045)
   - **Developer B**: User Story 1 UI components (T046-T065) - wait for T039-T045 to complete
   - **Developer C**: Begin Polish work (documentation T119-T122, helper functions T099-T103)
3. **After User Story 1**:
   - **Developer A**: User Story 2 intelligent merge (T066-T073)
   - **Developer B**: User Story 3 error handling (T074-T098)
   - **Developer C**: Polish completion (T104-T133)

---

## Task Summary

**Total Tasks**: 138 tasks across 6 phases (updated to reflect cityEnrichmentContent table architecture)
- **Phase 1 (Setup)**: 5 tasks (T001-T005)
- **Phase 2 (Foundational)**: 15 tasks (T006-T019, including T007 for by_city_id index, T008 split, T015 renumbered) ⚠️ BLOCKS all stories
- **Phase 3 (User Story 1 - P1)**: 50 tasks (T020-T065, including T020-T021 lock mgmt, T021-T025b enrichment status, T040a upsert, T046a fetch content) 🎯 MVP
- **Phase 4 (User Story 2 - P2)**: 8 tasks (T066-T073)
- **Phase 5 (User Story 3 - P3)**: 25 tasks (T074-T098)
- **Phase 6 (Polish)**: 35 tasks (T099-T133)

**Parallel Tasks**: 37 tasks marked [P] can run in parallel within their phase

**MVP Scope**: Phases 1-3 only (T001-T065) = **70 tasks** (updated)
- Delivers core automated enrichment functionality
- Users can visit city pages and see enriched Wikipedia content
- Background enrichment with graceful messaging
- Enrichment content stored in separate table for optimized queries

**Full Feature**: All 138 tasks
- Adds freshness management (auto re-enrichment)
- Adds comprehensive error handling and monitoring
- Adds Wikipedia disambiguation, performance optimization, and documentation

**Key Architecture Decision**: Enrichment content fields moved to dedicated `cityEnrichmentContent` table with 1:1 relationship to cities. This improves performance for city list queries and reduces database bloat when most cities remain unenriched.

---

## Notes

- [P] tasks = different files, no blocking dependencies within same phase
- [Story] label maps task to specific user story for traceability (US1, US2, US3)
- Each user story should be independently completable and testable
- No dedicated test tasks per spec (tests written ad-hoc during implementation)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All file paths are absolute from project root
- Environment variables set via .env.local (local) and `npx convex env set` (production)
