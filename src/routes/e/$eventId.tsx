import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CalendarPlus, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EventForm } from '~/components/events/event-form'
import { EventParticipantList } from '~/components/events/event-participant-list'
import { fadeIn, slideUp } from '~/lib/animations'

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

  // Fetch current user for accessibility features
  const { data: currentUser } = useSuspenseQuery(
    convexQuery(api.users.getCurrentUser, {}),
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

  // Generate Google Calendar URL
  const generateGoogleCalendarUrl = () => {
    const formatDateForGoogleCalendar = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '')
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      details: event.description,
      location: event.location,
      dates: `${formatDateForGoogleCalendar(startDate)}/${formatDateForGoogleCalendar(endDate || new Date(event.startTime + 3600000))}`,
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  // Check authentication status from current user
  const isAuthenticated = !!currentUser

  // Generate user profile link
  const ownerProfileLink = event.owner.username
    ? `/u/${event.owner.username}`
    : `/u/${event.owner._id}`

  // Edit/Cancel state
  const [showEditForm, setShowEditForm] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const updateEvent = useMutation(api.events.updateEvent)
  const cancelEvent = useMutation(api.events.cancelEvent)
  const joinEvent = useMutation(api.events.joinEvent)
  const leaveEvent = useMutation(api.events.leaveEvent)

  const handleEdit = () => {
    setShowEditForm(true)
    setUpdateError(null)
  }

  const handleUpdateEvent = async (values: {
    title: string
    description: string
    startTime: number
    endTime?: number
    timezone: string
    location: string
    maxCapacity?: number
    isParticipantListHidden: boolean
  }) => {
    setIsUpdating(true)
    setUpdateError(null)
    try {
      await updateEvent({
        eventId: event._id,
        ...values,
      })
      setShowEditForm(false)
      setUpdateError(null)
    } catch (error) {
      console.error('Failed to update event:', error)
      setUpdateError(
        error instanceof Error
          ? error.message
          : 'Failed to update event. Please try again.',
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEvent = async () => {
    setIsCancelling(true)
    setCancelError(null)
    try {
      await cancelEvent({ eventId: event._id })
      setShowCancelConfirm(false)
    } catch (error) {
      console.error('Failed to cancel event:', error)
      setCancelError(
        error instanceof Error
          ? error.message
          : 'Failed to cancel event. Please try again.',
      )
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="container mx-auto max-w-5xl px-4 py-8"
    >
      {/* Event Header - Glassy Card */}
      <motion.div
        variants={slideUp}
        className="mb-6 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/80 to-white/40 p-8 shadow-xl backdrop-blur-xl dark:from-zinc-900/80 dark:to-zinc-900/40 dark:border-white/10"
      >
        {/* Title and Status */}
        <div className="mb-3 flex items-start justify-between gap-4">
          <h1 className="bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:to-zinc-400">
            {event.title}
          </h1>
          <div className="flex flex-shrink-0 gap-2">
            {isPast && (
              <span className="rounded-full border border-zinc-300/50 bg-zinc-100/80 px-4 py-2 text-sm font-medium text-zinc-700 backdrop-blur-sm dark:border-zinc-600/50 dark:bg-zinc-700/80 dark:text-zinc-300">
                Past Event
              </span>
            )}
            {event.isCancelled && (
              <span className="rounded-full border border-red-300/50 bg-red-100/80 px-4 py-2 text-sm font-medium text-red-700 backdrop-blur-sm dark:border-red-600/50 dark:bg-red-900/50 dark:text-red-300">
                Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Organizer Info - Text Under Title */}
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Organized by{' '}
          <Link
            to={ownerProfileLink}
            className="font-semibold text-zinc-900 transition-colors hover:text-pink-600 dark:text-zinc-100 dark:hover:text-pink-400"
          >
            {event.owner.name}
          </Link>
        </p>

        {/* Description */}
        <div className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            ✨ About this event
          </h2>
          <p className="whitespace-pre-wrap leading-relaxed text-zinc-700 dark:text-zinc-300">
            {event.description}
          </p>
        </div>

        {/* Event Details - Combined Section */}
        <div className="mb-6 rounded-2xl border border-white/30 bg-white/50 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Location */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Location
                </p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                  {event.location}
                </p>
                <Link
                  to="/c/$shortSlug"
                  params={{ shortSlug: event.city.shortSlug }}
                  className="text-sm text-zinc-600 transition-colors hover:text-pink-600 dark:text-zinc-400 dark:hover:text-pink-400"
                >
                  {event.city.name}, {event.city.country}
                </Link>
              </div>
            </div>

            {/* Date/Time */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Date & Time
                </p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                  {formattedDate}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formattedStartTime}
                  {formattedEndTime && ` - ${formattedEndTime}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-3">
          {/* Join/Leave Button - All authenticated users */}
          {!isPast &&
            !event.isCancelled &&
            isAuthenticated &&
            (event.isParticipant ? (
              <Button
                onClick={async () => {
                  try {
                    await leaveEvent({ eventId: event._id })
                  } catch (error) {
                    console.error('Failed to leave event:', error)
                  }
                }}
                variant="outline"
                className="flex-1 rounded-xl border-white/40 bg-white/50 backdrop-blur-sm hover:bg-white/70 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
              >
                Leave Event
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  try {
                    await joinEvent({ eventId: event._id })
                  } catch (error) {
                    console.error('Failed to join event:', error)
                  }
                }}
                disabled={event.isFull || event.isCancelled}
                className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg transition-all hover:scale-105 hover:shadow-xl text-white"
              >
                {event.isFull
                  ? 'Event Full'
                  : event.isCancelled
                    ? 'Event Cancelled'
                    : 'Join Event'}
              </Button>
            ))}

          {/* Add to Calendar Button */}
          <a
            href={generateGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/40 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:border-white/20"
          >
            <CalendarPlus className="h-4 w-4" />
            Add to Calendar
          </a>

          {/* Owner Actions */}
          {event.isOwner && !isPast && !event.isCancelled && (
            <>
              <Button
                onClick={handleEdit}
                variant="outline"
                className="rounded-xl border-white/40 bg-white/50 backdrop-blur-sm hover:bg-white/70 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
              >
                Edit Event
              </Button>
              <Button
                onClick={() => setShowCancelConfirm(true)}
                variant="outline"
                className="rounded-xl border-white/40 bg-white/50 backdrop-blur-sm hover:bg-white/70 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
              >
                Cancel Event
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Edit Event Form */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-3xl border border-pink-300/50 bg-gradient-to-br from-pink-50/90 to-purple-50/90 p-6 shadow-xl backdrop-blur-xl dark:border-pink-500/30 dark:from-pink-900/30 dark:to-purple-900/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Edit Event
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false)
                  setUpdateError(null)
                }}
                className="rounded-full p-2 transition-colors hover:bg-pink-100/80 dark:hover:bg-pink-900/40"
                disabled={isUpdating}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {updateError && (
              <div className="mb-4 rounded-2xl border border-red-300/50 bg-red-100/80 px-4 py-3 text-sm text-red-700 backdrop-blur-sm dark:border-red-500/30 dark:bg-red-900/40 dark:text-red-300">
                {updateError}
              </div>
            )}
            <EventForm
              mode="edit"
              initialValues={{
                title: event.title,
                description: event.description,
                startTime: event.startTime,
                endTime: event.endTime,
                timezone: event.timezone,
                location: event.location,
                maxCapacity: event.maxCapacity,
                isParticipantListHidden: event.isParticipantListHidden,
              }}
              onSubmit={handleUpdateEvent}
              isLoading={isUpdating}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Dialog */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => !isCancelling && setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 to-white/70 p-8 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:from-zinc-900/90 dark:to-zinc-900/70"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-2xl font-bold text-transparent dark:from-white dark:to-zinc-400">
                Cancel Event?
              </h3>
              <p className="mb-6 leading-relaxed text-zinc-700 dark:text-zinc-300">
                Are you sure you want to cancel this event? This action cannot
                be undone. All participants will still be able to see the event
                details, but it will be marked as cancelled.
              </p>
              {cancelError && (
                <div className="mb-4 rounded-2xl border border-red-300/50 bg-red-100/80 px-4 py-3 text-sm text-red-700 backdrop-blur-sm dark:border-red-500/30 dark:bg-red-900/40 dark:text-red-300">
                  {cancelError}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelConfirm(false)
                    setCancelError(null)
                  }}
                  disabled={isCancelling}
                  className="flex-1 rounded-full border-white/40 bg-white/50 backdrop-blur-sm hover:bg-white/70 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  Keep Event
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelEvent}
                  disabled={isCancelling}
                  className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Event'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participant List - Glassy Card */}
      <motion.div
        variants={slideUp}
        className="overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/60 to-white/30 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:from-zinc-900/60 dark:to-zinc-900/30"
      >
        <EventParticipantList
          participantCount={event.participantCount}
          participants={event.participants}
          isOwner={event.isOwner}
          isParticipantListHidden={event.isParticipantListHidden}
          isParticipant={event.isParticipant}
          maxCapacity={event.maxCapacity}
          currentUserId={currentUser?._id}
        />
      </motion.div>
    </motion.div>
  )
}

function EventDetailErrorComponent({ error }: { error: Error }) {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="container mx-auto max-w-2xl px-4 py-16"
    >
      <div className="overflow-hidden rounded-3xl border border-red-300/50 bg-gradient-to-br from-red-50/90 to-pink-50/90 p-12 text-center shadow-2xl backdrop-blur-xl dark:border-red-500/30 dark:from-red-900/30 dark:to-pink-900/30">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-pink-500 shadow-lg">
            <span className="text-4xl">⚠️</span>
          </div>
        </div>
        <h1 className="mb-4 bg-gradient-to-br from-red-900 to-red-600 bg-clip-text text-4xl font-bold text-transparent dark:from-red-100 dark:to-red-400">
          Event Not Found
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-red-700 dark:text-red-300">
          {error.message ||
            "The event you're looking for doesn't exist or has been deleted."}
        </p>
      </div>
    </motion.div>
  )
}
