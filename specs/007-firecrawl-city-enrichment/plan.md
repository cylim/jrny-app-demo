# Implementation Plan: Firecrawl City Enrichment

**Branch**: `007-firecrawl-city-enrichment` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-firecrawl-city-enrichment/spec.md`

## Summary

Implement automatic, user-visit-driven city data enrichment using Firecrawl's web scraping API. When users visit a city page, the system triggers background enrichment to fetch detailed city information (descriptions, images, points of interest, climate data) from Wikipedia and other web sources. Enrichment occurs on-demand for unenriched cities or cities with stale data (>1 week old), with intelligent merge to preserve existing valid data. The system handles concurrent requests through locking, displays enrichment-in-progress messages to users, and logs all enrichment attempts for monitoring.

## Technical Context

**Language/Version**: TypeScript 5.x (existing project standard)
**Primary Dependencies**:
- `@mendable/firecrawl-js` (Firecrawl Node.js SDK for web scraping)
- Convex (backend database and serverless functions)
- TanStack Start + Router (frontend framework)
- Zod (runtime validation for scraped data)

**Storage**: Convex database (existing `cities` table extended with enrichment fields)
**Testing**: Vitest (unit tests), Playwright (E2E tests), convex-test (Convex function tests)
**Target Platform**: Cloudflare Workers (frontend), Convex Cloud (backend)
**Project Type**: Web application (existing full-stack TypeScript app)
**Performance Goals**:
- City page load: <2s regardless of enrichment status (enrichment non-blocking)
- Single city enrichment: <30s total (Firecrawl API call + data processing)
- 90% enrichment success rate
- Re-enrichment prevented for cities enriched within past week (80% API call reduction)

**Constraints**:
- Asynchronous enrichment only (cannot block city page display)
- 5-minute lock timeout for stale enrichment locks
- 1-week freshness threshold for re-enrichment
- Manual page refresh required to see enriched data (no auto-refresh or push notifications)
- Concurrent enrichment protection via in-progress flag

**Scale/Scope**:
- Initially enriches cities organically as users visit them (no bulk pre-enrichment)
- Supports all ~1000 cities in database
- Firecrawl rate limits apply (exact limits depend on plan tier)
- Enrichment logs stored indefinitely for monitoring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety & Validation ✅

- **Convex Functions**: All enrichment functions MUST use `args` and `returns` validators
- **Environment Variables**: `FIRECRAWL_API_KEY` MUST be validated via t3env with Zod
- **Scraped Data Validation**: All Firecrawl responses MUST be validated with Zod schemas before database updates
- **TypeScript**: Strict mode enabled (existing project standard)
- **No `any` types**: Firecrawl SDK responses typed with custom interfaces where SDK types incomplete

**Status**: ✅ PASS - Standard type safety maintained. Firecrawl SDK types may require custom interfaces (documented as justified use of type assertions where SDK incomplete).

### II. Testing Standards ✅

- **Integration Tests**: City page enrichment flow (visit → trigger → enrich → display)
- **Unit Tests**: Firecrawl response parsing, data validation, intelligent merge logic
- **Contract Tests**: Enrichment function contracts (trigger conditions, lock management, error handling)
- **Error Handling**: Firecrawl API failures, network timeouts, invalid scraped data

**Test Coverage Requirements**:
- Enrichment trigger logic (unenriched, stale data, concurrent requests)
- Lock acquisition and release (including stale lock cleanup)
- Data merge strategy (update only changed fields)
- Error scenarios (API failures, malformed data, rate limits)

**Status**: ✅ PASS - Test plan covers critical paths (enrichment trigger, locking, data validation).

### III. Performance & Observability ✅

**Performance Targets**:
- City page TTFB: <200ms p95 (existing target maintained - enrichment doesn't block)
- Enrichment latency: <30s total (Firecrawl API + processing)
- Lock timeout: 5 minutes maximum (prevents permanent blocking)
- Re-enrichment threshold: 1 week (balances freshness vs API cost)

**Observability**:
- **Sentry Integration**: Enrichment errors captured with city ID, error type, Firecrawl response
- **Enrichment Logs**: New `enrichmentLogs` table tracks all attempts with:
  - Timestamp, city ID, success/failure status, error details, duration
- **Metrics**: Track enrichment success rate, average duration, API failures
- **Alerts**: Monitor for elevated failure rates, stuck locks, API rate limit errors

**Status**: ✅ PASS - Observability via Sentry + enrichment logs. Performance targets aligned with async processing.

### IV. User Experience Consistency ✅

**Loading States**:
- Enrichment in-progress message displayed when `enrichmentInProgress === true` OR `lastEnrichedAt > 1 week`
- Basic city info always displayed (never blank page)
- No blocking spinners (enrichment is background process)

**Error States**:
- Firecrawl failures show generic "Unable to fetch latest city information" message
- City page still displays with existing data or basic city info
- Errors logged to Sentry, not surfaced to users

**Responsive Design**:
- Enrichment message styled with Tailwind utilities
- Works on mobile and desktop (existing responsive framework)

**Status**: ✅ PASS - User experience prioritizes page availability over enrichment completeness.

### V. Security & Privacy ✅

**Authentication**:
- Enrichment triggered on page visit (authenticated or anonymous users)
- No admin-only access required (public feature)

**Secrets Management**:
- `FIRECRAWL_API_KEY` stored as Convex environment variable (via `npx convex env set`)
- Never exposed to client (server-side Convex action only)

**Input Validation**:
- City names sanitized before Wikipedia URL construction
- Firecrawl responses validated with Zod before database writes
- Prevents injection attacks via scraped content

**Data Privacy**:
- No user data sent to Firecrawl (only public city names)
- Enriched data is public information (Wikipedia, tourism sites)
- No PII involved

**Status**: ✅ PASS - Minimal security surface (public data only). API key properly secured.

### Constitution Compliance Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| Type Safety & Validation | ✅ PASS | Zod validation for Firecrawl responses, t3env for API key |
| Testing Standards | ✅ PASS | Integration + unit tests for enrichment flow and error handling |
| Performance & Observability | ✅ PASS | Async processing, enrichment logs, Sentry integration |
| User Experience Consistency | ✅ PASS | Non-blocking enrichment, graceful error handling |
| Security & Privacy | ✅ PASS | API key in env vars, input validation, public data only |

**GATE RESULT**: ✅ **PASS** - All constitution principles satisfied. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/007-firecrawl-city-enrichment/
├── plan.md              # This file
├── research.md          # Firecrawl integration research (Phase 0 output)
├── data-model.md        # Extended city schema (Phase 1 output)
├── quickstart.md        # Development setup guide (Phase 1 output)
├── contracts/           # Enrichment function contracts (Phase 1 output)
│   └── enrichment.ts    # TypeScript types for enrichment API
└── tasks.md             # Implementation tasks (Phase 2 - via /speckit.tasks)
```

