import { motion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * Animated trees component - vertical bars that flow left and right
 * Positioned absolutely at the top border of the footer
 * Sticks to viewport bottom via parent sticky container
 */
export function AnimatedTrees() {
  // Generate tree bars with varying heights and initial rotations
  const trees = useMemo(() => {
    const count = 30 // Number of bars
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: (i / count) * 100, // Evenly distribute across width
      height: Math.random() * 30 + 10, // 10-40px height
      initialRotation: Math.random() * 10 - 5, // -5 to +5 degrees
      animationDelay: Math.random() * 2, // 0-2s delay
      animationDuration: 4 + Math.random() * 2, // 4-6s duration
    }))
  }, [])

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 h-8 -translate-y-full"
      aria-hidden="true"
    >
      {trees.map((tree) => (
        <motion.div
          key={tree.id}
          className="absolute bottom-0 bg-gradient-to-t from-green-700 to-lime-400 dark:bg-gradient-to-t dark:from-emerald-950 dark:to-green-600"
          style={{
            left: `${tree.left}%`,
            height: `${tree.height}px`,
            width: '3px',
            transformOrigin: 'center bottom',
          }}
          initial={{
            rotateZ: tree.initialRotation,
          }}
          animate={{
            rotateZ: [
              tree.initialRotation,
              tree.initialRotation + 5,
              tree.initialRotation - 5,
              tree.initialRotation,
            ],
          }}
          transition={{
            duration: tree.animationDuration,
            delay: tree.animationDelay,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
