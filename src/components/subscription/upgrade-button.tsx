/**
 * Upgrade Button Component
 *
 * Initiates Pro tier upgrade checkout flow.
 * TEMPORARILY DISABLED - Waiting for Autumn API integration
 */

import { Button } from '@/components/ui/button'

export function UpgradeButton() {
  // const initiateUpgrade = useMutation(api.subscriptions.initiateUpgrade)

  const handleUpgrade = async () => {
    try {
      // TODO: Re-enable when initiateUpgrade is implemented
      alert(
        'Upgrade to Pro is temporarily disabled. Autumn integration in progress.',
      )
      // const result = await initiateUpgrade({
      //   successUrl: `${window.location.origin}/subscription/success`,
      //   cancelUrl: `${window.location.origin}/settings`,
      // })
      // window.location.href = result.checkoutUrl
    } catch (error) {
      console.error('Failed to initiate upgrade:', error)
    }
  }

  return (
    <Button variant="kirby" size="lg" onClick={handleUpgrade}>
      Upgrade to Pro - $0.99/month
    </Button>
  )
}
