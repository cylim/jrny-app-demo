/**
 * Upgrade Prompt Component
 *
 * Modal/dialog that appears when free users try to access Pro-only features.
 * Shows feature name and upgrade call-to-action.
 */

import { UpgradeButton } from '@/components/subscription/upgrade-button'

interface UpgradePromptProps {
  /** Name of the feature requiring Pro */
  featureName: string
  /** Callback to close the modal */
  onClose: () => void
}

export function UpgradePrompt({ featureName, onClose }: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Upgrade to Pro
        </h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          "{featureName}" is a Pro feature. Upgrade to unlock advanced privacy
          controls and more.
        </p>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Pro Plan
            </span>
            <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
              $0.99/month
            </span>
          </div>
          <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <li>✓ Hide visit history from profile</li>
            <li>✓ Hide event participation from profile</li>
            <li>✓ Global visit privacy control</li>
            <li>✓ Individual visit privacy</li>
            <li>✓ Hide event participant lists</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-2 border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Maybe Later
          </button>
          <div className="flex-1">
            <UpgradeButton
              variant="kirby"
              size="default"
              className="w-full rounded-full"
              featureName={featureName}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
