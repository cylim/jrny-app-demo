import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '~@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/c/$shortSlug')({
  component: CityPage,
})

function CityPage() {
  const { shortSlug } = Route.useParams()
  const { data: session } = authClient.useSession()

  // Fetch city data
  const { data: city } = useSuspenseQuery(
    convexQuery(api.cities.getCityByShortSlug, { shortSlug }),
  )

  if (!city) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">City Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The city you're looking for doesn't exist in our database.
          </p>
          <a href="/" className="text-primary hover:underline font-medium">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* City Header */}
      <div className="max-w-4xl mx-auto">
        {city.image && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={city.image}
              alt={city.name}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{city.name}</h1>
          <p className="text-xl text-muted-foreground">
            {city.country} • {city.region}
          </p>
        </div>

        {/* Geographic Information */}
        <div className="bg-muted/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Location Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latitude</p>
              <p className="font-medium">{city.latitude}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Longitude</p>
              <p className="font-medium">{city.longitude}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Country Code</p>
              <p className="font-medium">{city.countryCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Region</p>
              <p className="font-medium">{city.region}</p>
            </div>
          </div>
        </div>

        {/* Who's Here Now Section - Only for logged-in users */}
        {session?.user ? (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Who's Here Now</h2>
            <p className="text-muted-foreground">
              This section will show travelers currently in {city.name}.
            </p>
            {/* TODO: Implement visitor list feature */}
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">
              See Who's Traveling Here
            </h2>
            <p className="text-muted-foreground mb-4">
              Log in to discover other travelers in {city.name} and connect with
              people visiting this destination.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
            >
              Sign In to View Travelers
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
