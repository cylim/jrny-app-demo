'use client'

import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { api } from '~@/convex/_generated/api'
import { GoogleSignInButton } from './google-sign-in-button'
import type { User } from '@/types/user'

/**
 * Render the user navigation control: an avatar button with a dropdown for account actions and authentication handling.
 *
 * Shows a pulsing skeleton while the session is pending, a GoogleSignInButton when no user is signed in, and an avatar-triggered menu when authenticated. When a session becomes available the component attempts to synchronize the session user to the server. The menu displays the user's name and email and provides links for profile (when available), settings, and sign-out.
 *
 * @returns The user navigation UI element (avatar trigger, menu content, and related controls)
 */
export function UserNav() {
  const { data: session, isPending } = authClient.useSession()
  const syncUser = useMutation(api.users.syncUser)

  // Get current user data to access username/id for profile link
  const { data: currentUser } = useQuery(
    convexQuery(api.users.getCurrentUser, {}),
  )

  // Sync user data to our users table when session becomes available
  useEffect(() => {
    if (session?.user) {
      syncUser()
        .then(() => {
          console.log('User synced successfully')
        })
        .catch((error) => {
          console.error('Failed to sync user:', error)
        })
    }
  }, [session?.user, syncUser])

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/'
        },
      },
    })
  }

  if (isPending) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
  }

  if (!session?.user) {
    return <GoogleSignInButton />
  }

  const user = session.user
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || '?'

  // Use username if available, otherwise use user ID for profile link
  const typedUser = currentUser as User | null
  const profileIdentifier = typedUser?.username || typedUser?._id || ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name || ''} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {profileIdentifier && (
            <Link to="/u/$usernameOrId" params={{ usernameOrId: profileIdentifier }}>
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
            </Link>
          )}
          <Link to="/settings">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}