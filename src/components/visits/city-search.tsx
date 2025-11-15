'use client'

import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { api } from '~@/convex/_generated/api'
import type { Id } from '~@/convex/_generated/dataModel'

interface CitySearchProps {
  value: Id<'cities'> | null
  onChange: (cityId: Id<'cities'> | null) => void
}

/**
 * Renders a searchable list of cities with a search input and selectable city entries.
 *
 * @param value - The currently selected city's id, or `null` if none is selected.
 * @param onChange - Callback invoked with a city's id when a city is selected, or `null` to clear selection.
 * @returns A React element containing the search input, an optional selected-city banner, and a scrollable list of matching city buttons.
 */
export function CitySearch({ value, onChange }: CitySearchProps) {
  const [search, setSearch] = useState('')
  const { data: allCities } = useSuspenseQuery(
    convexQuery(api.cities.getAllCities as any, {}),
  )

  const filteredCities = useMemo(() => {
    if (!search) return allCities.slice(0, 50) // Show first 50 when no search
    const searchLower = search.toLowerCase()
    return allCities
      .filter(
        (city: any) =>
          city.name.toLowerCase().includes(searchLower) ||
          city.country.toLowerCase().includes(searchLower),
      )
      .slice(0, 20) // Limit to 20 results
  }, [allCities, search])

  const selectedCity = allCities.find((city: any) => city._id === value)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {selectedCity && (
        <div className="p-2 bg-primary/10 rounded-lg text-sm">
          Selected: <strong>{selectedCity.name}</strong>, {selectedCity.country}
        </div>
      )}

      <div className="max-h-64 overflow-y-auto border rounded-lg">
        {filteredCities.map((city: any) => (
          <button
            key={city._id}
            type="button"
            onClick={() => onChange(city._id)}
            className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
              value === city._id ? 'bg-primary/10' : ''
            }`}
          >
            <div className="font-medium">{city.name}</div>
            <div className="text-xs text-muted-foreground">
              {city.country} • {city.region}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
