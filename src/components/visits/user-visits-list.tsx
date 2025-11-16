import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '~@/convex/_generated/api'
import type { Id } from '~@/convex/_generated/dataModel'
import { VisitCard } from './visit-card'

interface UserVisitsListProps {
  userId: Id<'users'>
  /** Whether the viewer is viewing their own profile */
  isOwnProfile?: boolean
}

/**
 * Displays a user's visit history, showing the 3 most recent visits by default.
 * Provides an expand button to view all older travel records.
 *
 * @param userId - The ID of the user whose visits should be fetched and displayed.
 * @param isOwnProfile - Whether the viewer is viewing their own profile (enables privacy controls)
 * @returns A React element that shows a centered "No visits recorded yet." message when the user has no visits, or a vertical list of VisitCard components for each visit.
 */
export function UserVisitsList({
  userId,
  isOwnProfile = false,
}: UserVisitsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: visits } = useSuspenseQuery(
    convexQuery(api.visits.getVisitsByUser, { userId }),
  )

  if (visits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No visits recorded yet.</p>
      </div>
    )
  }

  const INITIAL_DISPLAY_COUNT = 3
  const shouldShowExpandButton = visits.length > INITIAL_DISPLAY_COUNT
  const visibleVisits = isExpanded
    ? visits
    : visits.slice(0, INITIAL_DISPLAY_COUNT)
  const remainingCount = visits.length - INITIAL_DISPLAY_COUNT

  return (
    <div className="space-y-4">
      {visibleVisits.map((visit) => (
        <VisitCard key={visit._id} visit={visit} isOwnVisit={isOwnProfile} />
      ))}

      {shouldShowExpandButton && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View {remainingCount} older{' '}
                {remainingCount === 1 ? 'trip' : 'trips'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
