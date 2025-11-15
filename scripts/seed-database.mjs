#!/usr/bin/env node

/**
 * Database Seeding Script
 *
 * Populates the Convex database with realistic test data for development and testing.
 * Each user has continuous monthly visits (e.g., 20 visits = 20 continuous months).
 *
 * Usage:
 *   node scripts/seed-database.mjs [options]
 *
 * Options:
 *   --users <number>           Total number of users to have in database (default: 200)
 *   --visits-per-user <number> Number of visits per user (default: 20)
 *   --help                     Show this help message
 *
 * Examples:
 *   node scripts/seed-database.mjs
 *   node scripts/seed-database.mjs --users 500 --visits-per-user 10
 *
 * The script is idempotent - running it multiple times will only insert the delta needed
 * to reach the target counts.
 */

import { ConvexHttpClient } from 'convex/browser'
import { api, internal } from '../convex/_generated/api.js'
import { faker } from '@faker-js/faker'

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 50 // Insert records in batches of 50
const DEFAULT_USER_COUNT = 200
const DEFAULT_VISITS_PER_USER = 25
const USERNAME_PROBABILITY = 0.2 // 20% of users have usernames
const VISIT_DURATION_DAYS = 30 // Each visit is 1 month (30 days)
const MIN_CITIES_REQUIRED = 50
const TOP_CITIES_TO_USE = 50

// All visits start on April 1, 2024
const VISIT_START_DATE = new Date('2024-04-01').getTime()

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    users: DEFAULT_USER_COUNT,
    visitsPerUser: DEFAULT_VISITS_PER_USER,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      console.log(`
🌱 Database Seeding Script

Usage:
  node scripts/seed-database.mjs [options]

Options:
  --users <number>           Total number of users to have in database (default: ${DEFAULT_USER_COUNT})
  --visits-per-user <number> Number of visits per user (default: ${DEFAULT_VISITS_PER_USER})
  --help, -h                 Show this help message

Examples:
  node scripts/seed-database.mjs
  node scripts/seed-database.mjs --users 500 --visits-per-user 10
  node scripts/seed-database.mjs --users 50 --visits-per-user 5

The script is idempotent - running it multiple times will only insert the
delta needed to reach the target counts.
      `)
      process.exit(0)
    }

    if (arg === '--users') {
      const value = parseInt(args[++i], 10)
      if (isNaN(value) || value < 0) {
        console.error(`❌ Error: --users must be a non-negative number`)
        process.exit(1)
      }
      config.users = value
    }

    if (arg === '--visits-per-user') {
      const value = parseInt(args[++i], 10)
      if (isNaN(value) || value < 0) {
        console.error(`❌ Error: --visits-per-user must be a non-negative number`)
        process.exit(1)
      }
      config.visitsPerUser = value
    }
  }

  return config
}

// ============================================================================
// Data Generation Functions
// ============================================================================

/**
 * Generate a realistic user object with faker.js
 * @param {number} index - User index for generating unique IDs
 * @returns {object} User object matching convex/schema.ts users table
 */
function generateUser(index) {
  const now = Date.now()
  const fullName = faker.person.fullName()
  const hasUsername = Math.random() < USERNAME_PROBABILITY

  return {
    authUserId: `seed_user_${String(index).padStart(6, '0')}`,
    name: fullName,
    email: `seed_${index}_${faker.internet.email({ firstName: fullName.split(' ')[0], lastName: fullName.split(' ')[1] }).toLowerCase()}`,
    image: faker.image.avatar(),
    username: hasUsername ? faker.internet.username({ firstName: fullName.split(' ')[0], lastName: fullName.split(' ')[1] }).toLowerCase() : undefined,
    bio: Math.random() < 0.5 ? faker.person.bio() : undefined,
    settings: {
      globalPrivacy: false,
      hideVisitHistory: false,
    },
    socialLinks: {
      github: Math.random() < 0.6 ? `https://github.com/${faker.internet.username()}` : undefined,
      x: Math.random() < 0.5 ? `https://x.com/${faker.internet.username()}` : undefined,
      linkedin: Math.random() < 0.3 ? `https://linkedin.com/in/${faker.internet.username()}` : undefined,
      telegram: Math.random() < 0.4 ? `https://t.me/${faker.internet.username()}` : undefined,
    },
    isSeed: true,
    updatedAt: now,
    lastSeen: now,
  }
}

