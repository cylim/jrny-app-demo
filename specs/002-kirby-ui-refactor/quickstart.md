# Quickstart Guide: Kirby-Style UI Refactor

**Feature**: 002-kirby-ui-refactor
**Branch**: `002-kirby-ui-refactor`
**Date**: 2025-11-15

## Overview

This guide helps developers get started implementing the Kirby-style UI refactor. It covers setup, key concepts, and step-by-step implementation guidance.

---

## Prerequisites

Before starting, ensure you have:
- ✅ Cloned the repository and switched to `002-kirby-ui-refactor` branch
- ✅ Installed dependencies (`bun install`)
- ✅ Reviewed `spec.md` and `plan.md` in this directory
- ✅ Familiar with TanStack Start, React, Convex, and Tailwind CSS

---

## Quick Setup

### 1. Install New Dependencies

```bash
# Animation library
bun add framer-motion

# Testing framework (if not already installed)
bun add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event
bun add -D playwright @playwright/test
bunx playwright install
```

### 2. Verify Convex Schema

Check that the `by_visit_count` index exists on the `cities` table:

**File**: `convex/schema.ts`
```typescript
cities: defineTable({
  name: v.string(),
  heroImage: v.string(),
  visitCount: v.number(),
  // ... other fields
}).index('by_visit_count', ['visitCount']) // ← Ensure this line exists
```

If the index is missing, add it and run:
```bash
bunx convex dev  # Auto-generates index
```

### 3. Add Fallback City Images

Download and place 5 city images in `public/fallback-cities/`:
```
public/
└── fallback-cities/
    ├── tokyo.jpg
    ├── paris.jpg
    ├── new-york.jpg
    ├── london.jpg
    └── barcelona.jpg
```

**Image Specs**:
- Dimensions: 800x450px (16:9 aspect ratio)
- Format: JPEG or WebP
- Size: <100KB each (optimized)

---

## Implementation Steps

### Phase 1: Foundation (Day 1-2)

#### Step 1.1: Create Type Definitions

**File**: `src/types/city.ts`
```typescript
import { z } from 'zod'

export const FeaturedCitySchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(100),
  heroImage: z.string().url(),
  visitCount: z.number().int().nonnegative(),
})

export type FeaturedCity = z.infer<typeof FeaturedCitySchema>

export const FALLBACK_CITIES: ReadonlyArray<Omit<FeaturedCity, '_id'>> = [
  { name: 'Tokyo', heroImage: '/fallback-cities/tokyo.jpg', visitCount: 150000 },
  { name: 'Paris', heroImage: '/fallback-cities/paris.jpg', visitCount: 120000 },
  { name: 'New York', heroImage: '/fallback-cities/new-york.jpg', visitCount: 110000 },
  { name: 'London', heroImage: '/fallback-cities/london.jpg', visitCount: 100000 },
  { name: 'Barcelona', heroImage: '/fallback-cities/barcelona.jpg', visitCount: 95000 },
] as const
```

**File**: `src/lib/kirby-theme.ts`
```typescript
export const KIRBY_THEME = {
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

export type KirbyTheme = typeof KIRBY_THEME
```

#### Step 1.2: Update Tailwind Theme

**File**: `src/styles/app.css`

Add Kirby color palette and utilities:
```css
@layer base {
  :root {
    --color-kirby-pink: 253 164 175;
    --color-kirby-blue: 147 197 253;
    --color-kirby-purple: 196 181 253;
    --color-kirby-peach: 253 186 140;
    --color-kirby-mint: 167 243 208;
  }

  .dark {
    --color-kirby-pink: 244 114 182;
    --color-kirby-blue: 96 165 250;
    --color-kirby-purple: 167 139 250;
  }
}

@layer components {
  .kirby-rounded {
    border-radius: 1.5rem;
  }

  .kirby-bubble {
    border-radius: 9999px;
    box-shadow: 0 4px 6px -1px rgba(253, 164, 175, 0.3);
  }
}
```

---

### Phase 2: Backend (Day 2-3)

#### Step 2.1: Create Convex City Query

**File**: `convex/cities.ts` (new file)
```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'

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
    const topCities = await ctx.db
      .query('cities')
      .withIndex('by_visit_count')
      .order('desc')
      .take(50)

    // Fisher-Yates shuffle
    const shuffled = [...topCities]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled.slice(0, Math.min(args.count, shuffled.length)).map(city => ({
      _id: city._id,
      name: city.name,
      heroImage: city.heroImage,
      visitCount: city.visitCount,
    }))
  },
})
```

