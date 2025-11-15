import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  routeKey: string
}

/**
 * PageTransition component wraps page content with smooth crossfade animations
 * Uses AnimatePresence with sync mode for seamless transitions without flicker
 *
 * @param children - Page content to animate
 * @param routeKey - Unique key for the current route (triggers animation on change)
 */
export function PageTransition({ children, routeKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.2,
          ease: 'easeInOut',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
