import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

/**
 * Get detailed event information including participant count and list
 * Implements privacy logic:
 * - If isParticipantListHidden === false: All participants visible
 * - If isParticipantListHidden === true && viewer is owner: All participants visible
 * - If isParticipantListHidden === true && viewer is participant: Only self visible
 * - If isParticipantListHidden === true && viewer is anonymous: Empty array
 */
export const getEvent = query({
  args: { eventId: v.id('events') },
  returns: v.union(
    v.object({
      _id: v.id('events'),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      startTime: v.number(),
      endTime: v.optional(v.number()),
      timezone: v.string(),
      location: v.string(),
      cityId: v.id('cities'),
      ownerId: v.id('users'),
      maxCapacity: v.optional(v.number()),
      isParticipantListHidden: v.boolean(),
      isCancelled: v.boolean(),
      participantCount: v.number(),
      participants: v.array(
        v.object({
          _id: v.id('eventParticipants'),
          userId: v.id('users'),
          userName: v.string(),
          userImage: v.optional(v.string()),
        }),
      ),
      isOwner: v.boolean(),
      isParticipant: v.boolean(),
      isFull: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId)
    if (!event) return null

    // Get all participants
    const participantRecords = await ctx.db
      .query('eventParticipants')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .collect()

    // Get viewer identity
    const viewerIdentity = await ctx.auth.getUserIdentity()
    const viewerId = viewerIdentity?.subject

    // Check viewer roles
    const isOwner = viewerId ? event.ownerId === viewerId : false
    const isParticipant = viewerId
      ? participantRecords.some((p) => p.userId === viewerId)
      : false

    // Determine which participants to show based on privacy settings
    let visibleParticipants = participantRecords
    if (event.isParticipantListHidden && !isOwner) {
      if (isParticipant) {
        // Participant can only see themselves
        visibleParticipants = participantRecords.filter(
          (p) => p.userId === viewerId,
        )
      } else {
        // Anonymous or non-participant cannot see any participants
        visibleParticipants = []
      }
    }

    // Fetch user details for visible participants
    const participants = await Promise.all(
      visibleParticipants.map(async (p) => {
        const user = await ctx.db.get(p.userId)
        return {
          _id: p._id,
          userId: p.userId,
          userName: user?.name || 'Unknown',
          userImage: user?.image,
        }
      }),
    )

    return {
      ...event,
      participantCount: participantRecords.length,
      participants,
      isOwner,
      isParticipant,
      isFull: event.maxCapacity
        ? participantRecords.length >= event.maxCapacity
        : false,
    }
  },
})

/**
 * Get upcoming (future) events in a specific city
 * Filters out past events and cancelled events
 * Sorted by startTime (earliest first)
 */
export const listUpcomingEvents = query({
  args: { cityId: v.id('cities') },
  returns: v.array(
    v.object({
      _id: v.id('events'),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      startTime: v.number(),
      endTime: v.optional(v.number()),
      timezone: v.string(),
      location: v.string(),
      cityId: v.id('cities'),
      ownerId: v.id('users'),
      maxCapacity: v.optional(v.number()),
      isParticipantListHidden: v.boolean(),
      isCancelled: v.boolean(),
      participantCount: v.number(),
    }),
  ),
  handler: async (ctx, { cityId }) => {
    const now = Date.now()

    const events = await ctx.db
      .query('events')
      .withIndex('by_city_and_start', (q) =>
        q.eq('cityId', cityId).gte('startTime', now),
      )
      .filter((q) => q.eq(q.field('isCancelled'), false))
      .order('asc')
      .take(50) // Limit to 50 upcoming events

    // Add participant count to each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const participantCount = await ctx.db
          .query('eventParticipants')
          .withIndex('by_event', (q) => q.eq('eventId', event._id))
          .collect()
          .then((p) => p.length)

        return {
          ...event,
          participantCount,
        }
      }),
    )

    return eventsWithCounts
  },
})

/**
 * Get all events a user has joined (upcoming and past)
 * Returns separate arrays for upcoming and past events
 * Excludes cancelled events
 */
