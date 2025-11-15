import { expect, test } from '@playwright/test'

/**
 * E2E tests for landing page performance and functionality
 *
 * Test coverage:
 * - Cities load within 2 seconds
 * - CTA button achieves ≥90% viewport visibility
 * - Featured cities display correctly
 * - City cards are clickable
 * - Refresh changes cities (random selection)
 */
test.describe('Landing Page E2E Tests', () => {
  test('should load featured cities within 2 seconds', async ({ page }) => {
    await page.goto('/')

    // Wait for city cards to appear (performance budget: 2000ms)
    // CityCard components should have data-testid="city-card"
    const cityCards = page.locator('[data-testid="city-card"]')

    // The timeout enforces the performance budget - test fails if > 2000ms
    await cityCards.first().waitFor({ state: 'visible', timeout: 2000 })

    // Verify at least one city card is visible
    await expect(cityCards.first()).toBeVisible()

    // Verify city card has required elements: name, image, visit count
    const firstCard = cityCards.first()
    const cityName = firstCard.locator('[data-testid="city-name"]')
    const cityImage = firstCard.locator('[data-testid="city-image"]')
    const visitCount = firstCard.locator('[data-testid="visit-count"]')

    await expect(cityName).toBeVisible()
    await expect(cityImage).toBeVisible()
    await expect(visitCount).toBeVisible()
  })

  test('should display CTA button with ≥90% viewport visibility', async ({
    page,
  }) => {
    await page.goto('/')

    // CTA button should have data-testid="cta-button"
    const ctaButton = page.locator('[data-testid="cta-button"]')

    await expect(ctaButton).toBeVisible()

    // Check viewport visibility ratio
    const boundingBox = await ctaButton.boundingBox()
    expect(boundingBox).not.toBeNull()

    if (boundingBox) {
      const viewport = page.viewportSize()
      expect(viewport).not.toBeNull()

      if (viewport) {
        // Calculate visible area
        const visibleHeight =
          Math.min(boundingBox.y + boundingBox.height, viewport.height) -
          Math.max(boundingBox.y, 0)
        const visibleWidth =
          Math.min(boundingBox.x + boundingBox.width, viewport.width) -
          Math.max(boundingBox.x, 0)

        const visibleArea = visibleHeight * visibleWidth
        const totalArea = boundingBox.height * boundingBox.width
        const visibilityRatio = visibleArea / totalArea

        // CTA should be at least 90% visible
        expect(visibilityRatio).toBeGreaterThanOrEqual(0.9)
      }
    }
  })

  test('should display featured cities with name, image, and visit count', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cityCards = page.locator('[data-testid="city-card"]')

    // Should have at least 3 cities displayed
    const count = await cityCards.count()
    expect(count).toBeGreaterThanOrEqual(3)

    // Verify first city card structure
    const firstCard = cityCards.first()

    // City name
    const cityName = firstCard.locator('[data-testid="city-name"]')
    await expect(cityName).toBeVisible()
    const nameText = await cityName.textContent()
    expect(nameText).toBeTruthy()
    expect(nameText?.length).toBeGreaterThan(0)

    // City image
    const cityImage = firstCard.locator('[data-testid="city-image"]')
    await expect(cityImage).toBeVisible()
    const imageUrl = await cityImage.getAttribute('src')
    expect(imageUrl).toBeTruthy()

    // Visit count
    const visitCount = firstCard.locator('[data-testid="visit-count"]')
    await expect(visitCount).toBeVisible()
    const countText = await visitCount.textContent()
    expect(countText).toMatch(/\d+/)
  })

  test('should make city cards clickable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cityCards = page.locator('[data-testid="city-card"]')
    const firstCard = cityCards.first()

    await expect(firstCard).toBeVisible()

    // Verify card is clickable (has proper role or is a link)
    const role = await firstCard.getAttribute('role')
    const tagName = await firstCard.evaluate((el) => el.tagName.toLowerCase())

    // Should be either a button, link, or have button role
    const isClickable =
      role === 'button' ||
      role === 'link' ||
      tagName === 'button' ||
      tagName === 'a'

    expect(isClickable).toBe(true)

    // Click the card and verify navigation occurs
    // (This assumes clicking navigates to city detail page)
    await firstCard.click()

    // Wait for navigation
    await page.waitForLoadState('networkidle')

    // Verify URL changed (not on home page anymore)
    const currentUrl = page.url()
    expect(currentUrl).not.toBe(page.url().replace(/\/[^/]*$/, '/'))
  })

  test('should refresh and display different cities on page reload', async ({
    page,
  }) => {
    // First load
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cityCards = page.locator('[data-testid="city-card"]')
    await cityCards.first().waitFor({ state: 'visible' })

    // Collect city names from first load
    const firstLoadCities: string[] = []
    const count = await cityCards.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = cityCards.nth(i)
      const name = await card.locator('[data-testid="city-name"]').textContent()
      if (name) {
        firstLoadCities.push(name)
      }
    }

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await cityCards.first().waitFor({ state: 'visible' })

    // Collect city names from second load
    const secondLoadCities: string[] = []
    const newCount = await cityCards.count()
    for (let i = 0; i < Math.min(newCount, 5); i++) {
      const card = cityCards.nth(i)
      const name = await card.locator('[data-testid="city-name"]').textContent()
      if (name) {
        secondLoadCities.push(name)
      }
    }

    // Cities should be different (random selection)
    // Note: This is probabilistic - there's a small chance of same cities
    // If this becomes flaky, we can remove it
    const firstSet = firstLoadCities.join(',')
    const secondSet = secondLoadCities.join(',')

    expect(firstSet).not.toBe(secondSet)
  })

  test('should fallback to hardcoded cities if Convex query fails', async ({
    page,
    context,
  }) => {
    // Block Convex API requests to simulate failure
    await context.route('**/*.convex.cloud/**', (route) => {
      route.abort()
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cityCards = page.locator('[data-testid="city-card"]')

    // Should still display cities (fallback cities)
    await expect(cityCards.first()).toBeVisible({ timeout: 3000 })

    // Verify fallback cities are displayed
    // FALLBACK_CITIES: Tokyo, Paris, New York, London, Barcelona
    const cityNames = await page
      .locator('[data-testid="city-name"]')
      .allTextContents()

    // Should have at least one fallback city
    const hasFallbackCity = cityNames.some(
      (name) =>
        name.includes('Tokyo') ||
        name.includes('Paris') ||
        name.includes('New York') ||
        name.includes('London') ||
        name.includes('Barcelona'),
    )

    expect(hasFallbackCity).toBe(true)
  })

  test('should display CTA button with Kirby styling', async ({ page }) => {
    await page.goto('/')

    const ctaButton = page.locator('[data-testid="cta-button"]')
    await expect(ctaButton).toBeVisible()

    // Verify Kirby styling is applied
    const borderRadius = await ctaButton.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius
    })

    // Kirby rounded corners should be at least 16px
    expect(borderRadius).toMatch(/\d+px/)
    const radiusValue = Number.parseInt(borderRadius, 10)
    expect(radiusValue).toBeGreaterThanOrEqual(16)

    // Verify pastel pink background (approximation)
    const backgroundColor = await ctaButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Background should be set (not transparent)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('transparent')
  })

  test('should navigate to explore page when CTA is clicked', async ({
    page,
  }) => {
    await page.goto('/')

    const ctaButton = page.locator('[data-testid="cta-button"]')
    await expect(ctaButton).toBeVisible()

    // Click CTA button
    await ctaButton.click()

    // Wait for navigation
    await page.waitForLoadState('networkidle')

    // Verify navigation occurred (URL should not be root)
    await expect(page).not.toHaveURL('/')
    // Should navigate to cities or explore page
    await expect(page).toHaveURL(/(cities|explore|discover)/)
  })
})
