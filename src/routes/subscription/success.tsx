/**
 * Subscription Success Page
 *
 * Displayed after successful payment completion.
 * Syncs subscription status and redirects to settings.
 */

'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { useEffect } from 'react'
import { LoadingDots } from '@/components/ui/loading-dots'
import { api } from '~@/convex/_generated/api'

export const Route = createFileRoute('/subscription/success')({
  component: SubscriptionSuccess,
})

function SubscriptionSuccess() {
  const syncSubscription = useAction(api.subscriptions.syncSubscriptionStatus)
  const navigate = useNavigate()

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const sync = async () => {
      try {
        await syncSubscription({})
        // Redirect to settings after 2 seconds
        timeoutId = setTimeout(() => {
          navigate({ to: '/settings' })
        }, 2000)
      } catch (error) {
        console.error('Failed to sync subscription:', error)
        // Redirect anyway after delay
        timeoutId = setTimeout(() => {
          navigate({ to: '/settings' })
        }, 3000)
      }
    }

    sync()

    // Cleanup function to clear timeout if component unmounts
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [navigate, syncSubscription])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-bold">Welcome to Pro!</h1>
        <p className="text-muted-foreground">
          Your subscription is now active. You now have access to all Pro
          features.
        </p>
        <div className="flex justify-center pt-4">
          <LoadingDots />
        </div>
        <p className="text-sm text-muted-foreground">
          Redirecting to settings...
        </p>
      </div>
    </div>
  )
}
