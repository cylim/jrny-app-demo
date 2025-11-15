# Research: Kirby-Style UI Refactor

**Feature**: 002-kirby-ui-refactor
**Date**: 2025-11-15
**Phase**: 0 (Outline & Research)

## Research Questions

From Technical Context, the following areas require clarification:
1. **Animation Library**: React Spring vs Framer Motion - which fits best?
2. **Testing Framework**: Best practices for TanStack Start + Convex integration testing

## Research Findings

### 1. Animation Library Selection

**Decision**: **Framer Motion**

**Rationale**:
- **Bundle Size**: Framer Motion (~35KB gzipped) fits well within our 50KB budget, while React Spring is similar (~30KB). Both acceptable.
- **React Integration**: Framer Motion is purpose-built for React with first-class hooks API (`useMotion`, `useAnimate`, `useSpring`). React Spring is more universal but requires more boilerplate.
- **Accessibility**: Framer Motion has built-in `prefers-reduced-motion` support via `useReducedMotion()` hook - critical for FR-007 requirement.
- **TypeScript Support**: Excellent TypeScript support with full type inference for animation variants.
- **Learning Curve**: Simpler API for common use cases (bounce animations, transitions, gestures).
- **Performance**: Both libraries use GPU-accelerated transforms. Framer Motion's animation engine is highly optimized for 60fps.
- **Ecosystem**: Framer Motion has larger community, more examples for React apps, better documentation.
- **SSR Compatibility**: Works seamlessly with TanStack Start SSR (no hydration mismatches).

**Alternatives Considered**:
- **React Spring**: Excellent physics-based animations, but more complex API for simple use cases. Better for complex spring animations, overkill for our bounce/pulse needs.
- **CSS Animations**: Lightweight but limited control, harder to coordinate with React state, no programmatic easing control.
- **GSAP**: Powerful but heavier (~45KB), license costs for some features, not React-first.

**Implementation Approach**:
```tsx
// Example: Pulsating Dots Loader
import { motion, useReducedMotion } from 'framer-motion'

export function LoadingDots() {
  const shouldReduceMotion = useReducedMotion()

  const dotVariants = {
    initial: { y: 0, opacity: 0.5 },
    animate: {
      y: [-8, 0, -8],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  if (shouldReduceMotion) {
    return <div className="flex gap-2">{/* Static dots */}</div>
  }

  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          style={{ animationDelay: `${i * 0.1}s` }}
          className="w-3 h-3 rounded-full bg-pink-400"
        />
      ))}
    </div>
  )
}
```

**Installation**:
```bash
bun add framer-motion
```

**Bundle Impact**: +35KB gzipped (well within 50KB budget)

---

### 2. Testing Framework Selection

**Decision**: **Vitest + React Testing Library + Playwright**

**Rationale**:
- **Vitest**: Native Vite integration (project uses Vite), fast, Jest-compatible API, excellent TypeScript support
- **React Testing Library**: Industry standard for React component testing, encourages testing user behavior over implementation details
- **Playwright**: Modern E2E testing, works well with TanStack Start SSR, multi-browser support, built-in retry logic

**Test Strategy**:

**Unit Tests (Vitest + React Testing Library)**:
- Component rendering and props
- Animation state logic (reduced motion, loading states)
- Utility functions (animation helpers, color utilities)
- Location: `tests/unit/`

**Integration Tests (Vitest + Convex Testing)**:
- Featured cities query with top 50 filtering
- Fallback behavior when city query fails
- Loading state transitions (<200ms requirement)
- Location: `tests/integration/`

**E2E Tests (Playwright)**:
- Full user journey: landing page → city showcase → city detail
- Visual regression for Kirby-style components (Playwright visual comparisons)
- Accessibility testing (keyboard navigation, screen readers)
- Performance testing (60fps animation, <200ms loading)
- Location: `tests/e2e/`

**Alternatives Considered**:
- **Jest**: Slower than Vitest, requires Babel transform for TypeScript, not Vite-native
- **Cypress**: Good E2E tool but slower than Playwright, less robust multi-browser support
- **Testing Library alone**: Insufficient for E2E and visual regression needs

