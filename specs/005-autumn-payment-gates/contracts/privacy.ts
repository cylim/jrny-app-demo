/**
 * API Contract: Privacy Settings Management
 *
 * Convex functions for managing user privacy settings and enforcing
 * feature gates based on subscription tier.
 */

import { v } from 'convex/values'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Privacy settings configuration
 */
export type PrivacySettings = {
  // Free + Pro tier features
  hideProfileVisits: boolean // Hide visit list from profile page
  hideProfileEvents: boolean // Hide event participation from profile page

  // Pro-only features
  globalVisitPrivacy: boolean // Hide ALL visits from discovery features
}

/**
 * Privacy setting keys
 */
export type PrivacySettingKey =
  | 'hideProfileVisits'
  | 'hideProfileEvents'
  | 'globalVisitPrivacy'

// ============================================================================
// Convex Function Signatures
// ============================================================================

/**
 * Get current user's privacy settings
 *
 * @returns Privacy configuration with tier-specific access flags
 * @throws Error if user not authenticated
 */
export const getMyPrivacySettings = {
  args: {},
  returns: v.object({
    settings: v.object({
      hideProfileVisits: v.boolean(),
      hideProfileEvents: v.boolean(),
      globalVisitPrivacy: v.boolean(),
    }),
    tier: v.union(v.literal('free'), v.literal('pro')),
    canModify: v.object({
      hideProfileVisits: v.boolean(), // Always true
      hideProfileEvents: v.boolean(), // Always true
      globalVisitPrivacy: v.boolean(), // True only for Pro
    }),
  }),
}

/**
 * Update profile-level privacy setting (Free + Pro)
 *
 * Toggle hideProfileVisits or hideProfileEvents.
 * Available to all users regardless of tier.
 *
 * @param setting - Which profile privacy setting to update
 * @param enabled - New value for the setting
 * @returns Updated privacy settings
 * @throws Error if invalid setting key
 * @throws Error if user not authenticated
 */
export const updateProfilePrivacy = {
  args: {
    setting: v.union(
      v.literal('hideProfileVisits'),
      v.literal('hideProfileEvents'),
    ),
    enabled: v.boolean(),
  },
  returns: v.object({
    settings: v.object({
      hideProfileVisits: v.boolean(),
      hideProfileEvents: v.boolean(),
      globalVisitPrivacy: v.boolean(),
    }),
    message: v.string(), // Confirmation message
  }),
}

/**
 * Update global visit privacy setting (Pro only)
 *
 * Toggle globalVisitPrivacy to hide ALL visits from discovery features.
 * Requires Pro subscription - throws error for free users.
 *
 * @param enabled - New value for global privacy
 * @returns Updated privacy settings
 * @throws Error if user not on Pro tier
 * @throws Error if user not authenticated
 */
export const updateGlobalVisitPrivacy = {
  args: {
    enabled: v.boolean(),
  },
  returns: v.object({
    settings: v.object({
      hideProfileVisits: v.boolean(),
      hideProfileEvents: v.boolean(),
      globalVisitPrivacy: v.boolean(),
    }),
    message: v.string(),
  }),
}

/**
 * Update individual visit privacy flag (Pro only)
 *
 * Mark specific visit as private/public using the existing `isPrivate` field.
 * Requires Pro subscription - throws error for free users.
 *
 * @param visitId - ID of visit to update
 * @param isPrivate - Whether visit should be private
 * @returns Updated visit with privacy flag
 * @throws Error if user not on Pro tier
 * @throws Error if user doesn't own the visit
 * @throws Error if user not authenticated
 */
export const updateVisitPrivacy = {
  args: {
    visitId: v.id('visits'),
    isPrivate: v.boolean(),
  },
  returns: v.object({
    visitId: v.id('visits'),
    isPrivate: v.boolean(),
    message: v.string(),
  }),
}

/**
 * Get privacy-filtered visits for a city
 *
 * Returns list of visits to a city, filtered by privacy settings.
 * Excludes visits where:
 *   - User has globalVisitPrivacy enabled
 *   - Visit has isPrivate = true (Pro-only feature)
 *   - Viewer is not the visit owner
 *
 * @param cityId - City to query visits for
 * @param viewerId - Optional user ID viewing the list (for ownership check)
 * @returns Filtered list of visits
 */
export const getCityVisits = {
  args: {
    cityId: v.id('cities'),
    viewerId: v.optional(v.id('users')), // Authenticated viewer
  },
  returns: v.array(
    v.object({
      visitId: v.id('visits'),
      userId: v.id('users'),
      username: v.string(),
      userImage: v.optional(v.string()),
      startDate: v.number(),
      endDate: v.optional(v.number()),
      isCurrentlyVisiting: v.boolean(), // No end date or future end date
      // Note: isPrivate is NOT returned for privacy (only owner can see this flag)
    }),
  ),
}

/**
 * Get privacy-filtered visits for a user profile
 *
 * Returns list of visits for a user's profile page, filtered by privacy settings.
 * If profile owner has hideProfileVisits enabled and viewer is not the owner,
 * returns empty array.
 *
 * @param username - Username of profile to view
 * @param viewerId - Optional user ID viewing the profile
 * @returns Filtered list of visits or empty if hidden
 */
export const getUserProfileVisits = {
  args: {
    username: v.string(),
    viewerId: v.optional(v.id('users')),
  },
  returns: v.union(
    v.array(
      v.object({
        visitId: v.id('visits'),
        cityId: v.id('cities'),
        cityName: v.string(),
        citySlug: v.string(),
        startDate: v.number(),
        endDate: v.optional(v.number()),
        notes: v.optional(v.string()),
        isPrivate: v.boolean(), // Shown to owner only
      }),
    ),
    v.object({
      hidden: v.literal(true),
      message: v.string(), // "This user's visit history is private"
    }),
  ),
}

