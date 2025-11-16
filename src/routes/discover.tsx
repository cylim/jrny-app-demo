import { convexQuery } from '@convex-dev/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CityCard } from '~/components/city-card'
import { FilterBar, type SortOption } from '~/components/discover/filter-bar'
import { ErrorState } from '~/components/ui/error-state'
import { LoadingDots } from '~/components/ui/loading-dots'
import { LoadingState } from '~/components/ui/loading-state'
import type { CityListItem } from '~/types/city'
import { api } from '~@/convex/_generated/api'
import type { Id } from '~@/convex/_generated/dataModel'

type CityPaginationOpts = {
  numItems: number
  cursor: string | null
  id: Id<'cities'> | null
}

export const Route = createFileRoute('/discover')({
  component: Discover,
})

const CITIES_PER_PAGE = 24

/**
 * Discover page - Browse and filter all cities
 * Features server-side filtering, pagination with infinite scroll
 */
function Discover() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [sortOption, setSortOption] = useState<SortOption>('most-visited')

  // Fetch regions for filter dropdown
  const { data: regions = [] } = useQuery(
    convexQuery(api.cities.getRegions, {}),
  )

  // Fetch countries based on selected region
  const { data: countries = [] } = useQuery(
    convexQuery(api.cities.getCountries, {
      region: selectedRegion !== 'all' ? selectedRegion : undefined,
    }),
  )

  // Get convex client from router context
  const { convexClient } = Route.useRouteContext()

  // Infinite query for paginated cities using Convex .paginate()
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [
      'cities',
      'paginated',
      selectedRegion,
      selectedCountry,
      searchQuery,
      sortOption,
    ],
    queryFn: async ({ pageParam }) => {
      return await convexClient.query(api.cities.getCitiesPaginated, {
        region: selectedRegion !== 'all' ? selectedRegion : undefined,
        country: selectedCountry !== 'all' ? selectedCountry : undefined,
        searchQuery: searchQuery.trim() !== '' ? searchQuery : undefined,
        sortBy: sortOption,
        limit: CITIES_PER_PAGE,
        paginationOpts: pageParam,
      })
    },
    initialPageParam: undefined as CityPaginationOpts | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.isDone
        ? undefined
        : ({
            numItems: CITIES_PER_PAGE,
            cursor: lastPage.continueCursor,
            id: null,
          } as CityPaginationOpts),
  })

  // Flatten all pages into single array
  const allCities = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.cities)
  }, [data])

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Report errors to Sentry
  useEffect(() => {
    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'Discover', route: '/discover' },
        level: 'error',
      })
    }
  }, [error])

  // Reset country filter when region changes
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    setSelectedCountry('all')
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedRegion('all')
    setSelectedCountry('all')
  }

  return (
    <main className="flex flex-col gap-8 p-4 sm:p-8">
      {/* Page header */}
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="text-4xl font-bold sm:text-5xl">Discover Cities</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Explore destinations from around the world
        </p>
      </div>

      {/* Filter bar - always visible */}
      <div className="mx-auto w-full max-w-7xl">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          sortOption={sortOption}
          onSortChange={setSortOption}
          regions={regions}
          countries={countries}
          resultsCount={allCities.length}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* City grid with loading/error states */}
      <div className="mx-auto w-full max-w-7xl">
        {isLoading ? (
          <LoadingState message="Loading cities..." />
        ) : error ? (
          <ErrorState
            title="Failed to load cities"
            message="We couldn't load the cities. Please try again later."
          />
        ) : allCities.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {allCities.map((city: CityListItem) => (
                <Link
                  key={city._id}
                  to="/c/$shortSlug"
                  params={{ shortSlug: city.shortSlug }}
                  className="focus:outline-none"
                >
                  <CityCard city={city} onClick={() => {}} />
                </Link>
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="mt-8 flex justify-center">
              {isFetchingNextPage && (
                <div className="flex flex-col items-center gap-2">
                  <LoadingDots />
                  <p className="text-sm text-muted-foreground">
                    Loading more cities...
                  </p>
                </div>
              )}
              {!hasNextPage && allCities.length > CITIES_PER_PAGE && (
                <p className="text-sm text-muted-foreground">
                  You've reached the end! {allCities.length} cities shown.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="kirby-rounded flex min-h-[400px] flex-col items-center justify-center gap-4 bg-gradient-to-br from-pink-100 to-purple-100 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              No cities found
            </h2>
            <p className="max-w-md text-gray-600">
              Try adjusting your filters or search terms to find more cities.
            </p>
            {(searchQuery !== '' ||
              selectedRegion !== 'all' ||
              selectedCountry !== 'all') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="kirby-rounded bg-gradient-to-r from-pink-400 to-purple-400 px-6 py-2 font-semibold text-white shadow-lg hover:from-pink-500 hover:to-purple-500"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

/**
 * Loading component displayed while cities are being fetched
 */
export function DiscoverPending() {
  return <LoadingState message="Loading cities..." />
}
