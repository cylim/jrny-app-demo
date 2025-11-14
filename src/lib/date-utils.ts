/**
 * Format a date range for display
 */
export function formatDateRange(startDate: number, endDate: number): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // If same year, omit year from start date
  if (start.getFullYear() === end.getFullYear()) {
    const startShort = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    return `${startShort} - ${endStr}`
  }

  return `${startStr} - ${endStr}`
}

/**
 * Format a single date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Convert a date string (YYYY-MM-DD) to Unix timestamp
 * Uses UTC to avoid timezone-dependent shifts
 */
export function dateStringToTimestamp(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number)
  // Date.UTC uses 0-indexed months
  return Date.UTC(year, month - 1, day)
}

/**
 * Convert Unix timestamp to date string (YYYY-MM-DD)
 * Uses UTC to avoid timezone-dependent shifts
 */
export function timestampToDateString(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
