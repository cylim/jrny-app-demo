import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { Id } from 'convex/_generated/dataModel'
import { Github, Linkedin, Twitter } from 'lucide-react'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TestUserBadge } from '@/components/ui/test-user-badge'
import { AddVisitButton } from '@/components/visits/add-visit-button'
import { UserVisitsList } from '@/components/visits/user-visits-list'
import type { User } from '@/types/user'
import { EventCard } from '~/components/events/event-card'
import { api } from '~@/convex/_generated/api'

export const Route = createFileRoute('/u/$usernameOrId')({
  component: UserProfilePage,
})

/**
 * Component that fetches and displays user events (upcoming and past)
 * Only rendered when user exists to avoid invalid query parameters
 */
function UserEventsSection({
  userId,
  isOwnProfile,
}: {
  userId: Id<'users'>
  isOwnProfile: boolean
}) {
  const { data: userEvents } = useSuspenseQuery(
    convexQuery(api.events.getUserEvents, { userId }),
  )

  if (!userEvents) {
    return null
  }

  return (
    <div
      role="tabpanel"
      id="events-panel"
      aria-labelledby="events-tab"
      className="space-y-8"
    >
      {/* Upcoming Events */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">
          Upcoming Events ({userEvents.upcoming.length})
        </h2>
        {userEvents.upcoming.length === 0 ? (
          <div className="rounded-3xl border-2 border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400">
              {isOwnProfile
                ? "You haven't joined any upcoming events yet."
                : "This user hasn't joined any upcoming events yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userEvents.upcoming.map((event) => (
              <EventCard
                key={event._id}
                event={{ ...event, participantCount: 0 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">
          Past Events ({userEvents.past.length})
        </h2>
        {userEvents.past.length === 0 ? (
          <div className="rounded-3xl border-2 border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400">
              {isOwnProfile
                ? "You haven't attended any past events yet."
                : "This user hasn't attended any past events yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userEvents.past.map((event) => (
              <EventCard
                key={event._id}
                event={{ ...event, participantCount: 0 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Render the user profile page for the current route's username or ID.
 *
 * Fetches the target user and the currently authenticated user, shows a "User Not Found"
 * message if the target user doesn't exist, and renders the profile header (avatar, name,
 * username, bio, and social links). If the viewer owns the profile, an AddVisitButton is shown.
 * Conditionally displays the user's visit history or a privacy notice based on ownership and
 * the user's hideVisitHistory setting.
 *
 * @returns The rendered user profile page element.
 */
function UserProfilePage() {
  const { usernameOrId } = Route.useParams()

  // Fetch user data
  const { data: user } = useSuspenseQuery(
    convexQuery(api.users.getUserByUsernameOrId, { usernameOrId }),
  )

  // Fetch current user to check if this is their own profile
  const { data: currentUser } = useSuspenseQuery(
    convexQuery(api.users.getCurrentUser, {}),
  )

  // Tab state
  const [activeTab, setActiveTab] = useState<'visits' | 'events'>('visits')

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
  const typedUser = user as User
  const showVisitHistory =
    isOwnProfile || typedUser.settings?.hideVisitHistory !== true

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* User Header */}
        <div className="flex items-center gap-6 mb-8">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.image || undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-3xl font-bold">
              {user.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-4xl font-bold">{user.name}</h1>
              {typedUser.isSeed && <TestUserBadge />}
            </div>
            {user.username && (
              <p className="text-lg text-muted-foreground">@{user.username}</p>
            )}

            {/* Bio */}
            {typedUser.bio && (
              <p className="mt-3 text-base text-foreground max-w-2xl">
                {typedUser.bio}
              </p>
            )}

            {/* Social Links */}
            {typedUser.socialLinks && (
              <div className="mt-3 flex gap-3">
                {typedUser.socialLinks.github && (
                  <a
                    href={typedUser.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                )}
                {typedUser.socialLinks.x && (
                  <a
                    href={typedUser.socialLinks.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {typedUser.socialLinks.linkedin && (
                  <a
                    href={typedUser.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {typedUser.socialLinks.telegram && (
                  <a
                    href={typedUser.socialLinks.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      role="img"
                    >
                      <title>Telegram</title>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
          {isOwnProfile && <AddVisitButton />}
        </div>

        {/* Tab Navigation */}
        <div
          className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800"
          role="tablist"
          aria-label="Profile sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'visits'}
            aria-controls="visits-panel"
            id="visits-tab"
            onClick={() => setActiveTab('visits')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'visits'
                ? 'border-b-2 border-pink-500 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Visits
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'events'}
            aria-controls="events-panel"
            id="events-tab"
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'events'
                ? 'border-b-2 border-pink-500 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Events
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'visits' &&
          (showVisitHistory ? (
            <div
              role="tabpanel"
              id="visits-panel"
              aria-labelledby="visits-tab"
              className="bg-card/30 border rounded-lg p-6"
            >
              <h2 className="text-2xl font-semibold mb-6">
                {isOwnProfile ? 'My Travels' : 'Travels'}
              </h2>
              <UserVisitsList userId={user._id} />
            </div>
          ) : (
            <div
              role="tabpanel"
              id="visits-panel"
              aria-labelledby="visits-tab"
              className="bg-card border rounded-lg p-6"
            >
              <p className="text-center text-muted-foreground">
                This user has chosen to keep their travel history private.
              </p>
            </div>
          ))}

        {activeTab === 'events' && (
          <UserEventsSection userId={user._id} isOwnProfile={isOwnProfile} />
        )}
      </div>
    </div>
  )
}
