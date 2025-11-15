import { convexQuery } from '@convex-dev/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Suspense, useEffect } from 'react'
import { FALLBACK_CITIES, type FeaturedCity } from '~/types/city'
import { api } from '~@/convex/_generated/api'
import { CityCard } from './city-card'
import { LoadingDots } from './ui/loading-dots'

interface CityShowcaseProps {
  count?: number
}

/**
 * CityShowcaseContent - Inner component that uses Suspense
 * Displays a grid of featured cities from Convex
 * Falls back to FALLBACK_CITIES if query fails or returns empty
 * Includes loading state with performance tracking
 */
function CityShowcaseContent({ count = 9 }: CityShowcaseProps) {
  const router = useRouter()
  const startTime = performance.now()

  // Fetch featured cities from Convex
  const { data: cities, error } = useSuspenseQuery(
    convexQuery(api.cities.getFeaturedCities, { count }),
  )

  // Track fetch duration for performance monitoring
  useEffect(() => {
    const fetchDuration = performance.now() - startTime
    Sentry.metrics.distribution('city.showcase.fetch_duration', fetchDuration, {
      unit: 'millisecond',
    })
  }, [startTime])

  // Use fallback cities if query returns empty or fails
  const displayCities: FeaturedCity[] =
    !cities || cities.length === 0 || error
      ? FALLBACK_CITIES.slice(0, count)
      : cities

  const handleCityClick = (city: FeaturedCity) => {
    router.navigate({
      to: `/c/${city?.shortSlug}`,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {displayCities.map((city) => (
        <CityCard key={city._id} city={city} onClick={handleCityClick} />
      ))}
    </div>
  )
}

/**
 * CityShowcase component with error boundary and loading state
 * Displays featured cities in a responsive grid
 *
 * Grid layout:
 * - Mobile (< 640px): 1 column (3-4 cities)
 * - Tablet (640px - 768px): 2 columns (6-8 cities)
 * - Desktop (≥ 768px): 3 columns (9-12 cities)
 * - Large Desktop (≥ 1024px): 4 columns (9-12 cities)
 *
 * @param count - Number of cities to display (default: 9)
 */
export function CityShowcase({ count = 8 }: CityShowcaseProps) {
  return (
    <div className="w-full">
      <Sentry.ErrorBoundary
        fallback={() => (
          <div className="kirby-rounded bg-pink-50 p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Oops! Something went wrong
            </h3>
            <p className="mb-4 text-gray-600">
              We couldn't load the featured cities right now.
            </p>
            {/* Display fallback cities even on error */}
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {FALLBACK_CITIES.slice(0, count).map((city) => (
                <CityCard
                  key={city._id}
                  city={city}
                  onClick={(city) => {
                    window.location.href = `/c/${city.shortSlug}`
                  }}
                />
              ))}
            </div>
          </div>
        )}
        beforeCapture={(scope) => {
          scope.setTag('component', 'CityShowcase')
          scope.setLevel('error')
        }}
      >
        <Suspense
          fallback={
            <output
              className="flex min-h-[400px] items-center justify-center"
              aria-label="Loading featured cities"
            >
              <LoadingDots variant="pink" size="lg" />
            </output>
          }
        >
          <CityShowcaseContent count={count} />
        </Suspense>
      </Sentry.ErrorBoundary>
    </div>
  )
}
