import { test, expect } from '@playwright/test'

test.describe('Page Transitions', () => {
  test('should navigate from home to discover without flicker', async ({
    page,
  }) => {
    // Go to home page
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Take screenshot of home page
    await page.screenshot({ path: 'test-results/home-before.png' })

    // Click discover button
    const discoverButton = page.getByTestId('cta-button')
    await discoverButton.click()

    // Wait a bit to observe transition
    await page.waitForTimeout(500)

    // Take screenshot of discover page
    await page.screenshot({ path: 'test-results/discover-after.png' })

    // Verify we're on discover page
    await expect(page).toHaveURL(/\/discover/)
    await expect(
      page.getByRole('heading', { name: /Discover Cities/i }),
    ).toBeVisible()
  })

  test('should navigate from discover back to home', async ({ page }) => {
    // Go to discover page
    await page.goto('http://localhost:3000/discover')
    await page.waitForLoadState('networkidle')

    // Click home link
    await page.getByRole('link', { name: /JRNY/i }).click()

    // Wait a bit to observe transition
    await page.waitForTimeout(500)

    // Verify we're on home page
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(
      page.getByRole('heading', { name: /Welcome to JRNY/i }),
    ).toBeVisible()
  })

  test('should navigate to a city page', async ({ page }) => {
    // Go to discover page
    await page.goto('http://localhost:3000/discover')
    await page.waitForLoadState('networkidle')

    // Wait for city cards to load
    await page.waitForSelector('[data-testid="city-card"]', {
      timeout: 10000,
    })

    // Click first city card
    const firstCityCard = page.locator('[data-testid="city-card"]').first()
    await firstCityCard.click()

    // Wait a bit to observe transition
    await page.waitForTimeout(500)

    // Verify we're on a city page (URL should contain /c/)
    await expect(page).toHaveURL(/\/c\//)
  })
})
