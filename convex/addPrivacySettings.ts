/**
 * Migration: Add Privacy Settings and Subscription Fields
 *
 * Backfills existing users with default privacy settings and free tier subscription.
 * Safe to run multiple times (idempotent).
 */

import { internalMutation } from './_generated/server'

export const backfillPrivacySettings = internalMutation({
  args: {},
  returns: undefined,
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()

    let updatedCount = 0
    let skippedCount = 0

    for (const user of users) {
      // Check if user already has the unified privacy fields
      const hasNewFields =
        user.settings?.hideProfileVisits !== undefined &&
        user.settings?.hideProfileEvents !== undefined &&
        user.settings?.globalVisitPrivacy !== undefined

      if (!hasNewFields) {
        // Migrate from legacy field names to new unified names
        const currentSettings = user.settings || {}

        await ctx.db.patch(user._id, {
          settings: {
            // Map legacy hideVisitHistory -> hideProfileVisits
            hideProfileVisits:
              currentSettings.hideProfileVisits ??
              currentSettings.hideVisitHistory ??
              false,
            // New field - default false
            hideProfileEvents: currentSettings.hideProfileEvents ?? false,
            // Map legacy globalPrivacy -> globalVisitPrivacy
            globalVisitPrivacy:
              currentSettings.globalVisitPrivacy ??
              currentSettings.globalPrivacy ??
              false,
          },
          subscription: user.subscription || {
            tier: 'free', // All existing users start on free tier
            status: 'active',
            lastSyncedAt: Date.now(),
          },
        })
        updatedCount++
      } else {
        skippedCount++
      }
    }

    console.log(`Privacy settings migration complete:`)
    console.log(`  - Updated: ${updatedCount} users`)
    console.log(`  - Skipped: ${skippedCount} users (already migrated)`)
  },
})
