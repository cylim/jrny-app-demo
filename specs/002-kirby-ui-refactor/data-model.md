# Data Model: Kirby-Style UI Refactor

**Feature**: 002-kirby-ui-refactor
**Date**: 2025-11-15
**Phase**: 1 (Design & Contracts)

## Overview

This feature primarily involves UI/UX changes with minimal data model impact. The main data interaction is querying existing city data with new query patterns (top 50 by visit count, random selection). No new database tables are required, but we define TypeScript types for new frontend entities and validate existing Convex schema.

---

## Entities

### 1. Featured City (Frontend Type)

**Description**: A city displayed on the landing page showcase, selected from the top 50 most-visited cities in the database.

**Type Definition** (`src/types/city.ts`):
```typescript
import { z } from 'zod'
import type { Id } from '../../convex/_generated/dataModel'

// Zod schema for runtime validation
export const FeaturedCitySchema = z.object({
  _id: z.string(), // Convex ID type
  name: z.string().min(1).max(100),
  heroImage: z.string().url(),
  visitCount: z.number().int().nonnegative(),
})

export type FeaturedCity = z.infer<typeof FeaturedCitySchema>

// Fallback city constant (used when query fails)
export const FALLBACK_CITIES: ReadonlyArray<Omit<FeaturedCity, '_id'>> = [
  {
    name: 'Tokyo',
    heroImage: '/fallback-cities/tokyo.jpg',
    visitCount: 150000,
  },
  {
    name: 'Paris',
    heroImage: '/fallback-cities/paris.jpg',
    visitCount: 120000,
  },
  {
    name: 'New York',
    heroImage: '/fallback-cities/new-york.jpg',
    visitCount: 110000,
  },
  {
    name: 'London',
    heroImage: '/fallback-cities/london.jpg',
    visitCount: 100000,
  },
  {
    name: 'Barcelona',
    heroImage: '/fallback-cities/barcelona.jpg',
    visitCount: 95000,
  },
] as const
```

**Attributes**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | `Id<'cities'>` | Required, unique | Convex document ID |
| `name` | `string` | 1-100 chars, required | City name (e.g., "Tokyo") |
| `heroImage` | `string` | Valid URL, required | URL to representative city image |
| `visitCount` | `number` | Non-negative integer, required | Total visits/check-ins for sorting |

**Relationships**:
- **Source**: Queried from existing `cities` table in Convex
- **Used By**: `CityShowcase` and `CityCard` React components

**Validation Rules**:
- `name`: Non-empty, max 100 characters (prevent UI overflow)
- `heroImage`: Must be valid URL format (http/https)
- `visitCount`: Non-negative integer (used for sorting, can be 0 for new cities)

**Lifecycle**:
1. **Query**: Fetched from Convex via `getFeaturedCities` query
2. **Transform**: Convex returns raw city docs, frontend validates with `FeaturedCitySchema`
3. **Display**: Rendered in `CityCard` components on landing page
4. **Fallback**: On query error, use `FALLBACK_CITIES` constant array

---

### 2. Kirby Theme (Frontend Config Type)

**Description**: Configuration object defining the Kirby-style design system (colors, border radii, animation settings).

**Type Definition** (`src/lib/kirby-theme.ts`):
```typescript
import { z } from 'zod'

export const KirbyThemeSchema = z.object({
  colors: z.object({
    pink: z.string().regex(/^#[0-9A-F]{6}$/i),
    blue: z.string().regex(/^#[0-9A-F]{6}$/i),
    purple: z.string().regex(/^#[0-9A-F]{6}$/i),
    peach: z.string().regex(/^#[0-9A-F]{6}$/i),
    mint: z.string().regex(/^#[0-9A-F]{6}$/i),
  }),
  borderRadius: z.object({
    sm: z.string().regex(/^\d+(\.\d+)?(px|rem)$/), // e.g., "16px"
    default: z.string().regex(/^\d+(\.\d+)?(px|rem)$/), // e.g., "24px"
    full: z.literal('9999px'),
  }),
  animations: z.object({
    durationFast: z.number().positive(), // milliseconds
    durationNormal: z.number().positive(),
    durationSlow: z.number().positive(),
    easingBounce: z.string(), // e.g., "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
  }),
})

export type KirbyTheme = z.infer<typeof KirbyThemeSchema>

export const KIRBY_THEME: KirbyTheme = {
  colors: {
    pink: '#FDA4AF',
    blue: '#93C5FD',
    purple: '#C4B5FD',
    peach: '#FDBA8C',
    mint: '#A7F3D0',
  },
  borderRadius: {
    sm: '16px',
    default: '24px',
    full: '9999px',
  },
  animations: {
    durationFast: 200,
    durationNormal: 400,
    durationSlow: 600,
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const
```

