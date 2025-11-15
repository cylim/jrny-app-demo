import { LoadingDots } from './loading-dots'

interface LoadingStateProps {
  /**
   * Loading message to display below the spinner
   * @default "Loading..."
   */
  message?: string

  /**
   * LoadingDots variant (color)
   * @default "pink"
   */
  variant?: 'pink' | 'blue' | 'purple' | 'peach' | 'mint'

  /**
   * LoadingDots size
   * @default "lg"
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Additional CSS classes for the container
   */
  className?: string

  /**
   * Minimum height for the container
   * @default "60vh"
   */
  minHeight?: string
}

/**
 * Generic loading state component
 * Displays a centered loading spinner with optional message
 *
 * @example
 * ```tsx
 * // Default loading state
 * <LoadingState />
 *
 * // Custom message
 * <LoadingState message="Loading cities..." />
 *
 * // Different variant and size
 * <LoadingState
 *   variant="purple"
 *   size="md"
 *   message="Fetching data..."
 * />
 * ```
 */
export function LoadingState({
  message = 'Loading...',
  variant = 'pink',
  size = 'lg',
  className = '',
  minHeight = '60vh',
}: LoadingStateProps) {
  return (
    <main
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight }}
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingDots variant={variant} size={size} />
        <p className="text-lg text-muted-foreground">{message}</p>
      </div>
    </main>
  )
}