**Test it**:
```bash
bunx convex dev  # Start Convex dev server
# Open Convex dashboard → Functions → cities:getFeaturedCities
# Test with args: { count: 5 }
```

---

### Phase 3: UI Components (Day 3-5)

#### Step 3.1: LoadingDots Component

**File**: `src/components/ui/loading-dots.tsx`
```typescript
import { motion, useReducedMotion } from 'framer-motion'
import { KIRBY_THEME } from '@/lib/kirby-theme'

interface LoadingDotsProps {
  dotCount?: number
  color?: 'pink' | 'blue' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' }
const colorMap = {
  pink: 'bg-[rgb(var(--color-kirby-pink))]',
  blue: 'bg-[rgb(var(--color-kirby-blue))]',
  purple: 'bg-[rgb(var(--color-kirby-purple))]',
}

export function LoadingDots({ dotCount = 4, color = 'pink', size = 'md' }: LoadingDotsProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <div className="flex gap-2" role="status" aria-label="Loading">
        {Array.from({ length: dotCount }).map((_, i) => (
          <div key={i} className={`${sizeMap[size]} ${colorMap[color]} rounded-full opacity-50`} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-2" role="status" aria-label="Loading">
      {Array.from({ length: dotCount }).map((_, i) => (
        <motion.div
          key={i}
          className={`${sizeMap[size]} ${colorMap[color]} rounded-full`}
          animate={{
            y: [-8, 0, -8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  )
}
```

**Test it**:
```typescript
// src/routes/index.tsx (temporarily)
import { LoadingDots } from '@/components/ui/loading-dots'

export default function Home() {
  return <LoadingDots />
}
```

#### Step 3.2: CityCard Component

**File**: `src/components/city-card.tsx`
```typescript
import type { Id } from '../../convex/_generated/dataModel'
import type { FeaturedCity } from '@/types/city'
import { motion } from 'framer-motion'

interface CityCardProps {
  city: FeaturedCity
  onClick?: (cityId: Id<'cities'>) => void
  className?: string
}

export function CityCard({ city, onClick, className = '' }: CityCardProps) {
  const handleClick = () => onClick?.(city._id as Id<'cities'>)

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`kirby-rounded overflow-hidden bg-white dark:bg-gray-800 shadow-lg cursor-pointer ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${city.name} details`}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <img
        src={city.heroImage}
        alt={city.name}
        className="w-full aspect-[16/9] object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {city.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatVisitCount(city.visitCount)} visits
        </p>
      </div>
    </motion.div>
  )
}

function formatVisitCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}
```

#### Step 3.3: CityShowcase Component

**File**: `src/components/city-showcase.tsx`
```typescript
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { CityCard } from './city-card'
import { LoadingDots } from './ui/loading-dots'
import { FALLBACK_CITIES, FeaturedCitySchema } from '@/types/city'
import { useState, useEffect } from 'react'

interface CityShowcaseProps {
  maxCities?: number
  onCityClick?: (cityId: Id<'cities'>) => void
}

export function CityShowcase({ maxCities, onCityClick }: CityShowcaseProps) {
  const [cityCount, setCityCount] = useState(getCityCount(maxCities))

  useEffect(() => {
    const handleResize = () => setCityCount(getCityCount(maxCities))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [maxCities])

  const { data, error } = useSuspenseQuery(
    convexQuery(api.cities.getFeaturedCities, { count: cityCount })
  )

  // Validate and fallback logic
  const cities = error
    ? FALLBACK_CITIES.slice(0, cityCount)
    : data?.map(city => FeaturedCitySchema.parse(city)) ?? []

  return (
    <div className="w-full">
      {error && (
        <p className="text-sm text-gray-500 mb-4">
          Showing popular cities
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cities.map((city, idx) => (
          <CityCard key={city._id ?? idx} city={city} onClick={onCityClick} />
        ))}
      </div>
    </div>
  )
}

function getCityCount(maxCities?: number): number {
  if (maxCities) return maxCities

  // Responsive defaults
  if (typeof window === 'undefined') return 9 // SSR default
  const width = window.innerWidth
  if (width <= 640) return 4 // Mobile
  if (width <= 1024) return 8 // Tablet
  return 12 // Desktop
}
```

---

### Phase 4: Integration (Day 5-6)

