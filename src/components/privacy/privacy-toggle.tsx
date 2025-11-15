/**
 * Privacy Toggle Component
 *
 * Reusable component for privacy setting toggles with tier-based access control.
 */

import { api } from 'convex/_generated/api'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type PrivacyToggleProps = {
  setting: 'hideProfileVisits' | 'hideProfileEvents' | 'globalVisitPrivacy'
  label: string
  description: string
  value: boolean
  canModify: boolean
  proOnly?: boolean
  onUpgradeRequired?: () => void
}

export function PrivacyToggle({
  setting,
  label,
  description,
  value,
  canModify,
  proOnly = false,
  onUpgradeRequired,
}: PrivacyToggleProps) {
  const [loading, setLoading] = useState(false)

  const updateProfile = useMutation(api.privacy.updateProfilePrivacy)
  const updateGlobal = useMutation(api.privacy.updateGlobalVisitPrivacy)

  const handleToggle = async (checked: boolean) => {
    if (!canModify) {
      onUpgradeRequired?.()
      return
    }

    setLoading(true)
    try {
      if (setting === 'globalVisitPrivacy') {
        await updateGlobal({ enabled: checked })
      } else {
        await updateProfile({ setting, enabled: checked })
      }
    } catch (err) {
      console.error('Failed to update privacy setting:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="space-y-0.5 flex-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={setting}>{label}</Label>
          {proOnly && (
            <Badge variant="default" className="text-xs">
              Pro
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={setting}
        checked={value}
        onCheckedChange={handleToggle}
        disabled={!canModify || loading}
      />
    </div>
  )
}
