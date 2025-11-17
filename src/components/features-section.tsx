import { Calendar, Globe, Lock, MapPin, Sparkles, Users } from 'lucide-react'

export function FeaturesSection() {
  const features = [
    {
      icon: <MapPin className="h-8 w-8" />,
      title: 'Track Your Journey',
      description:
        'Log every city you visit with arrival and departure dates. Build your personal travel timeline and see where your adventures have taken you.',
      gradient: 'from-orange-400 to-amber-500',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Discover Fellow Travelers',
      description:
        'Find out who else is currently in your city or has visited the same places. Connect with travelers who share your path.',
      gradient: 'from-amber-400 to-yellow-500',
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: 'Organize Meetups',
      description:
        'Create and join events in cities you visit. From coffee meetups to group tours, make the most of your travels with local connections.',
      gradient: 'from-red-400 to-orange-500',
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: 'AI-Powered City Insights',
      description:
        'Get comprehensive information about every city powered by Firecrawl and Wikipedia. Learn about history, culture, attractions, and more.',
      gradient: 'from-pink-400 to-rose-500',
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: 'Privacy First',
      description:
        'Control your visibility with granular privacy settings. Hide your profile, individual visits, or event participation whenever you want.',
      gradient: 'from-sky-400 to-blue-500',
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: 'Lightning Fast',
      description:
        'Built on Convex for real-time updates and deployed on Cloudflare Workers for global edge performance. Experience instant updates anywhere.',
      gradient: 'from-yellow-400 to-orange-400',
    },
  ]

  return (
    <section className="mx-auto w-full max-w-7xl py-16">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Everything You Need to Track Your Adventures
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">
          Powerful features to help you document and share your travel journey
        </p>
      </div>

      <div className="grid gap-8 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group kirby-rounded-sm overflow-hidden border bg-card/30 p-6 shadow-sm transition-all hover:shadow-lg"
          >
            <div
              className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-md transition-transform group-hover:scale-110`}
            >
              {feature.icon}
            </div>
            <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
