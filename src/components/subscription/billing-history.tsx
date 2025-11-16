/**
 * Billing History Component
 *
 * Displays subscription billing information and provides access to
 * Autumn customer portal for full payment history.
 */

import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { api } from '~@/convex/_generated/api'

export function BillingHistory() {
  const { data: subscription } = useSuspenseQuery(
    convexQuery(api.subscriptions.getMySubscription, {}),
  )

  if (!subscription) {
    return (
      <div className="rounded-2xl border-2 border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No subscription information available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Info */}
      <div className="rounded-2xl border-2 border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Current Plan
          </h3>
        </div>

        <div className="space-y-3">
          {/* Tier */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Plan
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {subscription.tier === 'pro' ? 'Pro - $0.99/month' : 'Free'}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Status
            </span>
            <span
              className={`font-medium ${
                subscription.status === 'active'
                  ? 'text-green-600 dark:text-green-400'
                  : subscription.status === 'pending_cancellation'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {subscription.status === 'active'
                ? 'Active'
                : subscription.status === 'pending_cancellation'
                  ? 'Pending Cancellation'
                  : 'Cancelled'}
            </span>
          </div>

          {/* Next Billing Date (Pro only) */}
          {subscription.tier === 'pro' &&
            subscription.status === 'active' &&
            subscription.nextBillingDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Next Billing Date
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(subscription.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
            )}

          {/* Period End (Pending Cancellation) */}
          {subscription.status === 'pending_cancellation' &&
            subscription.periodEndDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Access Ends
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(subscription.periodEndDate).toLocaleDateString()}
                  {subscription.daysUntilPeriodEnd !== undefined && (
                    <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
                      ({subscription.daysUntilPeriodEnd} days)
                    </span>
                  )}
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Free Tier Message */}
      {subscription.tier === 'free' && (
        <div className="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You're currently on the free plan. Upgrade to Pro to access advanced
            privacy features and view billing history.
          </p>
        </div>
      )}
    </div>
  )
}
