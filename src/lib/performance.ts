import * as Sentry from '@sentry/tanstackstart-react'

/**
 * Performance tracking utilities for loading indicators and UI transitions
 *
 * Tracks:
 * - Loading indicator display latency (target: <200ms)
 * - Animation performance (target: ≥55fps)
 * - Data fetch durations
 */

interface LoadingMetrics {
  startTime: number
  endTime?: number
  duration?: number
  displayLatency?: number
}

const loadingMetrics = new Map<string, LoadingMetrics>()

/**
 * Mark the start of a loading operation
 *
 * @param operationId - Unique identifier for the loading operation
 */
export function markLoadingStart(operationId: string): void {
  // Guard against SSR - performance API not available on server
  if (typeof performance === 'undefined') return

  const startTime = performance.now()

  // Create performance mark
  performance.mark(`loading-start-${operationId}`)

  // Store metrics
  loadingMetrics.set(operationId, { startTime })

  // Send to Sentry
  Sentry.addBreadcrumb({
    category: 'loading',
    message: `Loading started: ${operationId}`,
    level: 'info',
    data: {
      operationId,
      startTime,
    },
  })
}

/**
 * Mark the end of a loading operation and track display latency
 *
 * @param operationId - Unique identifier for the loading operation
 * @param displayedAt - Timestamp when loading indicator was displayed (optional)
 */
export function markLoadingEnd(
  operationId: string,
  displayedAt?: number,
): void {
  // Guard against SSR - performance API not available on server
  if (typeof performance === 'undefined') return

  const endTime = performance.now()
  const metrics = loadingMetrics.get(operationId)

  if (!metrics) {
    console.warn(`No loading metrics found for operation: ${operationId}`)
    return
  }

  // Create performance mark
  performance.mark(`loading-end-${operationId}`)

  // Calculate duration
  const duration = endTime - metrics.startTime

  // Calculate display latency (time from start to indicator displayed)
  const displayLatency = displayedAt
    ? displayedAt - metrics.startTime
    : undefined

  // Update metrics
  loadingMetrics.set(operationId, {
    ...metrics,
    endTime,
    duration,
    displayLatency,
  })

  // Create performance measure
  try {
    performance.measure(
      `loading-${operationId}`,
      `loading-start-${operationId}`,
      `loading-end-${operationId}`,
    )
  } catch (_error) {
    // Ignore if marks don't exist
  }

  // Track in Sentry
  Sentry.addBreadcrumb({
    category: 'loading',
    message: `Loading completed: ${operationId}`,
    level: 'info',
    data: {
      operationId,
      duration,
      displayLatency,
      targetMet: displayLatency ? displayLatency < 200 : undefined,
    },
  })

  // If display latency exceeds threshold, capture as metric
  if (displayLatency && displayLatency >= 200) {
    Sentry.captureMessage(
      `Loading indicator exceeded 200ms threshold: ${operationId}`,
      {
        level: 'warning',
        tags: {
          operation: operationId,
          performance: 'slow-loading',
        },
        extra: {
          duration,
          displayLatency,
          threshold: 200,
        },
      },
    )
  }

  // Send custom metric to Sentry
  if (displayLatency) {
    Sentry.metrics.distribution('loading.display_latency', displayLatency, {
      unit: 'millisecond',
    })
  }

  Sentry.metrics.distribution('loading.duration', duration, {
    unit: 'millisecond',
  })
}

/**
 * Track animation frame rate for loading indicators
 *
 * @param operationId - Unique identifier for the loading operation
 * @param fps - Measured frames per second
 */
export function trackLoadingFPS(operationId: string, fps: number): void {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `Loading animation FPS: ${fps.toFixed(2)}`,
    level: fps >= 55 ? 'info' : 'warning',
    data: {
      operationId,
      fps,
      targetMet: fps >= 55,
    },
  })

  // If FPS is below threshold, capture as metric
  if (fps < 55) {
    Sentry.captureMessage(`Loading animation below 55fps: ${operationId}`, {
      level: 'warning',
      tags: {
        operation: operationId,
        performance: 'low-fps',
      },
      extra: {
        fps,
        threshold: 55,
      },
    })
  }

  // Send custom metric to Sentry
  Sentry.metrics.gauge('loading.animation_fps', fps, {
    unit: 'none',
  })
}

/**
 * Get loading metrics for a specific operation
 *
 * @param operationId - Unique identifier for the loading operation
 */
export function getLoadingMetrics(
  operationId: string,
): LoadingMetrics | undefined {
  return loadingMetrics.get(operationId)
}

/**
 * Clear loading metrics for a specific operation
 *
 * @param operationId - Unique identifier for the loading operation
 */
export function clearLoadingMetrics(operationId: string): void {
  loadingMetrics.delete(operationId)

  // Guard against SSR - performance API not available on server
  if (typeof performance === 'undefined') return

  // Clean up performance marks
  try {
    performance.clearMarks(`loading-start-${operationId}`)
    performance.clearMarks(`loading-end-${operationId}`)
    performance.clearMeasures(`loading-${operationId}`)
  } catch (_error) {
    // Ignore if marks don't exist
  }
}

/**
 * Clear all loading metrics
 */
export function clearAllLoadingMetrics(): void {
  loadingMetrics.clear()
}
