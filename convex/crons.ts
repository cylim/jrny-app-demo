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
  { hours: 1 }, // Run every hour
  internal.enrichment.cleanStaleLocks,
)
crons.interval(
  'sync current visitor counts',
  { minutes: 1440 },
  internal.visits.syncAllCurrentVisitorCounts,
)

// T109: Export as default export
export default crons
