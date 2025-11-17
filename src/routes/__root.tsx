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
import { AnimatedBackground } from '~/components/animated-background'
import { AnimatedTrees } from '~/components/animated-trees'
import { Footer } from '~/components/footer'
import { Header } from '~/components/header'
import { RouteLoadingBar } from '~/components/route-loading-bar'
import { ThemeProvider } from '~/components/theme-provider'
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
            <Link to="/">Go home</Link>
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
        title: 'JRNY - Travel Tracker & City Explorer',
      },
      {
        name: 'description',
        content:
          "Track your travel journey and explore the world's most amazing cities with JRNY. Discover who's traveling now and connect with fellow explorers.",
      },
      {
        name: 'keywords',
        content:
          'travel tracker, city explorer, travel app, journey planner, travel community, city discovery, travel history',
      },
      {
        name: 'author',
        content: 'JRNY',
      },
      {
        name: 'theme-color',
        content: '#ec4899',
      },
      // Open Graph / Facebook
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: 'JRNY',
      },
      {
        property: 'og:title',
        content: 'JRNY - Track Your Travels & Explore Cities',
      },
      {
        property: 'og:description',
        content:
          "Track your travel journey and explore the world's most amazing cities. Discover who's traveling now and connect with fellow explorers.",
      },
      {
        property: 'og:image',
        content: `${import.meta.env.SITE_URL || 'https://demo.jrny.app'}/android-chrome-512x512.png`,
      },
      {
        property: 'og:image:width',
        content: '512',
      },
      {
        property: 'og:image:height',
        content: '512',
      },
      {
        property: 'og:image:alt',
        content: 'JRNY - Travel Tracker & City Explorer',
      },
      // Twitter
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'JRNY - Track Your Travels & Explore Cities',
      },
      {
        name: 'twitter:description',
        content:
          "Track your travel journey and explore the world's most amazing cities. Discover who's traveling now and connect with fellow explorers.",
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.SITE_URL || 'https://demo.jrny.app'}/android-chrome-512x512.png`,
      },
      {
        name: 'twitter:image:alt',
        content: 'JRNY - Travel Tracker & City Explorer',
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
      <body className="bg-gradient-to-br from-orange-200 via-pink-200 to-purple-300 text-foreground dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-orange-900">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <RouteLoadingBar />
          {/* <AnimatedBackground variant="bubbles" intensity="moderate" /> */}
          <AnimatedBackground variant="particles" intensity="subtle" />
          <div className="relative z-10 flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <div className="sticky -bottom-16 z-10">
            <AnimatedTrees />
            <Footer />
          </div>
          <Toaster />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  )
}
