# Research: Database Seeding with Test Data

**Feature**: Database Seeding | **Date**: 2025-11-15

## Overview

This document consolidates research findings for implementing the database seeding feature. Research covers seeding strategy, data generation patterns, idempotency approaches, query optimization, and Convex best practices.

## Research Topics

### 1. Faker.js Data Generation Patterns

**Decision**: Use `@faker-js/faker` v9+ with locale-aware generators

**Rationale**:
- **TypeScript Support**: Full type definitions for all generators
- **Comprehensive API**: 60+ modules covering names, emails, dates, addresses, text, etc.
- **Locale Support**: Can generate realistic data for different regions (en_US, ja_JP, etc.)
- **Deterministic Seeding**: Supports `faker.seed()` for reproducible test data
- **Active Maintenance**: Official fork with regular updates and security patches

**Implementation Patterns**:

```typescript
import { faker } from '@faker-js/faker'

// User generation
const generateUser = () => ({
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  username: Math.random() < 0.2 ? faker.internet.username() : undefined, // 20% have usernames
  bio: Math.random() < 0.5 ? faker.person.bio() : undefined, // 50% have bios
  image: faker.image.avatar(),
  settings: {
    globalPrivacy: Math.random() < 0.3, // 30% enable global privacy
    hideVisitHistory: Math.random() < 0.2, // 20% hide visit history
  },
  socialLinks: {
    github: Math.random() < 0.4 ? `https://github.com/${faker.internet.username()}` : undefined,
    x: Math.random() < 0.3 ? `https://x.com/${faker.internet.username()}` : undefined,
    linkedin: Math.random() < 0.3 ? `https://linkedin.com/in/${faker.internet.username()}` : undefined,
    telegram: Math.random() < 0.2 ? `https://t.me/${faker.internet.username()}` : undefined,
  },
  isSeed: true, // Mark as faker-generated test data
})

// Visit generation (1 month duration)
const generateVisit = (cityId: Id<'cities'>) => {
  const startDate = faker.date.between({
    from: new Date('2024-01-01'),
    to: new Date('2025-12-31'),
  })
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + 1) // Add 1 month

  return {
    cityId,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    notes: Math.random() < 0.3 ? faker.lorem.sentence() : undefined, // 30% have notes
    isPrivate: Math.random() < 0.25, // 25% are private
    isSeed: true, // Mark as faker-generated test data
  }
}
```

**Alternatives Considered**:
- **`casual`**: Simpler API but lacks TypeScript types and comprehensive date generation
- **`chance`**: Good for randomization but weaker locale support and less actively maintained
- **Manual generation**: More control but high maintenance burden and less realistic data

### 2. Idempotency Strategy for Seed Script

**Decision**: Check existing count, calculate delta, insert only missing records

**Rationale**:
- **Developer-Friendly**: Re-running seed doesn't fail, just tops up to target count
- **Deterministic**: Always results in exactly N users and M visits (configurable)
- **Safe**: No accidental duplication or data corruption
- **Efficient**: Only inserts what's needed (no full re-seed on subsequent runs)

**Implementation Pattern**:

```typescript
// In seed script (scripts/seed-database.mjs)
async function seedUsers(targetCount: number) {
  const currentCount = await convex.query(api.seed.getUserCount)
  const delta = targetCount - currentCount

  if (delta <= 0) {
    console.log(`✓ Already have ${currentCount} users (target: ${targetCount})`)
    return
  }

  console.log(`Seeding ${delta} users (${currentCount} → ${targetCount})`)

  // Generate users in batches to avoid timeouts
  const batchSize = 50
  for (let i = 0; i < delta; i += batchSize) {
    const batch = Math.min(batchSize, delta - i)
    const users = Array.from({ length: batch }, generateUser)
    await convex.mutation(api.seed.insertUsers, { users })
    console.log(`  Inserted ${i + batch}/${delta} users`)
  }
}

