/**
 * Upgrade Button Component
 *
 * Initiates Pro tier upgrade checkout flow via Autumn/Stripe.
 * Uses Autumn's client-side checkout dialog for seamless payment experience.
 */

import { CheckoutDialog, useCustomer } from 'autumn-js/react'
import type { ComponentPropsWithoutRef } from 'react'
import { Button } from '@/components/ui/button'

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

  const handleUpgrade = () => {
    checkout({
      productId: 'pro',
      dialog: CheckoutDialog,
    })
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleUpgrade}
      className={className}
    >
      {featureName ? 'Upgrade to Pro' : 'Upgrade to Pro - $0.99/month'}
    </Button>
  )
}
