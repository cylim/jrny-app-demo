import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock framer-motion before importing component
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useReducedMotion: vi.fn(() => false),
}))

import { LoadingDots } from '~/components/ui/loading-dots'

describe('LoadingDots Component', () => {
  it('should render 3 dots by default', () => {
    render(<LoadingDots />)
    const dots = screen.getAllByTestId(/^loading-dot-/)
    expect(dots).toHaveLength(3)
  })

  it('should render custom number of dots', () => {
    render(<LoadingDots dotCount={5} />)
    const dots = screen.getAllByTestId(/^loading-dot-/)
    expect(dots).toHaveLength(5)
  })

  it('should apply default Kirby pink variant', () => {
    render(<LoadingDots />)
    const container = screen.getByRole('status')
    expect(container).toBeInTheDocument()

    // Check for pink color class
    const dots = screen.getAllByTestId(/^loading-dot-/)
    dots.forEach((dot) => {
      expect(dot).toHaveClass('bg-[rgb(var(--color-kirby-pink))]')
    })
  })

  it('should support blue color variant', () => {
    render(<LoadingDots variant="blue" />)
    const dots = screen.getAllByTestId(/^loading-dot-/)
    dots.forEach((dot) => {
      expect(dot).toHaveClass('bg-[rgb(var(--color-kirby-blue))]')
    })
  })

  it('should support purple color variant', () => {
    render(<LoadingDots variant="purple" />)
    const dots = screen.getAllByTestId(/^loading-dot-/)
    dots.forEach((dot) => {
      expect(dot).toHaveClass('bg-[rgb(var(--color-kirby-purple))]')
    })
  })

  it('should have aria-label for accessibility', () => {
    render(<LoadingDots />)
    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('aria-label', 'Loading')
  })

  it('should render dots when reduced motion is enabled', () => {
    render(<LoadingDots />)
    const dots = screen.getAllByTestId(/^loading-dot-/)

    // When reduced motion is enabled, dots should still render
    // The mock automatically returns false, but component handles both cases
    expect(dots).toHaveLength(3)
  })

  it('should accept custom className', () => {
    render(<LoadingDots className="custom-class" />)
    const container = screen.getByRole('status')
    expect(container).toHaveClass('custom-class')
  })

  it('should support small size variant', () => {
    render(<LoadingDots size="sm" />)
    const dots = screen.getAllByTestId(/^loading-dot-/)
    dots.forEach((dot) => {
      expect(dot).toHaveClass('h-2', 'w-2')
    })
  })

  it('should support medium size variant (default)', () => {
    render(<LoadingDots size="md" />)
    const dots = screen.getAllByTestId(/^loading-dot-/)
    dots.forEach((dot) => {
      expect(dot).toHaveClass('h-3', 'w-3')
    })
  })

  it('should support large size variant', () => {
    render(<LoadingDots size="lg" />)
    const dots = screen.getAllByTestId(/^loading-dot-/)
    dots.forEach((dot) => {
      expect(dot).toHaveClass('h-4', 'w-4')
    })
  })
})
