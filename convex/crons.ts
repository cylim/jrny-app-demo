/**
 * T104-T109: Convex cron jobs
 * Scheduled tasks for background maintenance
 */

import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

// T108: Register cleanStaleLocks cron to run every hour
const crons = cronJobs()

crons.interval(
  'clean-stale-locks',
  { minutes: 10 }, // Run every 10 minutes
  internal.enrichment.cleanStaleLocks,
)
crons.interval(
  'sync current visitor counts',
  { hours: 24 }, // Run every 24 hours
  internal.visits.syncAllCurrentVisitorCounts,
)

// T109: Export as default export
export default crons
