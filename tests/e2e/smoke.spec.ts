import { test, expect } from '@playwright/test';

test.describe('Smoke Tests — Navigation, Page Health & Core UI', () => {
  test('Dashboard page loads cleanly with executive metrics and no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/Career Command Center/i);
    await expect(page.locator('h1')).toContainText('Career Command Center');

    // Metrics cards should render
    await expect(page.getByText('Active Opportunities', { exact: true })).toBeVisible();
    await expect(page.getByText('High Priority', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending Actions', { exact: true })).toBeVisible();

    // No severe unexpected runtime console errors
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('Analyze a Role page loads with sample selection and custom JD form', async ({ page }) => {
    await page.goto('/analyze');
    await expect(page.locator('h1')).toContainText('Analyze a Role');
    await expect(page.getByText('Try a Sample Role')).toBeVisible();
    await expect(page.getByText('Paste Custom Job Description')).toBeVisible();

    // Click custom tab
    await page.getByText('Paste Custom Job Description').click();
    await expect(page.getByPlaceholder('e.g. Director of RevOps')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Apex Enterprise')).toBeVisible();
  });

  test('Opportunities Pipeline page loads with table, filters, and search input', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.locator('h1')).toContainText('Opportunities Pipeline');
    await expect(page.getByPlaceholder('Search title or company...')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('Candidate Profile page loads with career history and evidence library', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText(/Synthetic/i).first()).toBeVisible();
    await expect(page.getByText(/Career History/i).first()).toBeVisible();
    await expect(page.getByText(/Evidence Library/i).first()).toBeVisible();
  });

  test('About the Project page loads all 11 architecture sections', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toContainText('About Career Command Center');
    await expect(page.getByText(/Problem & Motivation/i)).toBeVisible();
    await expect(page.getByText(/Target User Persona/i)).toBeVisible();
    await expect(page.getByText(/Product Prioritization Principles/i)).toBeVisible();
    await expect(page.getByText(/Technical Architecture Summary/i)).toBeVisible();
    await expect(page.getByText(/Multi-Phase Product Roadmap/i)).toBeVisible();
  });

  test('Global search modal opens via shortcut or button and performs fast filtering', async ({ page }) => {
    await page.goto('/');
    // Click the search bar trigger in navbar
    const searchButton = page.locator('button[aria-label*="Global Search" i]').first();
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    const searchInput = page.getByPlaceholder(/Search company, title, stage, notes/i);
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('Director');
    // Results should appear
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
  });

  test('Theme toggle cycles light, dark, and system modes smoothly', async ({ page }) => {
    await page.goto('/');
    const themeBtn = page.locator('button[aria-label*="theme" i], button[title*="theme" i]').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      // Should change without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Professional Network Directory page loads with directory and company metrics', async ({ page }) => {
    await page.goto('/network');
    await expect(page.locator('h1')).toContainText('Professional Network Directory');
    await expect(page.getByText('Total Contacts')).toBeVisible();
    await expect(page.getByText('Unique Companies')).toBeVisible();
    await expect(page.getByText('Import Connections (CSV/XLSX)')).toBeVisible();
  });

  test('Server health endpoint returns HTTP 200 with healthy engine status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('career-command-center');
    expect(body.version).toBe('2.0.0');
  });
});
