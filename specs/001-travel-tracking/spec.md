# Feature Specification: Travel Location Tracking & Social Discovery

**Feature Branch**: `001-travel-tracking`
**Created**: 2025-11-14
**Status**: Draft
**Input**: User description: "Build an application that allow logged in user to record their traveling location and from/to date. On the travelled city page, can see who is currently in the location. User profile should have a list of visited cities sorted by date and able to see who was in the city during the period. For non-logged-in user, they can only visit the landing page, and city page without the user who is there info."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record Travel Location with Dates (Priority: P1)

A logged-in traveler wants to record where they've been and when, creating a personal travel history. They add a city they're visiting or have visited, specify arrival and departure dates, and the system saves this information to their profile.

**Why this priority**: This is the core value proposition—enabling users to track their travel history. Without this, there's no data for any other feature. This story delivers immediate value as a personal travel journal.

**Independent Test**: Can be fully tested by logging in, adding a city visit with dates, and verifying it appears in the user's profile. Delivers value as a standalone personal travel tracker.

**Acceptance Scenarios**:

1. **Given** a logged-in user on their profile page, **When** they add a new city visit with arrival date "2025-01-10" and departure date "2025-01-20", **Then** the city appears in their visited cities list with the correct date range
2. **Given** a logged-in user recording a current trip, **When** they add a city with arrival date "2025-11-10" and no departure date, **Then** the system marks them as "currently in" that location
3. **Given** a logged-in user with multiple city visits, **When** they view their profile, **Then** cities are sorted by most recent visit first (by arrival date)
4. **Given** a logged-in user adding a city, **When** they specify the same city with overlapping dates, **Then** the system prevents duplicate entries for the same period

---

### User Story 2 - View Who's Currently in a City (Priority: P2)

A logged-in traveler visiting a city page wants to see who else is currently there, enabling them to discover other travelers and potentially connect. They can see each traveler's profile photo, username, and clickable link to their full profile.

**Why this priority**: This is the social discovery feature that differentiates the app from a simple travel journal. It creates value through connection and community, but depends on Story 1's data to function.

**Independent Test**: Can be tested by having multiple logged-in users mark themselves as currently in the same city, then verifying each user sees the others on that city's page. Delivers social discovery value.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a city page where they are currently located, **When** another user also marks themselves as currently in that city, **Then** both users see each other in the "Who's here now" section
2. **Given** a logged-in user viewing a city page, **When** they see the list of current visitors, **Then** only users with open-ended visits (no departure date) or departure dates in the future appear
3. **Given** a logged-in user who departed a city yesterday, **When** viewing that city's page, **Then** they no longer appear in the "Who's here now" section
4. **Given** a logged-in user viewing a city page, **When** no other users are currently there, **Then** they see a message indicating "No other travelers here right now"

---

### User Story 3 - View Historical City Visitors (Priority: P3)

A logged-in user viewing their own profile wants to see who else was in the same cities during their visits, helping them discover shared experiences and potential connections based on past travels. Any single day of overlap counts as being "there at the same time."

**Why this priority**: This adds retroactive social discovery, creating connections based on historical overlap. It's valuable but less urgent than current location discovery since it's retrospective rather than enabling real-time meetups.

**Independent Test**: Can be tested by having users with overlapping city visits view their profiles and verify they see each other for the shared time period. Delivers historical connection discovery.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing their profile, **When** they select a city they visited from Jan 10-20, **Then** they see a list of other users who were in that city for at least one overlapping day
2. **Given** a logged-in user viewing visitors for a past city, **When** another user was there from Jan 15-25 (5-day overlap), **Then** that user appears in the list with their visit dates shown
3. **Given** a logged-in user who visited a city Jan 10-15, **When** another user visited the same city Jan 15-20 (single day overlap on Jan 15), **Then** both users appear in each other's historical visitor lists for that city
4. **Given** a logged-in user viewing visitors for a past city, **When** no other users were there during their visit (zero day overlap), **Then** they see a message "No other tracked travelers during your visit"
5. **Given** a logged-in user viewing their profile, **When** they see the list of cities, **Then** each city shows a count of how many other users had at least one day of overlap during their stay

---

### User Story 4 - Public Landing and City Pages (Priority: P1)

A non-logged-in visitor wants to understand what the app offers and browse city information without seeing private user data. They can access the landing page explaining the service and view city pages with general information, but not see who is currently there or who has visited.

**Why this priority**: Essential for user acquisition and privacy compliance. The landing page is the entry point for new users, and privacy-respecting public pages build trust. This is P1 because it's required for launch—you can't require login before users understand the value.

**Independent Test**: Can be tested by accessing the site without logging in and verifying: landing page is accessible, city pages show basic info but no user lists, and all user-related features prompt for login. Delivers marketing and onboarding value.

