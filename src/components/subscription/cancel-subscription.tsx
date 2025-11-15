/**
 * Cancel Subscription Component
 *
 * Allows Pro users to cancel their subscription with confirmation.
 * TEMPORARILY DISABLED - Waiting for Autumn API integration
 */

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function CancelSubscription() {
  const [isLoading, setIsLoading] = useState(false)
  // const cancelSubscription = useMutation(api.subscriptions.cancelSubscription)

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      // TODO: Re-enable when cancelSubscription is implemented
      // const result = await cancelSubscription()
      // console.log(result.message)
      alert('Subscription cancellation is temporarily disabled')
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          Cancel Subscription
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Pro Subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            Your Pro access will continue until the end of your current billing
            period. You can reactivate anytime before then.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Pro</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel}>
            Cancel Subscription
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
