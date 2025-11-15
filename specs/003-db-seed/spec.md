# Feature Specification: Database Seeding with Test Data

**Feature Branch**: `001-db-seed`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "populate db users and visits with faker"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Database Initialization (Priority: P1)

As a developer setting up the project locally, I need the database to be populated with realistic test data so I can develop and test features without manually creating users and visits.

**Why this priority**: Essential for development workflow - developers need test data immediately to work on any feature that displays users or visits. Without this, every developer must manually create test data, wasting time and creating inconsistent test environments.

**Independent Test**: Can be fully tested by running the seed script and verifying that users and visits appear in the database with realistic data values.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** the seed script is executed, **Then** multiple users are created with realistic profile data
2. **Given** an empty database, **When** the seed script is executed, **Then** multiple visits are created linking users to cities with realistic date ranges
3. **Given** an existing database with some data, **When** the seed script is executed, **Then** the script handles existing data gracefully without creating duplicates or errors

---

### User Story 2 - Testing Different Data Scenarios (Priority: P2)

As a developer testing edge cases, I need diverse test data with various configurations (different visit patterns, privacy settings, date ranges) so I can verify feature behavior across different scenarios.

**Why this priority**: Important for comprehensive testing - developers need varied data patterns to test filtering, sorting, privacy controls, and edge cases. This ensures features work correctly across different user behaviors.

**Independent Test**: Can be tested by examining the generated data and confirming it includes diverse patterns (different date ranges, privacy settings, visit counts per user, etc.).

**Acceptance Scenarios**:

1. **Given** the seed script is run, **When** examining generated users, **Then** users have varied privacy settings (some with global privacy enabled, some with hidden visit history)
2. **Given** the seed script is run, **When** examining generated visits, **Then** visits have diverse date ranges including past, recent, and overlapping dates
3. **Given** the seed script is run, **When** examining generated visits, **Then** some visits are marked as private and some as public

---

### User Story 3 - Performance Testing with Realistic Data Volume (Priority: P3)

As a developer testing performance, I need the ability to generate large volumes of test data so I can verify the application performs well under realistic load conditions.

**Why this priority**: Useful for performance testing - helps identify bottlenecks and ensures features scale properly. Lower priority because basic functionality doesn't require large datasets, but important for production readiness.

**Independent Test**: Can be tested by running the seed script with a configurable data volume parameter and verifying performance metrics remain acceptable.

**Acceptance Scenarios**:

1. **Given** a performance testing environment, **When** the seed script is run with a large volume parameter, **Then** hundreds or thousands of users and visits are created efficiently
2. **Given** a database with large test data volume, **When** querying visits or users, **Then** application queries perform within acceptable time limits
3. **Given** the seed script runs with configurable volume, **When** a developer specifies a small volume, **Then** only that amount of data is generated for quick testing

---

### Edge Cases

- What happens when the seed script is run multiple times? (Should be idempotent or clearly handle re-runs)
- How does the system handle seeding when required cities don't exist in the database?
- What happens if the seed script fails partway through? (Should support cleanup or rollback)
- How does the system ensure generated usernames don't conflict with real users?
- What happens when seeding visits with date ranges that span multiple years?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate realistic user data including name, email, optional username, bio, and social links
- **FR-002**: System MUST generate users with varied privacy settings (some with globalPrivacy enabled, some with hideVisitHistory enabled, some with both disabled)
- **FR-003**: System MUST generate visits linking users to existing cities in the database
- **FR-004**: System MUST generate visits with realistic date ranges including past dates, recent dates, and varying trip durations
- **FR-005**: System MUST generate visits with varied privacy settings (some private, some public)
- **FR-006**: System MUST ensure generated email addresses are unique and follow valid email format
- **FR-007**: System MUST set appropriate timestamps for createdAt, updatedAt, and lastSeen fields
- **FR-008**: System MUST allow developers to configure the number of users and visits to generate
- **FR-009**: System MUST verify that required cities exist before attempting to create visits
- **FR-010**: Generated data MUST use realistic faker data libraries to produce authentic-looking names, emails, dates, and text content
- **FR-011**: System MUST ensure generated visits have startDate before endDate
- **FR-012**: Script MUST be executable from the command line with clear success/failure feedback
- **FR-013**: System MUST handle errors gracefully and provide clear error messages if seeding fails

### Key Entities

- **User**: Represents a test user account with profile information (name, email, username, bio, social links), privacy settings, and timestamps. Generated users should have realistic data that mirrors actual user profiles.

- **Visit**: Represents a user's trip to a specific city with start/end dates, optional notes, and privacy settings. Generated visits should create realistic travel patterns with appropriate date ranges and city associations.

- **City**: Existing entities in the database that visits will reference. The seeding process relies on cities already being populated in the database.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can populate an empty database with test data in under 30 seconds
- **SC-002**: Generated data includes at least 20 unique users with diverse profile configurations
- **SC-003**: Generated data includes at least 50 visits distributed across multiple cities and users
- **SC-004**: 100% of generated users have valid, unique email addresses
- **SC-005**: 100% of generated visits have valid date ranges (startDate < endDate)
- **SC-006**: Generated data includes at least 3 different privacy setting combinations (various settings for globalPrivacy and hideVisitHistory)
- **SC-007**: Developers can successfully run the seed script multiple times without errors
- **SC-008**: Generated data enables testing of all major features (user profiles, visit lists, city pages, privacy controls) without additional manual data creation

## Scope *(mandatory)*

### In Scope

- Script to generate and insert test users into the database
- Script to generate and insert test visits into the database
- Generation of realistic user profile data (names, emails, usernames, bios, social links)
- Generation of varied privacy settings for users and visits
- Generation of realistic visit date ranges and durations
- Configuration options for number of users and visits to generate
- Clear documentation on how to run the seed script
- Error handling for common failure scenarios (missing cities, database errors)

### Out of Scope

- Seeding cities data (assumes cities already exist in database)
- Automated cleanup or deletion of test data
- Seeding data for production environments (this is development/testing only)
- Authentication integration (generated users don't need valid Better-Auth credentials)
- Data migration or versioning capabilities
- Performance optimization for extremely large datasets (focused on typical development volumes)
- UI for running seed scripts (command-line only)

## Assumptions *(mandatory)*

- Cities table is already populated with test city data before running the seed script
- The script will be run in development or testing environments only, never in production
- Developers have necessary permissions to write to the Convex database
- Faker.js or equivalent library is available and acceptable for generating test data
- Generated test users don't require valid Better-Auth authentication (they're for data visualization only)
- Standard development volume is 20-100 users and 50-200 visits (configurable but reasonable defaults)
- The Convex database schema matches the schema defined in convex/schema.ts
- Developers will run this script from the project root directory
- Generated usernames should be unique but don't need to follow specific business rules
- Test data doesn't need to be production-quality (acceptable to have obviously fake data like "john.doe@example.com")

## Dependencies *(mandatory)*

- Convex database must be accessible and configured
- Cities table must contain existing city records to reference in visits
- Faker.js (or similar data generation library) must be installed
- Node.js environment for running the seed script
- Convex CLI or SDK for database operations
