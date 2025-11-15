# Data Model: Database Seeding

**Feature**: Database Seeding | **Date**: 2025-11-15

## Overview

This document defines the data model for the database seeding feature, including entity schemas, validation rules, relationships, and state transitions. The seeding process populates existing entities (`users`, `visits`) without modifying the database schema.

## Entities

### User (Table: `users`)

**Purpose**: Test user accounts with realistic profile data for development and testing.

**Schema** (from `convex/schema.ts:9-41`):

| Field | Type | Required | Validation | Default | Notes |
|-------|------|----------|------------|---------|-------|
| `authUserId` | `string` | Yes | Non-empty, unique | - | Fake auth ID (e.g., `"seed_user_001"`) |
| `name` | `string` | Yes | Non-empty | - | Generated via `faker.person.fullName()` |
| `email` | `string` | Yes | Valid email, unique | - | Generated via `faker.internet.email().toLowerCase()` |
| `image` | `string?` | No | Valid URL | `undefined` | Generated via `faker.image.avatar()` |
| `username` | `string?` | No | Alphanumeric, unique | `undefined` | 20% of users have usernames via `faker.internet.username()` |
| `bio` | `string?` | No | Max 500 chars | `undefined` | 50% of users have bios via `faker.person.bio()` |
| `settings` | `object?` | No | See Settings schema | `{ globalPrivacy: false, hideVisitHistory: false }` | Privacy configuration |
| `settings.globalPrivacy` | `boolean` | Yes (if settings exists) | - | `false` | all 'false' |
| `settings.hideVisitHistory` | `boolean` | Yes (if settings exists) | - | `false` | all`false` |
| `socialLinks` | `object?` | No | See SocialLinks schema | `undefined` | Social media profiles |
| `socialLinks.github` | `string?` | No | Valid URL | `undefined` | 60% of users |
| `socialLinks.x` | `string?` | No | Valid URL | `undefined` | 50% of users |
| `socialLinks.linkedin` | `string?` | No | Valid URL | `undefined` | 30% of users |
| `socialLinks.telegram` | `string?` | No | Valid URL | `undefined` | 40% of users |
| `isSeed` | `boolean?` | No | - | `undefined` | **NEW**: `true` for all faker-generated users, `undefined` for real users |
| `updatedAt` | `number` | Yes | Unix timestamp (ms) | `Date.now()` | Seed script sets to current time |
| `lastSeen` | `number` | Yes | Unix timestamp (ms) | `Date.now()` | Seed script sets to current time |

**Indexes**:
- `by_auth_user_id` on `authUserId` (used by seed script for duplicate checks)
- `by_username` on `username` (used by app for profile lookups)

**Uniqueness Constraints**:
- `authUserId` must be globally unique across all users (including real users)
- `email` must be globally unique
- `username` must be globally unique when non-null

**UI Integration**:
- User profiles (`/u/$usernameOrId`) should display a badge/indicator when `isSeed === true`
- Example: "Test User" badge or "🤖 Fake Profile" label below user name
- This helps developers distinguish test data from real users during development
- Badge should be visually distinct but not intrusive (e.g., subtle background color, small icon)

**Seed Generation Strategy**:

```typescript
// Pseudo-code for user generation
for (let i = 0; i < userCount; i++) {
  const hasUsername = Math.random() < 0.2
  const hasBio = Math.random() < 0.5
  const username = faker.internet.username()

  const user = {
    authUserId: `seed_user_${String(i).padStart(6, '0')}`, // Unique prefix
    name: faker.person.fullName(),
    email: `seed_${i}_${faker.internet.email().toLowerCase()}`, // Unique prefix
    image: faker.image.avatar(),
    username: hasUsername ? username : undefined,
    bio: hasBio ? faker.person.bio() : undefined,
    settings: {
      globalPrivacy: false,
      hideVisitHistory: false,
    },
    socialLinks: {
      github: Math.random() < 0.6 ? `https://github.com/${username}` : undefined,
      x: Math.random() < 0.5 ? `https://x.com/${username}` : undefined,
      linkedin: Math.random() < 0.3 ? `https://linkedin.com/in/${username}` : undefined,
      telegram: Math.random() < 0.4 ? `https://t.me/${username}` : undefined,
    },
    isSeed: true, // Mark as faker-generated test data
    updatedAt: Date.now(),
    lastSeen: Date.now(),
  }
}
```

### Visit (Table: `visits`)

**Purpose**: Test visit records representing user trips to cities with realistic date ranges.

**Schema** (from `convex/schema.ts:64-81`):

| Field | Type | Required | Validation | Default | Notes |
|-------|------|----------|------------|---------|-------|
| `userId` | `Id<'users'>` | Yes | Must reference existing user | - | Randomly assigned seeded user |
| `cityId` | `Id<'cities'>` | Yes | Must reference existing city | - | Randomly selected from top 100 cities |
| `startDate` | `number` | Yes | Unix timestamp (ms), < endDate | - | Random date between 2024-01-01 and 2025-12-31 |
| `endDate` | `number` | Yes | Unix timestamp (ms), > startDate | - | `startDate + 1 month` (fixed duration) |
| `notes` | `string?` | No | Max 1000 chars | `undefined` | 30% of visits have notes via `faker.lorem.sentence()` |
| `isPrivate` | `boolean` | Yes | - | `false` | 25% of visits are private |
| `isSeed` | `boolean?` | No | - | `undefined` | **NEW**: `true` for all faker-generated visits, `undefined` for real visits |
| `updatedAt` | `number` | Yes | Unix timestamp (ms) | `Date.now()` | Seed script sets to current time |

**Indexes**:
- `by_user_id` on `userId` (used for "Travels" section)
- `by_city_id` on `cityId` (used for "Who's Here" section)
- `by_user_and_city` on `[userId, cityId]` (used for duplicate detection)
- `by_start_date` on `startDate` (used for chronological queries)
- `by_city_and_start` on `[cityId, startDate]` (used for "Who's Here" optimization)

**Validation Rules**:
1. `startDate < endDate` (enforced by seed logic and existing `createVisit` mutation)
2. `endDate = startDate + (30 * 24 * 60 * 60 * 1000)` (1 month = 30 days)
3. `userId` must exist in `users` table
4. `cityId` must exist in `cities` table (top 100 only for seed)

**Seed Generation Strategy**:

```typescript
// Pseudo-code for visit generation
for (const user of users) {
  for (let i = 0; i < visitsPerUser; i++) {
    const cityId = randomChoice(topCities) // Can repeat cities
    const startDate = faker.date.between({
      from: new Date('2024-01-01'),
      to: new Date('2025-12-31'),
    })
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1) // Add exactly 1 month

    const visit = {
      userId: user._id,
      cityId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      notes: Math.random() < 0.3 ? faker.lorem.sentence() : undefined,
      isPrivate: Math.random() < 0.25,
      isSeed: true, // Mark as faker-generated test data
      updatedAt: Date.now(),
    }
  }
}
```

### City (Table: `cities`)

**Purpose**: Existing city records (not created by seed script, only referenced).

**Schema** (from `convex/schema.ts:42-63`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `Id<'cities'>` | Yes | Referenced by `visits.cityId` |
| `name` | `string` | Yes | Display name (e.g., "New York") |
| `shortSlug` | `string` | Yes | URL slug (e.g., "nyc") |
| `visitCount` | `number?` | No | **Updated by seed script** after inserting visits |

**Seed Script Interaction**:
1. **Query top 100 cities** via `by_visit_count` index (descending order)
2. **Select randomly** from top 100 for each visit (weighted distribution)
3. **Update visitCount** atomically after each visit batch insertion

**Validation** (Pre-Seed):
- Must have ≥100 cities in database before seeding
- Seed script fails with error: `"Insufficient cities: found X, need 100"` if validation fails

## Relationships

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  User    │       │  Visit   │       │  City    │
├──────────┤       ├──────────┤       ├──────────┤
│ _id      │◄──┐   │ _id      │   ┌──►│ _id      │
│ authUserId│   │   │ userId   │───┘   │ name     │
│ name     │   └───│ cityId   │───┐   │ shortSlug│
│ email    │       │ startDate│   └──►│visitCount│
│ username │       │ endDate  │       │ ...      │
│ ...      │       │ isPrivate│       └──────────┘
└──────────┘       │ notes    │
                   └──────────┘

1:N Relationship: User → Visits (one user has many visits)
N:1 Relationship: Visits → City (many visits to one city)
```

