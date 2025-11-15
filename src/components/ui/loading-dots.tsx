'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { pulsate } from '~/lib/animations'
import type { LoadingDotsProps } from '~/types/loading'

const variantClasses = {
  pink: 'bg-[rgb(var(--color-kirby-pink))]',
  blue: 'bg-[rgb(var(--color-kirby-blue))]',
  purple: 'bg-[rgb(var(--color-kirby-purple))]',
  peach: 'bg-[rgb(var(--color-kirby-peach))]',
  mint: 'bg-[rgb(var(--color-kirby-mint))]',
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
}

/**
 * Loading indicator component with pulsating dots
 *
 * Features:
 * - Wave animation with staggered delays (0.1s apart)
 * - Respects prefers-reduced-motion
 * - Customizable color variants and sizes
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * <LoadingDots variant="pink" size="md" dotCount={3} />
 * <LoadingDots variant="blue" size="lg" />
 * ```
 */
export function LoadingDots({
  dotCount = 3,
  variant = 'pink',
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Loading',
}: LoadingDotsProps) {
  const shouldReduceMotion = useReducedMotion()

  const dots = Array.from({ length: dotCount }, (_, i) => i)

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {dots.map((i) => {
        if (shouldReduceMotion) {
          // Static dots when reduced motion is preferred
          return (
            <div
              key={i}
              data-testid={`loading-dot-${i}`}
              className={cn(
                'rounded-full',
                variantClasses[variant],
                sizeClasses[size],
              )}
            />
          )
        }

        // Animated dots with staggered delays (0.1s apart)
        const delay = i * 0.1
        const animation = pulsate(delay) as any

        return (
          <motion.div
            key={i}
            data-testid={`loading-dot-${i}`}
            className={cn(
              'rounded-full',
              variantClasses[variant],
              sizeClasses[size],
            )}
            variants={animation}
            initial="initial"
            animate="animate"
          />
        )
      })}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  )
}
