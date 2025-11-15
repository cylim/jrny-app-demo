import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLoadingState } from '~/hooks/useLoadingState'

describe('Loading State Timing', () => {
  it('should transition to loading state within 200ms', async () => {
    const startTime = performance.now()

    const { result } = renderHook(() => useLoadingState())

    // Start loading
    result.current.startLoading()

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    const endTime = performance.now()
    const elapsed = endTime - startTime

    // Loading indicator should appear within 200ms
    expect(elapsed).toBeLessThan(200)
  })

  it('should show loading indicator immediately for slow operations', async () => {
    const { result } = renderHook(() => useLoadingState())

    // Start loading
    result.current.startLoading()

    // Should be loading after state updates
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })
  })

  it('should transition from loading to success', async () => {
    const { result } = renderHook(() => useLoadingState())

    result.current.startLoading()
    await waitFor(() => {
      expect(result.current.state).toBe('loading')
    })

    result.current.setSuccess()
    await waitFor(() => {
      expect(result.current.state).toBe('success')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should transition from loading to error', async () => {
    const { result } = renderHook(() => useLoadingState())

    result.current.startLoading()
    await waitFor(() => {
      expect(result.current.state).toBe('loading')
    })

    const errorMessage = 'Something went wrong'
    result.current.setError(errorMessage)

    await waitFor(() => {
      expect(result.current.state).toBe('error')
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should reset to idle state', async () => {
    const { result } = renderHook(() => useLoadingState())

    result.current.startLoading()
    result.current.setSuccess()

    result.current.reset()

    expect(result.current.state).toBe('idle')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle multiple loading transitions', async () => {
    const { result } = renderHook(() => useLoadingState())

    // First load
    result.current.startLoading()
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    result.current.setSuccess()
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Second load
    result.current.startLoading()
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    result.current.setError('Error')
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should not exceed 200ms threshold with performance measurement', async () => {
    const measurements: number[] = []

    for (let i = 0; i < 10; i++) {
      const startTime = performance.now()

      const { result } = renderHook(() => useLoadingState())
      result.current.startLoading()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      const elapsed = performance.now() - startTime
      measurements.push(elapsed)
    }

    // Average should be well under 200ms
    const average =
      measurements.reduce((a, b) => a + b, 0) / measurements.length
    expect(average).toBeLessThan(200)

    // Max should not exceed 200ms
    const max = Math.max(...measurements)
    expect(max).toBeLessThan(200)
  })

  it('should provide loading duration in ms', async () => {
    const { result } = renderHook(() => useLoadingState())

    result.current.startLoading()
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100))

    result.current.setSuccess()

    // Duration should be greater than 0
    await waitFor(() => {
      expect(result.current.duration).toBeGreaterThan(0)
    })
  })
})
