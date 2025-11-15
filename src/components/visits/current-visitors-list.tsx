import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingDots } from '@/components/ui/loading-dots'
import type { Id } from '~@/convex/_generated/dataModel'

interface CurrentVisitor {
  user: {
    _id: Id<'users'>
    name: string
    username?: string
    image?: string
  }
  visit: {
    _id: Id<'visits'>
    startDate: number
    endDate: number
  }
}

interface CurrentVisitorsListProps {
  visitors: CurrentVisitor[]
  cityName?: string
}

/**
 * Renders a grid of user avatars currently visiting a city (for "Who's Here" section)
 * Each avatar links to the user's profile
 * Shows up to 28 avatars, with a clickable "+X" indicator to expand and show all
 * Includes loading and empty states
 *
 * @param visitors - Array of current visitors with user and visit information
 * @param cityName - Optional city name for empty state message
 * @returns A React element containing the rendered grid of current visitor avatars
 */
export function CurrentVisitorsList({
  visitors,
  cityName,
}: CurrentVisitorsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Empty state
  if (visitors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No one is currently in {cityName || 'this city'}
      </div>
    )
  }

  const threshold = 28
  const shouldCollapse = visitors.length > threshold && !isExpanded
  const MAX_VISIBLE = shouldCollapse ? 27 : visitors.length
  const visibleVisitors = visitors.slice(0, MAX_VISIBLE)
  const remainingCount = visitors.length - MAX_VISIBLE

  return (
    <div className="flex flex-wrap gap-3">
      {visibleVisitors.map((visitor) => (
        <Link
          key={visitor.user._id}
          to="/u/$usernameOrId"
          params={{
            usernameOrId: visitor.user.username ?? visitor.user._id,
          }}
          className="group"
        >
          <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary transition-all">
            <AvatarImage
              src={visitor.user.image || undefined}
              alt={visitor.user.name}
            />
            <AvatarFallback className="bg-primary/10 text-sm font-medium">
              {visitor.user.name[0] ?? '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
      ))}

      {remainingCount > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
        >
          +{remainingCount}
        </button>
      )}
    </div>
  )
}

/**
 * Loading wrapper component for CurrentVisitorsList
 * Displays a loading state while data is being fetched
 */
export function CurrentVisitorsListSkeleton() {
  return (
    <div className="py-8 flex justify-center">
      <LoadingDots />
    </div>
  )
}
