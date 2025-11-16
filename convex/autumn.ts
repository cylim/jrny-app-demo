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
  secretKey: (() => {
    const key = process.env.AUTUMN_SECRET_KEY
    if (!key) {
      throw new Error(
        'AUTUMN_SECRET_KEY environment variable is not set.\nRun: npx convex env set AUTUMN_SECRET_KEY "am_sk_test_..."',
      )
    }
    return key
  })(),
  identify: async (ctx: QueryCtx | MutationCtx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    // Better-Auth provides subject field with user ID
    // This is the stable identifier for the user across sessions
    // Validate subject exists before using it as customerId
    if (!identity.subject) {
      throw new Error(
        'Identity subject is missing - cannot create customer without stable user ID',
      )
    }

    return {
      customerId: identity.subject,
      customerData: {
        name: (identity.name as string) || '',
        email: (identity.email as string) || '',
      },
    }
  },
})

/**
 * Export Autumn API functions for use in other Convex functions
 * These functions handle subscription management, checkout, and feature access
 */
export const {
  track,
  cancel,
  query,
  attach,
  check,
  checkout,
  usage,
  setupPayment,
  createCustomer,
  listProducts,
  billingPortal,
  createReferralCode,
  redeemReferralCode,
  createEntity,
  getEntity,
} = autumn.api()

/**
 * Export config for use in other Convex functions
 * Useful for referencing tier names, feature IDs, etc.
 */
export { autumnConfig }
