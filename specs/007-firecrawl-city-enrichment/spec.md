# Feature Specification: Firecrawl City Enrichment

**Feature Branch**: `007-firecrawl-city-enrichment`
**Created**: 2025-11-16
**Status**: Draft
**Input**: User description: "use firecrawl to get city info, only get 50 cities update the info into convex."

## Clarifications

### Session 2025-11-16

- Q: When a city that was previously enriched is encountered again (either in a future run or if re-enrichment is explicitly requested), how should the system handle existing enriched data? → A: Update only if source data is newer/different (intelligent merge based on freshness)
- Q: FR-007 states the system must prevent duplicate enrichment by tracking which cities have been enriched. How should this tracking be implemented? → A: Add enrichment status field to City entity (e.g., isEnriched boolean, lastEnrichedAt timestamp)
- Q: FR-010 states the enrichment process must be manually triggered by administrators. What is the specific mechanism for triggering enrichment? → A: When user visits a city page, if not enriched or last enrichment is 1 week old, internal function automatically triggers enrichment
- Q: When multiple users visit the same unenriched city page simultaneously (or within seconds of each other), how should the system handle concurrent enrichment requests? → A: Single in-progress flag with locking (first request triggers enrichment, subsequent requests wait/skip)
- Q: Should users see any indication that enrichment is happening in the background when they visit a city page? → A: Show message indicating enrichment process started (when enrichmentInProgress is true OR lastEnrichedAt is >1 week old), but don't notify when complete; users refresh page to see latest enriched data

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated City Data Enrichment (Priority: P1)

As a user visiting a city page, I need the system to automatically fetch and enrich city information on-demand so that I can see detailed and accurate city profiles when planning my travels.

**Why this priority**: This is the core functionality that enables richer city pages with accurate descriptions, images, and metadata. Without this, city pages remain bare with minimal information, reducing user engagement.

**Independent Test**: Can be fully tested by visiting an unenriched city page, verifying that enrichment triggers automatically, and confirming that the city page displays enhanced information after enrichment completes.

**Acceptance Scenarios**:

1. **Given** a user visits a city page that has never been enriched, **When** the page loads, **Then** the system automatically triggers enrichment in the background, displays basic city information, and shows a message indicating enrichment is in progress
2. **Given** a city has been enriched recently (within 1 week), **When** users view the city page, **Then** they see enhanced information including description, images, points of interest, and other relevant metadata with no enrichment message
3. **Given** a city was enriched more than 1 week ago, **When** a user visits the city page, **Then** the system automatically triggers re-enrichment and displays a message indicating city information is being updated
4. **Given** enrichment is running in the background, **When** a user wants to see the latest enriched data, **Then** they must manually refresh the page (no automatic update notification)

---

### User Story 2 - Enrichment Freshness Management (Priority: P2)

As a user, I need the system to keep city information fresh by re-enriching stale data so that I always see up-to-date information when planning my travels.

**Why this priority**: City information changes over time (new attractions, updated descriptions, changed business hours). Automatic re-enrichment ensures data remains current without manual intervention.

**Independent Test**: Can be tested by enriching a city, manually updating its lastEnrichedAt timestamp to be older than 1 week, then visiting the city page to verify re-enrichment triggers automatically.

**Acceptance Scenarios**:

1. **Given** a city was last enriched more than 1 week ago, **When** a user visits the city page, **Then** the system automatically triggers re-enrichment with fresh web data
2. **Given** a city was enriched within the past week, **When** a user visits the city page, **Then** the system displays existing enriched data without triggering re-enrichment

---

### User Story 3 - Error Handling and Data Quality (Priority: P3)

As a user, I need the enrichment process to handle errors gracefully and validate data quality so that I see reliable city information and temporary web service failures don't break the city page.

**Why this priority**: Web scraping is inherently unreliable. Proper error handling ensures that transient failures don't prevent successful enrichment of other cities and that bad data doesn't pollute the database.

**Independent Test**: Can be tested by simulating various failure scenarios (network timeout, invalid data from web source, API rate limiting) when visiting a city page and verifying that the page still loads with existing data (if any) and errors are logged without breaking the user experience.

**Acceptance Scenarios**:

1. **Given** the web data source is unavailable when a user visits an unenriched city page, **When** enrichment fails, **Then** the system logs the error, displays the city page with basic information, and does not corrupt the city record
2. **Given** fetched data is incomplete or invalid during enrichment, **When** validating the data, **Then** the system rejects the data and preserves existing city information
3. **Given** enrichment fails for a city, **When** viewing enrichment logs, **Then** the system records the failure with error details for debugging

---

### Edge Cases

