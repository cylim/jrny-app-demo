import { expect, test } from '@playwright/test'

test.describe('Kirby Visual Styling Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display soft pastel colors on homepage', async ({ page }) => {
    // Check for presence of Kirby color palette in computed styles
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Verify CSS variables are defined
    const { kirbyPink, kirbyBlue, kirbyPurple, kirbyPeach, kirbyMint } =
      await page.evaluate(() => {
        const root = document.documentElement
        const styles = getComputedStyle(root)
        return {
          kirbyPink: styles.getPropertyValue('--color-kirby-pink').trim(),
          kirbyBlue: styles.getPropertyValue('--color-kirby-blue').trim(),
          kirbyPurple: styles.getPropertyValue('--color-kirby-purple').trim(),
          kirbyPeach: styles.getPropertyValue('--color-kirby-peach').trim(),
          kirbyMint: styles.getPropertyValue('--color-kirby-mint').trim(),
        }
      })

    // Verify Kirby palette CSS variables exist (RGB format from Tailwind)
    expect(kirbyPink).toBeTruthy()
    expect(kirbyBlue).toBeTruthy()
    expect(kirbyPurple).toBeTruthy()
    expect(kirbyPeach).toBeTruthy()
    expect(kirbyMint).toBeTruthy()
  })

  test('should have rounded corners on UI components', async ({ page }) => {
    // Check buttons for rounded corners (16-24px range)
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    if (buttonCount > 0) {
      const firstButton = buttons.first()
      const borderRadius = await firstButton.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius
      })

      // Verify border radius is not sharp (0px) and follows Kirby style
      expect(borderRadius).not.toBe('0px')
      // Accept various formats: 16px, 24px, or calc() values
      expect(borderRadius).toMatch(/\d+px/)
    }
  })

  test('should apply kirby-rounded class with 24px border radius', async ({
    page,
  }) => {
    // Inject a test element with kirby-rounded class
    await page.evaluate(() => {
      const testDiv = document.createElement('div')
      testDiv.className = 'kirby-rounded'
      testDiv.id = 'test-kirby-rounded'
      document.body.appendChild(testDiv)
    })

    const testElement = page.locator('#test-kirby-rounded')
    const borderRadius = await testElement.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius
    })

    // Verify kirby-rounded class applies 24px (1.5rem)
    expect(borderRadius).toBe('24px')
  })

  test('should apply kirby-rounded-sm class with 16px border radius', async ({
    page,
  }) => {
    // Inject a test element with kirby-rounded-sm class
    await page.evaluate(() => {
      const testDiv = document.createElement('div')
      testDiv.className = 'kirby-rounded-sm'
      testDiv.id = 'test-kirby-rounded-sm'
      document.body.appendChild(testDiv)
    })

    const testElement = page.locator('#test-kirby-rounded-sm')
    const borderRadius = await testElement.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius
    })

    // Verify kirby-rounded-sm class applies 16px (1rem)
    expect(borderRadius).toBe('16px')
  })

  test('should apply kirby-bubble class with full rounding and shadow', async ({
    page,
  }) => {
    // Inject a test element with kirby-bubble class
    await page.evaluate(() => {
      const testDiv = document.createElement('div')
      testDiv.className = 'kirby-bubble'
      testDiv.id = 'test-kirby-bubble'
      document.body.appendChild(testDiv)
    })

    const testElement = page.locator('#test-kirby-bubble')
    const styles = await testElement.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
      }
    })

    // Verify fully circular border radius
    expect(styles.borderRadius).toContain('9999px')

    // Verify soft pink shadow exists
    expect(styles.boxShadow).not.toBe('none')
    expect(styles.boxShadow).toBeTruthy()
  })

  test('should have animate-bounce-gentle utility with keyframe animation', async ({
    page,
  }) => {
    // Inject a test element with animate-bounce-gentle class
    await page.evaluate(() => {
      const testDiv = document.createElement('div')
      testDiv.className = 'animate-bounce-gentle'
      testDiv.id = 'test-bounce-gentle'
      document.body.appendChild(testDiv)
    })

    const testElement = page.locator('#test-bounce-gentle')
    const animation = await testElement.evaluate((el) => {
      return window.getComputedStyle(el).animation
    })

    // Verify animation is applied
    expect(animation).toContain('bounce-gentle')
    expect(animation).toContain('2s') // 2 second duration
    expect(animation).toContain('infinite')
  })

  test('should maintain visual consistency across page navigation', async ({
    page,
  }) => {
    // Navigate to a different page (if exists) and verify styling persists
    // This assumes the app has some navigation - adjust as needed
    const navLinks = page.locator('a[href^="/"]')
    const linkCount = await navLinks.count()

    if (linkCount > 0) {
      // Click first internal link
      await navLinks.first().click()
      await page.waitForLoadState('networkidle')

      // Verify Kirby CSS variables still exist on new page
      const newPageStyles = await page.evaluate(() => {
        const root = document.documentElement
        const styles = getComputedStyle(root)
        return {
          kirbyPink: styles.getPropertyValue('--color-kirby-pink').trim(),
        }
      })

      expect(newPageStyles.kirbyPink).toBeTruthy()
    }
  })
})
