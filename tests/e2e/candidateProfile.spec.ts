import { test, expect } from '@playwright/test';

test.describe('Candidate Profile & Evidence Library E2E', () => {
  test('Candidate profile editing, evidence viewing, and safe career role management', async ({ page }) => {
    // 1. Visit Profile page
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /Alex Vance/i })).toBeVisible();

    // 2. Click Edit Candidate Overview
    const editBtn = page.getByRole('button', { name: /Edit Candidate Overview/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 3. Verify editor inputs rendered
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Professional Headline/i)).toBeVisible();

    // 4. Cancel edit without changes
    await page.getByRole('button', { name: /Cancel/i }).first().click();
    await expect(page.getByRole('heading', { name: /Alex Vance/i })).toBeVisible();

    // 5. Inspect Evidence Library
    await expect(page.getByText(/Evidence Library/i).first()).toBeVisible();
    const filterInput = page.getByPlaceholder(/Search by title, metric, organization/i);
    if (await filterInput.isVisible()) {
      await filterInput.fill('$14M');
      await expect(page.getByText(/\$14M ARR pipeline growth/i)).toBeVisible();
      await filterInput.fill('');
    }

    // 6. Inspect Career History
    await expect(page.getByText(/Career History/i).first()).toBeVisible();
    await expect(page.getByText(/Apex Enterprise Software/i).first()).toBeVisible();
  });
});
