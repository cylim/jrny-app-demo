/**
 * Subscription Status Component
 *
 * Displays current subscription tier and status with Pro badge.
 */

import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { Badge } from '@/components/ui/badge'

export function SubscriptionStatus() {
  const { data: subscription } = useSuspenseQuery(
    convexQuery(api.subscriptions.getMySubscription, {}),
  )

  if (!subscription) return null

  return (
    <div className="flex items-center gap-2">
      <Badge variant={subscription.tier === 'pro' ? 'default' : 'secondary'}>
        {subscription.tier === 'pro' ? 'Pro' : 'Free'}
      </Badge>
      {subscription.status === 'pending_cancellation' &&
        subscription.periodEndDate && (
          <span className="text-sm text-muted-foreground">
            (Cancels {new Date(subscription.periodEndDate).toLocaleDateString()}
            )
          </span>
        )}
    </div>
  )
}
