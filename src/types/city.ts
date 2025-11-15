import { z } from 'zod'
import type { Id } from '~@/convex/_generated/dataModel'

/**
 * Featured City schema for landing page showcase
 * Matches the return type from api.cities.getFeaturedCities
 */
export const FeaturedCitySchema = z.object({
  _id: z.string() as unknown as z.ZodType<Id<'cities'>>,
  name: z.string(),
  image: z.string().nullable(),
  shortSlug: z.string(),
  visitCount: z.number().nullable(),
  currentVisitorCount: z.number().optional(),
})

export type FeaturedCity = z.infer<typeof FeaturedCitySchema>

/**
 * Fallback cities used when Convex query fails
 * These are hardcoded popular cities to ensure the landing page always displays content
 *
 * Note: _id values are placeholder strings since we don't have actual IDs
 * Image URLs should be replaced with actual hosted images or use a placeholder service
 */
export const FALLBACK_CITIES: FeaturedCity[] = [
  {
    _id: 'tokyo' as Id<'cities'>,
    name: 'Tokyo',
    shortSlug: 'tokyo',
    image:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=450&fit=crop',
    visitCount: 1500,
  },
  {
    _id: 'paris' as Id<'cities'>,
    name: 'Paris',
    shortSlug: 'paris',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=450&fit=crop',
    visitCount: 1350,
  },
  {
    _id: 'new-york-city' as Id<'cities'>,
    name: 'New York',
    shortSlug: 'new-york-city',
    image:
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=450&fit=crop',
    visitCount: 1200,
  },
  {
    _id: 'london' as Id<'cities'>,
    name: 'London',
    shortSlug: 'london',
    image:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=450&fit=crop',
    visitCount: 1100,
  },
  {
    _id: 'barcelona' as Id<'cities'>,
    name: 'Barcelona',
    shortSlug: 'barcelona',
    image:
      'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=450&fit=crop',
    visitCount: 950,
  },
  {
    _id: 'dubai' as Id<'cities'>,
    name: 'Dubai',
    shortSlug: 'dubai',
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=450&fit=crop',
    visitCount: 900,
  },
  {
    _id: 'singapore' as Id<'cities'>,
    name: 'Singapore',
    shortSlug: 'singapore',
    image:
      'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=450&fit=crop',
    visitCount: 850,
  },
  {
    _id: 'rome' as Id<'cities'>,
    name: 'Rome',
    shortSlug: 'rome',
    image:
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=450&fit=crop',
    visitCount: 800,
  },
]

/**
 * Full city details schema for city pages
 * Matches the return type from api.cities.getCityByShortSlug
 */
export const CityDetailsSchema = z.object({
  _id: z.string() as unknown as z.ZodType<Id<'cities'>>,
  name: z.string(),
  slug: z.string(),
  shortSlug: z.string(),
  country: z.string(),
  countryCode: z.string(),
  countrySlug: z.string(),
  region: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  image: z.string().nullable(),
  visitCount: z.number().nullable(),
})

export type CityDetails = z.infer<typeof CityDetailsSchema>

/**
 * City list item schema for discover page
 * Matches the return type from api.cities.getAllCities
 */
export const CityListItemSchema = z.object({
  _id: z.string() as unknown as z.ZodType<Id<'cities'>>,
  name: z.string(),
  slug: z.string(),
  shortSlug: z.string(),
  country: z.string(),
  countryCode: z.string(),
  region: z.string(),
  image: z.string().nullable(),
  visitCount: z.number().nullable(),
  currentVisitorCount: z.number().optional(),
})

export type CityListItem = z.infer<typeof CityListItemSchema>