### Source Code (repository root)

**Existing Structure** (Web application with TanStack Start + Convex):

```text
convex/
├── schema.ts            # [MODIFIED] Extend cities table with enrichment fields
├── enrichment.ts        # [NEW] Enrichment queries, mutations, actions
└── _generated/          # Auto-generated types

src/
├── routes/
│   └── c/
│       └── $shortSlug.tsx  # [MODIFIED] City page with enrichment trigger + UI message
├── lib/
│   └── firecrawl.ts     # [NEW] Firecrawl SDK wrapper with rate limiting
├── env.server.ts        # [MODIFIED] Add FIRECRAWL_API_KEY validation
└── components/
    └── city/
        └── enrichment-status.tsx  # [NEW] Enrichment in-progress message component

tests/
├── integration/
│   └── city-enrichment.spec.ts  # [NEW] E2E test for enrichment flow
└── unit/
    ├── enrichment.test.ts        # [NEW] Unit tests for enrichment logic
    └── firecrawl-parser.test.ts  # [NEW] Tests for Wikipedia data parsing
```

**Structure Decision**: Extends existing web application architecture. Enrichment implemented as Convex actions (for external API calls to Firecrawl) with supporting queries/mutations for lock management and data updates. Client-side city page modified to display enrichment status messages.

## Complexity Tracking

No constitution violations. This section intentionally left empty.
