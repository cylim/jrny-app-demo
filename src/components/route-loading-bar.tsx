import { useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * RouteLoadingBar component shows a fancy full-screen overlay during route transitions.
 * Uses TanStack Router's pending state to automatically show/hide the transition.
 *
 * Features:
 * - Animated gradient background
 * - Floating Kirby-style bubbles
 * - Pulsing loading ring
 * - Progress bar
 * - Smooth animations
 *
 * @returns A fancy full-screen loading overlay that appears during route transitions
 */
export function RouteLoadingBar() {
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })

  // Generate random floating bubbles
  const bubbles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 100 + 50,
    delay: Math.random() * 0.5,
    duration: Math.random() * 3 + 2,
  }))

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <>
          {/* Progress bar at top */}
          <motion.div
            className="fixed left-0 right-0 top-0 z-[62] h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{
              scaleX: [0, 0.3, 0.6, 0.8, 0.9],
              transformOrigin: 'left',
            }}
            exit={{
              scaleX: 1,
              transformOrigin: 'left',
              transition: { duration: 0.15 },
            }}
            transition={{
              duration: 1.5,
              ease: 'easeInOut',
              times: [0, 0.2, 0.5, 0.8, 1],
            }}
          />

          {/* Full-screen overlay with iOS glassmorphism */}
          <motion.div
            className="fixed inset-0 z-[60] overflow-hidden backdrop-blur-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: 'easeInOut',
            }}
          >
            {/* Ultra-transparent animated gradient background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10"
              animate={{
                background: [
                  'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(59, 130, 246, 0.08) 100%)',
                  'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(236, 72, 153, 0.08) 50%, rgba(168, 85, 247, 0.08) 100%)',
                  'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(236, 72, 153, 0.08) 100%)',
                  'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(59, 130, 246, 0.08) 100%)',
                ],
              }}
              transition={{
                duration: 6,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }}
            />

            {/* Glass texture overlay */}
            <div className="absolute inset-0 bg-white/5 dark:bg-black/20" />

            {/* Floating glass bubbles */}
            {bubbles.map((bubble) => (
              <motion.div
                key={bubble.id}
                className="absolute rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/10"
                style={{
                  width: bubble.size,
                  height: bubble.size,
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 20, 0],
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: bubble.duration,
                  delay: bubble.delay,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* Center loading animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative flex flex-col items-center justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                }}
              >
                {/* Glassy card inner glow */}
                {/* <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent" /> */}

                {/* Outer pulsing ring */}
                <motion.div
                  className="absolute -inset-12 rounded-full bg-gradient-to-r from-pink-400/20 to-purple-400/20 blur-3xl"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.15, 0.3, 0.15],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                />

                {/* Spinning rings */}
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <motion.div
                    className="absolute h-full w-full rounded-full border-4 border-pink-400 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    }}
                  />
                  <motion.div
                    className="absolute h-24 w-24 rounded-full border-4 border-purple-400 border-b-transparent"
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    }}
                  />
                  <motion.div
                    className="absolute h-16 w-16 rounded-full border-4 border-blue-400 border-r-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    }}
                  />

                  {/* Center logo/icon */}
                  <motion.div
                    className="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-400 shadow-xl p-2"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  >
                    <img
                      src="/favicon.png"
                      alt="JRNY Logo"
                      className="h-full w-full object-contain"
                    />
                  </motion.div>
                </div>

                {/* Loading text */}
                <motion.div
                  className="mt-8 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.p
                    className="text-lg font-semibold text-gray-800 dark:text-gray-200"
                    animate={{
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  >
                    Loading your journey...
                  </motion.p>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
