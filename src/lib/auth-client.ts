import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // Use TanStack Start proxy at /api/auth for all requests
  // This eliminates CORS issues while OAuth callbacks still go to Convex
  // baseURL defaults to same-origin (localhost:3000/api/auth)
  plugins: [convexClient()],
})
