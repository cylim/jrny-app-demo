import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/ui/loading-dots'
import {
  CurrentVisitorsList,
  CurrentVisitorsListSkeleton,
} from '@/components/visits/current-visitors-list'
import { authClient } from '@/lib/auth-client'
import { EventCard } from '~/components/events/event-card'
import { EventForm } from '~/components/events/event-form'
import { api } from '~@/convex/_generated/api'
import type { Id } from '~@/convex/_generated/dataModel'

export const Route = createFileRoute('/c/$shortSlug')({
  component: CityPage,
})

/**
 * Component that fetches and displays current visitors for a city
 */
function CurrentVisitorsSection({
  cityId,
  cityName,
}: {
  cityId: Id<'cities'>
  cityName: string
}) {
  const { data: visitors } = useSuspenseQuery(
    convexQuery(api.visits.getCurrentVisitors, { cityId }),
  )

  return <CurrentVisitorsList visitors={visitors} cityName={cityName} />
}

/**
 * Component that fetches and displays upcoming events for a city
 */
function UpcomingEventsSection({
  cityId,
  isAuthenticated,
}: {
  cityId: Id<'cities'>
  isAuthenticated: boolean
}) {
  const { data: events } = useSuspenseQuery(
    convexQuery(api.events.listUpcomingEvents, { cityId }),
  )

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const createEvent = useMutation(api.events.createEvent)

  const handleCreateEvent = async (values: {
    title: string
    description: string
    startTime: number
    endTime?: number
    timezone: string
    location: string
    maxCapacity?: number
    isParticipantListHidden: boolean
  }) => {
    setIsCreating(true)
    try {
      const eventId = await createEvent({
        cityId,
        ...values,
      })
      setShowCreateForm(false)
      // Navigate to event detail page
      window.location.href = `/e/${eventId}`
    } catch (error) {
      console.error('Failed to create event:', error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div>
      {/* Header with Create Button */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Upcoming Events</h2>
        {isAuthenticated && !showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="rounded-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        )}
      </div>

      {/* Create Event Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-3xl border-2 border-pink-200 bg-pink-50 p-6 dark:border-pink-900/50 dark:bg-pink-900/20"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create New Event</h3>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-full p-2 hover:bg-pink-100 dark:hover:bg-pink-900/30"
                disabled={isCreating}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <EventForm
              mode="create"
              onSubmit={handleCreateEvent}
              isLoading={isCreating}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="rounded-3xl border-2 border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-800">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            No upcoming events in this city yet.
          </p>
          {isAuthenticated && !showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="rounded-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create the First Event
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Render the city page for the current `shortSlug` route parameter.
 *
 * Renders a "City Not Found" view when no city is found; otherwise displays the city's image, name, country and region, location details (latitude, longitude, country code, region), and a conditional "Who's Here Now" panel shown only to authenticated users (or a sign-in prompt when unauthenticated).
 *
 * @returns The React element representing the city page content
 */
function CityPage() {
  const { shortSlug } = Route.useParams()
  const { data: session } = authClient.useSession()

  // Fetch city data
  const { data: city } = useSuspenseQuery(
    convexQuery(api.cities.getCityByShortSlug, { shortSlug }),
  )

  if (!city) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">City Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The city you're looking for doesn't exist in our database.
          </p>
          <a href="/" className="text-primary hover:underline font-medium">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* City Header */}
      <div className="max-w-4xl mx-auto">
        {city.image && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={city.image}
              alt={city.name}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{city.name}</h1>
          <p className="text-xl text-muted-foreground">
            {city.country} • {city.region}
          </p>
        </div>

        {/* Geographic Information */}
        <div className="bg-muted/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Location Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latitude</p>
              <p className="font-medium">{city.latitude}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Longitude</p>
              <p className="font-medium">{city.longitude}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Country Code</p>
              <p className="font-medium">{city.countryCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Region</p>
              <p className="font-medium">{city.region}</p>
            </div>
          </div>
        </div>

        {/* Upcoming Events Section */}
        <div className="mb-8">
          <Suspense
            fallback={
              <div className="rounded-3xl border-2 border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <LoadingDots />
              </div>
            }
          >
            <UpcomingEventsSection
              cityId={city._id}
              isAuthenticated={!!session?.user}
            />
          </Suspense>
        </div>

        {/* Who's Here Now Section - Only for logged-in users */}
        {session?.user ? (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Who's Here Now</h2>
            <Suspense fallback={<CurrentVisitorsListSkeleton />}>
              <CurrentVisitorsSection cityId={city._id} cityName={city.name} />
            </Suspense>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">
              See Who's Traveling Here
            </h2>
            <p className="text-muted-foreground mb-4">
              Log in to discover other travelers in {city.name} and connect with
              people visiting this destination.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
            >
              Sign In to View Travelers
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
