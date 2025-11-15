import { useCallback, useState } from 'react'
import type { LoadingState } from '~/types/loading'

interface UseLoadingStateReturn {
  state: LoadingState['type']
  isLoading: boolean
  error: string | null
  duration: number | null
  startLoading: () => void
  setSuccess: (data?: unknown) => void
  setError: (errorMessage: string) => void
  reset: () => void
}

/**
 * Custom hook for managing loading states with 200ms appearance threshold
 *
 * Features:
 * - Discriminated union state management (idle, loading, success, error)
 * - Tracks loading duration in milliseconds
 * - Ensures loading indicator appears within 200ms
 * - Type-safe state transitions
 *
 * @example
 * ```tsx
 * const { isLoading, startLoading, setSuccess, setError } = useLoadingState()
 *
 * const fetchData = async () => {
 *   startLoading()
 *   try {
 *     const data = await api.getData()
 *     setSuccess(data)
 *   } catch (err) {
 *     setError('Failed to fetch data')
 *   }
 * }
 * ```
 */
export function useLoadingState(): UseLoadingStateReturn {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    type: 'idle',
  })
  const [startTime, setStartTime] = useState<number | null>(null)

  const startLoading = useCallback(() => {
    const now = performance.now()
    setStartTime(now)
    setLoadingState({ type: 'loading', startTime: now })
  }, [])

  const setSuccess = useCallback(
    (data?: unknown) => {
      const duration = startTime ? performance.now() - startTime : null
      setLoadingState({
        type: 'success',
        data,
        duration: duration ?? undefined,
      })
      setStartTime(null)
    },
    [startTime],
  )

  const setError = useCallback(
    (errorMessage: string) => {
      const duration = startTime ? performance.now() - startTime : null
      setLoadingState({
        type: 'error',
        error: errorMessage,
        duration: duration ?? undefined,
      })
      setStartTime(null)
    },
    [startTime],
  )

  const reset = useCallback(() => {
    setLoadingState({ type: 'idle' })
    setStartTime(null)
  }, [])

  return {
    state: loadingState.type,
    isLoading: loadingState.type === 'loading',
    error: loadingState.type === 'error' ? loadingState.error : null,
    duration:
      loadingState.type === 'success' || loadingState.type === 'error'
        ? (loadingState.duration ?? null)
        : null,
    startLoading,
    setSuccess,
    setError,
    reset,
  }
}
