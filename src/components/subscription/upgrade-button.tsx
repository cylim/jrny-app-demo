/**
 * Upgrade Button Component
 *
 * Initiates Pro tier upgrade checkout flow via Autumn/Stripe.
 * Uses Autumn's client-side checkout dialog for seamless payment experience.
 */

import { CheckoutDialog, useCustomer } from 'autumn-js/react'
import type { ComponentPropsWithoutRef } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/ui/loading-dots'

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
  const { checkout } = useCustomer()
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      const currentOrigin = window.location.origin
      await checkout({
        productId: 'pro',
        dialog: CheckoutDialog,
        successUrl: `${currentOrigin}/subscription/success`,
      })
    } catch (error) {
      console.error('Checkout failed:', error)
      setIsLoading(false)
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
      {isLoading ? (
        <LoadingDots />
      ) : featureName ? (
        'Upgrade to Pro'
      ) : (
        'Upgrade to Pro - $0.99/month'
      )}
    </Button>
  )
}
