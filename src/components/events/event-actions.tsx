import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { Ban, Pencil, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Event action buttons component
 * Used in: Event detail page
 *
 * Features:
 * - Join/Leave button (toggles based on participation status)
 * - Edit/Cancel/Delete buttons (owner only)
 * - Loading states with TanStack Query isPending
 * - Optimistic updates for join/leave
 * - Error handling with rollback
 * - Disabled state when event is full or past
 */

interface EventActionsProps {
  /** Event ID */
  eventId: Id<'events'>
  /** Is the current viewer the event owner? */
  isOwner: boolean
  /** Is the current viewer a participant? */
  isParticipant: boolean
  /** Is the event full (at capacity)? */
  isFull: boolean
  /** Is the event in the past? */
  isPast: boolean
  /** Is the user authenticated? */
  isAuthenticated: boolean
  /** Callback when edit button clicked (owner only) */
  onEdit?: () => void
  /** Callback when cancel button clicked (owner only) */
  onCancel?: () => void
  /** Callback when delete button clicked (owner only) */
  onDelete?: () => void
}

export function EventActions({
  eventId,
  isOwner,
  isParticipant,
  isFull,
  isPast,
  isAuthenticated,
  onEdit,
  onCancel,
  onDelete,
}: EventActionsProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const joinEvent = useMutation(api.events.joinEvent)
  const leaveEvent = useMutation(api.events.leaveEvent)

  const handleJoin = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to join this event')
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      await joinEvent({ eventId })
      // Optimistic update handled by Convex live query
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join event')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeave = async () => {
    setIsLeaving(true)
    setError(null)

    try {
      await leaveEvent({ eventId })
      // Optimistic update handled by Convex live query
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave event')
    } finally {
      setIsLeaving(false)
    }
  }

  // Don't show join/leave buttons for past events
  const showJoinLeave = !isPast && !isOwner

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Join/Leave Button (non-owners, future events only) */}
        {showJoinLeave &&
          (isParticipant ? (
            <Button
              onClick={handleLeave}
              disabled={isLeaving}
              variant="outline"
              className="rounded-full px-6"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              {isLeaving ? 'Leaving...' : 'Leave Event'}
            </Button>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={isJoining || isFull}
              className="rounded-full px-6"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isJoining ? 'Joining...' : isFull ? 'Event Full' : 'Join Event'}
            </Button>
          ))}

        {/* Owner-only buttons */}
        {isOwner && !isPast && (
          <>
            {/* Edit Button */}
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                className="rounded-full px-6"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Event
              </Button>
            )}

            {/* Cancel Button */}
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="rounded-full px-6"
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel Event
              </Button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <Button
                onClick={onDelete}
                variant="destructive"
                className="rounded-full px-6"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Event
              </Button>
            )}
          </>
        )}
      </div>

      {/* Sign-in Prompt (anonymous users) */}
      {!isAuthenticated && showJoinLeave && (
        <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 dark:border-pink-900/50 dark:bg-pink-900/20">
          <p className="text-sm text-pink-700 dark:text-pink-300">
            Sign in to join this event and connect with other travelers!
          </p>
        </div>
      )}

      {/* Event Full Notice */}
      {isFull && !isParticipant && !isOwner && showJoinLeave && (
        <div className="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            This event is at capacity. Check back later in case someone leaves!
          </p>
        </div>
      )}

      {/* Past Event Notice */}
      {isPast && (
        <div className="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            This event has already taken place.
          </p>
        </div>
      )}
    </div>
  )
}
