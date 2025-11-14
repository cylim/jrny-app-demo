import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { GoogleSignInButton } from '~/components/auth/google-sign-in-button'
import { Button } from '~/components/ui/button'
import { authClient } from '~/lib/auth-client'
import { api } from '~@/convex/_generated/api'

export const Route = createFileRoute('/')({
  component: Home,
})

/**
 * Renders the Home route: a session-aware landing page that shows a welcome/sign-in prompt or a personalized greeting, and a demo card to add and view persisted random numbers with a link to another page.
 *
 * @returns The JSX element for the Home route page
 */
function Home() {
  const {
    data: { numbers },
  } = useSuspenseQuery(convexQuery(api.myFunctions.listNumbers, { count: 10 }))

  const { data: session } = authClient.useSession()
  const addNumber = useMutation(api.myFunctions.addNumber)

  return (
    <main className="flex flex-col gap-16 p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {!session?.user ? (
          <div className="flex flex-col items-center gap-8 py-16 text-center">
            <h1 className="text-5xl font-bold">Welcome to JRNY</h1>
            <p className="text-xl text-muted-foreground">
              Track your travel journey and explore the world
            </p>
            <div className="mt-4 w-full max-w-xs">
              <GoogleSignInButton />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold">
              Welcome back, {session.user.name}!
            </h1>
            <p className="text-muted-foreground">
              Ready to continue your journey?
            </p>
          </div>
        )}

        <div className="flex flex-col gap-6 rounded-lg border p-8">
          <div>
            <h2 className="text-2xl font-bold">
              Demo: Convex + TanStack Start
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Click the button below and open this page in another window - data
              is persisted in the Convex cloud database!
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              type="button"
              onClick={() => {
                void addNumber({ value: Math.floor(Math.random() * 10) })
              }}
              className="w-fit"
            >
              Add a random number
            </Button>

            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium">Numbers:</p>
              <p className="mt-1 font-mono text-sm">
                {numbers.length === 0
                  ? 'Click the button!'
                  : numbers.join(', ')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-6 text-sm">
            <p>
              Edit{' '}
              <code className="rounded-md bg-muted px-1 py-0.5 font-mono font-bold">
                convex/myFunctions.ts
              </code>{' '}
              to change your backend
            </p>
            <p>
              Edit{' '}
              <code className="rounded-md bg-muted px-1 py-0.5 font-mono font-bold">
                src/routes/index.tsx
              </code>{' '}
              to change your frontend
            </p>
            <p>
              Open{' '}
              <Link
                to="/anotherPage"
                className="text-primary underline hover:no-underline"
              >
                another page
              </Link>{' '}
              to send an action
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}