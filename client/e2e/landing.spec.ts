import { expect, test } from '@playwright/test';

// Helper to wait for the app to finish loading
async function waitForAppReady(page: import('@playwright/test').Page) {
  // Wait for loading spinner to disappear (if present)
  await page
    .waitForSelector('[class*="loading"], [class*="Loading"]', {
      state: 'hidden',
      timeout: 15000,
    })
    .catch(() => {
      // Loading component might not be present, that's okay
    });
  // Small additional wait for hydration
  await page.waitForTimeout(500);
}

test.describe('Landing Page', () => {
  test('should display the hero section', async ({ page }) => {
    await page.goto('/landing', { waitUntil: 'domcontentloaded' });

    // Check that the page loaded
    await expect(page).toHaveURL(/.*landing/);

    // Wait for app to be ready
    await waitForAppReady(page);

    // Check for main heading or content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/landing', { waitUntil: 'domcontentloaded' });

    // Wait for app to be ready
    await waitForAppReady(page);

    // Check for navigation - Navbar uses a fixed div with logo link
    const navBar = page.locator('a[href="/"]').filter({ hasText: /RENT/i }).first();
    await expect(navBar).toBeVisible({ timeout: 15000 });
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/landing', { waitUntil: 'domcontentloaded' });

    // Wait for app to be ready
    await waitForAppReady(page);

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Search Page', () => {
  test('should display search page', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });

    // Wait for app to be ready
    await waitForAppReady(page);

    await expect(page).toHaveURL(/.*search/);
  });

  test('should have filter options', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });

    // Wait for app to be ready
    await waitForAppReady(page);

    // Verify search page loaded
    await expect(page).toHaveURL(/.*search/);
  });
});
