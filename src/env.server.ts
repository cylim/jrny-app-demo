import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const serverEnv = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    CONVEX_SITE_URL: z.url().min(10),
    CONVEX_DEPLOYMENT: z.string(),
    SITE_URL: z.url().min(10),
  },

  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: process.env,

  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
