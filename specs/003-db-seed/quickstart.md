# Quickstart: Database Seeding

**Feature**: Database Seeding | **Last Updated**: 2025-11-15

## Overview

This guide shows developers how to populate the Convex database with realistic test data for local development and testing. The seed script generates 200 users and 4000 visits (20 visits per user, 1 month duration each) distributed across the top 100 cities.

## Prerequisites

1. **Convex Database Running**: `npm run dev:convex` (or `npm run dev` for full stack)
2. **Cities Populated**: At least 100 cities must exist in the database
3. **Environment Variables**: `VITE_CONVEX_URL` set in `.env.local`
4. **Dependencies Installed**: `npm install` (includes `@faker-js/faker`)

## Quick Start

### 1. Verify Cities Exist

Before seeding, ensure you have at least 100 cities:

```bash
# Check city count via Convex dashboard
# OR run a quick query in the Convex REPL:
npx convex run cities:count
# Expected output: { count: 1000 } (or at least 100)
```

If you don't have cities, seed them first (see `scripts/seed-cities.mjs` or city seeding docs).

### 2. Run Seed Script (Default Settings)

```bash
node scripts/seed-database.mjs
```

**What this does**:
- ✅ Checks if 100+ cities exist (fails if not)
- ✅ Counts existing users and visits
- ✅ Calculates delta (how many more needed to reach 200 users / 4000 visits)
- ✅ Generates realistic data using Faker.js
- ✅ Inserts data in batches of 50
- ✅ Updates city `visitCount` atomically after each visit batch
- ✅ Logs progress to console

**Expected Output**:

```
🌱 Database Seeding Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Pre-flight Checks
✓ Connected to Convex: https://wary-bison-35.convex.cloud
✓ Found 1000 cities (need 100 minimum)

👥 Seeding Users
✓ Already have 0 users (target: 200)
  Seeding 200 users...
  ✓ Inserted 50/200 users
  ✓ Inserted 100/200 users
  ✓ Inserted 150/200 users
  ✓ Inserted 200/200 users
✅ Users seeded: 200 total

🗺️ Seeding Visits
✓ Already have 0 visits (target: 4000)
  Seeding 4000 visits...
  ✓ Inserted 50/4000 visits (15 cities updated)
  ✓ Inserted 100/4000 visits (12 cities updated)
  ... (progress continues)
  ✓ Inserted 4000/4000 visits
✅ Visits seeded: 4000 total

✨ Seeding complete! (15.3s)
```

### 3. Run Seed Script (Custom Settings)

```bash
# Seed 500 users with 10 visits each (5000 total visits)
node scripts/seed-database.mjs --users 500 --visits-per-user 10

# Seed 50 users for quick testing
node scripts/seed-database.mjs --users 50 --visits-per-user 5
```

**CLI Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--users` | `number` | `200` | Total number of users to have in database |
| `--visits-per-user` | `number` | `20` | Number of visits per user |

**Note**: The script is **idempotent**. Running it multiple times will only add the difference needed to reach the target count.

### 4. Verify Seeded Data

**Option A: Convex Dashboard**
1. Open [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. Navigate to your deployment
3. Click "Data" tab
4. View `users` and `visits` tables

**Option B: Application UI**
1. Start dev server: `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000)
3. Navigate to:
   - **User profiles**: `/u/seed_user_000001` (or any seeded user ID)
   - **City pages**: `/c/nyc` (or any city short slug)
   - **Discover page**: `/discover` (see list of cities)

**Option C: Convex REPL**
```bash
# Count users
npx convex run seed:getUserCount
# Output: 200

# Count visits
npx convex run seed:getVisitCount
# Output: 4000

# Get sample user
npx convex run users:getUserByAuthUserId --authUserId seed_user_000042
```

## Idempotency

The seed script is **fully idempotent**:

```bash
# First run: seeds 200 users, 4000 visits
node scripts/seed-database.mjs

# Second run: does nothing (already at target)
node scripts/seed-database.mjs
# Output:
# ✓ Already have 200 users (target: 200)
# ✓ Already have 4000 visits (target: 4000)
# ✨ Seeding complete! (0.5s)

# Increase target: adds 300 more users, 6000 more visits
node scripts/seed-database.mjs --users 500 --visits-per-user 20
# Output:
# ✓ Already have 200 users (target: 500)
#   Seeding 300 users...
# ✓ Already have 4000 visits (target: 10000)
#   Seeding 6000 visits...
```

## Data Characteristics

### Users (200 by default)

- **Names**: Realistic full names via `faker.person.fullName()`
- **Emails**: Unique emails prefixed with `seed_` (e.g., `seed_42_jane.smith@example.com`)
- **Usernames**: Only ~20% of users have usernames (80% rely on display name)
- **Bios**: ~50% of users have bios
- **Avatars**: Random avatar URLs via `faker.image.avatar()`
- **Privacy Settings**:
  - 30% enable `globalPrivacy` (hidden from "Who's Here")
  - 20% enable `hideVisitHistory` (profile shows no travels)
  - Remaining users have both disabled
