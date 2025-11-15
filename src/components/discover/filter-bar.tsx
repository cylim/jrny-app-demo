import { Search, X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

export type SortOption =
  | 'most-visited'
  | 'alphabetical-asc'
  | 'alphabetical-desc'
  | 'least-visited'

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedRegion: string
  onRegionChange: (value: string) => void
  selectedCountry: string
  onCountryChange: (value: string) => void
  sortOption: SortOption
  onSortChange: (value: SortOption) => void
  regions: string[]
  countries: string[]
  resultsCount: number
  onClearFilters: () => void
}

/**
 * FilterBar component for the discover page
 * Provides search, region, country, and sort filters in a horizontal layout
 * Shows active filter count and clear all button
 *
 * @param searchQuery - Current search text
 * @param onSearchChange - Handler for search input changes
 * @param selectedRegion - Currently selected region (or 'all')
 * @param onRegionChange - Handler for region selection changes
 * @param selectedCountry - Currently selected country (or 'all')
 * @param onCountryChange - Handler for country selection changes
 * @param sortOption - Current sort option
 * @param onSortChange - Handler for sort option changes
 * @param regions - Array of available regions
 * @param countries - Array of available countries (filtered by region)
 * @param resultsCount - Number of cities matching current filters
 * @param onClearFilters - Handler to reset all filters
 */
export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedRegion,
  onRegionChange,
  selectedCountry,
  onCountryChange,
  sortOption,
  onSortChange,
  regions,
  countries,
  resultsCount,
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters =
    searchQuery !== '' || selectedRegion !== 'all' || selectedCountry !== 'all'

  const activeFilterCount =
    (searchQuery !== '' ? 1 : 0) +
    (selectedRegion !== 'all' ? 1 : 0) +
    (selectedCountry !== 'all' ? 1 : 0)

  return (
    <div className="kirby-rounded bg-white p-4 shadow-lg dark:bg-neutral-800">
      <div className="flex flex-col gap-4">
        {/* Main filter row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search input */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="kirby-rounded pl-10"
              aria-label="Search cities"
            />
          </div>

          {/* Region filter */}
          <Select value={selectedRegion} onValueChange={onRegionChange}>
            <SelectTrigger className="kirby-rounded w-full md:w-[180px]">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Country filter */}
          <Select
            value={selectedCountry}
            onValueChange={onCountryChange}
            disabled={countries.length === 0}
          >
            <SelectTrigger className="kirby-rounded w-full md:w-[180px]">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort filter */}
          <Select
            value={sortOption}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger className="kirby-rounded w-full md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most-visited">Most Visited</SelectItem>
              <SelectItem value="alphabetical-asc">A to Z</SelectItem>
              <SelectItem value="alphabetical-desc">Z to A</SelectItem>
              <SelectItem value="least-visited">Least Visited</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="kirby-rounded w-full md:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Results count and active filters */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing <strong>{resultsCount.toLocaleString()}</strong>{' '}
            {resultsCount === 1 ? 'city' : 'cities'}
          </span>
          {activeFilterCount > 0 && (
            <>
              <span>·</span>
              <Badge variant="secondary" className="kirby-rounded">
                {activeFilterCount}{' '}
                {activeFilterCount === 1 ? 'filter' : 'filters'} active
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
