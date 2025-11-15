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
        'kirby-rounded overflow-hidden bg-white shadow-lg',
        'flex flex-col items-stretch',
        'hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2',
        'transition-shadow duration-200',
        'w-full',
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
    >
      {/* City Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
        {city.image ? (
          <img
            data-testid="city-image"
            src={city.image}
            alt={`${city.name} cityscape`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            data-testid="city-image"
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-200 to-purple-200"
            role="img"
            aria-label={`${city.name} placeholder`}
          >
            <span className="text-4xl font-bold text-white opacity-30">
              {city.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* City Info */}
      <div className="flex flex-col items-start gap-2 p-4">
        <h3
          data-testid="city-name"
          className="text-lg font-semibold text-gray-800"
        >
          {city.name}
        </h3>

        <p data-testid="visit-count" className="text-sm text-gray-600">
          {formattedVisitCount} {city.visitCount === 1 ? 'visit' : 'visits'}
        </p>
      </div>
    </motion.button>
  )
}
