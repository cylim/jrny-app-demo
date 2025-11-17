import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

type AnimationVariant = 'bubbles' | 'waves' | 'particles'
type IntensityLevel = 'subtle' | 'moderate' | 'prominent'

interface AnimatedBackgroundProps {
  variant?: AnimationVariant
  intensity?: IntensityLevel
  className?: string
}

/**
 * Intensity configuration for animation parameters
 * Controls element count, animation speed, and opacity
 */
const INTENSITY_CONFIG = {
  subtle: {
    elementCount: 4,
    animationDuration: 20, // seconds
    opacity: 0.6,
  },
  moderate: {
    elementCount: 8,
    animationDuration: 15,
    opacity: 0.7,
  },
  prominent: {
    elementCount: 12,
    animationDuration: 10,
    opacity: 0.8,
  },
} as const

/**
 * AnimatedBackground component with Framer Motion
 * Provides dynamic animated backgrounds (bubbles, waves, particles)
 * Respects prefers-reduced-motion, maintains 60fps, and doesn't interfere with content
 *
 * @param variant - Animation style: bubbles, waves, or particles
 * @param intensity - Animation intensity: subtle, moderate, or prominent
 * @param className - Additional CSS classes
 */
export function AnimatedBackground({
  variant = 'bubbles',
  intensity = 'subtle',
  className,
}: AnimatedBackgroundProps) {
  const shouldReduceMotion = useReducedMotion()
  const config = INTENSITY_CONFIG[intensity]

  // Generate elements based on intensity
  const elements = useMemo(() => {
    return Array.from({ length: config.elementCount }, (_, i) => ({
      id: i,
      // Randomize initial position
      x: Math.random() * 100,
      y: Math.random() * 100,
      // Randomize size
      size: Math.random() * 100 + 50,
      // Randomize animation delay
      delay: Math.random() * 2,
      // Random movement offsets for more organic motion
      offsetX: Math.random() * 60 - 30, // -30 to +30
      offsetY: Math.random() * 60 - 30, // -30 to +30
    }))
  }, [config.elementCount])

  // Render variant-specific elements
  const renderElements = () => {
    if (shouldReduceMotion) {
      // Static elements when reduced motion is preferred
      return elements.map((el) => (
        <div
          key={el.id}
          data-testid={`${variant}-${el.id}`}
          className={cn(
            'absolute rounded-full',
            variant === 'bubbles' && 'bg-pink-300',
            variant === 'waves' && 'bg-blue-300',
            variant === 'particles' && 'bg-purple-300',
          )}
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.size}px`,
            height: `${el.size}px`,
            opacity: config.opacity,
          }}
        />
      ))
    }

    // Animated elements
    switch (variant) {
      case 'bubbles':
        return elements.map((el) => (
          <motion.div
            key={el.id}
            data-testid={`bubble-${el.id}`}
            className="absolute rounded-full bg-gradient-to-br from-pink-400 dark:from-pink-400 to-purple-300 dark:to-indigo-800 blur-lg"
            initial={{
              x: `${el.x}vw`,
              y: `${el.y}vh`,
              scale: 0.8,
            }}
            animate={{
              x: [`${el.x}vw`, `${(el.x + el.offsetX) % 100}vw`, `${el.x}vw`],
              y: [`${el.y}vh`, `${(el.y + el.offsetY) % 100}vh`, `${el.y}vh`],
              scale: [0.8, 1.1, 0.9, 0.8],
              rotate: [0, 90, 180, 270, 360],
            }}
            transition={{
              duration: config.animationDuration + el.delay * 2,
              delay: el.delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
            style={{
              width: `${el.size}px`,
              height: `${el.size}px`,
              opacity: config.opacity,
            }}
          />
        ))

      case 'waves':
        return elements.map((el) => (
          <motion.div
            key={el.id}
            data-testid={`wave-${el.id}`}
            className="absolute h-32 w-full bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 blur-2xl"
            initial={{
              x: '0%',
              y: `${el.y}vh`,
              scaleX: 1,
            }}
            animate={{
              x: ['-100%', '100%'],
              scaleX: [1, 1.5, 1],
            }}
            transition={{
              duration: config.animationDuration,
              delay: el.delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
            style={{
              opacity: config.opacity,
            }}
          />
        ))

      case 'particles':
        return elements.map((el) => (
          <motion.div
            key={el.id}
            data-testid={`particle-${el.id}`}
            className="absolute rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 blur-md"
            initial={{
              x: `${el.x}vw`,
              y: `${el.y}vh`,
              scale: 0.5,
            }}
            animate={{
              x: [
                `${el.x}vw`,
                `${(el.x + el.offsetX * 1.5) % 100}vw`,
                `${(el.x - el.offsetX) % 100}vw`,
                `${el.x}vw`,
              ],
              y: [
                `${el.y}vh`,
                `${(el.y + el.offsetY * 1.5) % 100}vh`,
                `${(el.y - el.offsetY) % 100}vh`,
                `${el.y}vh`,
              ],
              scale: [0.5, 1, 0.7, 0.5],
            }}
            transition={{
              duration: config.animationDuration - el.delay,
              delay: el.delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
            style={{
              width: `${el.size / 3}px`,
              height: `${el.size / 3}px`,
              opacity: config.opacity,
            }}
          />
        ))

      default:
        return null
    }
  }

  return (
    <div
      data-testid="animated-background"
      className={cn(
        'pointer-events-none fixed inset-0 overflow-hidden',
        'z-0', // Stay behind content but above body background
        className,
      )}
      aria-hidden="true" // Hide from screen readers
    >
      {renderElements()}
    </div>
  )
}