export const getUserEvents = query({
  args: { userId: v.id('users') },
  returns: v.object({
    upcoming: v.array(
      v.object({
        _id: v.id('events'),
        _creationTime: v.number(),
        title: v.string(),
        description: v.string(),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        timezone: v.string(),
        location: v.string(),
        cityId: v.id('cities'),
        ownerId: v.id('users'),
        maxCapacity: v.optional(v.number()),
        isParticipantListHidden: v.boolean(),
        isCancelled: v.boolean(),
      }),
    ),
    past: v.array(
      v.object({
        _id: v.id('events'),
        _creationTime: v.number(),
        title: v.string(),
        description: v.string(),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        timezone: v.string(),
        location: v.string(),
        cityId: v.id('cities'),
        ownerId: v.id('users'),
        maxCapacity: v.optional(v.number()),
        isParticipantListHidden: v.boolean(),
        isCancelled: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, { userId }) => {
    const participations = await ctx.db
      .query('eventParticipants')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const eventIds = participations.map((p) => p.eventId)
    const events = await Promise.all(eventIds.map((id) => ctx.db.get(id)))

    // Filter out null events and cancelled events (type guard)
    const validEvents = events.filter(
      (e): e is NonNullable<typeof e> => e !== null && !e.isCancelled,
    )

    const now = Date.now()
    return {
      upcoming: validEvents
        .filter((e) => e.startTime >= now)
        .sort((a, b) => a.startTime - b.startTime),
      past: validEvents
        .filter((e) => e.startTime < now)
        .sort((a, b) => b.startTime - a.startTime), // Newest first
    }
  },
})

/**
 * Create a new event in a city
 * Requires authentication
 * Validates all inputs
 */
export const createEvent = mutation({
  args: {
    cityId: v.id('cities'),
    title: v.string(),
    description: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    timezone: v.string(),
    location: v.string(),
    maxCapacity: v.optional(v.number()),
    isParticipantListHidden: v.optional(v.boolean()),
  },
  returns: v.id('events'),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Validation: Title length
    if (args.title.length < 1 || args.title.length > 100) {
      throw new Error('Title must be 1-100 characters')
    }

    // Validation: Description length
    if (args.description.length < 1 || args.description.length > 5000) {
      throw new Error('Description must be 1-5000 characters')
    }

    // Validation: Start time must be in future
    if (args.startTime <= Date.now()) {
      throw new Error('Event start time must be in the future')
    }

    // Validation: End time (if provided) must be after start time
    if (args.endTime && args.endTime <= args.startTime) {
      throw new Error('Event end time must be after start time')
    }

    // Validation: Timezone must be valid IANA timezone
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: args.timezone })
    } catch (_e) {
      throw new Error('Invalid timezone')
    }

    // Validation: Location length
    if (args.location.length < 1 || args.location.length > 500) {
      throw new Error('Location must be 1-500 characters')
    }

    // Validation: Max capacity (if provided) must be >= 1
    if (args.maxCapacity !== undefined && args.maxCapacity < 1) {
      throw new Error('Max capacity must be at least 1')
    }

    // Verify city exists
    const city = await ctx.db.get(args.cityId)
    if (!city) {
      throw new Error('City not found')
    }

    // Create event
    const eventId = await ctx.db.insert('events', {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      timezone: args.timezone,
      location: args.location,
      cityId: args.cityId,
      ownerId: user._id,
      maxCapacity: args.maxCapacity,
      isParticipantListHidden: args.isParticipantListHidden ?? false,
      isCancelled: false,
    })

    return eventId
  },
})

/**
 * Join an event as a participant
 * Requires authentication
 * Validates capacity, duplication, and event status
 */
export const joinEvent = mutation({
  args: { eventId: v.id('events') },
  returns: v.id('eventParticipants'),
  handler: async (ctx, { eventId }) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Event must exist
    const event = await ctx.db.get(eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Event must not be cancelled
    if (event.isCancelled) {
      throw new Error('Event is cancelled')
    }

    // Event must be upcoming (not past)
    if (event.startTime < Date.now()) {
      throw new Error('Cannot join past event')
    }

    // User must not already be joined
    const existing = await ctx.db
      .query('eventParticipants')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', eventId).eq('userId', user._id),
      )
      .unique()

    if (existing) {
      throw new Error('Already joined this event')
    }

    // Check capacity if limit set
    if (event.maxCapacity !== undefined) {
      const participantCount = await ctx.db
        .query('eventParticipants')
        .withIndex('by_event', (q) => q.eq('eventId', eventId))
        .collect()
        .then((p) => p.length)

      if (participantCount >= event.maxCapacity) {
        throw new Error('Event is full')
      }
    }

    // Create participation record
    const participationId = await ctx.db.insert('eventParticipants', {
      eventId,
      userId: user._id,
    })

    return participationId
  },
})

/**
 * Leave an event as a participant
 * Requires authentication
 * Verifies user is actually a participant
 */
export const leaveEvent = mutation({
  args: { eventId: v.id('events') },
  returns: v.null(),
  handler: async (ctx, { eventId }) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Event must exist
    const event = await ctx.db.get(eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // User must be a participant
    const participation = await ctx.db
      .query('eventParticipants')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', eventId).eq('userId', user._id),
      )
      .unique()

    if (!participation) {
      throw new Error('User is not a participant')
    }

    // Delete participation record
    await ctx.db.delete(participation._id)

    return null
  },
})

/**
 * Update event details
 * Requires authentication and ownership
 * Validates all updates and prevents conflicts
 */
