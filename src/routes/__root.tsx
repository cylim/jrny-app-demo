import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import {
  fetchSession,
  getCookieName,
} from '@convex-dev/better-auth/react-start'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import type { QueryClient } from '@tanstack/react-query'
import type { ErrorComponentProps } from '@tanstack/react-router'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouteContext,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookie, getRequest } from '@tanstack/react-start/server'
import type { ConvexReactClient } from 'convex/react'
import * as React from 'react'
import { UserNav } from '~/components/auth/user-nav'
import { authClient } from '~/lib/auth-client'
import appCss from '~/styles/app.css?url'

const fetchAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { createAuth } = await import('~@/convex/auth')
  const { session } = await fetchSession(getRequest())
  const sessionCookieName = getCookieName(createAuth)
  const token = getCookie(sessionCookieName)
  return {
    userId: session?.user.id,
    token,
  }
})

// Custom error component that reports errors to Sentry
function RootErrorComponent(props: ErrorComponentProps) {
  React.useEffect(() => {
    // Capture the error to Sentry
    Sentry.captureException(props.error, {
      contexts: {
        react: {
          componentStack: props.info?.componentStack,
        },
      },
    })
  }, [props.error, props.info])

  return (
    <RootDocument>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold text-red-500">
            Something went wrong
          </h1>
          <p className="text-neutral-300">
            An error occurred while rendering this page. The error has been
            reported to our team.
          </p>
          {import.meta.env.MODE !== 'production' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-300">
                Error details (dev only)
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-neutral-900 p-2 text-xs text-red-400">
                {props.error.message}
                {'\n\n'}
                {props.error.stack}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/'
              }}
              className="rounded bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    </RootDocument>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: RootErrorComponent,
  notFoundComponent: () => <div>Route not found</div>,
  beforeLoad: async (ctx) => {
    // all queries, mutations and action made with TanStack Query will be
    // authenticated by an identity token.
    const { userId, token } = await fetchAuth()
    // During SSR only (the only time serverHttpClient exists),
    // set the auth token to make HTTP queries with.
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    }
    return { userId, token }
  },
  component: RootComponent,
})

function RootComponent() {
  const context = useRouteContext({ from: Route.id })
  return (
    <ConvexBetterAuthProvider
      client={context.convexClient}
      authClient={authClient}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ConvexBetterAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center">
              <div className="mr-4 flex">
                <Link to="/" className="mr-6 flex items-center space-x-2">
                  <span className="font-bold">JRNY</span>
                </Link>
              </div>
              <div className="flex flex-1 items-center justify-end space-x-2">
                <nav className="flex items-center">
                  <UserNav />
                </nav>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