/**
 * Generate a realistic visit object with 1-month duration
 * Visits are continuous: visit N+1 starts where visit N ends
 * All visits start from April 1, 2024 and are public (not private)
 * @param {string} userId - Convex ID of the user
 * @param {string} cityId - Convex ID of the city
 * @param {number} visitIndex - Index of this visit (0-based) to calculate continuous dates
 * @returns {object} Visit object matching convex/schema.ts visits table
 */
function generateVisit(userId, cityId, visitIndex) {
  const now = Date.now()

  // Calculate start date: April 1, 2024 + (visitIndex * 30 days)
  const startDate = VISIT_START_DATE + (visitIndex * VISIT_DURATION_DAYS * 24 * 60 * 60 * 1000)

  // End date is exactly 30 days (1 month) after start date
  const endDate = startDate + (VISIT_DURATION_DAYS * 24 * 60 * 60 * 1000)

  return {
    userId,
    cityId,
    startDate,
    endDate,
    notes: Math.random() < 0.3 ? faker.hacker.phrase() : undefined,
    isPrivate: false, // All visits are public
    isSeed: true,
    updatedAt: now,
  }
}

/**
 * Calculate how many records need to be inserted to reach target
 * @param {number} current - Current count in database
 * @param {number} target - Target count
 * @returns {number} Delta to insert (0 if target already met)
 */
function calculateDelta(current, target) {
  return Math.max(0, target - current)
}

// ============================================================================
// Seeding Functions
// ============================================================================

/**
 * Seed users into the database with idempotency check
 * @param {ConvexHttpClient} client - Convex client
 * @param {number} targetCount - Target number of users
 */
async function seedUsers(client, targetCount) {
  console.log('\n👥 Seeding Users')
  console.log('━'.repeat(30))

  // Get current user count
  const currentCount = await client.query(internal.seed.getUserCount, {})
  console.log(`✓ Already have ${currentCount} users (target: ${targetCount})`)

  const delta = calculateDelta(currentCount, targetCount)

  if (delta === 0) {
    console.log('✓ User count already at target')
    return []
  }

  console.log(`  Seeding ${delta} users...`)

  const allUserIds = []

  // Insert users in batches
  for (let i = 0; i < delta; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, delta - i)
    const users = []

    for (let j = 0; j < batchSize; j++) {
      const userIndex = currentCount + i + j
      users.push(generateUser(userIndex))
    }

    const result = await client.mutation(internal.seed.insertUsers, { users })
    allUserIds.push(...result.userIds)

    console.log(`  ✓ Inserted ${i + batchSize}/${delta} users`)
  }

  console.log(`✅ Users seeded: ${delta} inserted, ${currentCount + delta} total`)
  return allUserIds
}

/**
 * Seed visits into the database with idempotency check
 * Each user gets continuous monthly visits (visit N+1 starts where visit N ends)
 * @param {ConvexHttpClient} client - Convex client
 * @param {Array<string>} allUserIds - Array of all user IDs
 * @param {Array<object>} topCities - Array of top cities by visit count
 * @param {number} visitsPerUser - Number of visits per user
 */