**Attributes**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `colors` | `object` | 5 hex colors, required | Pastel color palette |
| `borderRadius` | `object` | 3 size variants, required | Rounded corner values (16px, 24px, full) |
| `animations` | `object` | Duration + easing, required | Animation timing configuration |

**Usage**:
- Referenced by Tailwind CSS custom properties
- Used by Framer Motion animation variants
- Type-safe access to design tokens throughout app

---

### 3. Loading State (Frontend State Type)

**Description**: Transient state representing async operations (data fetches, page navigation).

**Type Definition** (`src/types/loading.ts`):
```typescript
import { z } from 'zod'

export const LoadingStateSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('idle'),
  }),
  z.object({
    status: z.literal('loading'),
    startTime: z.number(), // timestamp when loading started
  }),
  z.object({
    status: z.literal('success'),
  }),
  z.object({
    status: z.literal('error'),
    error: z.string(),
  }),
])

export type LoadingState = z.infer<typeof LoadingStateSchema>

// Helper to check if should show loading indicator (>200ms threshold)
export function shouldShowLoadingIndicator(state: LoadingState): boolean {
  if (state.status !== 'loading') return false
  const elapsed = Date.now() - state.startTime
  return elapsed >= 200 // FR-004: Must appear within 200ms
}
```

**State Transitions**:
```
idle → loading (user triggers fetch/navigation)
loading → success (data loaded successfully)
loading → error (fetch failed, show fallback)
success/error → idle (reset for next operation)
```

**Attributes**:
| State | Fields | Description |
|-------|--------|-------------|
| `idle` | status only | No operation in progress |
| `loading` | status, startTime | Async operation in progress, track duration |
| `success` | status only | Operation completed successfully |
| `error` | status, error message | Operation failed, show error/fallback |

**Validation Rules**:
- `startTime`: Must be valid timestamp (milliseconds since epoch)
- `error`: Non-empty string describing what went wrong
- State transitions are one-way (no going back from success/error to loading)

---

## Convex Schema Validation

**File**: `convex/schema.ts`

**Required Index** (verify exists):
```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  cities: defineTable({
    name: v.string(),
    heroImage: v.string(),
    visitCount: v.number(), // Must be indexed for top 50 query
    // ... other existing fields
  })
    .index('by_visit_count', ['visitCount']) // CRITICAL: Required for efficient query
    .index('by_name', ['name']), // Existing index (if present)
})
```

**Schema Requirements**:
- `visitCount` field MUST exist as `number` type
- `by_visit_count` index MUST exist for efficient top 50 query
- `heroImage` field MUST store valid URL string

**Migration Check**:
If `by_visit_count` index does not exist, Convex will auto-generate it when schema is updated. No data migration needed (existing data preserved).

---

## Component Props Types

### CityShowcase Component Props
```typescript
export interface CityShowcaseProps {
  maxCities?: number // Default: responsive (3-4 mobile, 6-8 tablet, 9-12 desktop)
  fallbackCities?: ReadonlyArray<Omit<FeaturedCity, '_id'>> // Default: FALLBACK_CITIES
}
```

### CityCard Component Props
```typescript
export interface CityCardProps {
  city: FeaturedCity
  onClick?: (cityId: Id<'cities'>) => void
  className?: string
}
```

### LoadingDots Component Props
```typescript
export interface LoadingDotsProps {
  dotCount?: number // Default: 4 dots (3-5 per spec)
  color?: 'pink' | 'blue' | 'purple' // Default: 'pink'
  size?: 'sm' | 'md' | 'lg' // Default: 'md'
}
```

