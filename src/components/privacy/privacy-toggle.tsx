/**
 * Privacy Toggle Component
 *
 * Reusable toggle switch for privacy settings with upgrade prompts for Pro features.
 */

import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

interface PrivacyToggleProps {
  /** Setting key (e.g., 'hideProfileVisits') */
  setting: string
  /** Display label */
  label: string
  /** Description text */
  description: string
  /** Current value */
  value: boolean
  /** Can the user modify this setting? */
  canModify: boolean
  /** Callback when toggle is changed */
  onChange: (checked: boolean) => void
  /** Callback when user tries to enable a Pro feature they don't have access to */
  onUpgradeRequired?: () => void
  /** Is this a Pro-only feature? */
  isProFeature?: boolean
  /** Loading state */
  isLoading?: boolean
}

export function PrivacyToggle({
  setting,
  label,
  description,
  value,
  canModify,
  onChange,
  onUpgradeRequired,
  isProFeature = false,
  isLoading = false,
}: PrivacyToggleProps) {
  const handleChange = (checked: boolean) => {
    if (!canModify && checked && onUpgradeRequired) {
      onUpgradeRequired()
      return
    }
    onChange(checked)
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border-2 border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <label
            htmlFor={setting}
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {label}
          </label>
          {isProFeature && (
            <Badge
              variant="default"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-xs text-white"
            >
              Pro
            </Badge>
          )}
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <Switch
        id={setting}
        checked={value}
        onCheckedChange={handleChange}
        disabled={isLoading || (!canModify && value)}
        aria-label={label}
      />
    </div>
  )
}