#### Step 4.1: Update Landing Page

**File**: `src/routes/index.tsx`
```typescript
import { createFileRoute } from '@tanstack/react-router'
import { CityShowcase } from '@/components/city-showcase'
import { AnimatedBackground } from '@/components/animated-background'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground variant="bubbles" intensity="subtle" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Start Your Journey
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Discover amazing cities and track your adventures
          </p>
          <button className="kirby-rounded px-8 py-4 bg-[rgb(var(--color-kirby-pink))] text-white font-semibold hover:opacity-90 transition-opacity">
            Explore Cities
          </button>
        </div>

        {/* City Showcase */}
        <CityShowcase onCityClick={(cityId) => {
          // Navigate to city detail page
          console.log('Navigate to city:', cityId)
        }} />
      </div>
    </div>
  )
}
```

#### Step 4.2: Refactor Existing UI Components

Update existing shadcn/ui components to use Kirby styling:

**File**: `src/components/ui/button.tsx`
```typescript
// Add kirby variant to button variants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        // ... existing variants
        kirby: 'kirby-rounded bg-[rgb(var(--color-kirby-pink))] text-white hover:opacity-90',
      },
      // ... rest of config
    }
  }
)
```

---

### Phase 5: Testing (Day 7-8)

#### Step 5.1: Setup Test Configuration

**File**: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

**File**: `tests/setup.ts`
```typescript
import '@testing-library/jest-dom'
```

#### Step 5.2: Write Unit Tests

**File**: `tests/unit/loading-dots.test.tsx`
```typescript
import { render, screen } from '@testing-library/react'
import { LoadingDots } from '@/components/ui/loading-dots'
import { describe, it, expect } from 'vitest'

describe('LoadingDots', () => {
  it('renders correct number of dots', () => {
    render(<LoadingDots dotCount={5} />)
    const dots = screen.getAllByRole('status')
    expect(dots).toHaveLength(5)
  })
})
```

Run tests:
```bash
bun run test
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Start Convex dev server (terminal 1)
bunx convex dev

# 2. Start Vite dev server (terminal 2)
bun run dev:web

# 3. Run tests in watch mode (terminal 3)
bun run test

# 4. Open browser to http://localhost:3000
```

### Before Committing

```bash
# 1. Lint and format
bun run lint
bun run format

# 2. Run all tests
bun run test
bun run test:e2e

# 3. Build to verify production bundle
bun run build

# 4. Check bundle size
du -sh .output/client/assets/*.js | grep -v vendor
```

---

## Common Issues & Solutions

### Issue 1: Framer Motion Hydration Mismatch

**Symptom**: Console warning about server/client HTML mismatch

**Solution**: Wrap animated components in `<ClientOnly>`:
```typescript
import { ClientOnly } from '@tanstack/react-start'

<ClientOnly fallback={<StaticVersion />}>
  <AnimatedBackground />
</ClientOnly>
```

### Issue 2: Convex Query Not Updating

**Symptom**: Featured cities don't change on refresh

**Solution**: Ensure TanStack Query cache is configured:
```typescript
queryClient.setQueryDefaults(convexQuery(api.cities.getFeaturedCities, {}), {
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

### Issue 3: Animation Performance Issues

**Symptom**: Janky animations, <60fps

**Solution**:
- Use `transform` and `opacity` only (GPU-accelerated)
- Avoid animating `width`, `height`, `margin`, `padding`
- Use `will-change: transform` sparingly

---

## Performance Checklist

- [ ] Animations run at 60fps (verify in Chrome DevTools Performance tab)
- [ ] Loading dots appear within 200ms (verify with Sentry performance trace)
- [ ] Featured cities load within 2 seconds (verify with Lighthouse)
- [ ] Bundle size increase <50KB gzipped (verify with `bun run build`)
- [ ] `prefers-reduced-motion` respected (test with browser settings)

---

## Next Steps

After completing implementation:
1. Run `/speckit.tasks` to generate actionable task breakdown
2. Submit PR with constitution compliance checklist
3. Request code review from team
4. Deploy to staging for QA testing

---

## Resources

- **Feature Spec**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/convex-api.md](./contracts/convex-api.md)
- **Framer Motion Docs**: https://www.framer.com/motion/
- **TanStack Start Docs**: https://tanstack.com/start/
- **Convex Docs**: https://docs.convex.dev/

---

**Questions?** Check `CLAUDE.md` in repository root for additional project context.