**Acceptance Scenarios**:

1. **Given** a non-logged-in visitor, **When** they access the landing page, **Then** they see an overview of the app's features and a prominent "Sign Up" or "Log In" call-to-action
2. **Given** a non-logged-in visitor, **When** they navigate to a city page, **Then** they see the city name and basic information but no "Who's here now" section or visitor lists
3. **Given** a non-logged-in visitor on a city page, **When** they attempt to record a visit or view visitors, **Then** they are prompted to log in or sign up
4. **Given** a non-logged-in visitor, **When** they try to access a user profile page directly, **Then** they are redirected to the landing page with a login prompt

---

### Edge Cases

- **Overlapping visits**: What happens when a user records multiple visits to the same city with overlapping date ranges? (System should prevent overlaps or merge them)
- **Past departure dates**: How does the system handle users who forgot to set a departure date for a past trip? (Auto-close visits after a configurable period, e.g., 90 days)
- **Time zones**: What happens when users are recording visits across different time zones? (Store dates in UTC, display in user's local time)
- **Invalid date ranges**: How does the system handle departure dates before arrival dates? (Validation prevents this at input time)
- **City naming**: What happens when a user can't find their city in the autocomplete? (The database includes the top 1000 cities worldwide by population, covering the vast majority of travel destinations; unsupported cities require users to contact support for admin to add new entries)
- **Privacy concerns**: What happens if a user doesn't want to appear in any visitor lists? (Users can enable a global privacy toggle that hides them from all current and historical visitor lists)
- **Deleted accounts**: What happens to historical "who was there" data when a user deletes their account? (Remove user from all historical visitor lists)

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST require authentication for recording travel locations
- **FR-002**: System MUST require authentication for viewing "Who's currently in a city" information
- **FR-003**: System MUST require authentication for viewing historical city visitors
- **FR-004**: System MUST allow non-authenticated users to access the landing page
- **FR-005**: System MUST allow non-authenticated users to view city pages without user-specific information
- **FR-006**: Users MUST only be able to edit or delete their own travel records
- **FR-007**: Users MUST be able to view other users' current locations only when those users are marked as currently in a city

#### Travel Location Recording

- **FR-008**: Logged-in users MUST be able to add a city visit with an arrival date
- **FR-009**: Logged-in users MUST be able to optionally add a departure date when recording a visit
- **FR-010**: System MUST mark users as "currently in" a location when no departure date is provided or departure date is in the future
- **FR-011**: System MUST validate that departure dates are not before arrival dates
- **FR-012**: System MUST prevent duplicate visits to the same city with overlapping date ranges
- **FR-013**: Logged-in users MUST be able to edit their own visit dates
- **FR-014**: Logged-in users MUST be able to delete their own visit records
- **FR-015**: System MUST automatically close open-ended visits (no departure date) after 90 days of inactivity

#### City Selection & Data

- **FR-032**: System MUST maintain a pre-populated table of the top 1000 cities worldwide by population, including geographic coordinates
- **FR-033**: Users MUST select cities from the pre-populated list via autocomplete search functionality
- **FR-034**: City autocomplete MUST filter results as users type, showing matching city names
- **FR-035**: Each city in the database MUST include name, country, region, latitude, and longitude
- **FR-036**: City pages MUST be accessible via URL-friendly identifiers (e.g., slugs)
- **FR-039**: System MUST provide a way for administrators to add new cities to the database if users request unsupported locations

#### User Profile

- **FR-016**: Logged-in users MUST have a profile page displaying their visited cities
- **FR-017**: System MUST sort visited cities by arrival date, most recent first
- **FR-018**: Profile MUST display visit date ranges for each city (arrival - departure)
- **FR-019**: Profile MUST indicate when a visit is ongoing (currently in location)
- **FR-020**: Profile MUST show a count of other users who were in each city with at least one day of date overlap
- **FR-021**: Users MUST be able to click on a city in their profile to see who else was there with at least one day of overlap
- **FR-040**: System MUST detect date overlaps using day-level precision (two visits overlap if they share at least one calendar day)

#### City Pages

- **FR-022**: System MUST have dedicated pages for each city
- **FR-023**: City pages for logged-in users MUST show a "Who's here now" section listing current visitors
- **FR-024**: City pages for logged-in users MUST only include users whose current visit hasn't ended
- **FR-025**: City pages for non-logged-in users MUST NOT display any user lists or visitor information
- **FR-026**: City pages MUST display the city name prominently
- **FR-027**: System MUST update "Who's here now" lists in real-time when users add or update their visits
- **FR-037**: Visitor lists (current and historical) MUST display each user's profile photo, username, and clickable profile link
- **FR-038**: Users MUST have a profile photo (default avatar provided if user hasn't uploaded one)

#### Privacy & Data

- **FR-028**: Users MUST have a global privacy toggle to opt out of appearing in all visitor lists (both current and historical)
- **FR-029**: System MUST respect the global privacy toggle when displaying "Who's here now" and historical visitors (hidden users never appear in any lists)
- **FR-030**: System MUST remove all user data from visitor lists when an account is deleted
- **FR-031**: System MUST store dates with sufficient precision to determine overlapping visits (day-level minimum)

### Key Entities

- **User**: Represents a traveler using the app. Attributes include username/profile identifier, profile photo (or default avatar), authentication credentials, privacy settings, and a collection of city visits.

- **City Visit**: Represents a single visit to a city by a user. Attributes include the city reference, arrival date, optional departure date, and the user who recorded it. Relationships: belongs to one User, references one City.

- **City**: Represents a geographic location that users can visit. Attributes include city name, country, region, latitude, longitude, and a normalized identifier for URL-friendly routing. Pre-populated in the system to ensure data consistency. Relationships: has many City Visits.

- **Visit Overlap**: (Derived/computed relationship) Represents the period when two users were in the same city simultaneously. Two visits overlap if they share at least one calendar day. Calculated by comparing City Visit date ranges for the same city using day-level precision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Logged-in users can record a new city visit in under 30 seconds
- **SC-002**: Users can view their complete travel history sorted by date within 2 seconds of loading their profile
- **SC-003**: "Who's here now" lists update within 5 seconds when a user marks themselves as currently in a city
- **SC-004**: 90% of users successfully record their first city visit without encountering errors or confusion
- **SC-005**: Non-logged-in users can browse at least 3 city pages and the landing page without being forced to authenticate
- **SC-006**: Users can discover at least one connection (shared city visit) within their first week of active use, if overlaps exist
- **SC-007**: System accurately identifies date overlaps with 100% accuracy (any single day overlap is correctly detected and displayed in historical visitor lists)
- **SC-008**: Zero instances of users seeing visit data from deleted accounts in any visitor lists
- **SC-009**: Privacy-conscious users can opt out of visibility in under 3 clicks from their profile settings

## Clarifications

### Session 2025-11-14

- Q: How should users select cities when recording a visit? → A: Pre-populated cities table with autocomplete search
- Q: How granular should the privacy controls be for user visibility? → A: Global visibility toggle only (on/off for all lists)
- Q: What user information should be displayed in the "Who's here now" and historical visitor lists? → A: Username, profile photo, and profile link
- Q: What should be the initial scope of the pre-populated cities database? → A: Top 1000 cities worldwide by population
- Q: How should the system determine if two visits "overlap" for the historical visitor feature? → A: Any single day overlap counts (most inclusive)

## Assumptions

Since the feature description didn't specify certain details, the following reasonable assumptions were made:

1. **Authentication Method**: The app already has authentication implemented (Better-Auth as per project context), so this feature leverages existing auth without defining the login/signup flow.

2. **City Data Source**: Cities are stored in a pre-populated Convex table containing the top 1000 cities worldwide by population, each with name, country, region, latitude, and longitude. Users select cities via autocomplete search rather than free-text entry, ensuring data consistency and enabling location-based features. This covers the vast majority of travel destinations while keeping the database manageable.

3. **Privacy Defaults**: Users are visible in all traveler lists by default (opt-out model rather than opt-in) to maximize social discovery value. A single global privacy toggle controls visibility across both current location and historical visitor lists, keeping the privacy model simple and easy to understand.

4. **Date Precision**: Day-level precision is sufficient for tracking visits (no need for hour/minute timestamps), which matches typical travel planning granularity.

5. **Real-time Updates**: "Real-time" means updates appear within a few seconds via the existing Convex real-time subscription infrastructure, not instant WebSocket push.

6. **Historical Data Retention**: All historical visit data is retained indefinitely unless explicitly deleted by the user or when the user deletes their account.

7. **Auto-close Period**: Open-ended visits (no departure date) are automatically closed after 90 days to prevent stale "currently here" data when users forget to mark their departure.

8. **User Profiles**: User profiles are accessible to other logged-in users to facilitate social discovery, but specific profile content (beyond visited cities) is out of scope for this feature.

9. **Landing Page Content**: The landing page includes standard marketing content explaining the app's value proposition, features, and clear CTAs for signup/login. Specific copywriting is handled during design/implementation.

10. **City Page URLs**: Cities are accessible via URL-friendly routes (e.g., `/city/paris`, `/city/new-york`) to enable bookmarking and sharing, with basic SEO-friendly content for non-logged-in visitors.
