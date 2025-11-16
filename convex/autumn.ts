/**
 * Autumn Client Configuration
 *
 * Initializes the Autumn payment platform client for subscription management.
 * Integrates with Better-Auth for user identification.
 */

import { Autumn } from '@useautumn/convex'
import autumnConfig from '../autumn.config'
import { components } from './_generated/api'
import type { MutationCtx, QueryCtx } from './_generated/server'

/**
 * Autumn client instance
 *
 * Configured with:
 * - Secret key from environment (AUTUMN_SECRET_KEY)
 * - Tier and feature definitions from autumn.config.ts
 * - Better-Auth user identification
 */
export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY!,
  identify: async (ctx: QueryCtx | MutationCtx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    // Better-Auth provides subject field with user ID
    // This is the stable identifier for the user across sessions
    return identity.subject
  },
})

/**
 * Export config for use in other Convex functions
 * Useful for referencing tier names, feature IDs, etc.
 */
export { autumnConfig }
