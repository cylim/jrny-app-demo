import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { Calendar, Lock, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { UpgradePrompt } from '@/components/privacy/upgrade-prompt'
import { formatDateRange } from '@/lib/date-utils'
import { api } from '~@/convex/_generated/api'
import type { Id } from '~@/convex/_generated/dataModel'
import { OverlappingVisitorsList } from './overlapping-visitors-list'

interface VisitCardProps {
  visit: {
    _id: Id<'visits'>
    startDate: number
    endDate: number
    notes?: string
    isPrivate: boolean
    city: {
      _id: Id<'cities'>
      name: string
      shortSlug: string
      country: string
      image?: string
    }
  }
  /** Whether the viewer owns this visit (controls privacy toggle visibility) */
  isOwnVisit?: boolean
}

/**
 * Renders a card displaying a visit's city, country, date range, optional notes, and a list of overlapping visitors when present.
 *
 * @param visit - The visit to display; expected to include `_id`, `startDate`, `endDate`, optional `notes`, `isPrivate`, and a `city` object with `name`, `shortSlug`, `country`, and optional `image`.
 * @param isOwnVisit - Whether the viewer owns this visit (shows privacy toggle)
 * @returns A JSX element containing the visit card.
 */
export function VisitCard({ visit, isOwnVisit = false }: VisitCardProps) {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  // Optimistic UI state - track privacy status separately from server state
  const [optimisticIsPrivate, setOptimisticIsPrivate] = useState(
    visit.isPrivate,
  )
  const updateVisitPrivacy = useAction(api.privacy.updateVisitPrivacy)

  // Fetch overlapping visitors
  const { data: overlappingVisitors } = useSuspenseQuery(
    convexQuery(api.visits.getOverlappingVisitors, {
      visitId: visit._id,
    }),
  )

  // Sync optimistic state when server state changes
  useEffect(() => {
    setOptimisticIsPrivate(visit.isPrivate)
  }, [visit.isPrivate])

  const handlePrivacyToggle = async () => {
    // Use functional update to flip optimistic state immediately
    // This ensures we always read the current optimistic state, not stale props
    const newPrivateState = await new Promise<boolean>((resolve) => {
      setOptimisticIsPrivate((prev) => {
        const next = !prev
        resolve(next)
        return next
      })
    })

    try {
      await updateVisitPrivacy({
        visitId: visit._id,
        isPrivate: newPrivateState,
      })

      // Show success toast
      toast.success(
        newPrivateState
          ? 'Visit is now private'
          : 'Visit is now visible to others',
      )
    } catch (error) {
      setOptimisticIsPrivate(visit.isPrivate)

      if (
        error instanceof Error &&
        error.message.includes('Pro subscription required')
      ) {
        setShowUpgradePrompt(true)
        toast.error('Pro subscription required for individual visit privacy')
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update privacy settings'
        toast.error(errorMessage)
      }
    }
  }

  return (
    <div className="relative border rounded-lg overflow-hidden h-64 group hover:ring-2 hover:ring-primary/50 transition-all">
      <Link
        to="/c/$shortSlug"
        params={{ shortSlug: visit.city.shortSlug }}
        className="absolute inset-0 z-0"
        aria-label={`View ${visit.city.name}`}
      />
      {/* Background Image */}
      {visit.city.image && (
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={visit.city.image}
            alt={visit.city.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        </div>
      )}

      {/* Privacy Controls - Top Left (only for own visits) */}
      {isOwnVisit && (
        <div className="absolute top-14 right-4 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={handlePrivacyToggle}
            className="flex items-center gap-2 text-sm text-white/90 bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
            aria-label={
              optimisticIsPrivate ? 'Make visit public' : 'Make visit private'
            }
          >
            <Lock
              className={`w-4 h-4 ${optimisticIsPrivate ? 'text-yellow-400' : 'text-white/50'}`}
            />
            <span className="font-medium">
              {optimisticIsPrivate ? 'Private' : 'Public'}
            </span>
          </button>
        </div>
      )}

      {/* Lock Icon Badge - Top Left (for non-owners viewing private visits) */}
      {!isOwnVisit && optimisticIsPrivate && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-sm text-white/90 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
          <Lock className="w-4 h-4 text-yellow-400" />
        </div>
      )}

      {/* Date Range - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-white/90 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none z-10">
        <Calendar className="w-4 h-4" />
        <span>{formatDateRange(visit.startDate, visit.endDate)}</span>
      </div>

      {/* Content Overlay */}
      <div className="relative h-full p-6 flex flex-col justify-between text-white pointer-events-none z-10">
        {/* Top Section */}
        <div>
          {/* City Name */}
          <h3 className="text-2xl font-semibold group-hover:text-primary transition-colors">
            {visit.city.name}
          </h3>
          <p className="text-sm text-white/90 mb-3">{visit.city.country}</p>

          {/* Notes */}
          {visit.notes && (
            <p className="text-sm text-white/90 line-clamp-2">{visit.notes}</p>
          )}
        </div>

        {/* Bottom Section - Overlapping Visitors */}
        {overlappingVisitors.length > 0 && (
          <div className="pt-4 border-t border-white/20 pointer-events-auto max-h-[140px] overflow-y-auto overflow-x-hidden scrollbar-thin">
            <div className="flex items-center gap-2 text-sm font-medium mb-3 pointer-events-none sticky top-0  pb-2 -mt-1">
              <Users className="w-4 h-4" />
              <span>
                Crossed paths with {overlappingVisitors.length}{' '}
                {overlappingVisitors.length === 1 ? 'traveler' : 'travelers'}
              </span>
            </div>
            <OverlappingVisitorsList visitors={overlappingVisitors} />
          </div>
        )}
      </div>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          featureName="Individual Visit Privacy"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  )
}