**Implementation Approach**:

**Setup Commands**:
```bash
bun add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event
bun add -D playwright @playwright/test
bunx playwright install
```

**Vitest Config** (`vitest.config.ts`):
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/convex/_generated/**']
    }
  }
})
```

**Example Unit Test** (`tests/unit/loading-dots.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react'
import { LoadingDots } from '@/components/ui/loading-dots'
import { describe, it, expect, vi } from 'vitest'

describe('LoadingDots', () => {
  it('renders three dots', () => {
    render(<LoadingDots />)
    const dots = screen.getAllByRole('status')
    expect(dots).toHaveLength(3)
  })

  it('respects reduced motion preference', () => {
    vi.mock('framer-motion', () => ({
      useReducedMotion: () => true
    }))
    render(<LoadingDots />)
    // Assert static dots, no animations
  })
})
```

**Example Integration Test** (`tests/integration/city-showcase.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../convex/_generated/api'

describe('City Showcase', () => {
  it('returns top 50 cities by visit count', async () => {
    const t = convexTest(schema)
    // Seed test data
    await t.run(async (ctx) => {
      const cities = await ctx.db.query('cities')
        .withIndex('by_visit_count')
        .order('desc')
        .take(50)
      expect(cities).toHaveLength(50)
      expect(cities[0].visitCount).toBeGreaterThanOrEqual(cities[49].visitCount)
    })
  })

  it('falls back to hardcoded cities on query failure', async () => {
    // Test fallback logic
  })
})
```

**Example E2E Test** (`tests/e2e/landing-page.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('displays featured cities within 2 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')

    await expect(page.locator('[data-testid="city-showcase"]')).toBeVisible()
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(2000)
  })

  test('loading indicator appears within 200ms', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="trigger-fetch"]')

    const startTime = Date.now()
    await expect(page.locator('[data-testid="loading-dots"]')).toBeVisible()
    const appearTime = Date.now() - startTime
    expect(appearTime).toBeLessThan(200)
  })

  test('animations run at 60fps', async ({ page }) => {
    await page.goto('/')
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0
        const startTime = performance.now()

        function countFrames() {
          frameCount++
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrames)
          } else {
            resolve(frameCount)
          }
        }
        requestAnimationFrame(countFrames)
      })
    })

    expect(fps).toBeGreaterThanOrEqual(55) // Allow 5fps tolerance
  })
})
```

**Package Scripts** (add to `package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Test Directory Structure**:
```
tests/
├── setup.ts                  # Vitest global setup
├── unit/
│   ├── components/
│   │   ├── loading-dots.test.tsx
│   │   ├── city-card.test.tsx
│   │   └── animated-background.test.tsx
│   └── lib/
│       └── animations.test.ts
├── integration/
│   ├── city-showcase.test.ts
│   └── fallback-cities.test.ts
└── e2e/
    ├── landing-page.spec.ts
    ├── animations.spec.ts
    └── accessibility.spec.ts
```

---

### 3. Additional Best Practices Research

#### Tailwind CSS v4 Kirby Theme Implementation

**Custom Color Palette** (add to `src/styles/app.css`):
```css
@layer base {
  :root {
    /* Kirby Pastel Palette */
    --color-kirby-pink: 253 164 175; /* #FDA4AF - soft pink */
    --color-kirby-blue: 147 197 253; /* #93C5FD - soft blue */
    --color-kirby-purple: 196 181 253; /* #C4B5FD - soft purple */
    --color-kirby-peach: 253 186 140; /* #FDBA8C - soft peach */
    --color-kirby-mint: 167 243 208; /* #A7F3D0 - soft mint */

    /* Semantic colors */
    --color-primary: var(--color-kirby-pink);
    --color-secondary: var(--color-kirby-blue);
    --color-accent: var(--color-kirby-purple);
  }

  .dark {
    /* Adjust for dark mode (desaturated) */
    --color-kirby-pink: 244 114 182;
    --color-kirby-blue: 96 165 250;
    --color-kirby-purple: 167 139 250;
  }
}

