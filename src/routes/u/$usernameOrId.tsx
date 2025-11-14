import { createFileRoute, type FileRoutesByPath } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '~@/convex/_generated/api'
import { UserVisitsList } from '@/components/visits/user-visits-list'
import { AddVisitButton } from '@/components/visits/add-visit-button'

export const Route = createFileRoute(
  '/u/$usernameOrId' as keyof FileRoutesByPath,
)({
  component: UserProfilePage,
})

function UserProfilePage() {
  const params = Route.useParams()
  const usernameOrId = 'usernameOrId' in params ? params.usernameOrId : ''

  // Fetch user data
  const { data: user } = useSuspenseQuery(
    convexQuery(api.users.getUserByUsernameOrId as any, { usernameOrId }),
  )

  // Fetch current user to check if this is their own profile
  const { data: currentUser } = useSuspenseQuery(
    convexQuery(api.users.getCurrentUser as any, {}),
  )

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The user you're looking for doesn't exist.
          </p>
          <a href="/" className="text-primary hover:underline font-medium">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?._id === user._id

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* User Header */}
        <div className="flex items-center gap-6 mb-8">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold">
              {user.name[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-1">{user.name}</h1>
            {user.username && (
              <p className="text-lg text-muted-foreground">@{user.username}</p>
            )}
          </div>
          {isOwnProfile && <AddVisitButton />}
        </div>

        {/* Visited Cities Section */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">
            {isOwnProfile ? 'My Travels' : 'Travels'}
          </h2>
          <UserVisitsList userId={user._id} />
        </div>
      </div>
    </div>
  )
}
