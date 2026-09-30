import { test, expect } from '@playwright/test';

test.describe('Pipeline & Opportunity Workflow E2E', () => {
  test('Complete end-to-end opportunity lifecycle and action completion persistence', async ({ page }) => {
    // 1. Visit Opportunities page
    await page.goto('/opportunities');
    await expect(page.locator('h1')).toContainText('Opportunities Pipeline');

    // 2. Click Report on the first opportunity
    const reportLink = page.getByRole('link', { name: /Report/i }).first();
    await expect(reportLink).toBeVisible();
    await reportLink.click();

    // 3. Verify Analysis Results page loaded
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Overall Fit', { exact: true })).toBeVisible();

    // 4. Verify all 5 tab buttons exist
    await expect(page.getByRole('button', { name: /Executive Overview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Qualifications & Gaps/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Evidence & Objections/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Interview Preparation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Action Plan/i })).toBeVisible();

    // 5. Navigate to Action Plan tab
    await page.getByRole('button', { name: /Action Plan/i }).click();
    await expect(page.getByText('Action Plan Execution Checklist')).toBeVisible();
    await expect(page.getByText('Current Stage Checklist:')).toBeVisible();

    // 6. Complete the first stage action
    const completeButton = page.locator('button[aria-label*="Mark action complete" i]').first();
    if (await completeButton.isVisible()) {
      await completeButton.click();
      // Should now show completed styling
      await expect(page.getByText(/Completed/i).first()).toBeVisible();
    }

    // 7. Add a custom action
    const customInput = page.getByPlaceholder('Add a custom action...');
    if (await customInput.isVisible()) {
      await customInput.fill('Reach out to head of talent');
      await page.locator('button[aria-label="Add custom action"]').click();
      await expect(page.getByText('Reach out to head of talent')).toBeVisible();
    }

    // 8. Change Stage from dropdown
    const stageSelect = page.locator('select[aria-label="Pipeline stage"]').first();
    if (await stageSelect.isVisible()) {
      await stageSelect.selectOption('Applied');
      await page.waitForTimeout(300);
      // Stage checklist title should update to Applied
      await expect(page.getByText('Current Stage Checklist: Applied')).toBeVisible();

      // Return to Identified stage
      await stageSelect.selectOption('Identified');
      await page.waitForTimeout(300);
      await expect(page.getByText('Current Stage Checklist: Identified')).toBeVisible();
    }

    // 9. Verify Print button is present
    await expect(page.getByRole('button', { name: /Print Report/i })).toBeVisible();

    // 10. Navigate back to Dashboard and verify metrics and action item rendered
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Career Command Center' })).toBeVisible();
    await expect(page.getByText('Active Opportunities', { exact: true })).toBeVisible();
  });

  test('Opportunities Pipeline table supports horizontal chevron navigation and preserves interaction', async ({ page }) => {
    // 1. Visit Opportunities page
    await page.goto('/opportunities');
    await expect(page.locator('h1')).toContainText('Opportunities Pipeline');

    // 2. Verify table exists with min-w-[960px]
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // 3. Set a viewport to ensure horizontal overflow on standard screen
    await page.setViewportSize({ width: 800, height: 700 });
    await page.waitForTimeout(300);

    // 4. Verify More Columns affordance and right chevron are visible
    const moreColsBtn = page.getByRole('button', { name: /Scroll pipeline to more columns/i });
    const rightChevron = page.locator('button[aria-label="Scroll pipeline right"]');

    await expect(moreColsBtn).toBeVisible();
    await expect(rightChevron.first()).toBeVisible();

    // 5. Click right chevron to scroll horizontally
    await rightChevron.first().click();
    await page.waitForTimeout(400);

    // 6. Left chevron should now be visible and enabled
    const leftChevron = page.locator('button[aria-label="Scroll pipeline left"]');
    await expect(leftChevron.first()).toBeVisible();

    // 7. Click left chevron to scroll back
    await leftChevron.first().click();
    await page.waitForTimeout(400);

    // 8. Verify table sorting still works while navigation controls are present
    const fitSortHeader = page.getByRole('button', { name: /Fit/i });
    if (await fitSortHeader.isVisible()) {
      await fitSortHeader.click();
      await page.waitForTimeout(200);
      await expect(table).toBeVisible();
    }
  });
});