- **Social Links**: Random distribution (60% GitHub, 50% X, 30% LinkedIn, 40% Telegram)
- **Test Data Marker**: All seeded users have `isSeed: true` field
  - User profiles display a "Test User" badge when `isSeed === true`
  - Helps distinguish fake data from real users during development
  - Real users have `isSeed: undefined`

### Visits (4000 by default, 20 per user)

- **Duration**: All visits are exactly **1 month** (30 days)
- **Date Range**: Random start dates between Jan 1, 2024 and Dec 31, 2025
- **Cities**: Randomly selected from **top 100 cities** by visit count
- **Repeat Visits**: Users can visit the same city multiple times (realistic)
- **Notes**: ~30% of visits have notes (e.g., "Amazing food scene!")
- **Privacy**: 25% of visits are private (hidden from public views)
- **Test Data Marker**: All seeded visits have `isSeed: true` field
  - Helps filter or identify test data programmatically
  - Real visits have `isSeed: undefined`

### Cities (referenced, not created)

- **Selection**: Top 100 cities by `visitCount` (descending order)
- **visitCount Update**: Atomically recalculated after each visit batch insertion
- **Distribution**: Natural power-law distribution (popular cities get more visits)

## Troubleshooting

### Error: "Insufficient cities: found 42, need 100"

**Problem**: Database has fewer than 100 cities.

**Solution**: Seed cities first:
```bash
# Run city seeding script (if available)
node scripts/seed-cities.mjs

# OR manually add cities via Convex dashboard
```

### Error: "ConvexError: No user identity found"

**Problem**: Seed script is trying to call authenticated mutations instead of internal mutations.

**Solution**: Verify `convex/seed.ts` uses `internalMutation` and `internalQuery`, not `mutation` and `query`.

### Error: "VITE_CONVEX_URL is not defined"

**Problem**: Missing environment variable.

**Solution**:
```bash
# Add to .env.local
echo "VITE_CONVEX_URL=https://your-deployment.convex.cloud" >> .env.local

# Restart Convex dev server
npm run dev:convex
```

### Seed script hangs or times out

**Problem**: Batch size too large or network issues.

**Solution**:
1. Reduce batch size in `scripts/seed-database.mjs` (default: 50)
2. Check Convex dashboard for function execution errors
3. Verify network connection to Convex deployment

### Users/visits not showing in UI

**Problem**: Privacy settings or data not committed.

**Solution**:
1. Check Convex dashboard to verify data exists
2. Verify privacy settings: `globalPrivacy: false`, `isPrivate: false` for test users/visits
3. Check browser console for query errors
4. Verify "Who's Here" query filters correctly (`endDate >= now`)

## Advanced Usage

### Deterministic Seeding (Same Data Every Time)

```javascript
// In scripts/seed-database.mjs, add before generateUser():
import { faker } from '@faker-js/faker'
faker.seed(12345) // Use any number for reproducibility
```

**Use Case**: Snapshot tests, consistent demo data.

### Seeding Specific User Profiles

```javascript
// In scripts/seed-database.mjs, customize generateUser():
const generateUser = (index) => {
  // Create specific personas for first 5 users
  if (index < 5) {
    return {
      authUserId: `seed_user_${String(index).padStart(6, '0')}`,
      name: ['Alice Admin', 'Bob Builder', 'Charlie Traveler', 'Dana Explorer', 'Eve Wanderer'][index],
      email: `seed_${index}_persona${index}@example.com`,
      username: ['alice', 'bob', 'charlie', 'dana', 'eve'][index],
      // ... rest of fields
    }
  }
  // Random for remaining users
  return { /* faker-generated */ }
}
```

### Cleaning Seeded Data

```bash
# Manual cleanup via Convex dashboard:
# 1. Go to Data tab
# 2. Filter users: authUserId starts with "seed_user_"
# 3. Delete filtered users
# 4. Visits will cascade (manual deletion required)

# OR write a cleanup script:
node scripts/clean-seed-data.mjs  # (if implemented)
```

**Note**: Automatic cleanup is intentionally out of scope to prevent accidental data loss.

## Next Steps

- **Implement Features**: Use seeded data to develop user profiles, city pages, visit tracking
- **Test Privacy**: Verify `globalPrivacy` and `hideVisitHistory` work correctly
- **Test "Who's Here"**: Check city pages show current visitors (filtered by privacy)
- **Test Performance**: Run queries with full 4000 visits to ensure <100ms p95
- **Write E2E Tests**: Use seeded data as fixtures for Playwright tests

## Related Documentation

- [Feature Specification](./spec.md) - Full requirements and acceptance criteria
- [Data Model](./data-model.md) - Entity schemas and relationships
- [API Contracts](./contracts/seed-api.yaml) - Convex function contracts
- [Implementation Plan](./plan.md) - Technical architecture and decisions
