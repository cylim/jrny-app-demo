/**
 * Privacy Settings Panel Component
 *
 * Main privacy controls panel for user settings page.
 * Displays toggles for all privacy settings with Pro upgrade prompts.
 */

import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { PrivacyToggle } from './privacy-toggle'
import { UpgradePrompt } from './upgrade-prompt'

export function PrivacySettingsPanel() {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('')

  // Fetch current privacy settings
  const { data: privacySettings } = useSuspenseQuery(
    convexQuery(api.privacy.getMyPrivacySettings, {}),
  )

  // Mutations
  const updateProfilePrivacy = useMutation(api.privacy.updateProfilePrivacy)
  const updateGlobalPrivacy = useMutation(api.privacy.updateGlobalVisitPrivacy)

  if (!privacySettings) {
    return null
  }

  const handleUpgradeRequired = (featureName: string) => {
    setUpgradeFeatureName(featureName)
    setShowUpgradePrompt(true)
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Privacy Controls
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage who can see your profile information and activities
        </p>
      </div>

      {/* Hide Profile Visits - Free */}
      <PrivacyToggle
        setting="hideProfileVisits"
        label="Hide Visit History from Profile"
        description="When enabled, other users cannot see your visit history on your profile page"
        value={privacySettings.settings.hideProfileVisits || false}
        canModify={privacySettings.canModify.hideProfileVisits}
        onChange={async (checked) => {
          await updateProfilePrivacy({
            setting: 'hideProfileVisits',
            enabled: checked,
          })
        }}
      />

      {/* Hide Profile Events - Free */}
      <PrivacyToggle
        setting="hideProfileEvents"
        label="Hide Event Participation from Profile"
        description="When enabled, other users cannot see which events you've joined on your profile page"
        value={privacySettings.settings.hideProfileEvents || false}
        canModify={privacySettings.canModify.hideProfileEvents}
        onChange={async (checked) => {
          await updateProfilePrivacy({
            setting: 'hideProfileEvents',
            enabled: checked,
          })
        }}
      />

      {/* Global Visit Privacy - Pro Only */}
      <PrivacyToggle
        setting="globalVisitPrivacy"
        label="Hide All Visits from Discovery"
        description="When enabled, your visits are completely hidden from city pages and discovery features (Pro only)"
        value={privacySettings.settings.globalVisitPrivacy || false}
        canModify={privacySettings.canModify.globalVisitPrivacy}
        isProFeature
        onChange={async (checked) => {
          await updateGlobalPrivacy({ enabled: checked })
        }}
        onUpgradeRequired={() => handleUpgradeRequired('Global Visit Privacy')}
      />

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          featureName={upgradeFeatureName}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  )
}
