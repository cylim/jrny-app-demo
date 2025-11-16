/**
 * Upgrade Button Component
 *
 * Initiates Pro tier upgrade checkout flow via Autumn/Stripe.
 */

import { useMutation } from 'convex/react'
import type { ComponentPropsWithoutRef } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '~@/convex/_generated/api'

interface UpgradeButtonProps {
  variant?: ComponentPropsWithoutRef<typeof Button>['variant']
  size?: ComponentPropsWithoutRef<typeof Button>['size']
  className?: string
  featureName?: string
}

export function UpgradeButton({
  variant = 'kirby',
  size = 'lg',
  className,
  featureName,
}: UpgradeButtonProps) {
  const initiateUpgrade = useMutation(api.subscriptions.initiateUpgrade)
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    try {
      setIsLoading(true)

      // Create Stripe Checkout session
      const result = await initiateUpgrade({
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/settings`,
      })

      // Redirect to Stripe Checkout
      window.location.href = result.checkoutUrl
    } catch (error) {
      console.error('Failed to initiate upgrade:', error)
      setIsLoading(false)

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to start checkout: ${errorMessage}. Please try again.`)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleUpgrade}
      className={className}
      disabled={isLoading}
    >
      {isLoading
        ? 'Starting checkout...'
        : featureName
          ? `Upgrade to Pro`
          : 'Upgrade to Pro - $0.99/month'}
    </Button>
  )
}