// Similar pattern for visits
async function seedVisits(targetCount: number, citiesPerUser: number) {
  const currentCount = await convex.query(api.seed.getVisitCount)
  const delta = targetCount - currentCount

  if (delta <= 0) {
    console.log(`✓ Already have ${currentCount} visits (target: ${targetCount})`)
    return
  }

  // Get all users and top 100 cities
  const users = await convex.query(api.seed.getAllUsers)
  const cities = await convex.query(api.seed.getTopCities, { limit: 100 })

  // Distribute visits across users
  const visitsPerUser = Math.ceil(delta / users.length)
  // ... generate and insert visits in batches
}
```

**Alternatives Considered**:
- **Clear and regenerate**: Simple but destructive, loses manually added test data
- **Fail-fast**: Safest but annoying for developers who just want data
- **Append mode**: Allows accumulation but unpredictable final counts

### 3. Convex Internal Mutations vs. Direct Mutations

**Decision**: Use `internalMutation` for seed operations, call via `ConvexHttpClient`

**Rationale**:
- **Security**: Internal mutations can't be called from untrusted clients (frontend)
- **No Auth Required**: Seed script runs with admin privileges, no user auth needed
- **Batch Operations**: Can insert multiple records in single transaction
- **Type Safety**: Full TypeScript types from `convex/_generated/api`

**Implementation Pattern**:

```typescript
// convex/seed.ts
import { internalMutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'

export const getUserCount = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users.length
  },
})

export const insertUsers = internalMutation({
  args: {
    users: v.array(v.object({
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      username: v.optional(v.string()),
      // ... all user fields
    })),
  },
  returns: v.object({
    inserted: v.number(),
    userIds: v.array(v.id('users')),
  }),
  handler: async (ctx, { users }) => {
    const userIds = []
    const now = Date.now()

    for (const user of users) {
      const userId = await ctx.db.insert('users', {
        ...user,
        updatedAt: now,
        lastSeen: now,
      })
      userIds.push(userId)
    }

    return { inserted: users.length, userIds }
  },
})

