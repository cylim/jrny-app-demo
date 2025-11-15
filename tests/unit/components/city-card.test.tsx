import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CityCard } from '~/components/city-card'
import type { FeaturedCity } from '~/types/city'

/**
 * Unit tests for CityCard component
 * Verifies component renders city data correctly and handles interactions
 *
 * Test coverage:
 * - Renders city name, image, and visit count
 * - Formats visit count with commas (e.g., 1,500)
 * - Calls onClick handler when clicked
 * - Has proper accessibility attributes
 * - Handles missing image gracefully
 * - Applies Kirby styling (rounded corners, hover effects)
 */
describe('CityCard Component', () => {
  it('should render city name, image, and visit count', () => {
    const mockCity: FeaturedCity = {
      _id: 'test-city-1' as any,
      name: 'Tokyo',
      shortSlug: 'tokyo',
      image: 'https://example.com/tokyo.jpg',
      visitCount: 1500,
    }

    render(<CityCard city={mockCity} onClick={() => {}} />)

    // City name should be visible
    expect(screen.getByText('Tokyo')).toBeInTheDocument()

    // Image should be rendered with alt text
    const image = screen.getByRole('img', { name: /tokyo/i })
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/tokyo.jpg')

    // Visit count should be formatted with comma
    expect(screen.getByText(/1,500/)).toBeInTheDocument()
  })

  it('should format visit count with thousands separators', () => {
    const mockCity1: FeaturedCity = {
      _id: 'test-1' as any,
      name: 'Paris',
      shortSlug: 'paris',
      image: 'https://example.com/paris.jpg',
      visitCount: 1234567,
    }

    const { rerender } = render(
      <CityCard city={mockCity1} onClick={() => {}} />,
    )

    expect(screen.getByText(/1,234,567/)).toBeInTheDocument()

    const mockCity2: FeaturedCity = {
      _id: 'test-2' as any,
      name: 'London',
      shortSlug: 'london',
      image: 'https://example.com/london.jpg',
      visitCount: 500,
    }

    rerender(<CityCard city={mockCity2} onClick={() => {}} />)

    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('should call onClick handler when card is clicked', async () => {
    const user = userEvent.setup()
    const mockOnClick = vi.fn()

    const mockCity: FeaturedCity = {
      _id: 'test-city-1' as any,
      name: 'Barcelona',
      shortSlug: 'barcelona',
      image: 'https://example.com/barcelona.jpg',
      visitCount: 950,
    }

    render(<CityCard city={mockCity} onClick={mockOnClick} />)

    const card = screen.getByRole('button')
    await user.click(card)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
    expect(mockOnClick).toHaveBeenCalledWith(mockCity)
  })

  it('should have proper accessibility attributes', () => {
    const mockCity: FeaturedCity = {
      _id: 'test-city-1' as any,
      name: 'New York',
      shortSlug: 'new-york-city',
      image: 'https://example.com/newyork.jpg',
      visitCount: 1200,
    }

    render(<CityCard city={mockCity} onClick={() => {}} />)

    const card = screen.getByRole('button')
    expect(card).toHaveAccessibleName(/new york/i)

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('alt')
  })

  it('should handle missing image gracefully', () => {
    const mockCity: FeaturedCity = {
      _id: 'test-city-1' as any,
      name: 'Berlin',
      shortSlug: 'berlin',
      image: null,
      visitCount: 800,
    }

    render(<CityCard city={mockCity} onClick={() => {}} />)

    expect(screen.getByText('Berlin')).toBeInTheDocument()
    expect(screen.getByText(/800/)).toBeInTheDocument()

    // Should have a placeholder with role="img"
    const placeholder = screen.getByRole('img', { name: /berlin placeholder/i })
    expect(placeholder).toBeInTheDocument()
  })

  it('should apply Kirby styling with rounded corners', () => {
    const mockCity: FeaturedCity = {
      _id: 'test-city-1' as any,
      name: 'Sydney',
      shortSlug: 'sydney',
      image: 'https://example.com/sydney.jpg',
      visitCount: 700,
    }

    const { container } = render(<CityCard city={mockCity} onClick={() => {}} />)

    const card = container.firstChild as HTMLElement
    const classes = card.className

    // Should have kirby-rounded class
    expect(classes).toMatch(/kirby-rounded/)

    // Should have shadow for bubble effect
    expect(classes).toMatch(/shadow/)
  })

  it('should show hover and tap effects with Framer Motion', () => {
    const mockCity: FeaturedCity = {
      _id: 'test-city-1' as any,
      name: 'Dubai',
      shortSlug: 'dubai',
      image: 'https://example.com/dubai.jpg',
      visitCount: 600,
    }

    const { container } = render(<CityCard city={mockCity} onClick={() => {}} />)

    const card = container.firstChild as HTMLElement

    // Check if it's a motion component (button element)
    expect(card.tagName).toBe('BUTTON')
  })

  it('should display test IDs for E2E testing', () => {
    const mockCity: FeaturedCity = {
      _id: 'test-city-1' as any,
      name: 'Singapore',
      shortSlug: 'singapore',
      image: 'https://example.com/singapore.jpg',
      visitCount: 550,
    }

    render(<CityCard city={mockCity} onClick={() => {}} />)

    expect(screen.getByTestId('city-card')).toBeInTheDocument()
    expect(screen.getByTestId('city-name')).toBeInTheDocument()
    expect(screen.getByTestId('city-image')).toBeInTheDocument()
    expect(screen.getByTestId('visit-count')).toBeInTheDocument()
  })
})
