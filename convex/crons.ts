import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Update current visitor counts for all cities every 24 hours
crons.interval(
  'sync current visitor counts',
  { minutes: 1440 },
  internal.visits.syncAllCurrentVisitorCounts,
)

export default crons