@layer components {
  .kirby-rounded {
    border-radius: 1.5rem; /* 24px - pronounced rounding */
  }

  .kirby-rounded-sm {
    border-radius: 1rem; /* 16px - subtle rounding */
  }

  .kirby-bubble {
    border-radius: 9999px; /* Fully circular */
    box-shadow: 0 4px 6px -1px rgba(253, 164, 175, 0.3); /* Soft pink shadow */
  }
}

@layer utilities {
  .animate-bounce-gentle {
    animation: bounce-gentle 2s infinite;
  }

  @keyframes bounce-gentle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
}
```

**Tailwind Config Extension** (`tailwind.config.js` if needed):
```javascript
export default {
  theme: {
    extend: {
      borderRadius: {
        'kirby': '1.5rem',
        'kirby-sm': '1rem',
      },
      colors: {
        'kirby-pink': 'rgb(var(--color-kirby-pink))',
        'kirby-blue': 'rgb(var(--color-kirby-blue))',
        'kirby-purple': 'rgb(var(--color-kirby-purple))',
        'kirby-peach': 'rgb(var(--color-kirby-peach))',
        'kirby-mint': 'rgb(var(--color-kirby-mint))',
      }
    }
  }
}
```

#### Performance Monitoring Setup

**Sentry Custom Performance Marks**:
```typescript
// src/lib/performance.ts
import * as Sentry from '@sentry/tanstackstart-react'

export function measureAnimationInit(componentName: string) {
  const transaction = Sentry.startTransaction({
    name: `Animation Init: ${componentName}`,
    op: 'animation'
  })

  return () => transaction.finish()
}

export function measureCityDataFetch() {
  const transaction = Sentry.startTransaction({
    name: 'Featured Cities Fetch',
    op: 'query'
  })

  return {
    finish: () => transaction.finish(),
    setData: (data: { cityCount: number; fetchTime: number }) => {
      transaction.setData('cityCount', data.cityCount)
      transaction.setData('fetchTime', data.fetchTime)
    }
  }
}
```

#### Convex Query Optimization

**Ensure Index Exists** (verify in `convex/schema.ts`):
```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  cities: defineTable({
    name: v.string(),
    heroImage: v.string(),
    visitCount: v.number(),
    // ... other fields
  }).index('by_visit_count', ['visitCount']), // CRITICAL: Index for top 50 query
})
```

**Efficient Query Implementation** (`convex/cities.ts`):
```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'

export const getFeaturedCities = query({
  args: { count: v.number() },
  returns: v.array(v.object({
    _id: v.id('cities'),
    name: v.string(),
    heroImage: v.string(),
    visitCount: v.number()
  })),
  handler: async (ctx, args) => {
    // Get top 50 cities by visit count
    const topCities = await ctx.db
      .query('cities')
      .withIndex('by_visit_count')
      .order('desc')
      .take(50)

    // Randomly select N cities from top 50
    const shuffled = topCities.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, args.count)
  }
})
```

---

## Research Summary

| Question | Decision | Rationale | Bundle Impact |
|----------|----------|-----------|---------------|
| Animation Library | Framer Motion | Better React integration, built-in accessibility, simpler API | +35KB gzipped |
| Testing Framework | Vitest + RTL + Playwright | Vite-native, fast, modern, comprehensive test coverage | Dev dependency only |
| Tailwind Theming | CSS custom properties + utility classes | Type-safe, maintainable, dark mode support | ~0KB (CSS only) |
| Performance Monitoring | Sentry custom spans | Already integrated, no additional cost | 0KB (existing) |

**Total Bundle Increase**: ~35KB gzipped (well within 50KB budget)

**Next Phase**: Proceed to Phase 1 (Design & Contracts) with:
- Framer Motion as animation library
- Vitest + RTL + Playwright as testing stack
- Tailwind custom properties for Kirby theme
- Convex query with `by_visit_count` index
