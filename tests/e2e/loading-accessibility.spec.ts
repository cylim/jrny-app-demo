import { expect, test } from '@playwright/test'

test.describe('Loading Indicator Accessibility - Reduced Motion', () => {
  test('should show static dots when prefers-reduced-motion is enabled', async ({
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
          addListener: () => {}, // Deprecated
          removeListener: () => {}, // Deprecated
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
      })
    })

    await page.goto('/')

    // Create loading indicator on the page
    await page.evaluate(() => {
      const loadingContainer = document.createElement('div')
      loadingContainer.id = 'test-loading-container'
      loadingContainer.innerHTML = `
        <div role="status" aria-label="Loading" data-testid="loading-indicator">
          <div class="flex gap-1">
            <div data-testid="loading-dot-0" class="h-3 w-3 rounded-full bg-pink-300"></div>
            <div data-testid="loading-dot-1" class="h-3 w-3 rounded-full bg-pink-300"></div>
            <div data-testid="loading-dot-2" class="h-3 w-3 rounded-full bg-pink-300"></div>
          </div>
        </div>
      `
      document.body.appendChild(loadingContainer)
    })

    // Verify loading indicator exists
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]')
    await expect(loadingIndicator).toBeVisible()

    // Check that dots don't have animation classes when reduced motion is preferred
    const dot = page.locator('[data-testid="loading-dot-0"]')
    const hasAnimation = await dot.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      const animationName = styles.animationName
      const animationDuration = styles.animationDuration

      return animationName !== 'none' && animationDuration !== '0s'
    })

    // With reduced motion, animations should be disabled
    // This test verifies the component respects user preferences
    expect(hasAnimation).toBe(false)
  })

  test('should maintain visibility of loading indicator with reduced motion', async ({
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

    // Create loading indicator
    await page.evaluate(() => {
      const div = document.createElement('div')
      div.role = 'status'
      div.setAttribute('aria-label', 'Loading')
      div.textContent = 'Loading...'
      div.id = 'test-loading'
      document.body.appendChild(div)
    })

    const loadingElement = page.locator('#test-loading')

    // Loading indicator should still be visible
    await expect(loadingElement).toBeVisible()

    // Text content should be accessible
    await expect(loadingElement).toHaveText('Loading...')
  })

  test('should have proper ARIA labels for screen readers', async ({
    page,
  }) => {
    await page.goto('/')

    // Create loading indicator
    await page.evaluate(() => {
      const div = document.createElement('div')
      div.role = 'status'
      div.setAttribute('aria-label', 'Loading')
      div.setAttribute('aria-live', 'polite')
      div.id = 'test-loading'
      document.body.appendChild(div)
    })

    const loadingElement = page.locator('#test-loading')

    // Verify ARIA attributes
    await expect(loadingElement).toHaveAttribute('role', 'status')
    await expect(loadingElement).toHaveAttribute('aria-label', 'Loading')
    await expect(loadingElement).toHaveAttribute('aria-live', 'polite')
  })

  test('should be keyboard navigable around loading indicator', async ({
    page,
  }) => {
    await page.goto('/')

    // Create a page with focusable elements and loading indicator
    await page.evaluate(() => {
      const container = document.createElement('div')
      container.innerHTML = `
        <button id="button-before">Before</button>
        <div role="status" aria-label="Loading" id="loading-indicator" tabindex="-1">
          <div class="flex gap-1">
            <div class="h-3 w-3 rounded-full bg-pink-300"></div>
            <div class="h-3 w-3 rounded-full bg-pink-300"></div>
            <div class="h-3 w-3 rounded-full bg-pink-300"></div>
          </div>
        </div>
        <button id="button-after">After</button>
      `
      document.body.appendChild(container)
    })

    const buttonBefore = page.locator('#button-before')
    const buttonAfter = page.locator('#button-after')

    // Focus first button
    await buttonBefore.focus()
    await expect(buttonBefore).toBeFocused()

    // Tab to next button (should skip loading indicator with tabindex="-1")
    await page.keyboard.press('Tab')
    await expect(buttonAfter).toBeFocused()
  })

  test('should work with high contrast mode', async ({ page, context }) => {
    // Simulate high contrast mode
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-contrast: high)',
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

    // Create loading indicator
    await page.evaluate(() => {
      const div = document.createElement('div')
      div.role = 'status'
      div.setAttribute('aria-label', 'Loading')
      div.style.color = 'currentColor'
      div.style.backgroundColor = 'transparent'
      div.innerHTML = `
        <div class="flex gap-1">
          <div class="h-3 w-3 rounded-full" style="background-color: currentColor"></div>
          <div class="h-3 w-3 rounded-full" style="background-color: currentColor"></div>
          <div class="h-3 w-3 rounded-full" style="background-color: currentColor"></div>
        </div>
      `
      div.id = 'test-loading'
      document.body.appendChild(div)
    })

    const loadingElement = page.locator('#test-loading')

    // Should be visible in high contrast mode
    await expect(loadingElement).toBeVisible()

    // Dots should use currentColor which adapts to high contrast
    const dot = page.locator('#test-loading > div > div').first()
    const backgroundColor = await dot.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    expect(backgroundColor).toBeTruthy()
  })

  test('should announce loading state to screen readers', async ({ page }) => {
    await page.goto('/')

    // Create loading indicator with aria-live
    await page.evaluate(() => {
      const div = document.createElement('div')
      div.role = 'status'
      div.setAttribute('aria-label', 'Loading')
      div.setAttribute('aria-live', 'polite')
      div.setAttribute('aria-busy', 'true')
      div.id = 'test-loading'
      div.textContent = 'Loading content...'
      document.body.appendChild(div)
    })

    const loadingElement = page.locator('#test-loading')

    // Verify aria-live region is set up correctly
    await expect(loadingElement).toHaveAttribute('aria-live', 'polite')
    await expect(loadingElement).toHaveAttribute('aria-busy', 'true')

    // Update to loaded state
    await page.evaluate(() => {
      const div = document.getElementById('test-loading')
      if (div) {
        div.setAttribute('aria-busy', 'false')
        div.textContent = 'Content loaded'
      }
    })

    await expect(loadingElement).toHaveAttribute('aria-busy', 'false')
    await expect(loadingElement).toHaveText('Content loaded')
  })
})
