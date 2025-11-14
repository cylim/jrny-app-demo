import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '~@/convex/_generated/api'
import { Link } from '@tanstack/react-router'
import { Calendar, Users } from 'lucide-react'
import { OverlappingVisitorsList } from './overlapping-visitors-list'
import { formatDateRange } from '@/lib/date-utils'
import type { Id } from '~@/convex/_generated/dataModel'

interface VisitCardProps {
  visit: {
    _id: Id<'visits'>
    startDate: number
    endDate: number
    notes?: string
    city: {
      _id: Id<'cities'>
      name: string
      shortSlug: string
      country: string
      image?: string
    }
  }
}

/**
 * Renders a card displaying a visit's city, country, date range, optional notes, and a list of overlapping visitors when present.
 *
 * @param visit - The visit to display; expected to include `_id`, `startDate`, `endDate`, optional `notes`, and a `city` object with `name`, `shortSlug`, `country`, and optional `image`.
 * @returns A JSX element containing the visit card.
 */
export function VisitCard({ visit }: VisitCardProps) {
  // Fetch overlapping visitors
  const { data: overlappingVisitors } = useSuspenseQuery(
    convexQuery(api.visits.getOverlappingVisitors, {
      visitId: visit._id,
    }),
  )

  return (
    <div className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
      <div className="flex gap-4">
        {/* City Image */}
        {visit.city.image && (
          <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={visit.city.image}
              alt={visit.city.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Visit Details */}
        <div className="flex-1 min-w-0">
          {/* City Name */}
          <Link
            to="/c/$shortSlug"
            params={{ shortSlug: visit.city.shortSlug }}
            className="text-xl font-semibold hover:text-primary transition-colors"
          >
            {visit.city.name}
          </Link>
          <p className="text-sm text-muted-foreground mb-3">
            {visit.city.country}
          </p>

          {/* Date Range */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDateRange(visit.startDate, visit.endDate)}</span>
          </div>

          {/* Notes */}
          {visit.notes && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {visit.notes}
            </p>
          )}

          {/* Overlapping Visitors */}
          {overlappingVisitors.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
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
      </div>
    </div>
  )
}