// scripts/seed-database.mjs
import { ConvexHttpClient } from 'convex/browser'

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL)
const result = await client.mutation(api.seed.insertUsers, { users: [...] })
```

**Alternatives Considered**:
- **Public mutations**: Would require auth, not suitable for seed script
- **Direct database access**: Convex doesn't expose raw DB connections
- **Convex Actions**: Could work but adds unnecessary network overhead

### 4. Query Optimization for "Who's Here" Feature

**Decision**: Use `by_city_and_start` index with date range filtering

**Rationale**:
- **Index Efficiency**: Index already exists (`by_city_and_start` in schema)
- **Date Range Logic**: "Current visitors" = visits where `now` is between `startDate` and `endDate`
- **Privacy Filtering**: Filter out `isPrivate` visits and `globalPrivacy` users after query
- **Performance**: Single indexed query vs. full table scan

**Implementation Pattern**:

```typescript
// convex/visits.ts
export const getCurrentVisitors = query({
  args: { cityId: v.id('cities') },
  returns: v.array(v.object({
    user: v.object({
      _id: v.id('users'),
      name: v.string(),
      username: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
    visit: v.object({
      _id: v.id('visits'),
      startDate: v.number(),
      endDate: v.number(),
    }),
  })),
  handler: async (ctx, { cityId }) => {
    const now = Date.now()

    // Get all visits to this city
    const cityVisits = await ctx.db
      .query('visits')
      .withIndex('by_city_id', (q) => q.eq('cityId', cityId))
      .collect()

    // Filter for current visits (now is between start and end)
    const currentVisits = cityVisits.filter(
      (visit) => !visit.isPrivate && visit.startDate <= now && now <= visit.endDate
    )

    // Join with users and filter privacy
    const results = await Promise.all(
      currentVisits.map(async (visit) => {
        const user = await ctx.db.get(visit.userId)
        if (!user || user.settings?.globalPrivacy) {
          return null
        }

        return {
          user: {
            _id: user._id,
            name: user.name,
            username: user.username,
            image: user.image,
          },
          visit: {
            _id: visit._id,
            startDate: visit.startDate,
            endDate: visit.endDate,
          },
        }
      })
    )

    return results.filter((r): r is NonNullable<typeof r> => r !== null)
  },
})
```

**Performance Analysis**:
- **Index Scan**: O(visits per city) - typically 10-100 visits
- **Date Filter**: O(n) in-memory filter on results
- **User Joins**: O(n) parallel gets with Convex's optimized batch loading
- **Expected**: <50ms p95 for cities with <100 visits

**Alternatives Considered**:
- **Scan all visits**: O(total visits) - would be slow with 4000+ visits
- **Denormalize current visitors**: Complex to maintain, stale data issues
- **Add date range index**: Convex doesn't support multi-column range queries

### 5. Visit Count Atomic Updates

**Decision**: Use existing `getVisitCountForCity()` helper, call after each batch insert

**Rationale**:
- **Already Implemented**: `convex/visits.ts:10-20` has atomic count calculation
- **Source of Truth**: Recalculates from actual visits, no race conditions
- **Batch Efficiency**: Update once per batch (50 visits) vs. once per visit

**Implementation Pattern**:

```typescript
// convex/seed.ts
export const insertVisits = internalMutation({
  args: {
    visits: v.array(v.object({
      userId: v.id('users'),
      cityId: v.id('cities'),
      startDate: v.number(),
      endDate: v.number(),
      notes: v.optional(v.string()),
      isPrivate: v.boolean(),
    })),
  },
  returns: v.object({
    inserted: v.number(),
    visitIds: v.array(v.id('visits')),
  }),
  handler: async (ctx, { visits }) => {
    const visitIds = []
    const now = Date.now()
    const affectedCities = new Set<Id<'cities'>>()

    for (const visit of visits) {
      const visitId = await ctx.db.insert('visits', {
        ...visit,
        updatedAt: now,
      })
      visitIds.push(visitId)
      affectedCities.add(visit.cityId)
    }

    // Atomically update visitCount for all affected cities
    for (const cityId of affectedCities) {
      const count = await getVisitCountForCity(ctx, cityId)
      await ctx.db.patch(cityId, { visitCount: count })
    }

    return { inserted: visits.length, visitIds }
  },
})
```

**Performance Optimization**: Group visits by city in seed script to minimize `affectedCities` set size.

### 6. Deterministic vs. Random Seeding

**Decision**: Use time-based random seeding (non-deterministic) for realistic variety

**Rationale**:
- **Realism**: Different data each run simulates real-world variability
- **Developer Experience**: Each developer gets unique realistic data
- **No Coordination**: No need to version-control seed state
- **Sufficient**: Test stability comes from query logic, not specific data values

**If Deterministic Needed** (future):
```typescript
import { faker } from '@faker-js/faker'
faker.seed(12345) // Reproducible data
```

**Alternatives Considered**:
- **Deterministic seeding**: Good for snapshot tests but unnecessary for this use case
- **Fixed test fixtures**: Too brittle, doesn't test realistic data distributions

## Best Practices Summary

### Convex Seeding Best Practices
1. **Use internal mutations** for admin operations
2. **Batch inserts** (50-100 records) to avoid timeouts
3. **Update indexes** after bulk operations (visitCount)
4. **Validate data** before insertion (email uniqueness, date ranges)
5. **Log progress** for long-running operations

### Faker.js Best Practices
1. **Use type-safe imports**: `import { faker } from '@faker-js/faker'`
2. **Lowercase emails**: `faker.internet.email().toLowerCase()`
3. **Realistic probabilities**: 20-30% for optional fields, not 50%
4. **Date ranges**: Use `faker.date.between()` for historical data
5. **Unique constraints**: Check uniqueness for emails/usernames

### Query Optimization Best Practices
1. **Always use indexes**: `withIndex()` for filtered queries
2. **Filter in-memory**: Privacy checks after indexed query
3. **Batch user lookups**: Convex optimizes parallel `ctx.db.get()` calls
4. **Return minimal data**: Only fields needed by UI
5. **Cache when stable**: visitCount caching pattern

## Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Seed timeout (4000 visits) | High | Batch inserts (50/batch), log progress |
| Duplicate emails | Medium | Generate unique emails with counter suffix |
| City query returns <100 | High | Validate city count before seeding, fail-fast with clear error |
| visitCount out of sync | Low | Atomic recalculation in mutation, eventual consistency acceptable |
| "Who's Here" slow on popular cities | Medium | Index optimization, pagination if >100 current visitors |

## Next Steps

Phase 1 will use these research findings to generate:
1. **data-model.md**: User and Visit entity schemas with validation rules
2. **contracts/seed-api.yaml**: OpenAPI spec for Convex seed mutations and queries
3. **quickstart.md**: Developer guide for running seed script