/**
 * Get privacy-filtered events for a user profile
 *
 * Returns list of events for a user's profile page, filtered by privacy settings.
 * If profile owner has hideProfileEvents enabled and viewer is not the owner,
 * returns empty array.
 *
 * @param username - Username of profile to view
 * @param viewerId - Optional user ID viewing the profile
 * @returns Filtered list of events or empty if hidden
 */
export const getUserProfileEvents = {
  args: {
    username: v.string(),
    viewerId: v.optional(v.id('users')),
  },
  returns: v.union(
    v.array(
      v.object({
        eventId: v.id('events'),
        title: v.string(),
        cityId: v.id('cities'),
        cityName: v.string(),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        isOrganizer: v.boolean(),
      }),
    ),
    v.object({
      hidden: v.literal(true),
      message: v.string(), // "This user's event participation is private"
    }),
  ),
}

/**
 * Check if visit should be visible to viewer
 *
 * Internal helper function to determine visit visibility based on privacy rules.
 * Used by other functions to filter visits consistently.
 *
 * @param visitId - Visit to check
 * @param viewerId - Optional user viewing the visit
 * @returns True if visible, false if hidden by privacy settings
 */
export const isVisitVisible = {
  args: {
    visitId: v.id('visits'),
    viewerId: v.optional(v.id('users')),
  },
  returns: v.boolean(),
}

/**
 * Batch update privacy settings
 *
 * Update multiple privacy settings in a single transaction.
 * Only updates settings user has permission to modify based on tier.
 *
 * @param updates - Object with privacy setting keys and new values
 * @returns Updated settings and list of any settings that were skipped
 * @throws Error if user not authenticated
 */
export const batchUpdatePrivacySettings = {
  args: {
    updates: v.object({
      hideProfileVisits: v.optional(v.boolean()),
      hideProfileEvents: v.optional(v.boolean()),
      globalVisitPrivacy: v.optional(v.boolean()),
    }),
  },
  returns: v.object({
    settings: v.object({
      hideProfileVisits: v.boolean(),
      hideProfileEvents: v.boolean(),
      globalVisitPrivacy: v.boolean(),
    }),
    skipped: v.array(v.string()), // Settings not updated (e.g., "globalVisitPrivacy" for free users)
    message: v.string(),
  }),
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Privacy settings panel component
 *
 * Frontend:
 *   const { settings, tier, canModify } = await getMyPrivacySettings();
 *
 *   return (
 *     <>
 *       <Toggle
 *         checked={settings.hideProfileVisits}
 *         onChange={(val) => updateProfilePrivacy({ setting: "hideProfileVisits", enabled: val })}
 *       />
 *       <Toggle
 *         checked={settings.hideProfileEvents}
 *         onChange={(val) => updateProfilePrivacy({ setting: "hideProfileEvents", enabled: val })}
 *       />
 *       <Toggle
 *         checked={settings.globalVisitPrivacy}
 *         disabled={!canModify.globalVisitPrivacy}  // Disabled for free users
 *         onChange={(val) => updateGlobalVisitPrivacy({ enabled: val })}
 *       />
 *       {!canModify.globalVisitPrivacy && <UpgradePrompt feature="global privacy" />}
 *     </>
 *   );
 */

/**
 * Example: City visitor list with privacy filtering
 *
 * Frontend:
 *   const visits = await getCityVisits({
 *     cityId: "j1234...",
 *     viewerId: currentUser?._id  // undefined for anonymous
 *   });
 *
 *   return visits.map(visit => (
 *     <VisitorCard
 *       key={visit.visitId}
 *       username={visit.username}
 *       image={visit.userImage}
 *       dates={`${formatDate(visit.startDate)} - ${formatDate(visit.endDate)}`}
 *       isCurrentlyVisiting={visit.isCurrentlyVisiting}
 *     />
 *   ));
 *
 * Backend (Convex query):
 *   - Query visits by city
 *   - For each visit:
 *     - Get user's privacy settings
 *     - Check if viewer is visit owner
 *     - Apply privacy rules (global, individual, profile)
 *     - Exclude if any privacy rule hides visit
 *   - Return filtered list
 */

/**
 * Example: Profile page visit history
 *
 * Frontend:
 *   const visits = await getUserProfileVisits({
 *     username: "johndoe",
 *     viewerId: currentUser?._id
 *   });
 *
 *   if (visits.hidden) {
 *     return <div>{visits.message}</div>;  // "This user's visit history is private"
 *   }
 *
 *   return visits.map(visit => <VisitCard {...visit} />);
 *
 * Backend (Convex query):
 *   - Get profile owner's privacy settings
 *   - If hideProfileVisits=true AND viewer !== owner:
 *     - Return { hidden: true, message: "..." }
 *   - Otherwise: Return filtered visit list
 */

/**
 * Example: Individual visit privacy toggle (Pro feature)
 *
 * Frontend:
 *   <Toggle
 *     checked={visit.isPrivate}
 *     onChange={async (val) => {
 *       try {
 *         await updateVisitPrivacy({ visitId: visit._id, isPrivate: val });
 *       } catch (err) {
 *         if (err.message.includes("Pro subscription")) {
 *           showUpgradePrompt();
 *         }
 *       }
 *     }}
 *   />
 *
 * Backend (Convex mutation):
 *   - Check user owns visit
 *   - Check user has Pro tier (via autumn.check())
 *   - If Pro: Update visit.isPrivateVisit
 *   - If Free: Throw error "Pro subscription required"
 */
