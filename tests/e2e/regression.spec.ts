import { test, expect } from '@playwright/test';

test.describe('Regression & Edge Case Tests E2E', () => {
  test('Empty state rendering, restoration of demo data, and search filtering regression', async ({ page }) => {
    // 1. Visit Opportunities page
    await page.goto('/opportunities');
    await expect(page.locator('table')).toBeVisible();

    // 2. Filter by search term that yields 0 results
    const searchInput = page.getByPlaceholder('Search title or company...');
    await searchInput.fill('NonExistentCompanyXYZ999');
    await expect(page.getByText(/No opportunities match current filters/i)).toBeVisible();

    // 3. Clear search filter
    await page.getByRole('button', { name: /Clear/i }).first().click();
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);

    // 4. Test Restore Demo Opportunities modal
    const restoreBtn = page.getByRole('button', { name: /Restore Demo Opportunities/i }).first();
    await restoreBtn.click();
    await expect(page.getByRole('heading', { name: 'Restore demo opportunities?' })).toBeVisible();

    // Close without resetting
    await page.getByRole('button', { name: /Cancel/i }).click();
  });
});
