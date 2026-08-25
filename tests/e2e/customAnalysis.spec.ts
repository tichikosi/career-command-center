import { test, expect } from '@playwright/test';

test.describe('Role Analysis E2E', () => {
  test('Sample role selection analysis and custom job description input validation', async ({ page }) => {
    // 1. Visit Analyze page
    await page.goto('/analyze');
    await expect(page.locator('h1')).toContainText('Analyze a Role');

    // 2. Test sample role evaluation
    const analyzeBtn = page.getByRole('button', { name: /Analyze Selected Role/i });
    await expect(analyzeBtn).toBeVisible();
    await analyzeBtn.click();

    // 3. Should navigate to Analysis Results page
    await page.waitForURL(/\/analysis\/.+/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Overall Fit', { exact: true })).toBeVisible();

    // 4. Return to Analyze page and test Custom JD form validation
    await page.goto('/analyze');
    await page.getByText('Paste Custom Job Description').click();

    // Fill short text (less than 50 words)
    await page.getByPlaceholder('e.g. Director of RevOps').fill('Director of Revenue Operations');
    await page.getByPlaceholder('e.g. Apex Enterprise').fill('Acme Corp');
    await page.getByPlaceholder('Paste the full job description text here...').fill('Too short job description text.');

    await page.getByRole('button', { name: /Run Custom Analysis/i }).click();

    // Error alert should display
    await expect(page.getByText(/Job description must contain at least 50 words/i)).toBeVisible();

    // Fill valid text > 50 words
    const validJdText = `
      Acme Corp is seeking a seasoned Director of Strategy and Operations to lead enterprise scaling initiatives.
      The ideal candidate will have extensive experience in go-to-market operational alignment, revenue operations,
      cross-functional leadership, and AI workflow enablement. Responsibilities include defining executive rhythms,
      overseeing strategic planning processes, managing cross-functional programs across four business units,
      and collaborating directly with executive leadership. Qualifications include ten plus years of experience in enterprise SaaS,
      proven track record in pipeline growth and revenue optimization, strong executive communication, and deep analytical problem solving skills.
    `;
    await page.getByPlaceholder('Paste the full job description text here...').fill(validJdText);
    await page.getByRole('button', { name: /Run Custom Analysis/i }).click();

    // Should navigate to analysis results page for custom role
    await page.waitForURL(/\/analysis\/opp-custom-.+/);
    await expect(page.locator('h1')).toContainText('Director of Revenue Operations');
    await expect(page.getByText('Overall Fit', { exact: true })).toBeVisible();
  });
});
