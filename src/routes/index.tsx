import { createFileRoute, useRouter } from '@tanstack/react-router'
import { GoogleSignInButton } from '~/components/auth/google-sign-in-button'
import { CityShowcase } from '~/components/city-showcase'
import { Button } from '~/components/ui/button'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/')({
  component: Home,
})

/**
 * Renders the Home route: Landing page with hero section, featured cities showcase,
 * and a demo section showing Convex + TanStack Start integration
 *
 * @returns The JSX element for the Home route page
 */
function Home() {
  const router = useRouter()

  const { data: session } = authClient.useSession()

  const handleExploreCities = () => {
    // Navigate to discover/cities page
    // For now, using a placeholder route - will be created later
    router.navigate({ to: '/discover' })
  }

  return (
    <main className="relative flex flex-col gap-16 p-4 sm:p-8">
      {/* Hero Section with CTA */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 py-12 text-center sm:py-16">
        {!session?.user ? (
          <>
            <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
              Welcome to JRNY
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Track your travel journey and explore the world's most amazing
              cities
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                data-testid="cta-button"
                variant="kirby"
                size="lg"
                onClick={handleExploreCities}
                className="kirby-rounded bg-gradient-to-r from-pink-400 to-purple-400 px-8 py-6 text-lg font-semibold text-white shadow-lg hover:from-pink-500 hover:to-purple-500"
              >
                Explore Cities
              </Button>
              <div className="w-full sm:w-auto">
                <GoogleSignInButton />
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold sm:text-5xl">
              Welcome back, {session.user.name}!
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Ready to continue your journey? Explore featured cities below
            </p>
            <Button
              data-testid="cta-button"
              variant="kirby"
              size="lg"
              onClick={handleExploreCities}
              className="kirby-rounded bg-gradient-to-r from-pink-400 to-purple-400 px-8 py-6 text-lg font-semibold text-white shadow-lg hover:from-pink-500 hover:to-purple-500"
            >
              Explore Cities
            </Button>
          </>
        )}
      </section>

      {/* Featured Cities Showcase */}
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Featured Cities</h2>
          <p className="mt-2 text-muted-foreground">
            Discover popular destinations from around the world
          </p>
        </div>
        <CityShowcase count={8} />
      </section>
    </main>
  )
}