### AnimatedBackground Component Props
```typescript
export interface AnimatedBackgroundProps {
  variant: 'bubbles' | 'waves' | 'particles' // Default: 'bubbles'
  intensity?: 'subtle' | 'moderate' | 'prominent' // Default: 'subtle'
  respectReducedMotion?: boolean // Default: true (required by FR-007)
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Landing Page Load                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  CityShowcase Component                                     │
│  - Sets LoadingState to 'loading' (startTime = Date.now()) │
│  - Renders <LoadingDots /> (if >200ms elapsed)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Convex Query: api.cities.getFeaturedCities                 │
│  - Query 'cities' table with .withIndex('by_visit_count')  │
│  - Order desc, take top 50                                  │
│  - Randomly shuffle, return N cities                        │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
            SUCCESS                      ERROR
                 │                         │
                 ▼                         ▼
┌──────────────────────────┐  ┌─────────────────────────┐
│ Validate with            │  │ Use FALLBACK_CITIES     │
│ FeaturedCitySchema       │  │ constant array          │
│ → LoadingState: success  │  │ → LoadingState: error   │
└──────────────────────────┘  └─────────────────────────┘
                 │                         │
                 └────────────┬────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Render Grid of CityCard Components                         │
│  - Each CityCard receives FeaturedCity props                │
│  - Responsive grid (3-4 mobile, 6-8 tablet, 9-12 desktop)   │
│  - Click handler navigates to city detail page              │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Strategy

### Runtime Validation Points

1. **Convex Query Response** (`src/hooks/useFeaturedCities.ts`):
```typescript
const { data, error } = useSuspenseQuery(
  convexQuery(api.cities.getFeaturedCities, { count: cityCount })
)

// Validate response with Zod
const validatedCities = data?.map(city =>
  FeaturedCitySchema.parse(city)
) ?? []
```

2. **Fallback Cities** (compile-time + runtime):
```typescript
// Type-safe constant with readonly array
const FALLBACK_CITIES: ReadonlyArray<Omit<FeaturedCity, '_id'>> = [...]

// Runtime validation on app load (development only)
if (import.meta.env.DEV) {
  FALLBACK_CITIES.forEach(city => {
    FeaturedCitySchema.omit({ _id: true }).parse(city)
  })
}
```

3. **Component Props** (TypeScript compile-time):
```typescript
function CityCard(props: CityCardProps) {
  // TypeScript ensures props.city matches FeaturedCity shape
}
```

### Error Handling

**Query Failure**:
- Catch Convex query errors in React Error Boundary
- Log error to Sentry with context (query params, user session)
- Render fallback cities immediately (no retry logic)
- Show subtle error indicator (e.g., "Showing popular cities")

**Validation Failure**:
- Skip invalid city entries (filter out, don't crash)
- Log validation errors to Sentry
- If <3 valid cities remain, use fallback cities

---

## Performance Considerations

### Query Optimization
- **Index Usage**: `by_visit_count` index enables O(log n) query instead of O(n) table scan
- **Limit Results**: `.take(50)` prevents over-fetching (only need top 50 for random selection)
- **Caching**: TanStack Query caches results (5-minute stale time recommended)

### Fallback Data Size
- 5 cities × ~200 bytes each = ~1KB total
- Negligible bundle size impact
- Images served from CDN (not bundled)

### Type Safety Cost
- Zod validation: ~10KB gzipped (already in project dependencies)
- Runtime validation only in development (tree-shaken in production)

---

## Summary

| Entity | Storage | Validation | Used By |
|--------|---------|------------|---------|
| Featured City | Convex query result | Zod schema | CityShowcase, CityCard |
| Kirby Theme | TypeScript constant | Zod schema | All styled components |
| Loading State | React state | Discriminated union | LoadingDots, async wrappers |

**No Database Migrations Required**: Existing `cities` table sufficient, only need to verify `by_visit_count` index exists.

**Next Phase**: Generate API contracts (Convex function signatures)
