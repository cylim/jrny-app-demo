import type { Transition } from 'framer-motion'
import { KIRBY_THEME } from './kirby-theme'

/**
 * Bouncy easing function for Kirby-style animations
 */
export const bounceEasing = KIRBY_THEME.animations.easingBounce

/**
 * Animation duration presets
 */
export const durations = {
  fast: KIRBY_THEME.animations.durationFast / 1000, // Convert to seconds for Framer Motion
  normal: KIRBY_THEME.animations.durationNormal / 1000,
  slow: KIRBY_THEME.animations.durationSlow / 1000,
}

/**
 * Bouncy spring configuration for Framer Motion
 */
export const bounceSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
}

/**
 * Gentle bounce animation variants
 */
export const gentleBounce = {
  initial: { y: 0 },
  animate: {
    y: [-10, 0, -10],
    transition: {
      duration: durations.slow * 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * Fade in animation variants
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

/**
 * Scale bounce animation variants (for buttons, cards)
 */
export const scaleBounce = {
  initial: { scale: 1 },
  hover: { scale: 1.05, transition: bounceSpring },
  tap: { scale: 0.95, transition: bounceSpring },
}

/**
 * Pulsating animation for loading indicators
 */
export const pulsate = (delay = 0) => ({
  initial: { opacity: 0.5, y: 0 },
  animate: {
    opacity: [0.5, 1, 0.5],
    y: [-8, 0, -8],
    transition: {
      duration: durations.normal * 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
      delay,
    },
  },
})

/**
 * Floating animation for background elements
 */
export const float = (delay = 0) => ({
  animate: {
    y: [-20, 20, -20],
    x: [-10, 10, -10],
    transition: {
      duration: durations.slow * 5,
      repeat: Infinity,
      ease: 'easeInOut',
      delay,
    },
  },
})

/**
 * Slide in from direction
 */
export const slideIn = (
  direction: 'left' | 'right' | 'top' | 'bottom' = 'bottom',
) => {
  const directions = {
    left: { x: -100 },
    right: { x: 100 },
    top: { y: -100 },
    bottom: { y: 100 },
  }

  return {
    initial: { ...directions[direction], opacity: 0 },
    animate: { x: 0, y: 0, opacity: 1, transition: bounceSpring },
    exit: { ...directions[direction], opacity: 0 },
  }
}

/**
 * Staggered children animation container
 */
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

/**
 * Staggered child item
 */
export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: bounceSpring },
}

/**
 * Slide up animation variant
 */
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: bounceSpring },
  exit: { opacity: 0, y: 20 },
}
