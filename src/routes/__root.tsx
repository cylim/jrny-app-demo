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
import { ModeToggle } from '~/components/mode-toggle'
import { ThemeProvider } from '~/components/theme-provider'
import { UserNav } from '~/components/auth/user-nav'
import { Toaster } from '~/components/ui/sonner'
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

/**
 * Reports the rendering error to Sentry and renders a user-facing error page.
 *
 * The UI informs the user that an error occurred, offers "Reload page" and "Go home"
 * actions, and (in non-production builds) shows error message and stack trace.
 *
 * @param props.error - The caught Error object to report and display (dev-only).
 * @param props.info - Optional React error info; its component stack is sent to Sentry.
 * @returns A React element that renders the error page wrapped in RootDocument.
 */
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

/**
 * Provides the application's root component tree with authentication context and the document layout.
 *
 * @returns A React element that wraps the app in a ConvexBetterAuthProvider (supplying `convexClient` and `authClient`), renders the document layout via `RootDocument`, and mounts the matched child route with `Outlet`.
 */
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

/**
 * Renders the root HTML document and application layout used across all pages.
 *
 * @param children - Page content to render inside the document's main area
 * @returns The root HTML element containing head, themed body, site header, main content area, toasts, and client scripts
 */
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
              <div className="container flex h-14 max-w-screen-2xl items-center">
                <div className="mr-4 flex">
                  <Link to="/" className="mr-6 flex items-center space-x-2">
                    <span className="font-bold">JRNY</span>
                  </Link>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                  <nav className="flex items-center gap-2">
                    <ModeToggle />
                    <UserNav />
                  </nav>
                </div>
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  )
}