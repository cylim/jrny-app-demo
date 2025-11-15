/**
 * Produce a localized en-US date range string suitable for display.
 *
 * When both dates fall in the same calendar year, the start date omits the year
 * (e.g., "Jan 5 - Dec 10, 2025"); otherwise both dates include the year
 * (e.g., "Dec 28, 2024 - Jan 3, 2025").
 *
 * @param startDate - Start timestamp in milliseconds since the Unix epoch
 * @param endDate - End timestamp in milliseconds since the Unix epoch
 * @returns The formatted date range string
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
 * Format a UNIX timestamp as an en-US short month/day/year date string.
 *
 * @param timestamp - Milliseconds since the Unix epoch
 * @returns The date formatted like `Jan 1, 2020`
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Convert a date string in `YYYY-MM-DD` format to a UTC Unix timestamp.
 *
 * @param dateString - Date in `YYYY-MM-DD` format
 * @returns The UTC Unix timestamp in milliseconds since 1970-01-01 UTC corresponding to the start of `dateString`
 */
export function dateStringToTimestamp(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number)
  // Date.UTC uses 0-indexed months
  return Date.UTC(year, month - 1, day)
}

/**
 * Format a Unix timestamp as a UTC date string in YYYY-MM-DD.
 *
 * The returned date reflects the UTC date for the provided timestamp and avoids
 * timezone-dependent shifts by using UTC date fields.
 *
 * @param timestamp - Milliseconds since the Unix epoch
 * @returns The UTC date as a string formatted `YYYY-MM-DD`
 */
export function timestampToDateString(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
