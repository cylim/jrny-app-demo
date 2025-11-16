import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
 * Renders a grid of user avatars who had overlapping visits
 * Each avatar links to the user's profile
 * Shows up to 6 avatars, with a clickable "+X" indicator to expand and show all
 *
 * @param visitors - Array of visitor entries containing user info, visit start/end timestamps, and overlapDays
 * @returns A React element containing the rendered grid of overlapping visitor avatars
 */
export function OverlappingVisitorsList({
  visitors,
}: OverlappingVisitorsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (visitors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No overlapping visitors found
      </div>
    )
  }

  const threshold = 6
  const shouldCollapse = visitors.length > threshold && !isExpanded
  const MAX_VISIBLE = shouldCollapse ? 5 : visitors.length
  const visibleVisitors = visitors.slice(0, MAX_VISIBLE)
  const remainingCount = visitors.length - MAX_VISIBLE

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-3">
        {visibleVisitors.map((visitor) => (
          <Tooltip key={visitor.user._id}>
            <TooltipTrigger asChild>
              <Link
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
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{visitor.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {visitor.overlapDays}{' '}
                {visitor.overlapDays === 1 ? 'day' : 'days'} overlap
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsExpanded(true)
            }}
            className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
          >
            +{remainingCount}
          </button>
        )}
      </div>
    </TooltipProvider>
  )
}
