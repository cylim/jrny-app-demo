/**
 * Pricing Card Component
 *
 * Displays Free vs Pro tier comparison with features list.
 * Shows pricing, benefits, and upgrade/downgrade actions.
 */

import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface PricingCardProps {
  /** Current user's tier */
  currentTier?: 'free' | 'pro'
  /** Callback when upgrade button is clicked */
  onUpgrade?: () => void
  /** Callback when cancel button is clicked */
  onCancel?: () => void
}

export function PricingCard({
  currentTier = 'free',
  onUpgrade,
  onCancel,
}: PricingCardProps) {
  const freeTier = {
    name: 'Free',
    price: '$0',
    interval: 'forever',
    features: [
      'Track unlimited visits',
      'Join and create events',
      'Hide visit history from profile',
      'Hide event participation from profile',
      'Public profile customization',
    ],
  }

  const proTier = {
    name: 'Pro',
    price: '$0.99',
    interval: 'month',
    features: [
      'Everything in Free',
      'Global visit privacy control',
      'Individual visit privacy',
      'Hide event participant lists',
      'Priority support',
    ],
  }

  const isPro = currentTier === 'pro'

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Free Tier */}
      <Card className="relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{freeTier.name}</CardTitle>
            {!isPro && (
              <Badge variant="outline" className="text-xs">
                Current Plan
              </Badge>
            )}
          </div>
          <CardDescription>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {freeTier.price}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              /{freeTier.interval}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {freeTier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          {isPro && onCancel && (
            <Button variant="outline" className="w-full" onClick={onCancel}>
              Downgrade to Free
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Pro Tier */}
      <Card className="relative border-pink-500 dark:border-pink-600">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            Most Popular
          </Badge>
        </div>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{proTier.name}</CardTitle>
            {isPro && (
              <Badge
                variant="default"
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-xs text-white"
              >
                Current Plan
              </Badge>
            )}
          </div>
          <CardDescription>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {proTier.price}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              /{proTier.interval}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {proTier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-pink-600 dark:text-pink-400" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          {!isPro && onUpgrade && (
            <Button variant="kirby" className="w-full" onClick={onUpgrade}>
              Upgrade to Pro
            </Button>
          )}
          {isPro && (
            <div className="w-full text-center text-sm text-zinc-600 dark:text-zinc-400">
              You're on the Pro plan
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
