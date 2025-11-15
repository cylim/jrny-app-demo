import { Link } from '@tanstack/react-router'
import { formatDateRange } from '@/lib/date-utils'
import type { Id } from '~@/convex/_generated/dataModel'

interface OverlappingVisitor {
  user: {
    _id: Id<'users'>
    name: string
    username?: string
    image?: string
  }
  visit: {
    startDate: number
    endDate: number
  }
  overlapDays: number
}

interface OverlappingVisitorsListProps {
  visitors: OverlappingVisitor[]
}

/**
 * Renders a vertical list of visitors who had overlapping visits, showing an avatar (or initial), a link to the user's profile, the visit date range, and an overlap-days badge.
 *
 * @param visitors - Array of visitor entries containing user info, visit start/end timestamps, and overlapDays
 * @returns A React element containing the rendered list of overlapping visitors
 */
export function OverlappingVisitorsList({
  visitors,
}: OverlappingVisitorsListProps) {
  return (
    <div className="space-y-2">
      {visitors.map((visitor) => (
        <div
          key={visitor.user._id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* User Avatar */}
          {visitor.user.image ? (
            <img
              src={visitor.user.image}
              alt={visitor.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {visitor.user.name[0] ?? '?'}
            </div>
          )}

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <Link
              to="/u/$usernameOrId"
              params={{
                usernameOrId: visitor.user.username ?? visitor.user._id,
              }}
              className="font-medium hover:text-primary transition-colors"
            >
              {visitor.user.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDateRange(visitor.visit.startDate, visitor.visit.endDate)}
            </p>
          </div>

          {/* Overlap Badge */}
          <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
            {visitor.overlapDays} {visitor.overlapDays === 1 ? 'day' : 'days'}
          </div>
        </div>
      ))}
    </div>
  )
}
