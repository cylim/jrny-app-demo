import { Badge } from '@/components/ui/badge'

/**
 * Badge component to indicate fake/test user profiles
 * Displays when user.isSeed === true
 *
 * @example
 * ```tsx
 * {user.isSeed && <TestUserBadge />}
 * ```
 */
export function TestUserBadge() {
  return (
    <Badge variant="secondary" className="ml-2">
      Test User
    </Badge>
  )
}
