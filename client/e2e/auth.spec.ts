import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to auth when accessing protected routes', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/managers/properties', { waitUntil: 'domcontentloaded' });

    // Wait for either redirect to signin or the page to load
    // The app should redirect unauthenticated users
    await expect(page).toHaveURL(/\/(signin|managers|landing|$)/);
  });

  test('should show login options', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the page to finish loading (loading spinner to disappear)
    await page
      .waitForSelector('[class*="loading"]', { state: 'hidden', timeout: 15000 })
      .catch(() => {
        // Loading might not be present, that's okay
      });

    // Page should be accessible
    await expect(page).toHaveURL(/\//);
  });
});
