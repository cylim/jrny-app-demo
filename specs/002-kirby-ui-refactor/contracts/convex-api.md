# Convex API Contract: Kirby-Style UI Refactor

**Feature**: 002-kirby-ui-refactor
**Date**: 2025-11-15
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the Convex function signatures (queries, mutations, actions) required for the Kirby-style UI refactor feature. All functions follow Convex best practices with explicit `args` and `returns` validators.

---

## Queries

### `api.cities.getFeaturedCities`

**Purpose**: Retrieve N randomly-selected cities from the top 50 most-visited cities in the database.

**File**: `convex/cities.ts`

**Signature**:
```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'

export const getFeaturedCities = query({
  args: {
    count: v.number(), // Number of cities to return (3-12 based on screen size)
  },
  returns: v.array(
    v.object({
      _id: v.id('cities'),
      name: v.string(),
      heroImage: v.string(),
      visitCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Implementation details below
  },
})
```

**Arguments**:
| Name | Type | Validation | Description |
|------|------|------------|-------------|
| `count` | `number` | Required, 1-50 | Number of featured cities to return |

**Returns**:
Array of city objects with fields:
| Field | Type | Description |
|-------|------|-------------|
| `_id` | `Id<'cities'>` | Convex document ID |
| `name` | `string` | City name |
| `heroImage` | `string` | URL to city hero image |
| `visitCount` | `number` | Total visits/check-ins (for debugging/logging) |

**Behavior**:
1. Query `cities` table using `.withIndex('by_visit_count')`
2. Order by `visitCount` descending
3. Take top 50 results
4. Randomly shuffle the 50 cities
5. Return first `count` cities from shuffled array

**Error Handling**:
- If fewer than `count` cities exist, return all available cities
- If database query fails, throw error (frontend will use fallback cities)

**Performance**:
- **Index**: Requires `by_visit_count` index on `cities` table
- **Complexity**: O(log n) for indexed query + O(50 log 50) for shuffle
- **Expected Latency**: <100ms p95

**Example Usage** (Frontend):
```typescript
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

const { data: cities } = useSuspenseQuery(
  convexQuery(api.cities.getFeaturedCities, { count: 8 })
)
```

**Implementation**:
```typescript
export const getFeaturedCities = query({
  args: { count: v.number() },
  returns: v.array(
    v.object({
      _id: v.id('cities'),
      name: v.string(),
      heroImage: v.string(),
      visitCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get top 50 cities by visit count
    const topCities = await ctx.db
      .query('cities')
      .withIndex('by_visit_count')
      .order('desc')
      .take(50)

    // Randomly shuffle using Fisher-Yates algorithm
    const shuffled = [...topCities]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Return requested count (or fewer if not enough cities)
    return shuffled.slice(0, Math.min(args.count, shuffled.length)).map(city => ({
      _id: city._id,
      name: city.name,
      heroImage: city.heroImage,
      visitCount: city.visitCount,
    }))
  },
})
```

---

## Frontend Component API Contracts

While not Convex functions, these are the public APIs for new React components.

### `<CityShowcase />`

**Purpose**: Display grid of featured cities with responsive layout.

**Props**:
```typescript
interface CityShowcaseProps {
  /** Maximum cities to display (auto-responsive if omitted) */
  maxCities?: number
  /** Fallback cities if query fails (default: FALLBACK_CITIES) */
  fallbackCities?: ReadonlyArray<Omit<FeaturedCity, '_id'>>
  /** Callback when city is clicked */
  onCityClick?: (cityId: Id<'cities'>) => void
}
```

**Behavior**:
- Queries `api.cities.getFeaturedCities` with responsive count:
  - Mobile (≤640px): 3-4 cities
  - Tablet (641-1024px): 6-8 cities
  - Desktop (>1024px): 9-12 cities
- Shows `<LoadingDots />` if query takes >200ms
- Falls back to `fallbackCities` if query fails
- Renders grid of `<CityCard />` components

**Error Boundary**:
Wrapped in React Error Boundary to catch render errors and show fallback UI.

---

### `<CityCard />`

**Purpose**: Display individual city information in card format.

**Props**:
```typescript
interface CityCardProps {
  /** City data to display */
  city: FeaturedCity
  /** Click handler (navigates to city detail) */
  onClick?: (cityId: Id<'cities'>) => void
  /** Additional CSS classes */
  className?: string
}
```

**Behavior**:
- Renders Kirby-styled card with:
  - Hero image (full-width, aspect-ratio 16:9)
  - City name (h3 heading)
  - Visit count (formatted number, e.g., "150K visits")
- On click: calls `onClick` handler with city ID
- Applies Kirby theme: 24px border radius, pastel background, subtle shadow

**Accessibility**:
- `role="button"` if `onClick` provided
- `tabIndex={0}` for keyboard navigation
- ARIA label: "View {cityName} details"

---

### `<LoadingDots />`

**Purpose**: Animated loading indicator with pulsating dots and wave effect.

**Props**:
```typescript
interface LoadingDotsProps {
  /** Number of dots (3-5) */
  dotCount?: number // Default: 4
  /** Color variant */
  color?: 'pink' | 'blue' | 'purple' // Default: 'pink'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' // Default: 'md'
}
```

**Behavior**:
- Renders `dotCount` circular dots
- Animates with pulsating y-axis motion (wave effect)
- Each dot has staggered delay (0.1s apart)
- Respects `prefers-reduced-motion` (shows static dots if enabled)
- Uses Framer Motion for animation