async function seedVisits(client, allUserIds, topCities, visitsPerUser) {
  console.log('\n🗺️  Seeding Visits')
  console.log('━'.repeat(30))

  const targetVisitCount = allUserIds.length * visitsPerUser
  const currentCount = await client.query(internal.seed.getVisitCount, {})
  console.log(`✓ Already have ${currentCount} visits (target: ${targetVisitCount})`)

  const delta = calculateDelta(currentCount, targetVisitCount)

  if (delta === 0) {
    console.log('✓ Visit count already at target')
    return
  }

  console.log(`  Seeding ${delta} visits...`)

  let totalCitiesUpdated = 0

  // Calculate which users need visits and how many
  const startUserIndex = Math.floor(currentCount / visitsPerUser)
  const startVisitIndex = currentCount % visitsPerUser

  // Generate visits in order: all visits for user 0, then user 1, etc.
  const visits = []
  let insertedCount = 0

  for (let userIdx = startUserIndex; userIdx < allUserIds.length && insertedCount < delta; userIdx++) {
    const userId = allUserIds[userIdx]

    // Determine how many visits this user needs
    const startVisit = (userIdx === startUserIndex) ? startVisitIndex : 0
    const endVisit = visitsPerUser

    for (let visitIdx = startVisit; visitIdx < endVisit && insertedCount < delta; visitIdx++) {
      // Random city from top cities for each visit
      const randomCity = topCities[Math.floor(Math.random() * topCities.length)]

      visits.push(generateVisit(userId, randomCity._id, visitIdx))
      insertedCount++

      // Insert in batches
      if (visits.length >= BATCH_SIZE) {
        const result = await client.mutation(internal.seed.insertVisits, { visits: visits.splice(0, BATCH_SIZE) })
        totalCitiesUpdated += result.citiesUpdated
        console.log(`  ✓ Inserted ${insertedCount}/${delta} visits (${result.citiesUpdated} cities updated)`)
      }
    }
  }

  // Insert any remaining visits
  if (visits.length > 0) {
    const result = await client.mutation(internal.seed.insertVisits, { visits })
    totalCitiesUpdated += result.citiesUpdated
    console.log(`  ✓ Inserted ${insertedCount}/${delta} visits (${result.citiesUpdated} cities updated)`)
  }

  console.log(`✅ Visits seeded: ${delta} inserted, ${currentCount + delta} total, ${totalCitiesUpdated} cities updated`)
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🌱 Database Seeding Script')
  console.log('━'.repeat(30))

  // Parse CLI arguments
  const config = parseArgs()
  const targetUserCount = config.users
  const visitsPerUser = config.visitsPerUser
  const targetVisitCount = targetUserCount * visitsPerUser

  // Validate environment variables
  if (!process.env.VITE_CONVEX_URL) {
    console.error('❌ Error: VITE_CONVEX_URL environment variable is not set')
    console.error('   Set it in .env.local or pass it when running the script:')
    console.error('   VITE_CONVEX_URL=https://your-deployment.convex.cloud node scripts/seed-database.mjs')
    process.exit(1)
  }

  if (!process.env.CONVEX_DEPLOYMENT) {
    console.error('❌ Error: CONVEX_DEPLOYMENT environment variable is not set')
    console.error('   This is required to authenticate as admin for internal functions')
    console.error('   Set it in .env.local or pass it when running the script:')
    console.error('   CONVEX_DEPLOYMENT=dev:your-deployment node scripts/seed-database.mjs')
    process.exit(1)
  }

  // Initialize Convex client with admin authentication
  const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL)
  client.setAdminAuth(process.env.CONVEX_DEPLOYMENT)

  try {
    // Pre-flight checks
    console.log('\n📊 Pre-flight Checks')
    console.log('━'.repeat(30))
    console.log(`✓ Connected to Convex: ${process.env.VITE_CONVEX_URL}`)

    // Check if we have enough cities
    const topCities = await client.query(internal.seed.getTopCities, { limit: TOP_CITIES_TO_USE })

    if (topCities.length < MIN_CITIES_REQUIRED) {
      console.error(`❌ Error: Insufficient cities in database`)
      console.error(`   Found: ${topCities.length} cities`)
      console.error(`   Need: ${MIN_CITIES_REQUIRED} cities minimum`)
      console.error(`   Please seed cities first (see scripts/seed-cities.mjs or city seeding docs)`)
      process.exit(1)
    }

    console.log(`✓ Found ${topCities.length} cities (need ${MIN_CITIES_REQUIRED} minimum)`)

    // Seed users
    const startTime = Date.now()
    await seedUsers(client, targetUserCount)

    // Get ALL user IDs (including previously seeded ones)
    const allUsers = await client.query(internal.seed.getAllUsers, {})
    const allExistingUserIds = allUsers.map((u) => u._id)

    // Seed visits (distribute across all users)
    await seedVisits(client, allExistingUserIds, topCities, visitsPerUser)

    const endTime = Date.now()
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(1)

    console.log('\n✨ Seeding complete!')
    console.log(`   Duration: ${durationSeconds}s`)
    console.log(`   Users: ${targetUserCount}`)
    console.log(`   Visits: ${targetVisitCount}`)

  } catch (error) {
    console.error('\n❌ Error during seeding:')
    console.error(error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    process.exit(1)
  } finally {
    client.close()
  }
}

// Run main function
main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
