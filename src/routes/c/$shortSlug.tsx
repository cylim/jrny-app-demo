import { convexQuery } from '@convex-dev/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { Suspense, useState } from 'react'
import { EnrichmentContent } from '@/components/city/enrichment-content'
import { EnrichmentStatus } from '@/components/city/enrichment-status'
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
  loader: async ({ params, context }) => {
    // T046-T049: Enrichment integration
    const { shortSlug } = params

    // Get city first to extract cityId
    const cityData = await context.queryClient.ensureQueryData(
      convexQuery(api.cities.getCityByShortSlug, { shortSlug }),
    )

    if (!cityData) return { enrichmentStatus: null, enrichmentContent: null }

    // T046: Fetch enrichment status
    const enrichmentStatus = await context.queryClient.ensureQueryData(
      convexQuery(api.enrichment.checkEnrichmentStatus, {
        cityId: cityData._id,
      }),
    )

    // T046a: Fetch enrichment content if city is enriched
    let enrichmentContent = null
    if (cityData.isEnriched) {
      enrichmentContent = await context.queryClient.ensureQueryData(
        convexQuery(api.enrichment.getCityEnrichmentContent, {
          cityId: cityData._id,
        }),
      )
    }

    // T047-T048 + T096-T097: Trigger enrichment in background (fire-and-forget)
    if (
      enrichmentStatus.needsEnrichment &&
      enrichmentStatus.reason !== 'in_progress'
    ) {
      try {
        // Fire and forget - don't await
        context.convexClient
          .action(api.enrichmentActions.enrichCity, { cityId: cityData._id })
          .catch((error) => {
            console.error('Background enrichment failed:', error)

            // T096-T097: Capture enrichment errors in Sentry with context
            Sentry.captureException(error, {
              tags: {
                feature: 'city-enrichment',
                cityId: cityData._id,
                cityName: cityData.name,
                enrichmentReason: enrichmentStatus.reason,
              },
              contexts: {
                enrichment: {
                  cityId: cityData._id,
                  cityName: cityData.name,
                  cityCountry: cityData.country,
                  enrichmentReason: enrichmentStatus.reason,
                  needsEnrichment: enrichmentStatus.needsEnrichment,
                },
              },
            })
          })
      } catch (error) {
        // T048: Don't block page load on enrichment errors
        console.error('Failed to trigger enrichment:', error)

        // T096-T097: Capture sync enrichment trigger errors
        Sentry.captureException(error, {
          tags: {
            feature: 'city-enrichment',
            phase: 'trigger',
            cityId: cityData._id,
          },
        })
      }
    }

    // T049: Return enrichmentStatus and enrichmentContent
    return { enrichmentStatus, enrichmentContent }
  },
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
  const navigate = useNavigate()

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
      // Navigate to event detail page using TanStack Router
      navigate({ to: '/e/$eventId', params: { eventId } })
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
        <div className="rounded-3xl p-8 text-center ">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            No upcoming events in this city yet.
          </p>
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
  const loaderData = Route.useLoaderData()

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
    <div className="pb-8">
      {/* City Header with Image */}
      {city.image ? (
        <div className="relative w-full mb-8">
          <img
            src={city.image}
            alt={city.name}
            className="w-full h-80 object-cover"
          />
          {/* Overlay with city name and geographic data */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6">
            <div className="max-w-4xl mx-auto w-full">
              <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white">
                {city.name}
              </h1>
              <p className="text-xl text-white/90 mb-4">
                {city.country} • {city.region}
              </p>
              {/* Geographic Information Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white/70 text-xs mb-1">Latitude</p>
                  <p className="font-medium text-white">{city.latitude}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white/70 text-xs mb-1">Longitude</p>
                  <p className="font-medium text-white">{city.longitude}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white/70 text-xs mb-1">Country Code</p>
                  <p className="font-medium text-white">{city.countryCode}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white/70 text-xs mb-1">Region</p>
                  <p className="font-medium text-white">{city.region}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Text-only header for cities without images */
        <div className="w-full mb-8 bg-gradient-to-b from-muted/50 to-background p-6">
          <div className="max-w-4xl mx-auto w-full">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{city.name}</h1>
            <p className="text-xl text-muted-foreground mb-4">
              {city.country} • {city.region}
            </p>
            {/* Geographic Information Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-card border rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Latitude</p>
                <p className="font-medium">{city.latitude}</p>
              </div>
              <div className="bg-card border rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Longitude</p>
                <p className="font-medium">{city.longitude}</p>
              </div>
              <div className="bg-card border rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">
                  Country Code
                </p>
                <p className="font-medium">{city.countryCode}</p>
              </div>
              <div className="bg-card border rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Region</p>
                <p className="font-medium">{city.region}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        {/* T056-T057: Enrichment Status */}
        <div className="max-w-6xl mx-auto mb-6">
          <EnrichmentStatus enrichmentStatus={loaderData.enrichmentStatus} />
        </div>

        {/* Two-column layout when enrichment data exists */}
        {loaderData.enrichmentContent ? (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Enrichment Content (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* T058: Description */}
              {loaderData.enrichmentContent.description && (
                <EnrichmentContent
                  title={`About ${city.name}`}
                  content={loaderData.enrichmentContent.description}
                  defaultExpanded={true}
                />
              )}

              {/* T062: History */}
              {loaderData.enrichmentContent.history && (
                <EnrichmentContent
                  title="History"
                  content={loaderData.enrichmentContent.history}
                  defaultExpanded={false}
                />
              )}

              {/* T063: Geography */}
              {loaderData.enrichmentContent.geography && (
                <EnrichmentContent
                  title="Geography"
                  content={loaderData.enrichmentContent.geography}
                  defaultExpanded={false}
                />
              )}

              {/* T064: Climate */}
              {loaderData.enrichmentContent.climate && (
                <EnrichmentContent
                  title="Climate"
                  content={loaderData.enrichmentContent.climate}
                  defaultExpanded={false}
                />
              )}

              {/* T065: Transportation */}
              {loaderData.enrichmentContent.transportation && (
                <EnrichmentContent
                  title="Transportation"
                  content={loaderData.enrichmentContent.transportation}
                  defaultExpanded={false}
                />
              )}

              {/* T059-T061: Tourism sections */}
              {loaderData.enrichmentContent.tourism && (
                <>
                  {loaderData.enrichmentContent.tourism.landmarks &&
                    loaderData.enrichmentContent.tourism.landmarks.length >
                      0 && (
                      <div className="rounded-3xl border-2 border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="mb-4 text-2xl font-semibold">
                          Landmarks
                        </h2>
                        <ul className="list-inside list-disc space-y-2 text-zinc-700 dark:text-zinc-300">
                          {loaderData.enrichmentContent.tourism.landmarks.map(
                            (landmark, idx) => (
                              <li key={idx}>{landmark}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                  {loaderData.enrichmentContent.tourism.museums &&
                    loaderData.enrichmentContent.tourism.museums.length > 0 && (
                      <div className="rounded-3xl border-2 border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="mb-4 text-2xl font-semibold">
                          Museums & Galleries
                        </h2>
                        <ul className="list-inside list-disc space-y-2 text-zinc-700 dark:text-zinc-300">
                          {loaderData.enrichmentContent.tourism.museums.map(
                            (museum, idx) => (
                              <li key={idx}>{museum}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                  {loaderData.enrichmentContent.tourism.attractions &&
                    loaderData.enrichmentContent.tourism.attractions.length >
                      0 && (
                      <div className="rounded-3xl border-2 border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="mb-4 text-2xl font-semibold">
                          Attractions
                        </h2>
                        <ul className="list-inside list-disc space-y-2 text-zinc-700 dark:text-zinc-300">
                          {loaderData.enrichmentContent.tourism.attractions.map(
                            (attraction, idx) => (
                              <li key={idx}>{attraction}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* Right Sidebar: Events and Visitors (1/3 width) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Who's Here Now Section - Only for logged-in users */}
              {session?.user ? (
                <div className="bg-card/30 border rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4">
                    Who's Here Now
                  </h2>
                  <Suspense fallback={<CurrentVisitorsListSkeleton />}>
                    <CurrentVisitorsSection
                      cityId={city._id}
                      cityName={city.name}
                    />
                  </Suspense>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-6 text-center">
                  <h2 className="text-xl font-semibold mb-2">
                    See Who's Traveling Here
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Log in to discover other travelers in {city.name} and
                    connect with people visiting this destination.
                  </p>
                </div>
              )}

              {/* Upcoming Events Section */}
              <div>
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
            </div>
          </div>
        ) : (
          /* Single column layout when no enrichment data */
          <div className="max-w-4xl mx-auto">
            {/* Who's Here Now Section - Only for logged-in users */}
            {session?.user ? (
              <div className="bg-card/30 border rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Who's Here Now</h2>
                <Suspense fallback={<CurrentVisitorsListSkeleton />}>
                  <CurrentVisitorsSection
                    cityId={city._id}
                    cityName={city.name}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-6 text-center mb-8">
                <h2 className="text-xl font-semibold mb-2">
                  See Who's Traveling Here
                </h2>
                <p className="text-muted-foreground mb-4">
                  Log in to discover other travelers in {city.name} and connect
                  with people visiting this destination.
                </p>
              </div>
            )}

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
          </div>
        )}
      </div>
    </div>
  )
}
