import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { Button } from '~/components/ui/button'
import { api } from '~@/convex/_generated/api'

export const Route = createFileRoute('/anotherPage')({
  component: AnotherPage,
})

/**
 * Renders the "Convex + Tanstack Start" page that displays a list of numbers and provides a control to add a random number.
 *
 * Shows the fetched numbers, a button that invokes the Convex action to add a random number and displays a success alert, and a link back to the root.
 *
 * @returns The page's JSX element.
 */
function AnotherPage() {
  const callMyAction = useAction(api.myFunctions.myAction)

  const { data } = useSuspenseQuery(
    convexQuery(api.myFunctions.listNumbers, { count: 10 }),
  )

  return (
    <main className="p-8 flex flex-col gap-16">
      <h1 className="text-4xl font-bold text-center">
        Convex + Tanstack Start
      </h1>
      <div className="flex flex-col gap-8 max-w-lg mx-auto">
        <p>Numbers: {data.numbers.join(', ')}</p>
        <p>Click the button below to add a random number to the database.</p>
        <p>
          <Button
            onClick={() => {
              callMyAction({
                first: Math.round(Math.random() * 100),
              }).then(() => alert('Number added!'))
            }}
          >
            Call action to add a random number
          </Button>
        </p>
        <Link to="/" className="text-blue-600 underline hover:no-underline">
          Back
        </Link>
      </div>
    </main>
  )
}