- What happens when a city name has special characters or non-English names that may not be found accurately in web sources?
- How does the system handle rate limiting from the web data source (Firecrawl) when fetching city data?
- When a city's web data changes between multiple enrichment runs, the system performs an intelligent merge: it updates only fields where source data is newer or different, preserving existing valid data when source hasn't changed
- How does the system handle cities that share the same name but are in different countries (e.g., Portland, USA vs Portland, UK)?
- What happens when the enrichment process is interrupted midway (e.g., server restart) - the enrichmentInProgress flag ensures graceful recovery; stale locks are cleared after a timeout period
- When multiple users visit the same city page simultaneously, only the first request triggers enrichment; concurrent requests skip enrichment due to the in-progress lock

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch city information from web sources using a web scraping service when a user visits a city page
- **FR-002**: System MUST trigger enrichment automatically when a city page is visited if the city has never been enriched OR if last enrichment occurred more than 1 week ago
- **FR-003**: System MUST extract relevant city information from web sources including description, images, points of interest, tourism highlights, climate information, and local culture details
- **FR-004**: System MUST validate fetched data for completeness and accuracy before updating city records
- **FR-005**: System MUST update existing city records in the database with enriched information without deleting or overwriting core city attributes (name, country, coordinates); when re-enriching previously processed cities, system MUST intelligently merge by updating only fields where source data is newer or different
- **FR-006**: System MUST handle errors during data fetching gracefully by logging failures without breaking the city page display; if enrichment fails, city page MUST still display basic city information
- **FR-007**: System MUST prevent duplicate enrichment by tracking enrichment status on the City entity using an isEnriched boolean flag and lastEnrichedAt timestamp; system MUST use an enrichmentInProgress flag to prevent concurrent enrichment of the same city when multiple users visit simultaneously
- **FR-011**: System MUST set enrichmentInProgress flag before starting enrichment and clear it upon completion or failure; stale locks (enrichmentInProgress true for more than 5 minutes) MUST be automatically cleared to prevent permanent blocking
- **FR-008**: System MUST log enrichment attempts with timestamp, city ID, success/failure status, and error details for monitoring and debugging
- **FR-009**: System MUST respect rate limits imposed by the web data source to avoid service interruptions
- **FR-010**: Enrichment process MUST run asynchronously in the background to avoid blocking city page display; users MUST NOT wait for enrichment to complete before seeing the city page
- **FR-012**: System MUST display a user-facing message when enrichment is in progress (enrichmentInProgress is true OR lastEnrichedAt is >1 week old), informing users to refresh the page for latest data; system MUST NOT show completion notifications or auto-refresh the page when enrichment completes

### Key Entities

- **City**: Existing entity in the database representing a geographic location. Will be extended with enriched fields such as:
  - Extended description (beyond basic name/country)
  - Multiple images (hero image, landmarks, street views)
  - Points of interest (museums, parks, landmarks)
  - Tourism highlights and recommended activities
  - Climate and weather information
  - Cultural notes and local customs
  - Best times to visit
  - Transportation information
  - Enrichment tracking fields: isEnriched (boolean), lastEnrichedAt (timestamp), enrichmentInProgress (boolean for locking)

- **Enrichment Log**: New entity tracking enrichment execution history:
  - Timestamp of enrichment run
  - Number of cities processed
  - Number of successful enrichments
  - Number of failures with error details
  - List of city IDs processed in this run
  - Duration of enrichment process
  - Last enrichment timestamp per city (used for intelligent merge to determine if source data is newer)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: City page loads within 2 seconds for users, regardless of enrichment status (enrichment does not block page display)
- **SC-002**: At least 90% of enrichment attempts succeed when triggered by city page visits
- **SC-003**: Enriched city information becomes visible to users within 1 minute after enrichment completes
- **SC-004**: Single city enrichment completes within 30 seconds, accounting for web scraping and data processing
- **SC-005**: System maintains enrichment logs that track all enrichment attempts with success/failure status for monitoring
- **SC-006**: Existing city data (name, country, coordinates, visit counts) remains unchanged after enrichment - only enriched fields are added or updated
- **SC-007**: Cities enriched within the past week are not re-enriched, reducing unnecessary API calls by at least 80%

## Assumptions

- Firecrawl service is the chosen web scraping provider and has API access configured
- System has appropriate API keys and credentials for Firecrawl
- City names in the database are accurate enough to produce reliable web search results
- Web sources (Wikipedia, travel sites, etc.) have sufficient information for most major cities
- Enrichment freshness threshold of 1 week balances data currency with API cost efficiency
- Asynchronous enrichment is acceptable; users do not need instant enriched data on first page load
- Enriched data will be stored in additional optional fields on the existing cities table rather than a separate table
- Most cities will be visited by users over time, naturally spreading enrichment across the dataset

## Out of Scope

- Manual admin-triggered batch enrichment (replaced by automatic user-visit-driven enrichment)
- Real-time synchronous enrichment that blocks city page display
- Automatic page refresh or live updates when enrichment completes (users must manually refresh)
- Real-time progress bars or percentage completion indicators for enrichment
- Translation of enriched content to multiple languages
- Continuous scheduled monitoring of web sources for data updates
- Bulk pre-enrichment of all cities in the database (enrichment occurs organically as users visit cities)
- Custom selection of specific cities to enrich (trigger is purely based on user visits and staleness)
- Push notifications or toast messages when enrichment completes
