import type { GenericCtx } from '@convex-dev/better-auth'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { query } from './_generated/server'

const convexSiteUrl = process.env.CONVEX_SITE_URL!
const frontendUrl = process.env.SITE_URL!

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    // Use frontend URL as baseURL when using TanStack Start proxy
    // This ensures OAuth callbacks go through the proxy on the same domain
    baseURL: frontendUrl,
    database: authComponent.adapter(ctx),
    // Allow requests from your application URLs
    trustedOrigins: [
      convexSiteUrl, // Convex site URL
      frontendUrl, // Your app URL (localhost:3000 in dev)
    ],
    // Advanced session configuration
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production',
      // No cross-domain config needed - everything goes through the same-origin proxy
    },
    // Configure Google OAuth for authentication
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        accessType: 'offline',
        prompt: 'select_account consent',
        // No explicit redirectURI - will use baseURL/api/auth/callback/google
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  })
}

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
})
