/**
 * Cancel Subscription Component
 *
 * Allows Pro users to cancel their subscription with confirmation.
 */

import { useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { api } from '~@/convex/_generated/api'

export function CancelSubscription() {
  const [isLoading, setIsLoading] = useState(false)
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription)

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      const result = await cancelSubscription({})
      toast.success(result.message)
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to cancel subscription'
      toast.error(errorMessage)
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
          <AlertDialogAction onClick={handleCancel} disabled={isLoading}>
            {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
