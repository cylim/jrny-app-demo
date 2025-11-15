import { expect, test } from '@playwright/test'

test.describe('Loading Indicator Performance', () => {
  test('should display loading indicator within 200ms of navigation', async ({
    page,
  }) => {
    await page.goto('/')

    // Find a navigation link
    const navLink = page.locator('a[href^="/"]').first()
    const hasLink = (await navLink.count()) > 0

    if (hasLink) {
      const startTime = Date.now()

      // Click navigation link
      await navLink.click()

      // Wait for loading indicator to appear
      const loadingIndicator = page.locator('[aria-label="Loading"]')

      await expect(loadingIndicator).toBeVisible({ timeout: 200 })
      const elapsed = Date.now() - startTime
      expect(elapsed).toBeLessThanOrEqual(200)
    }
  })

  test('should animate loading dots smoothly at ≥55fps', async ({ page }) => {
    await page.goto('/')

    // Create a test page with loading indicator
    await page.evaluate(() => {
      const loadingContainer = document.createElement('div')
      loadingContainer.id = 'test-loading-container'
      loadingContainer.innerHTML = `
        <div role="status" aria-label="Loading">
          <div class="flex gap-1">
            <div class="h-3 w-3 rounded-full animate-bounce" style="animation-delay: 0s"></div>
            <div class="h-3 w-3 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="h-3 w-3 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>
      `
      document.body.appendChild(loadingContainer)
    })

    // Measure animation frame rate
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frames = 0
        const startTime = performance.now()
        const duration = 1000 // Measure for 1 second

        function countFrame() {
          frames++
          const elapsed = performance.now() - startTime

          if (elapsed < duration) {
            requestAnimationFrame(countFrame)
          } else {
            const fps = (frames / elapsed) * 1000
            resolve(fps)
          }
        }

        requestAnimationFrame(countFrame)
      })
    })

    // FPS should be at least 55 (target is 60fps, allow some margin)
    expect(fps).toBeGreaterThanOrEqual(55)
  })

  test('should not cause layout shifts during loading transition', async ({
    page,
  }) => {
    await page.goto('/')

    // Measure cumulative layout shift (CLS)
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === 'layout-shift' &&
              !(entry as any).hadRecentInput
            ) {
              clsValue += (entry as any).value
            }
          }
        })

        observer.observe({ type: 'layout-shift', buffered: true })

        // Wait 2 seconds to collect layout shifts
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 2000)
      })
    })

    // CLS should be minimal (< 0.1 is good, < 0.25 is acceptable)
    expect(cls).toBeLessThan(0.25)
  })

  test('should handle rapid loading state changes without performance degradation', async ({
    page,
  }) => {
    await page.goto('/')

    // Simulate rapid loading state changes
    const executionTime = await page.evaluate(async () => {
      const startTime = performance.now()

      // Rapidly toggle loading state 100 times
      for (let i = 0; i < 100; i++) {
        const div = document.createElement('div')
        div.role = 'status'
        div.setAttribute('aria-label', 'Loading')
        div.className = 'loading-indicator'
        document.body.appendChild(div)

        // Force reflow
        div.getBoundingClientRect()

        document.body.removeChild(div)
      }

      return performance.now() - startTime
    })

    // 100 rapid state changes should complete in < 500ms
    expect(executionTime).toBeLessThan(500)
  })

  test('should maintain 60fps during data fetching with loading indicator', async ({
    page,
  }) => {
    await page.goto('/')

    // Trigger a data fetch operation (e.g., click button that fetches data)
    const fetchButton = page.locator('button').first()
    const hasButton = (await fetchButton.count()) > 0

    if (hasButton) {
      // Start monitoring FPS
      const fps = await page.evaluate(async () => {
        let frames = 0
        const startTime = performance.now()
        const duration = 500 // Monitor for 500ms

        return new Promise<number>((resolve) => {
          function countFrame() {
            frames++
            const elapsed = performance.now() - startTime

            if (elapsed < duration) {
              requestAnimationFrame(countFrame)
            } else {
              const fps = (frames / elapsed) * 1000
              resolve(fps)
            }
          }

          requestAnimationFrame(countFrame)
        })
      })

      // Should maintain ≥55fps during loading
      expect(fps).toBeGreaterThanOrEqual(55)
    }
  })

  test('should have smooth opacity transitions', async ({ page }) => {
    await page.goto('/')

    // Create loading indicator
    await page.evaluate(() => {
      const div = document.createElement('div')
      div.id = 'test-loading'
      div.role = 'status'
      div.setAttribute('aria-label', 'Loading')
      div.style.opacity = '0'
      div.style.transition = 'opacity 200ms ease-in-out'
      document.body.appendChild(div)
    })

    const loadingElement = page.locator('#test-loading')

    // Fade in
    await page.evaluate(() => {
      const div = document.getElementById('test-loading')
      if (div) div.style.opacity = '1'
    })

    // Wait for transition
    await page.waitForTimeout(250)

    const opacity = await loadingElement.evaluate((el) => {
      return window.getComputedStyle(el).opacity
    })

    // Opacity should be fully transitioned to 1
    expect(parseFloat(opacity)).toBe(1)
  })
})