**Animation Spec**:
```typescript
const dotAnimation = {
  y: [-8, 0, -8], // Bounce height
  opacity: [0.5, 1, 0.5], // Fade in/out
  transition: {
    duration: 0.6,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}
```

---

### `<AnimatedBackground />`

**Purpose**: Decorative animated background layer.

**Props**:
```typescript
interface AnimatedBackgroundProps {
  /** Animation type */
  variant: 'bubbles' | 'waves' | 'particles'
  /** Animation intensity */
  intensity?: 'subtle' | 'moderate' | 'prominent' // Default: 'subtle'
  /** Respect reduced motion preference */
  respectReducedMotion?: boolean // Default: true
}
```

**Behavior**:
- Renders decorative animated elements behind content
- Uses Framer Motion for smooth 60fps animations
- Automatically disables if `prefers-reduced-motion` detected
- Z-index: -1 (always behind foreground content)
- Pointer events: none (doesn't block clicks)

**Variants**:
- **bubbles**: Floating circular shapes with gentle up/down motion
- **waves**: Flowing gradient waves with horizontal motion
- **particles**: Small dots with random drift motion

---

## Type Definitions Export

**File**: `convex/_generated/api.d.ts` (auto-generated)

Convex automatically generates TypeScript types for all queries/mutations/actions. Frontend can import these types:

```typescript
import { api } from '../../convex/_generated/api'
import type { FunctionReference } from 'convex/server'

// Type-safe reference to query
const featuredCitiesQuery: FunctionReference<
  'query',
  'public',
  { count: number },
  Array<{
    _id: Id<'cities'>
    name: string
    heroImage: string
    visitCount: number
  }>
> = api.cities.getFeaturedCities
```

---

## Contract Testing Strategy

### 1. Query Contract Test

**File**: `tests/contract/featured-cities.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

describe('api.cities.getFeaturedCities', () => {
  it('returns requested number of cities', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      // Seed 100 test cities
      const cityIds = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          ctx.db.insert('cities', {
            name: `City ${i}`,
            heroImage: `https://example.com/city-${i}.jpg`,
            visitCount: Math.floor(Math.random() * 10000),
          })
        )
      )

      // Query for 10 cities
      const result = await ctx.runQuery(api.cities.getFeaturedCities, { count: 10 })

      expect(result).toHaveLength(10)
      result.forEach(city => {
        expect(city).toHaveProperty('_id')
        expect(city).toHaveProperty('name')
        expect(city).toHaveProperty('heroImage')
        expect(city).toHaveProperty('visitCount')
      })
    })
  })

  it('returns cities from top 50 by visit count', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      // Seed cities with known visit counts
      await Promise.all([
        ...Array.from({ length: 60 }, (_, i) =>
          ctx.db.insert('cities', {
            name: `High Visit City ${i}`,
            heroImage: 'https://example.com/high.jpg',
            visitCount: 10000 - i, // Top 60 cities
          })
        ),
        ...Array.from({ length: 40 }, (_, i) =>
          ctx.db.insert('cities', {
            name: `Low Visit City ${i}`,
            heroImage: 'https://example.com/low.jpg',
            visitCount: 100 + i, // Bottom 40 cities
          })
        ),
      ])

      // Query for 20 cities
      const result = await ctx.runQuery(api.cities.getFeaturedCities, { count: 20 })

      // All results should be from top 50 (visit count >= 9950)
      result.forEach(city => {
        expect(city.visitCount).toBeGreaterThanOrEqual(9950)
      })
    })
  })

  it('handles count exceeding available cities', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      // Seed only 5 cities
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          ctx.db.insert('cities', {
            name: `City ${i}`,
            heroImage: 'https://example.com/city.jpg',
            visitCount: 1000 + i,
          })
        )
      )

      // Request 20 cities (more than exist)
      const result = await ctx.runQuery(api.cities.getFeaturedCities, { count: 20 })

      // Should return all 5 available
      expect(result).toHaveLength(5)
    })
  })
})
```

### 2. Component Props Contract Test

**File**: `tests/contract/city-card-props.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CityCard } from '@/components/city-card'
import type { FeaturedCity } from '@/types/city'

describe('CityCard Props Contract', () => {
  const mockCity: FeaturedCity = {
    _id: 'test-id' as any,
    name: 'Tokyo',
    heroImage: 'https://example.com/tokyo.jpg',
    visitCount: 150000,
  }

  it('renders with required city prop', () => {
    render(<CityCard city={mockCity} />)

    expect(screen.getByText('Tokyo')).toBeInTheDocument()
    expect(screen.getByText(/150K/)).toBeInTheDocument()
  })

  it('calls onClick handler with city ID when clicked', async () => {
    const handleClick = vi.fn()
    render(<CityCard city={mockCity} onClick={handleClick} />)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledWith('test-id')
  })
})
```

---

## Summary

| Contract | Type | Location | Test Coverage |
|----------|------|----------|---------------|
| `getFeaturedCities` | Convex Query | `convex/cities.ts` | Contract + Integration tests |
| `CityShowcase` | React Component | `src/components/city-showcase.tsx` | Unit + Integration tests |
| `CityCard` | React Component | `src/components/city-card.tsx` | Unit + Contract tests |
| `LoadingDots` | React Component | `src/components/ui/loading-dots.tsx` | Unit tests |
| `AnimatedBackground` | React Component | `src/components/animated-background.tsx` | Unit tests |

**Next Steps**:
1. Generate `quickstart.md` for developer onboarding
2. Update agent context with new technologies
3. Re-evaluate Constitution Check post-design
