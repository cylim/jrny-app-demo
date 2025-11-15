import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CityListItem, FeaturedCity } from '~/types/city'

interface CityCardProps {
  city: FeaturedCity | CityListItem
  onClick: (city: FeaturedCity | CityListItem) => void
}

/**
 * CityCard component displays a city with Kirby styling
 * Includes hero image, city name, and formatted visit count
 * Features Framer Motion hover and tap effects
 * Accepts both FeaturedCity and CityListItem types
 *
 * @param city - City data with _id, name, image, and visitCount
 * @param onClick - Handler called when card is clicked
 */
export function CityCard({ city, onClick }: CityCardProps) {
  const formattedVisitCount = city.visitCount
    ? city.visitCount.toLocaleString('en-US')
    : '0'

  const handleClick = () => {
    onClick(city)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(city)
    }
  }

  return (
    <motion.button
      data-testid="city-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`View ${city.name} - ${formattedVisitCount} visits`}
      className={cn(
        'kirby-rounded relative overflow-hidden shadow-lg',
        'aspect-video w-full',
        'hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2',
        'transition-shadow duration-200',
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
    >
      {/* Full-bleed City Image */}
      {city.image ? (
        <img
          data-testid="city-image"
          src={city.image}
          alt={`${city.name} cityscape`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          data-testid="city-image"
          className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-200 to-purple-200"
          role="img"
          aria-label={`${city.name} placeholder`}
        >
          <span className="text-6xl font-bold text-white opacity-30">
            {city.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* City Info - Overlaid on image */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-4">
        <h3
          data-testid="city-name"
          className="text-xl font-bold text-white drop-shadow-lg"
        >
          {city.name}
        </h3>

        <p
          data-testid="visit-count"
          className="text-sm font-medium text-white/90 drop-shadow-md"
        >
          {formattedVisitCount} {city.visitCount === 1 ? 'visit' : 'visits'}
        </p>
      </div>
    </motion.button>
  )
}
