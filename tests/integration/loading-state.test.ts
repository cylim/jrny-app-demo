import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useLoadingState } from '~/hooks/useLoadingState'

describe('Loading State Timing', () => {
  afterEach(() => {
    cleanup()
  })

  it('should transition to loading state within 200ms', async () => {
    const startTime = performance.now()

    const { result } = renderHook(() => useLoadingState())

    // Start loading
    act(() => {
      result.current.startLoading()
    })

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
    act(() => {
      result.current.startLoading()
    })

    // Should be loading after state updates
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })
  })

  it('should transition from loading to success', async () => {
    const { result } = renderHook(() => useLoadingState())

    act(() => {
      result.current.startLoading()
    })
    await waitFor(() => {
      expect(result.current.state).toBe('loading')
    })

    act(() => {
      result.current.setSuccess()
    })
    await waitFor(() => {
      expect(result.current.state).toBe('success')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should transition from loading to error', async () => {
    const { result } = renderHook(() => useLoadingState())

    act(() => {
      result.current.startLoading()
    })
    await waitFor(() => {
      expect(result.current.state).toBe('loading')
    })

    const errorMessage = 'Something went wrong'
    act(() => {
      result.current.setError(errorMessage)
    })

    await waitFor(() => {
      expect(result.current.state).toBe('error')
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should reset to idle state', async () => {
    const { result } = renderHook(() => useLoadingState())

    act(() => {
      result.current.startLoading()
    })
    act(() => {
      result.current.setSuccess()
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle multiple loading transitions', async () => {
    const { result } = renderHook(() => useLoadingState())

    // First load
    act(() => {
      result.current.startLoading()
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.setSuccess()
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Second load
    act(() => {
      result.current.startLoading()
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.setError('Error')
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should transition state synchronously without delays', () => {
    const { result } = renderHook(() => useLoadingState())
    const measurements: number[] = []

    // Test multiple state transitions with a single hook instance
    for (let i = 0; i < 3; i++) {
      // Measure only the state transition logic, not React rendering
      const startTime = performance.now()

      act(() => {
        result.current.startLoading()
      })

      const elapsed = performance.now() - startTime
      measurements.push(elapsed)

      // Verify state changed synchronously
      expect(result.current.isLoading).toBe(true)
      expect(result.current.state).toBe('loading')

      // Reset for next iteration
      act(() => {
        result.current.reset()
      })
    }

    // State transitions should be nearly instantaneous (< 10ms each)
    const average =
      measurements.reduce((a, b) => a + b, 0) / measurements.length
    expect(average).toBeLessThan(10)

    const max = Math.max(...measurements)
    expect(max).toBeLessThan(10)
  })

  it('should provide loading duration in ms', async () => {
    const { result } = renderHook(() => useLoadingState())

    act(() => {
      result.current.startLoading()
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100))

    act(() => {
      result.current.setSuccess()
    })

    // Duration should be greater than 0
    await waitFor(() => {
      expect(result.current.duration).toBeGreaterThan(0)
    })
  })
})