**Referential Integrity**:
- `visits.userId` → `users._id` (enforced by Convex via `v.id('users')` type)
- `visits.cityId` → `cities._id` (enforced by Convex via `v.id('cities')` type)
- Seed script validates city exists before inserting visit

## State Transitions

### User Lifecycle

```
[None] ──seed──> [Seeded User] ──manual update──> [Updated User]
                       │
                       └──delete (manual)──> [Deleted]
```

**States**:
1. **None**: User doesn't exist
2. **Seeded User**: Created by seed script with fake `authUserId`
3. **Updated User**: Developer manually edits profile via UI
4. **Deleted**: Developer manually deletes user

**Seed Script Behavior**:
- **Idempotent**: Checks `getUserCount()`, only inserts delta
- **No Updates**: Never modifies existing users (even if previously seeded)
- **No Deletes**: Never removes users

### Visit Lifecycle

```
[None] ──seed──> [Seeded Visit] ──manual update──> [Updated Visit]
                       │
                       └──delete (manual)──> [Deleted] ──> [City.visitCount--]
```

**States**:
1. **None**: Visit doesn't exist
2. **Seeded Visit**: Created by seed script
3. **Updated Visit**: Developer manually edits dates/notes/privacy via UI
4. **Deleted**: Developer manually deletes visit

**Seed Script Behavior**:
- **Idempotent**: Checks `getVisitCount()`, only inserts delta
- **Atomic visitCount Update**: After each batch, recalculates `city.visitCount`
- **No Updates**: Never modifies existing visits
- **No Deletes**: Never removes visits

### City visitCount Cache

```
[Initial: 0] ──first visit inserted──> [visitCount++]
                                              │
                                              └──recalculated after batch──> [Accurate Count]
```

**Update Strategy**:
- **Source of Truth**: Count of `visits` where `cityId = city._id`
- **Update Trigger**: After each visit batch insertion (50 visits)
- **Calculation**: `getVisitCountForCity(ctx, cityId)` (convex/visits.ts:10-20)
- **Atomicity**: Single mutation transaction ensures consistency

## Data Volume Estimates

### Default Configuration

| Entity | Count | Size per Record | Total Size |
|--------|-------|-----------------|------------|
| Users | 200 | ~500 bytes (JSON) | ~100 KB |
| Visits | 4,000 | ~150 bytes (JSON) | ~600 KB |
| **Total** | **4,200** | - | **~700 KB** |

### Performance Scaling

| Users | Visits (20 each) | Seed Time (estimate) | "Who's Here" Query Time |
|-------|------------------|----------------------|------------------------|
| 50 | 1,000 | ~5 seconds | <50ms |
| 200 | 4,000 | ~15 seconds | <100ms |
| 1,000 | 20,000 | ~60 seconds | <200ms |
| 5,000 | 100,000 | ~300 seconds (5 min) | <500ms |

**Notes**:
- Seed time assumes batch size of 50 records
- Query time assumes top 100 cities distribution (avg 40 visits per city)
- Convex auto-indexes provide O(log n) query performance

## Validation Rules Summary

### Pre-Seed Validation
1. ✅ At least 100 cities exist in `cities` table
2. ✅ `VITE_CONVEX_URL` environment variable is set
3. ✅ Convex deployment is accessible

### User Validation
1. ✅ `authUserId` matches pattern `seed_user_XXXXXX` (unique prefix)
2. ✅ `email` is lowercase and unique
3. ✅ `username` is unique when non-null
4. ✅ `updatedAt` and `lastSeen` are current timestamps

### Visit Validation
1. ✅ `startDate < endDate` (enforced by existing mutation)
2. ✅ `endDate = startDate + 30 days` (enforced by seed logic)
3. ✅ `userId` references existing seeded user
4. ✅ `cityId` references one of top 100 cities
5. ✅ `updatedAt` is current timestamp

## Next Steps

Phase 1 will use this data model to generate:
1. **contracts/seed-api.yaml**: API contracts for seed mutations and queries
2. **quickstart.md**: Developer guide with example usage
