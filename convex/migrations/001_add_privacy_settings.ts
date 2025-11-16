/**
 * Migration: Add Privacy Settings and Subscription Fields
 *
 * This migration backfills the new `settings` and `subscription` fields
 * for existing users with default values.
 *
 * Default values:
 * - settings.hideProfileVisits: false (visit history visible)
 * - settings.hideProfileEvents: false (event participation visible)
 * - settings.globalVisitPrivacy: false (visits visible in discovery)
 * - subscription.tier: 'free'
 * - subscription.status: 'active'
 * - subscription.lastSyncedAt: current timestamp
 *
 * Run this migration after deploying the schema changes.
 */

import { internalMutation } from '../_generated/server'

export const backfillPrivacyAndSubscription = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all users without settings or subscription
    const users = await ctx.db.query('users').collect()

    let updatedCount = 0
    let skippedCount = 0

    for (const user of users) {
      const needsUpdate =
        !user.settings ||
        !user.subscription ||
        !user.settings.hideProfileVisits ||
        !user.settings.hideProfileEvents ||
        !user.settings.globalVisitPrivacy

      if (needsUpdate) {
        await ctx.db.patch(user._id, {
          settings: {
            // Preserve existing values if they exist, otherwise use defaults
            hideProfileVisits: user.settings?.hideProfileVisits ?? false,
            hideProfileEvents: user.settings?.hideProfileEvents ?? false,
            globalVisitPrivacy: user.settings?.globalVisitPrivacy ?? false,
            // Preserve legacy fields for backward compatibility
            hideVisitHistory: user.settings?.hideVisitHistory ?? false,
            globalPrivacy: user.settings?.globalPrivacy ?? false,
          },
          subscription: user.subscription ?? {
            tier: 'free' as const,
            status: 'active' as const,
            lastSyncedAt: Date.now(),
          },
        })
        updatedCount++
      } else {
        skippedCount++
      }
    }

    return {
      total: users.length,
      updated: updatedCount,
      skipped: skippedCount,
      message: `Migration complete: ${updatedCount} users updated, ${skippedCount} already had settings`,
    }
  },
})