export const updateEvent = mutation({
  args: {
    eventId: v.id('events'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.union(v.number(), v.null())),
    timezone: v.optional(v.string()),
    location: v.optional(v.string()),
    maxCapacity: v.optional(v.union(v.number(), v.null())),
    isParticipantListHidden: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Event must exist
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Authorization: Only owner can update
    if (event.ownerId !== user._id) {
      throw new Error('Only the event owner can update this event')
    }

    // Validation: Title length (if provided)
    if (args.title !== undefined) {
      if (args.title.length < 1 || args.title.length > 100) {
        throw new Error('Title must be 1-100 characters')
      }
    }

    // Validation: Description length (if provided)
    if (args.description !== undefined) {
      if (args.description.length < 1 || args.description.length > 5000) {
        throw new Error('Description must be 1-5000 characters')
      }
    }

    // Validation: Start time must be in future (if provided)
    if (args.startTime !== undefined) {
      if (args.startTime <= Date.now()) {
        throw new Error('Event start time must be in the future')
      }
    }

    // Validation: End time must be after start time (if provided)
    const finalStartTime = args.startTime ?? event.startTime
    const finalEndTime = args.endTime === null ? undefined : args.endTime
    if (finalEndTime !== undefined && finalEndTime <= finalStartTime) {
      throw new Error('Event end time must be after start time')
    }

    // Validation: Timezone must be valid IANA timezone (if provided)
    if (args.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat(undefined, { timeZone: args.timezone })
      } catch (_e) {
        throw new Error('Invalid timezone')
      }
    }

    // Validation: Location length (if provided)
    if (args.location !== undefined) {
      if (args.location.length < 1 || args.location.length > 500) {
        throw new Error('Location must be 1-500 characters')
      }
    }

    // Validation: Max capacity must be >= current participant count (if provided)
    if (args.maxCapacity !== undefined && args.maxCapacity !== null) {
      if (args.maxCapacity < 1) {
        throw new Error('Max capacity must be at least 1')
      }

      const participantCount = await ctx.db
        .query('eventParticipants')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect()
        .then((p) => p.length)

      if (args.maxCapacity < participantCount) {
        throw new Error(
          `Cannot reduce capacity below current participant count (${participantCount})`,
        )
      }
    }

    // Build update object (only include provided fields)
    const updates: Partial<{
      title: string
      description: string
      startTime: number
      endTime: number | undefined
      timezone: string
      location: string
      maxCapacity: number | undefined
      isParticipantListHidden: boolean
    }> = {}

    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.startTime !== undefined) updates.startTime = args.startTime
    if (args.endTime !== undefined)
      updates.endTime = args.endTime === null ? undefined : args.endTime
    if (args.timezone !== undefined) updates.timezone = args.timezone
    if (args.location !== undefined) updates.location = args.location
    if (args.maxCapacity !== undefined)
      updates.maxCapacity =
        args.maxCapacity === null ? undefined : args.maxCapacity
    if (args.isParticipantListHidden !== undefined)
      updates.isParticipantListHidden = args.isParticipantListHidden

    // Update event
    await ctx.db.patch(args.eventId, updates)

    return null
  },
})

/**
 * Cancel an event
 * Requires authentication and ownership
 * Sets isCancelled flag to true
 */
export const cancelEvent = mutation({
  args: { eventId: v.id('events') },
  returns: v.null(),
  handler: async (ctx, { eventId }) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', identity.subject))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Event must exist
    const event = await ctx.db.get(eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Authorization: Only owner can cancel
    if (event.ownerId !== user._id) {
      throw new Error('Only the event owner can cancel this event')
    }

    // Already cancelled check
    if (event.isCancelled) {
      throw new Error('Event is already cancelled')
    }

    // Update event to mark as cancelled
    await ctx.db.patch(eventId, { isCancelled: true })

    return null
  },
})

/**
 * Delete all events owned by a user (internal mutation for account deletion)
 * Called when a user account is deleted to maintain data integrity
 * Cascades to delete all eventParticipants for each owned event
 */
export const deleteUserEvents = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    // Get all events owned by this user
    const ownedEvents = await ctx.db
      .query('events')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .collect()

    // Delete all event participants for each owned event, then delete the event
    for (const event of ownedEvents) {
      // Delete all participants for this event
      const participants = await ctx.db
        .query('eventParticipants')
        .withIndex('by_event', (q) => q.eq('eventId', event._id))
        .collect()

      for (const participant of participants) {
        await ctx.db.delete(participant._id)
      }

      // Delete the event itself
      await ctx.db.delete(event._id)
    }

    return null
  },
})

/**
 * Delete all event participations by a user (internal mutation for account deletion)
 * Called when a user account is deleted to remove them from all events they joined
 */
export const deleteUserParticipations = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    // Get all event participations for this user
    const participations = await ctx.db
      .query('eventParticipants')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    // Delete each participation record
    for (const participation of participations) {
      await ctx.db.delete(participation._id)
    }

    return null
  },
})
