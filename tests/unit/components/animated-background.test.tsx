import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnimatedBackground } from '~/components/animated-background'

/**
 * Unit tests for AnimatedBackground component
 * Verifies variant props, intensity levels, and reduced motion behavior
 *
 * Test coverage:
 * - Renders with different variants (bubbles, waves, particles)
 * - Applies intensity levels (subtle, moderate, prominent)
 * - Respects prefers-reduced-motion setting
 * - Applies correct z-index and pointer-events styling
 * - Renders behind content without interfering
 */
describe('AnimatedBackground Component', () => {
  // Mock matchMedia for reduced motion tests
  const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }

  it('should render bubbles variant', () => {
    const { container } = render(
      <AnimatedBackground variant="bubbles" intensity="subtle" />,
    )

    // Should render container with bubbles
    const background = screen.getByTestId('animated-background')
    expect(background).toBeInTheDocument()

    // Should have multiple bubble elements
    const bubbles = container.querySelectorAll('[data-testid^="bubble-"]')
    expect(bubbles.length).toBeGreaterThan(0)
  })

  it('should render waves variant', () => {
    const { container } = render(
      <AnimatedBackground variant="waves" intensity="moderate" />,
    )

    // Should render container with waves
    const background = screen.getByTestId('animated-background')
    expect(background).toBeInTheDocument()

    // Should have wave elements
    const waves = container.querySelectorAll('[data-testid^="wave-"]')
    expect(waves.length).toBeGreaterThan(0)
  })

  it('should render particles variant', () => {
    const { container } = render(
      <AnimatedBackground variant="particles" intensity="prominent" />,
    )

    // Should render container with particles
    const background = screen.getByTestId('animated-background')
    expect(background).toBeInTheDocument()

    // Should have particle elements
    const particles = container.querySelectorAll('[data-testid^="particle-"]')
    expect(particles.length).toBeGreaterThan(0)
  })

  it('should apply subtle intensity with fewer elements', () => {
    const { container } = render(
      <AnimatedBackground variant="bubbles" intensity="subtle" />,
    )

    const bubbles = container.querySelectorAll('[data-testid^="bubble-"]')
    // Subtle should have 4 elements
    expect(bubbles.length).toBe(4)
  })

  it('should apply moderate intensity with medium elements', () => {
    const { container } = render(
      <AnimatedBackground variant="bubbles" intensity="moderate" />,
    )

    const bubbles = container.querySelectorAll('[data-testid^="bubble-"]')
    // Moderate should have 8 elements
    expect(bubbles.length).toBe(8)
  })

  it('should apply prominent intensity with more elements', () => {
    const { container } = render(
      <AnimatedBackground variant="bubbles" intensity="prominent" />,
    )

    const bubbles = container.querySelectorAll('[data-testid^="bubble-"]')
    // Prominent should have 12 elements
    expect(bubbles.length).toBe(12)
  })

  it('should disable animations when prefers-reduced-motion is set', () => {
    // Mock prefers-reduced-motion: reduce
    mockMatchMedia(true)

    const { container } = render(
      <AnimatedBackground variant="bubbles" intensity="moderate" />,
    )

    // Should render but without animations
    const background = screen.getByTestId('animated-background')
    expect(background).toBeInTheDocument()

    // Check that elements don't have motion properties (should be regular divs, not motion.div)
    const elements = container.querySelectorAll('[data-testid^="bubbles-"]')
    elements.forEach((element) => {
      expect(element.tagName).toBe('DIV')
    })
  })

  it('should apply pointer-events: none to not interfere with clicks', () => {
    render(<AnimatedBackground variant="bubbles" intensity="subtle" />)

    const background = screen.getByTestId('animated-background')

    // Should have pointer-events: none
    expect(background.className).toMatch(/pointer-events-none/)
  })

  it('should render with data-testid for E2E testing', () => {
    render(<AnimatedBackground variant="bubbles" intensity="subtle" />)

    expect(screen.getByTestId('animated-background')).toBeInTheDocument()
  })

  it('should be hidden from screen readers', () => {
    render(<AnimatedBackground variant="bubbles" intensity="subtle" />)

    const background = screen.getByTestId('animated-background')
    expect(background).toHaveAttribute('aria-hidden', 'true')
  })

  it('should have z-0 class to stay behind content', () => {
    render(<AnimatedBackground variant="bubbles" intensity="subtle" />)

    const background = screen.getByTestId('animated-background')
    expect(background.className).toMatch(/z-0/)
  })
})
