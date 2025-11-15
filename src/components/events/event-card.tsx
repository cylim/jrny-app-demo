import { motion } from 'framer-motion'
import { Calendar, MapPin, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { fadeIn } from '~/lib/animations'
import type { Id } from 'convex/_generated/dataModel'

/**
 * Event card component for displaying event summaries
 * Used in: City page event list, user profile event tabs
 *
 * Features:
 * - Kirby-style rounded design with pastel colors
 * - Shows event title, date/time, location, participant count
 * - "Event Full" badge when at capacity
 * - "Past" badge for past events
 * - Framer Motion fadeIn animation
 * - Responsive design
 */

interface EventCardProps {
  event: {
    _id: Id<'events'>
    title: string
    description: string
    startTime: number
    endTime?: number
    timezone: string
    location: string
    cityId: Id<'cities'>
    maxCapacity?: number
    participantCount: number
    isCancelled: boolean
  }
}

export function EventCard({ event }: EventCardProps) {
  const isPast = event.startTime < Date.now()
  const isFull = event.maxCapacity
    ? event.participantCount >= event.maxCapacity
    : false

  // Format date/time with timezone
  const startDate = new Date(event.startTime)
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: event.timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: event.timezone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  const formattedDate = dateFormatter.format(startDate)
  const formattedTime = timeFormatter.format(startDate)

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Link
        to="/e/$eventId"
        params={{ eventId: event._id }}
        className="block rounded-3xl border-2 border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Header with badges */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {event.title}
          </h3>
          <div className="flex flex-shrink-0 gap-2">
            {isPast && (
              <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                Past
              </span>
            )}
            {isFull && !isPast && (
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                Event Full
              </span>
            )}
          </div>
        </div>

        {/* Description preview */}
        <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {event.description}
        </p>

        {/* Event details */}
        <div className="space-y-2">
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>
              {formattedDate} • {formattedTime}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <MapPin className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="truncate">{event.location}</span>
          </div>

          {/* Participant count */}
          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <Users className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>
              {event.participantCount}
              {event.maxCapacity !== undefined &&
                ` / ${event.maxCapacity}`}{' '}
              {event.participantCount === 1 ? 'participant' : 'participants'}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
