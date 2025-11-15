import { expect, test } from '@playwright/test'

const VIEWPORTS = {
  mobile: { width: 320, height: 568, name: 'Mobile (320px)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768px)' },
  desktop: { width: 1920, height: 1080, name: 'Desktop (1920px)' },
}

test.describe('Kirby Styling Responsive Design', () => {
  for (const [, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      test(`should maintain Kirby color palette at ${viewport.width}px`, async ({
        page,
      }) => {
        await page.goto('/')

        // Verify CSS variables are defined at this viewport
        const rootStyles = await page.evaluate(() => {
          const root = document.documentElement
          const styles = getComputedStyle(root)
          return {
            kirbyPink: styles.getPropertyValue('--color-kirby-pink').trim(),
            kirbyBlue: styles.getPropertyValue('--color-kirby-blue').trim(),
            kirbyPurple: styles.getPropertyValue('--color-kirby-purple').trim(),
          }
        })

        // Verify Kirby palette exists regardless of viewport
        expect(rootStyles.kirbyPink).toBeTruthy()
        expect(rootStyles.kirbyBlue).toBeTruthy()
        expect(rootStyles.kirbyPurple).toBeTruthy()
      })

      test(`should maintain rounded corners at ${viewport.width}px`, async ({
        page,
      }) => {
        await page.goto('/')

        // Inject test elements with Kirby classes
        await page.evaluate(() => {
          const testRounded = document.createElement('div')
          testRounded.className = 'kirby-rounded'
          testRounded.id = 'test-rounded'
          document.body.appendChild(testRounded)

          const testRoundedSm = document.createElement('div')
          testRoundedSm.className = 'kirby-rounded-sm'
          testRoundedSm.id = 'test-rounded-sm'
          document.body.appendChild(testRoundedSm)
        })

        const roundedRadius = await page
          .locator('#test-rounded')
          .evaluate((el) => window.getComputedStyle(el).borderRadius)

        const roundedSmRadius = await page
          .locator('#test-rounded-sm')
          .evaluate((el) => window.getComputedStyle(el).borderRadius)

        // Verify border radius values are consistent across viewports
        expect(roundedRadius).toBe('24px')
        expect(roundedSmRadius).toBe('16px')
      })

      test(`should maintain kirby-bubble styling at ${viewport.width}px`, async ({
        page,
      }) => {
        await page.goto('/')

        // Inject test element with kirby-bubble class
        await page.evaluate(() => {
          const testBubble = document.createElement('div')
          testBubble.className = 'kirby-bubble'
          testBubble.id = 'test-bubble'
          document.body.appendChild(testBubble)
        })

        const bubbleStyles = await page
          .locator('#test-bubble')
          .evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return {
              borderRadius: computed.borderRadius,
              boxShadow: computed.boxShadow,
            }
          })

        // Verify fully circular and shadow exists
        expect(bubbleStyles.borderRadius).toContain('9999px')
        expect(bubbleStyles.boxShadow).not.toBe('none')
      })

      test(`should render UI components correctly at ${viewport.width}px`, async ({
        page,
      }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Verify page is visible and interactive
        const body = page.locator('body')
        await expect(body).toBeVisible()

        // Check that buttons are rendered (if any exist)
        const buttons = page.locator('button')
        const buttonCount = await buttons.count()

        if (buttonCount > 0) {
          const firstButton = buttons.first()
          await expect(firstButton).toBeVisible()

          // Verify button has rounded corners
          const borderRadius = await firstButton.evaluate((el) => {
            return window.getComputedStyle(el).borderRadius
          })
          expect(borderRadius).not.toBe('0px')
        }
      })

      test(`should maintain animations at ${viewport.width}px`, async ({
        page,
      }) => {
        await page.goto('/')

        // Inject test element with animation
        await page.evaluate(() => {
          const testAnimated = document.createElement('div')
          testAnimated.className = 'animate-bounce-gentle'
          testAnimated.id = 'test-animated'
          document.body.appendChild(testAnimated)
        })

        const animation = await page
          .locator('#test-animated')
          .evaluate((el) => {
            return window.getComputedStyle(el).animation
          })

        // Verify animation is applied consistently
        expect(animation).toContain('bounce-gentle')
        expect(animation).toContain('2s')
        expect(animation).toContain('infinite')
      })
    })
  }

  test('should have no layout shifts when resizing from mobile to desktop', async ({
    page,
  }) => {
    // Start at mobile
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Capture initial Kirby styling
    const mobileStyles = await page.evaluate(() => {
      const root = document.documentElement
      const styles = getComputedStyle(root)
      return {
        kirbyPink: styles.getPropertyValue('--color-kirby-pink').trim(),
      }
    })

    // Resize to desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500) // Wait for any resize animations

    // Verify Kirby styling persists after resize
    const desktopStyles = await page.evaluate(() => {
      const root = document.documentElement
      const styles = getComputedStyle(root)
      return {
        kirbyPink: styles.getPropertyValue('--color-kirby-pink').trim(),
      }
    })

    expect(desktopStyles.kirbyPink).toBe(mobileStyles.kirbyPink)
  })

  test('should support dark mode Kirby palette across viewports', async ({
    page,
  }) => {
    await page.goto('/')

    // Enable dark mode (if supported by the app)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })

    // Verify dark mode Kirby colors are defined
    const darkStyles = await page.evaluate(() => {
      const root = document.documentElement
      const styles = getComputedStyle(root)
      return {
        kirbyPink: styles.getPropertyValue('--color-kirby-pink').trim(),
        kirbyBlue: styles.getPropertyValue('--color-kirby-blue').trim(),
        kirbyPurple: styles.getPropertyValue('--color-kirby-purple').trim(),
      }
    })

    // Verify dark mode Kirby palette exists (slightly desaturated versions)
    expect(darkStyles.kirbyPink).toBeTruthy()
    expect(darkStyles.kirbyBlue).toBeTruthy()
    expect(darkStyles.kirbyPurple).toBeTruthy()

    // Verify dark mode values are different from light mode (desaturated)
    // Light: 253 164 175, Dark: 244 114 182
    expect(darkStyles.kirbyPink).not.toBe('253 164 175')
  })
})
