import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '~@/convex/_generated/api'
import { VisitCard } from './visit-card'
import type { Id } from '~@/convex/_generated/dataModel'

interface UserVisitsListProps {
  userId: Id<'users'>
}

export function UserVisitsList({ userId }: UserVisitsListProps) {
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

  return (
    <div className="space-y-4">
      {visits.map((visit) => (
        <VisitCard key={visit._id} visit={visit} />
      ))}
    </div>
  )
}
