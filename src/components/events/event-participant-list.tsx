import { Link } from '@tanstack/react-router'
import type { Id } from 'convex/_generated/dataModel'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/**
 * Event participant list component with privacy-aware rendering
 * Used in: Event detail page
 *
 * Features:
 * - Displays participant avatars and names
 * - Respects privacy settings (shows/hides based on viewer role)
 * - Shows "Hidden by organizer" message when private
 * - Shows participant count even when list hidden
 * - Shows "Only you" message when participant sees only themselves
 * - Responsive grid layout
 */

interface EventParticipantListProps {
  /** Participant count (always visible) */
  participantCount: number
  /** Visible participants (respects privacy logic from backend) */
  participants: Array<{
    _id: Id<'eventParticipants'>
    userId: Id<'users'>
    userName: string
    userImage?: string
    username?: string
  }>
  /** Is the current viewer the event owner? */
  isOwner: boolean
  /** Is the participant list hidden by the organizer? */
  isParticipantListHidden: boolean
  /** Is the current viewer a participant? */
  isParticipant: boolean
  /** Maximum capacity (optional) */
  maxCapacity?: number
}

export function EventParticipantList({
  participantCount,
  participants,
  isOwner,
  isParticipantListHidden,
  isParticipant,
  maxCapacity,
}: EventParticipantListProps) {
  // Determine what message to show based on privacy settings
  const showHiddenMessage =
    isParticipantListHidden && !isOwner && participants.length === 0
  const showSelfOnlyMessage =
    isParticipantListHidden &&
    !isOwner &&
    isParticipant &&
    participants.length === 1

  return (
    <div className="">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Participants
        </h3>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {participantCount}
          {maxCapacity !== undefined && ` / ${maxCapacity}`}
        </span>
      </div>

      {/* Privacy Messages */}
      {showHiddenMessage && (
        <div className="rounded-2xl bg-zinc-50 p-4 text-center dark:bg-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            🔒 Participant list hidden by organizer
          </p>
        </div>
      )}

      {showSelfOnlyMessage && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-pink-50 p-4 text-center dark:bg-pink-900/20">
            <p className="text-sm text-pink-700 dark:text-pink-300">
              🔒 Only you can see yourself in this list. Other participants are
              hidden by the organizer.
            </p>
          </div>

          {/* Show the participant (themselves) */}
          <div className="flex flex-wrap gap-3">
            {participants.map((participant) => {
              const userLink = participant.username
                ? `/u/${participant.username}`
                : `/u/${participant.userId}`

              return (
                <Link
                  key={participant._id}
                  to={userLink}
                  className="group relative"
                  title={`${participant.userName} (You)`}
                >
                  <Avatar className="h-12 w-12 transition-transform hover:scale-110">
                    <AvatarImage
                      src={participant.userImage}
                      alt={participant.userName}
                    />
                    <AvatarFallback className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                      {participant.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Participant Grid (when visible) */}
      {!showHiddenMessage &&
        !showSelfOnlyMessage &&
        (participants.length === 0 ? (
          <div className="rounded-2xl bg-zinc-50 p-4 text-center dark:bg-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No participants yet. Be the first to join!
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {participants.map((participant) => {
              const userLink = participant.username
                ? `/u/${participant.username}`
                : `/u/${participant.userId}`

              return (
                <Link
                  key={participant._id}
                  to={userLink}
                  className="group relative"
                  title={participant.userName}
                >
                  <Avatar className="h-12 w-12 transition-transform hover:scale-110">
                    <AvatarImage
                      src={participant.userImage}
                      alt={participant.userName}
                    />
                    <AvatarFallback className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                      {participant.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )
            })}
          </div>
        ))}
    </div>
  )
}
