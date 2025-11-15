import { ConvexQueryClient } from '@convex-dev/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { clientEnv } from '~/env.client'
import { routeTree } from './routeTree.gen'

/**
 * Create and configure the application's router with Convex clients, React Query integration, and client-side Sentry initialization.
 *
 * The router is wrapped to provide a React Query client and Convex client instances via context and uses a ConvexQueryClient for query hashing and fetching. Sentry is initialized for client-side error, performance, replay, and feedback integrations when running in the browser.
 *
 * @returns The configured router instance
 */
export function getRouter() {
  const CONVEX_URL = clientEnv.VITE_CONVEX_URL
  const convex = new ConvexReactClient(CONVEX_URL, {
    unsavedChangesWarning: false,
  })
  const convexQueryClient = new ConvexQueryClient(convex)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      scrollRestoration: true,
      context: { queryClient, convexClient: convex, convexQueryClient },
      Wrap: ({ children }) => (
        <ConvexProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexProvider>
      ),
    }),
    queryClient,
  )

  // Initialize Sentry on the client side
  if (!router.isServer) {
    Sentry.init({
      dsn: clientEnv.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',

      // Integrations
      integrations: [
        // Performance monitoring for route changes
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        // Session replay for debugging user sessions
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
        // User feedback widget
        Sentry.feedbackIntegration({
          colorScheme: 'system',
        }),
      ],

      // Performance Monitoring sample rate
      // 1.0 = 100% of transactions are sent to Sentry
      // Adjust lower for production (e.g., 0.1 = 10%)
      tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

      // Session Replay sample rates
      // This sets the sample rate at 10%. You may want to change it to 100% while in development
      // and then sample at a lower rate in production.
      replaysSessionSampleRate:
        import.meta.env.MODE === 'production' ? 0.1 : 1.0,

      // If you're not already sampling the entire session, change the sample rate to 100%
      // when sampling sessions where errors occur.
      replaysOnErrorSampleRate: 1.0,

      // Adds request headers and IP for users
      sendDefaultPii: true,
    })
  }

  return router
}
