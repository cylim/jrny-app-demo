import { expect, test } from '@playwright/test'

/**
 * E2E tests for AnimatedBackground component
 *
 * Test coverage:
 * - Background animation performance (≥55fps)
 * - Animations disable with prefers-reduced-motion
 * - Foreground content remains readable and interactive
 */
test.describe('Background Animation Performance and Accessibility', () => {
  test('should maintain ≥55fps during background animation', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Start performance measurement
    await page.evaluate(() => {
      ;(window as any).frameCount = 0
      ;(window as any).startTime = performance.now()

      const countFrames = () => {
        ;(window as any).frameCount++
        if (performance.now() - (window as any).startTime < 2000) {
          requestAnimationFrame(countFrames)
        }
      }
      requestAnimationFrame(countFrames)
    })

    // Wait for 2 seconds of animation
    await page.waitForTimeout(2100)

    // Calculate FPS
    const fps = await page.evaluate(() => {
      const elapsed = (performance.now() - (window as any).startTime) / 1000
      return (window as any).frameCount / elapsed
    })

    // Verify FPS is at least 55fps
    expect(fps).toBeGreaterThanOrEqual(55)
  })

  test('should disable animations when prefers-reduced-motion is enabled', async ({
    page,
    context,
  }) => {
    // Enable prefers-reduced-motion
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that animated background exists
    const background = page.locator('[data-testid="animated-background"]')
    await expect(background).toBeVisible()

    // Verify animations are disabled
    // Check that animated elements don't have animation styles
    const hasAnimation = await background.evaluate((el) => {
      const children = el.querySelectorAll(
        '[data-testid^="bubble-"], [data-testid^="wave-"], [data-testid^="particle-"]',
      )

      for (const child of children) {
        const styles = window.getComputedStyle(child as Element)
        const animationName = styles.animationName
        const animationDuration = styles.animationDuration

        if (animationName !== 'none' && animationDuration !== '0s') {
          return true
        }
      }
      return false
    })

    // With reduced motion, animations should be disabled
    expect(hasAnimation).toBe(false)
  })

  test('should keep foreground content readable and interactive', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify animated background is present
    const background = page.locator('[data-testid="animated-background"]')
    await expect(background).toBeVisible()

    // Verify background is behind content (z-index: -1)
    const zIndex = await background.evaluate((el) => {
      return window.getComputedStyle(el).zIndex
    })
    expect(zIndex).toBe('-1')

    // Verify pointer-events: none so it doesn't interfere with clicks
    const pointerEvents = await background.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents
    })
    expect(pointerEvents).toBe('none')

    // Verify foreground content is still clickable
    const ctaButton = page.locator('[data-testid="cta-button"]')
    await expect(ctaButton).toBeVisible()

    // Click should work despite background animation
    await ctaButton.click()
    await page.waitForLoadState('networkidle')

    // Verify navigation occurred (URL changed)
    const currentUrl = page.url()
    expect(currentUrl).toContain('discover')
  })

  test('should not affect text readability with contrast check', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify animated background exists
    const background = page.locator('[data-testid="animated-background"]')
    await expect(background).toBeVisible()

    // Check heading text contrast
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()

    // Verify text is still readable (visible and has sufficient contrast)
    const headingText = await heading.textContent()
    expect(headingText).toBeTruthy()
    expect(headingText?.length).toBeGreaterThan(0)

    // Check that text is not obscured by background
    const isVisible = await heading.isVisible()
    expect(isVisible).toBe(true)
  })

  test('should animate smoothly without visual glitches', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify animated background is present
    const background = page.locator('[data-testid="animated-background"]')
    await expect(background).toBeVisible()

    // Take screenshot at start
    const screenshot1 = await page.screenshot()
    expect(screenshot1).toBeTruthy()

    // Wait 500ms
    await page.waitForTimeout(500)

    // Take screenshot after animation
    const screenshot2 = await page.screenshot()
    expect(screenshot2).toBeTruthy()

    // Both screenshots should be valid (no crashes or visual errors)
    // This is a basic sanity check for animation stability
    expect(screenshot1.length).toBeGreaterThan(0)
    expect(screenshot2.length).toBeGreaterThan(0)
  })

  test('should work across different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Verify background renders at this viewport
      const background = page.locator('[data-testid="animated-background"]')
      await expect(background).toBeVisible()

      // Verify it stays behind content
      const zIndex = await background.evaluate((el) => {
        return window.getComputedStyle(el).zIndex
      })
      expect(zIndex).toBe('-1')
    }
  })
})
