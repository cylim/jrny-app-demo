interface ErrorStateProps {
  /**
   * Error title/heading
   * @default "Oops! Something went wrong"
   */
  title?: string

  /**
   * Error message/description
   * @default "We encountered an error. Please try again later."
   */
  message?: string

  /**
   * Custom action button text
   * @default "Reload page"
   */
  actionLabel?: string

  /**
   * Custom action handler
   * @default () => window.location.reload()
   */
  onAction?: () => void

  /**
   * Whether to show the action button
   * @default true
   */
  showAction?: boolean

  /**
   * Additional CSS classes for the container
   */
  className?: string
}

/**
 * Generic error state component
 * Displays a user-friendly error message with optional action button
 *
 * @example
 * ```tsx
 * // Default error state with reload button
 * <ErrorState />
 *
 * // Custom error message
 * <ErrorState
 *   title="Failed to load data"
 *   message="Check your internet connection and try again."
 * />
 *
 * // Custom action
 * <ErrorState
 *   actionLabel="Go back"
 *   onAction={() => router.navigate({ to: '/' })}
 * />
 * ```
 */
export function ErrorState({
  title = 'Oops! Something went wrong',
  message = 'We encountered an error. Please try again later.',
  actionLabel = 'Reload page',
  onAction = () => window.location.reload(),
  showAction = true,
  className = '',
}: ErrorStateProps) {
  return (
    <main
      className={`flex min-h-[60vh] items-center justify-center p-4 ${className}`}
    >
      <div className="kirby-rounded flex max-w-md flex-col items-center gap-4 bg-gradient-to-br from-red-100 to-pink-100 p-8 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-600">{message}</p>
        {showAction && (
          <button
            type="button"
            onClick={onAction}
            className="kirby-rounded bg-gradient-to-r from-pink-400 to-purple-400 px-6 py-2 font-semibold text-white shadow-lg hover:from-pink-500 hover:to-purple-500"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </main>
  )
}
