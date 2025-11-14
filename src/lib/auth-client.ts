import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'


const baseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.SITE_URL ?? 'http://localhost:3000'

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient()],
})
