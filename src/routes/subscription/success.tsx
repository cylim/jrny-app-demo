/**
 * Subscription Success Page
 *
 * Displayed after successful payment completion.
 * Syncs subscription status and redirects to settings.
 * TEMPORARILY DISABLED - Waiting for Autumn API integration
 */

'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LoadingDots } from '@/components/ui/loading-dots'

export const Route = createFileRoute('/subscription/success')({
  component: SubscriptionSuccess,
})

function SubscriptionSuccess() {
  // const syncSubscription = useMutation(api.subscriptions.syncSubscriptionStatus)
  const navigate = useNavigate()

  useEffect(() => {
    const sync = async () => {
      try {
        // TODO: Re-enable when syncSubscriptionStatus is implemented
        // await syncSubscription()
        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate({ to: '/settings' })
        }, 2000)
      } catch (error) {
        console.error('Failed to sync subscription:', error)
        // Redirect anyway after delay
        setTimeout(() => {
          navigate({ to: '/settings' })
        }, 3000)
      }
    }

    sync()
  }, [navigate])

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
