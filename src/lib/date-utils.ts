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
 */
export function dateStringToTimestamp(dateString: string): number {
  return new Date(dateString).getTime()
}

/**
 * Convert Unix timestamp to date string (YYYY-MM-DD)
 */
export function timestampToDateString(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
