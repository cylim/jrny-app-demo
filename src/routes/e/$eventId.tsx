import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { motion } from 'framer-motion'
import { Calendar, MapPin, User, ArrowLeft } from 'lucide-react'
import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'
import { EventParticipantList } from '~/components/events/event-participant-list'
import { EventActions } from '~/components/events/event-actions'
import { fadeIn, slideUp } from '~/lib/animations'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/**
 * Event detail page (/e/$eventId)
 *
 * Features:
 * - Displays full event details (title, description, date/time, location)
 * - Shows event owner with avatar
 * - EventParticipantList component with privacy logic
 * - EventActions component (join/leave/edit buttons)
 * - Error boundary for "Event not found"
 * - Kirby-style design with Framer Motion animations
 * - Real-time updates via Convex live queries
 * - Responsive layout
 */

export const Route = createFileRoute('/e/$eventId')({
  component: EventDetailPage,
  errorComponent: EventDetailErrorComponent,
})

function EventDetailPage() {
  const { eventId } = Route.useParams()

  // Fetch event data with real-time updates
  const { data: event } = useSuspenseQuery(
    convexQuery(api.events.getEvent, { eventId: eventId as Id<'events'> }),
  )

  // Event not found
  if (!event) {
    throw new Error('Event not found')
  }

  const isPast = event.startTime < Date.now()

  // Format date/time with timezone
  const startDate = new Date(event.startTime)
  const endDate = event.endTime ? new Date(event.endTime) : null

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: event.timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: event.timezone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'long',
  })

  const formattedDate = dateFormatter.format(startDate)
  const formattedStartTime = timeFormatter.format(startDate)
  const formattedEndTime = endDate ? timeFormatter.format(endDate) : null

  // Get owner info (we'll need to fetch this separately in a future enhancement)
  // For now, just show owner ID
  const ownerName = 'Event Organizer' // TODO: Fetch owner name from users table

  // Check authentication status (placeholder - will integrate with auth later)
  const isAuthenticated = true // TODO: Get from auth context

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="container mx-auto max-w-4xl px-4 py-8"
    >
      {/* Back Button */}
      <Link
        to="/discover"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Discover
      </Link>

      {/* Event Header */}
      <motion.div
        variants={slideUp}
        className="mb-8 rounded-3xl border-2 border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Title and Status */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            {event.title}
          </h1>
          {isPast && (
            <span className="flex-shrink-0 rounded-full bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              Past Event
            </span>
          )}
          {event.isCancelled && (
            <span className="flex-shrink-0 rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              Cancelled
            </span>
          )}
        </div>

        {/* Organizer */}
        <div className="mb-6 flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={undefined} alt={ownerName} />
            <AvatarFallback className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Organized by
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {ownerName}
            </p>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          {/* Date/Time */}
          <div className="flex items-start gap-3">
            <Calendar className="mt-1 h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400" />
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {formattedDate}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formattedStartTime}
                {formattedEndTime && ` - ${formattedEndTime}`}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400" />
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {event.location}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-800">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            About this event
          </h2>
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {event.description}
          </p>
        </div>
      </motion.div>

      {/* Event Actions */}
      <motion.div variants={slideUp} className="mb-8">
        <EventActions
          eventId={event._id}
          isOwner={event.isOwner}
          isParticipant={event.isParticipant}
          isFull={event.isFull}
          isPast={isPast}
          isAuthenticated={isAuthenticated}
        />
      </motion.div>

      {/* Participant List */}
      <motion.div variants={slideUp}>
        <EventParticipantList
          participantCount={event.participantCount}
          participants={event.participants}
          isOwner={event.isOwner}
          isParticipantListHidden={event.isParticipantListHidden}
          isParticipant={event.isParticipant}
          maxCapacity={event.maxCapacity}
        />
      </motion.div>
    </motion.div>
  )
}

function EventDetailErrorComponent({ error }: { error: Error }) {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-3xl border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-900/20">
        <h1 className="mb-4 text-3xl font-bold text-red-900 dark:text-red-100">
          Event Not Found
        </h1>
        <p className="mb-6 text-red-700 dark:text-red-300">
          {error.message ||
            "The event you're looking for doesn't exist or has been deleted."}
        </p>
        <Link
          to="/discover"
          className="inline-block rounded-full bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        >
          Browse Events
        </Link>
      </div>
    </div>
  )
}
