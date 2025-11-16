import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UpgradeButton } from '../subscription/upgrade-button'
import { Badge } from '../ui/badge'

/**
 * Event creation/editing form component
 * Used in: Create event modal/page, edit event modal
 *
 * Features:
 * - All event fields (title, description, date/time, timezone, location, capacity)
 * - Validation: required fields, start time in future, valid timezone
 * - Timezone selector with IANA timezones
 * - Optional capacity limit
 * - Privacy toggle for participant list
 * - Mode prop for create vs edit
 * - shadcn/ui form components
 */

interface EventFormProps {
  /** Form mode: create or edit */
  mode?: 'create' | 'edit'
  /** Initial values for edit mode */
  initialValues?: {
    title: string
    description: string
    startTime: number
    endTime?: number
    timezone: string
    location: string
    maxCapacity?: number
    isParticipantListHidden: boolean
  }
  /** Callback when form is submitted */
  onSubmit: (values: {
    title: string
    description: string
    startTime: number
    endTime?: number
    timezone: string
    location: string
    maxCapacity?: number
    isParticipantListHidden: boolean
  }) => Promise<void>
  /** Loading state while submitting */
  isLoading?: boolean
}

export function EventForm({
  mode = 'create',
  initialValues,
  onSubmit,
  isLoading = false,
}: EventFormProps) {
  // Check feature access for hiding participant list
  const { data: featureAccess } = useSuspenseQuery(
    convexQuery(api.subscriptions.checkFeatureAccess, {
      featureId: 'event_participant_list_hide',
    }),
  )

  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  )
  const [location, setLocation] = useState(initialValues?.location ?? '')
  const [timezone, setTimezone] = useState(
    initialValues?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [hasCapacity, setHasCapacity] = useState(
    initialValues?.maxCapacity !== undefined,
  )
  const [maxCapacity, setMaxCapacity] = useState(
    initialValues?.maxCapacity?.toString() ?? '10',
  )
  const [isParticipantListHidden, setIsParticipantListHidden] = useState(
    initialValues?.isParticipantListHidden ?? false,
  )

  // Date/time state (use ISO string for input fields)
  const defaultStartDate = initialValues?.startTime
    ? new Date(initialValues.startTime).toISOString().slice(0, 16)
    : ''
  const defaultEndDate = initialValues?.endTime
    ? new Date(initialValues.endTime).toISOString().slice(0, 16)
    : ''

  const [startDateTime, setStartDateTime] = useState(defaultStartDate)
  const [endDateTime, setEndDateTime] = useState(defaultEndDate)

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get list of valid IANA timezones
  const timezones = Intl.supportedValuesOf('timeZone')

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Title validation (1-100 characters)
    if (title.length < 1) {
      newErrors.title = 'Title is required'
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less'
    }

    // Description validation (1-5000 characters)
    if (description.length < 1) {
      newErrors.description = 'Description is required'
    } else if (description.length > 5000) {
      newErrors.description = 'Description must be 5000 characters or less'
    }

    // Start time validation
    if (!startDateTime) {
      newErrors.startDateTime = 'Start date/time is required'
    } else {
      const startTime = new Date(startDateTime).getTime()
      if (startTime <= Date.now()) {
        newErrors.startDateTime = 'Event must start in the future'
      }
    }

    // End time validation (if provided)
    if (endDateTime) {
      const startTime = new Date(startDateTime).getTime()
      const endTime = new Date(endDateTime).getTime()
      if (endTime <= startTime) {
        newErrors.endDateTime = 'End time must be after start time'
      }
    }

    // Location validation (1-500 characters)
    if (location.length < 1) {
      newErrors.location = 'Location is required'
    } else if (location.length > 500) {
      newErrors.location = 'Location must be 500 characters or less'
    }

    // Capacity validation (if enabled)
    if (hasCapacity) {
      const capacity = Number.parseInt(maxCapacity, 10)
      if (Number.isNaN(capacity) || capacity < 1) {
        newErrors.maxCapacity = 'Capacity must be at least 1'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Convert datetime-local input to Unix timestamp in the target timezone
   * The datetime-local input gives us a local time (no timezone info), but we want
   * to interpret it as a time in the target timezone, not the user's browser timezone.
   */
  const convertToTargetTimezone = (dateTimeLocal: string): number => {
    // Parse the datetime-local value as if it were in the target timezone
    // Example: "2025-01-15T14:00" should be treated as 2PM in the selected timezone
    const [datePart, timePart] = dateTimeLocal.split('T')
    const isoString = `${datePart}T${timePart}:00`

    // Parse the ISO string as local time, then format it in the target timezone
    // to get a string representation we can parse back
    // This leverages the browser's timezone handling to get the correct offset
    const tempDate = new Date(isoString)
    const targetTimeString = new Date(tempDate).toLocaleString('en-US', {
      timeZone: timezone,
    })

    // Parse back to get the correct timestamp
    // This accounts for the timezone offset
    const result = new Date(targetTimeString)
    const offset = result.getTime() - tempDate.getTime()

    // Apply the reverse offset to get the correct timestamp
    return tempDate.getTime() - offset
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    const startTime = convertToTargetTimezone(startDateTime)
    const endTime = endDateTime
      ? convertToTargetTimezone(endDateTime)
      : undefined

    await onSubmit({
      title,
      description,
      startTime,
      endTime,
      timezone,
      location,
      maxCapacity: hasCapacity ? Number.parseInt(maxCapacity, 10) : undefined,
      isParticipantListHidden,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Event Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Coffee Meetup, City Walking Tour"
          className="mt-1 block w-full rounded-xl border-2 border-zinc-200 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-pink-500 dark:focus:ring-pink-900/30"
          maxLength={100}
          disabled={isLoading}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.title}
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {title.length}/100 characters
        </p>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Description *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your event..."
          rows={4}
          className="mt-1 block w-full rounded-xl border-2 border-zinc-200 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-pink-500 dark:focus:ring-pink-900/30"
          maxLength={5000}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.description}
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {description.length}/5000 characters
        </p>
      </div>

      {/* Date/Time Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Start Date/Time */}
        <div>
          <label
            htmlFor="startDateTime"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Start Date/Time *
          </label>
          <input
            id="startDateTime"
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            className="mt-1 block w-full rounded-xl border-2 border-zinc-200 px-4 py-2 text-zinc-900 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-pink-500 dark:focus:ring-pink-900/30"
            disabled={isLoading}
          />
          {errors.startDateTime && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.startDateTime}
            </p>
          )}
        </div>

        {/* End Date/Time (Optional) */}
        <div>
          <label
            htmlFor="endDateTime"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            End Date/Time (Optional)
          </label>
          <input
            id="endDateTime"
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="mt-1 block w-full rounded-xl border-2 border-zinc-200 px-4 py-2 text-zinc-900 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-pink-500 dark:focus:ring-pink-900/30"
            disabled={isLoading}
          />
          {errors.endDateTime && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.endDateTime}
            </p>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label
          htmlFor="timezone"
          className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Timezone *
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 block w-full rounded-xl border-2 border-zinc-200 px-4 py-2 text-zinc-900 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-pink-500 dark:focus:ring-pink-900/30"
          disabled={isLoading}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Choose the timezone where the event will take place
        </p>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Location *
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Central Park, Starbucks on Main St"
          className="mt-1 block w-full rounded-xl border-2 border-zinc-200 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-pink-500 dark:focus:ring-pink-900/30"
          maxLength={500}
          disabled={isLoading}
        />
        {errors.location && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.location}
          </p>
        )}
      </div>

      {/* Capacity */}
      <div>
        <div className="flex items-center gap-2">
          <input
            id="hasCapacity"
            type="checkbox"
            checked={hasCapacity}
            onChange={(e) => setHasCapacity(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-pink-600 focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-pink-900/30"
            disabled={isLoading}
          />
          <label
            htmlFor="hasCapacity"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Set participant limit
          </label>
        </div>
        {hasCapacity && (
          <div className="mt-2">
            <input
              id="maxCapacity"
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              min={1}
              className="block w-full rounded-xl border-2 border-zinc-200 px-4 py-2 text-zinc-900 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-pink-500 dark:focus:ring-pink-900/30"
              disabled={isLoading}
            />
            {errors.maxCapacity && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.maxCapacity}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Privacy Toggle */}
      <div>
        <div className="flex items-center gap-2">
          <input
            id="isParticipantListHidden"
            type="checkbox"
            checked={isParticipantListHidden}
            onChange={(e) => {
              if (featureAccess?.hasAccess) {
                setIsParticipantListHidden(e.target.checked)
              }
            }}
            className="h-4 w-4 rounded border-zinc-300 text-pink-600 focus:ring-2 focus:ring-pink-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-pink-900/30"
            disabled={isLoading || !featureAccess?.hasAccess}
          />
          <label
            htmlFor="isParticipantListHidden"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Hide participant list
            <Badge variant="default" className="ml-1 text-xs">
              Pro
            </Badge>
          </label>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          When enabled, only you (the organizer) can see the full list of
          participants. Participants will only see themselves.
        </p>
        {!featureAccess?.hasAccess && (
          <div className="mt-2">
            <UpgradeButton
              variant="outline"
              size="sm"
              className="text-xs"
              featureName="Hide Participant List"
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="rounded-full px-6 py-2"
        >
          {isLoading
            ? 'Creating...'
            : mode === 'create'
              ? 'Create Event'
              : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
