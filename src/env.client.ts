import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const clientEnv = createEnv({
  /**
   * Specify your client-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   * To expose them to the client, prefix them with `VITE_`.
   */
  clientPrefix: 'VITE_',
  client: {
    VITE_CONVEX_URL: z.url().min(10),
    VITE_CONVEX_SITE_URL: z.url().min(10),
    VITE_SENTRY_DSN: z.url().min(10),
  },

  /**
   * You can't destruct `import.meta.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: import.meta.env,

  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
