/**
 * Privacy Settings Panel Component
 *
 * Displays privacy toggle controls for user profile settings.
 */

import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { PrivacyToggle } from './privacy-toggle'

export function PrivacySettingsPanel() {
  const { data } = useSuspenseQuery(
    convexQuery(api.privacy.getMyPrivacySettings, {}),
  )

  const handleUpgradeRequired = () => {
    // TODO: Show upgrade prompt modal
    console.log('Upgrade to Pro required')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Privacy Settings</h3>
        <p className="text-sm text-muted-foreground">
          Control what information is visible on your profile
        </p>
      </div>

      <div className="space-y-4">
        <PrivacyToggle
          setting="hideProfileVisits"
          label="Hide Profile Visits"
          description="Other users won't see your visit history on your profile"
          value={data.settings.hideProfileVisits ?? false}
          canModify={data.canModify.hideProfileVisits}
        />

        <PrivacyToggle
          setting="hideProfileEvents"
          label="Hide Profile Events"
          description="Other users won't see your event participation"
          value={data.settings.hideProfileEvents ?? false}
          canModify={data.canModify.hideProfileEvents}
        />

        <PrivacyToggle
          setting="globalVisitPrivacy"
          label="Global Visit Privacy"
          description="Hide all your visits from city pages and discovery"
          value={data.settings.globalVisitPrivacy ?? false}
          canModify={data.canModify.globalVisitPrivacy}
          proOnly={true}
          onUpgradeRequired={handleUpgradeRequired}
        />
      </div>

      {data.tier === 'free' && (
        <p className="text-sm text-muted-foreground">
          Upgrade to Pro to unlock Global Visit Privacy
        </p>
      )}
    </div>
  )
}
