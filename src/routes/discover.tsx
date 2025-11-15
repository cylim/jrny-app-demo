import { convexQuery } from '@convex-dev/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { CityCard } from '~/components/city-card'
import { FilterBar, type SortOption } from '~/components/discover/filter-bar'
import { LoadingDots } from '~/components/ui/loading-dots'
import type { CityListItem } from '~/types/city'
import { api } from '~@/convex/_generated/api'

export const Route = createFileRoute('/discover')({
  component: Discover,
})

/**
 * Discover page - Browse and filter all cities
 * Features search, region, country, and sort filters
 * Client-side filtering for instant results
 */
function Discover() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [sortOption, setSortOption] = useState<SortOption>('most-visited')

  // Fetch all cities
  const { data: allCities, error } = useSuspenseQuery(
    convexQuery(api.cities.getAllCities, {}),
  )

  // Report error to Sentry
  if (error) {
    Sentry.captureException(error, {
      tags: { component: 'Discover' },
    })
  }

  // Extract unique regions from all cities
  const regions = useMemo(() => {
    const uniqueRegions = new Set(
      allCities.map((city: CityListItem) => city.region),
    )
    return Array.from(uniqueRegions).sort()
  }, [allCities])

  // Extract unique countries based on selected region
  const countries = useMemo(() => {
    const citiesToFilter =
      selectedRegion === 'all'
        ? allCities
        : allCities.filter(
            (city: CityListItem) => city.region === selectedRegion,
          )

    const uniqueCountries = new Set(
      citiesToFilter.map((city: CityListItem) => city.country),
    )
    return Array.from(uniqueCountries).sort()
  }, [allCities, selectedRegion])

  // Reset country filter when region changes
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    setSelectedCountry('all')
  }

  // Filter and sort cities
  const filteredCities = useMemo(() => {
    let result = [...allCities]

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      result = result.filter((city: CityListItem) =>
        city.name.toLowerCase().includes(query),
      )
    }

    // Apply region filter
    if (selectedRegion !== 'all') {
      result = result.filter(
        (city: CityListItem) => city.region === selectedRegion,
      )
    }

    // Apply country filter
    if (selectedCountry !== 'all') {
      result = result.filter(
        (city: CityListItem) => city.country === selectedCountry,
      )
    }

    // Apply sorting
    result.sort((a: CityListItem, b: CityListItem) => {
      switch (sortOption) {
        case 'most-visited':
          return (b.visitCount ?? 0) - (a.visitCount ?? 0)
        case 'least-visited':
          return (a.visitCount ?? 0) - (b.visitCount ?? 0)
        case 'alphabetical-asc':
          return a.name.localeCompare(b.name)
        case 'alphabetical-desc':
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })

    return result
  }, [allCities, searchQuery, selectedRegion, selectedCountry, sortOption])

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

      {/* Filter bar */}
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
          resultsCount={filteredCities.length}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* City grid */}
      <div className="mx-auto w-full max-w-7xl">
        {filteredCities.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredCities.map((city: CityListItem) => (
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
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingDots />
        <p className="text-muted-foreground">Loading cities...</p>
      </div>
    </main>
  )
}
