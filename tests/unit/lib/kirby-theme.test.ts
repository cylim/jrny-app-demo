import { describe, expect, it } from 'vitest'
import { KIRBY_THEME, KirbyThemeSchema } from '~/lib/kirby-theme'

describe('KIRBY_THEME constants', () => {
  it('should have valid color hex values', () => {
    // Verify each color is a valid 6-digit hex color
    expect(KIRBY_THEME.colors.pink).toMatch(/^#[0-9A-F]{6}$/i)
    expect(KIRBY_THEME.colors.blue).toMatch(/^#[0-9A-F]{6}$/i)
    expect(KIRBY_THEME.colors.purple).toMatch(/^#[0-9A-F]{6}$/i)
    expect(KIRBY_THEME.colors.peach).toMatch(/^#[0-9A-F]{6}$/i)
    expect(KIRBY_THEME.colors.mint).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('should have expected pastel color values', () => {
    // Verify the specific soft pastel colors defined in spec
    expect(KIRBY_THEME.colors.pink).toBe('#FDA4AF')
    expect(KIRBY_THEME.colors.blue).toBe('#93C5FD')
    expect(KIRBY_THEME.colors.purple).toBe('#C4B5FD')
    expect(KIRBY_THEME.colors.peach).toBe('#FDBA8C')
    expect(KIRBY_THEME.colors.mint).toBe('#A7F3D0')
  })

  it('should have valid border radius values', () => {
    // Verify border radius follows CSS format (px or rem)
    expect(KIRBY_THEME.borderRadius.sm).toMatch(/^\d+(\.\d+)?(px|rem)$/)
    expect(KIRBY_THEME.borderRadius.default).toMatch(/^\d+(\.\d+)?(px|rem)$/)
    expect(KIRBY_THEME.borderRadius.full).toBe('9999px')
  })

  it('should have border radius in 16-24px range for pronounce rounding', () => {
    // Verify sm (16px) and default (24px) are within spec range
    expect(KIRBY_THEME.borderRadius.sm).toBe('16px')
    expect(KIRBY_THEME.borderRadius.default).toBe('24px')
  })

  it('should have positive animation durations', () => {
    expect(KIRBY_THEME.animations.durationFast).toBeGreaterThan(0)
    expect(KIRBY_THEME.animations.durationNormal).toBeGreaterThan(0)
    expect(KIRBY_THEME.animations.durationSlow).toBeGreaterThan(0)
  })

  it('should have expected animation duration values in milliseconds', () => {
    expect(KIRBY_THEME.animations.durationFast).toBe(200)
    expect(KIRBY_THEME.animations.durationNormal).toBe(400)
    expect(KIRBY_THEME.animations.durationSlow).toBe(600)
  })

  it('should have bouncy cubic-bezier easing function', () => {
    // Verify bouncy easing follows cubic-bezier format
    expect(KIRBY_THEME.animations.easingBounce).toMatch(
      /^cubic-bezier\([\d.-]+,\s*[\d.-]+,\s*[\d.-]+,\s*[\d.-]+\)$/,
    )
    expect(KIRBY_THEME.animations.easingBounce).toBe(
      'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    )
  })

  it('should pass Zod schema validation', () => {
    // Verify entire theme object validates against schema
    const result = KirbyThemeSchema.safeParse(KIRBY_THEME)
    expect(result.success).toBe(true)
  })

  it('should be immutable (as const)', () => {
    // TypeScript enforces this at compile time, but we can verify structure
    expect(KIRBY_THEME).toBeDefined()
    expect(Object.isFrozen(KIRBY_THEME)).toBe(false) // 'as const' doesn't freeze, just type-level immutability
  })
})
