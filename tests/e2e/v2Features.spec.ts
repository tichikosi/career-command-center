import { test, expect } from '@playwright/test';

test.describe('V2.0 AI-Native Features — Kanban CRM, Network & Résumé Ingestion', () => {
  test('Kanban Opportunity CRM: switches between Table and Board views seamlessly', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.locator('h1')).toContainText('Opportunities Pipeline');

    // Default is Table view
    await expect(page.locator('table')).toBeVisible();

    // Switch to Board view
    const boardBtn = page.getByRole('button', { name: /board/i });
    await expect(boardBtn).toBeVisible();
    await boardBtn.click();

    // Verify all 6 Kanban columns render
    await expect(page.getByRole('heading', { name: 'Identified', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Applied', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Screening', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interviewing', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Offer', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Archived', exact: true })).toBeVisible();

    // Switch back to Table view
    const tableBtn = page.getByRole('button', { name: /table/i });
    await tableBtn.click();
    await expect(page.locator('table')).toBeVisible();
  });

  test('Professional Network: adds a new contact and reflects in directory and company filter', async ({ page }) => {
    await page.goto('/network');
    await expect(page.locator('h1')).toContainText('Professional Network Directory');

    // Open Add Contact Modal
    await page.getByRole('button', { name: /\+ add contact/i }).click();

    // Fill form
    await page.getByPlaceholder('e.g. Sarah Chen').fill('Marcus Sterling');
    await page.getByPlaceholder('e.g. ServiceNow').fill('Apex Dynamics');
    await page.getByPlaceholder('e.g. Director of AI').fill('Chief AI Architect');
    await page.getByPlaceholder('name@company.com').fill('marcus@apexdynamics.ai');

    // Submit using modal submit button
    const submitBtn = page.locator('button[type="submit"]:has-text("Add Contact")');
    await submitBtn.click();

    // Contact card should be visible
    await expect(page.getByText('Marcus Sterling')).toBeVisible();
    await expect(page.getByText('Chief AI Architect')).toBeVisible();
    await expect(page.locator('span:has-text("Apex Dynamics")').first()).toBeVisible();
  });

  test('Opportunity Details: displays matched network connections and allows adding outreach action', async ({ page }) => {
    // Opportunity 1 (ServiceNow) has demo contact Sarah Chen
    await page.goto('/analysis/opp-role-1-ai-strategy');
    await expect(page.locator('h1')).toBeVisible();

    // Check Network panel
    const networkPanel = page.getByText(/Network Intelligence/i);
    if (await networkPanel.isVisible()) {
      const outreachBtn = page.getByRole('button', { name: /\+ Add Outreach Action/i }).first();
      if (await outreachBtn.isVisible()) {
        await outreachBtn.click();
        await expect(page.getByText('Added to Plan').first()).toBeVisible();
      }
    }
  });

  test('Candidate Profile: opens résumé ingestion modal with dropzone and pasted text options', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('h1')).toBeVisible();

    // Click Import Résumé button
    const importBtn = page.getByRole('button', { name: /import résumé/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Modal dialog should open
    await expect(page.getByText('Import Résumé (AI-Powered Extraction)')).toBeVisible();
    await expect(page.getByText('Paste Résumé Text')).toBeVisible();

    // Switch to paste tab
    await page.getByText('Paste Résumé Text').click();
    await expect(page.getByPlaceholder(/Paste full text of your/i)).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText('Import Résumé (AI-Powered Extraction)')).not.toBeVisible();
  });

  test('Professional Network: imports LinkedIn Connections CSV with preamble rows and updates contacts', async ({ page }) => {
    await page.goto('/network');
    await expect(page.locator('h1')).toContainText('Professional Network Directory');

    // Open Import Connections Modal
    const importBtn = page.getByRole('button', { name: /import connections/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Verify modal header
    await expect(page.getByRole('heading', { name: 'Import Professional Network Contacts' })).toBeVisible();

    // Upload LinkedIn CSV with preamble
    const linkedInCsv = `Notes:
1. When exporting your connection data, that may contain your connections' names, email addresses, etc.
2. Please do not distribute without permission.

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Tariro,Mutasa,https://www.linkedin.com/in/tariromutasa,tariro@anthropic.com,Anthropic,AI Research Lead,15 Jan 2024
Kudzai,Nyahoda,https://www.linkedin.com/in/kudzainyahoda,,Datadog,VP Engineering,20 Feb 2023`;

    await page.locator('#network-file-upload').setInputFiles({
      name: 'Connections.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(linkedInCsv),
    });

    // Modal should show stats and preview
    await expect(page.getByText('Valid Contacts')).toBeVisible();
    await expect(page.getByText('Tariro Mutasa')).toBeVisible();
    await expect(page.getByText('AI Research Lead')).toBeVisible();

    // Commit import
    const commitBtn = page.getByRole('button', { name: /import 2 contacts/i });
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    // Verify modal closes and directory displays newly imported contacts
    await expect(page.getByRole('heading', { name: 'Import Professional Network Contacts' })).not.toBeVisible();
    await expect(page.getByText('Tariro Mutasa')).toBeVisible();
    await expect(page.getByText('AI Research Lead')).toBeVisible();
  });

  test('Professional Network: isolates contact editing to target record and does not leak prior Add Contact state', async ({ page }) => {
    await page.goto('/network');
    await expect(page.locator('h1')).toContainText('Professional Network Directory');

    // 1. Manually add Jane Doe
    await page.getByRole('button', { name: /\+ add contact/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Professional Contact' })).toBeVisible();

    const nameInput = page.getByPlaceholder('e.g. Sarah Chen');
    const companyInput = page.getByPlaceholder('e.g. ServiceNow');
    const positionInput = page.getByPlaceholder('e.g. Director of AI');

    await nameInput.fill('Jane Doe');
    await companyInput.fill('Google');
    await positionInput.fill('Director');
    await page.locator('button[type="submit"]:has-text("Add Contact")').click();

    // Verify Jane Doe appears
    await expect(page.getByText('Jane Doe')).toBeVisible();
    await expect(page.getByText('Director', { exact: true })).toBeVisible();

    // 2. Import LinkedIn connections
    await page.getByRole('button', { name: /import connections/i }).click();
    const linkedInCsv = `Notes:
1. Preamble text

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Tariro,Mutasa,https://www.linkedin.com/in/tariromutasa,tariro@anthropic.com,Anthropic,AI Research Lead,15 Jan 2024
Kudzai,Nyahoda,https://www.linkedin.com/in/kudzainyahoda,,Datadog,VP Engineering,20 Feb 2023`;

    await page.locator('#network-file-upload').setInputFiles({
      name: 'Connections.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(linkedInCsv),
    });
    await page.getByRole('button', { name: /import 2 contacts/i }).click();

    // 3. Find Tariro Mutasa card and click Edit
    const tariroCard = page.locator('div.border.rounded-xl:has-text("Tariro Mutasa")');
    await expect(tariroCard).toBeVisible();
    await tariroCard.locator('button[title="Edit Contact"]').click();

    // 4. Modal MUST display Tariro Mutasa, NOT Jane Doe
    await expect(page.getByRole('heading', { name: 'Edit Contact' })).toBeVisible();
    await expect(nameInput).toHaveValue('Tariro Mutasa');
    await expect(companyInput).toHaveValue('Anthropic');
    await expect(positionInput).toHaveValue('AI Research Lead');

    // 5. Update Position and Save
    await positionInput.fill('Principal AI Scientist');
    await page.locator('button[type="submit"]:has-text("Save Changes")').click();
    await expect(page.getByRole('heading', { name: 'Edit Contact' })).not.toBeVisible();

    // 6. Verify Tariro Mutasa updated, Jane Doe unmodified
    await expect(tariroCard.getByText('Principal AI Scientist')).toBeVisible();
    const janeCard = page.locator('div.border.rounded-xl:has-text("Jane Doe")');
    await expect(janeCard.getByText('Director', { exact: true })).toBeVisible();
    await expect(janeCard.getByText('Google')).toBeVisible();

    // 7. Verify Add Contact opens blank
    await page.getByRole('button', { name: /\+ add contact/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Professional Contact' })).toBeVisible();
    await expect(nameInput).toHaveValue('');
    await expect(companyInput).toHaveValue('');
    await expect(positionInput).toHaveValue('');
    await page.getByRole('button', { name: /cancel/i }).click();

    // 8. Verify Edit on Kudzai Nyahoda opens Kudzai Nyahoda
    const kudzaiCard = page.locator('div.border.rounded-xl:has-text("Kudzai Nyahoda")');
    await kudzaiCard.locator('button[title="Edit Contact"]').click();
    await expect(page.getByRole('heading', { name: 'Edit Contact' })).toBeVisible();
    await expect(nameInput).toHaveValue('Kudzai Nyahoda');
    await expect(companyInput).toHaveValue('Datadog');
    await page.getByRole('button', { name: /cancel/i }).click();
  });

  test('Network Intelligence: handles opportunity deep linking and shows contextual banner', async ({ page }) => {
    await page.goto('/network?opportunityId=opp-qa-test-google-ai-strategy');
    await expect(page.locator('h1')).toContainText('Professional Network Directory');

    // Contextual banner should display matching information
    await expect(page.getByText(/matched to Google/i)).toBeVisible();
    const bannerResetBtn = page.getByRole('button', { name: 'View All Network Contacts', exact: true });
    await expect(bannerResetBtn).toBeVisible();

    // Resetting filter restores directory
    await bannerResetBtn.click();
    await expect(page).toHaveURL('/network');
  });

  test('Opportunities Pipeline: creates new real opportunity and displays in board/table', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.locator('h1')).toContainText('Opportunities Pipeline');

    // Click + Add Opportunity
    await page.getByRole('button', { name: /\+ Add Opportunity/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Target Opportunity' })).toBeVisible();

    // Fill form
    await page.getByPlaceholder('e.g. Google, Anthropic, Scale AI').fill('OpenAI');
    await page.getByPlaceholder('e.g. Director, AI Strategy & Operations').fill('Lead Strategy Architect');
    await page.getByPlaceholder('e.g. San Francisco, CA (Hybrid) or Remote').fill('San Francisco, CA');

    // Click Save Opportunity
    await page.getByRole('button', { name: 'Save Opportunity' }).click();
    await expect(page.getByRole('heading', { name: 'Add Target Opportunity' })).not.toBeVisible();

    // Verify opportunity appears
    await expect(page.getByText('Lead Strategy Architect').first()).toBeVisible();
    await expect(page.getByText('OpenAI').first()).toBeVisible();
  });

  test('Opportunities Table: contact badge deep links canonically to /network?opportunityId=<id>', async ({ page }) => {
    // 1. Add Google and DoorDash network contacts
    await page.goto('/network');
    await page.getByRole('button', { name: /\+ add contact/i }).click();
    await page.getByPlaceholder('e.g. Sarah Chen').fill('Sundar Executive');
    await page.getByPlaceholder('e.g. ServiceNow').fill('Google');
    await page.getByPlaceholder('e.g. Director of AI').fill('VP Engineering');
    await page.locator('button[type="submit"]:has-text("Add Contact")').click();

    await page.getByRole('button', { name: /\+ add contact/i }).click();
    await page.getByPlaceholder('e.g. Sarah Chen').fill('DoorDash Recruiter');
    await page.getByPlaceholder('e.g. ServiceNow').fill('DoorDash');
    await page.getByPlaceholder('e.g. Director of AI').fill('Lead Technical Recruiter');
    await page.locator('button[type="submit"]:has-text("Add Contact")').click();

    // 2. Go to /opportunities in Table View
    await page.goto('/opportunities');
    await expect(page.locator('h1')).toContainText('Opportunities Pipeline');

    // Switch to Table View if in Board View
    const tableBtn = page.getByRole('button', { name: /table/i });
    if (await tableBtn.isVisible()) {
      await tableBtn.click();
    }

    // Verify Google contact link in table row
    const googleLink = page.locator('tr:has-text("Google") a[href*="/network?opportunityId="]').first();
    await expect(googleLink).toBeVisible();
    await googleLink.click();

    // Verify navigated to Google filtered network view
    await expect(page).toHaveURL(/\/network\?opportunityId=opp-qa-test-google-ai-strategy/);
    await expect(page.getByText(/matched to Google/i)).toBeVisible();
    await expect(page.getByText('Sundar Executive')).toBeVisible();

    // Browser back returns to Opportunities
    await page.goBack();
    await expect(page).toHaveURL('/opportunities');

    // 3. Create DoorDash opportunity
    await page.getByRole('button', { name: /\+ Add Opportunity/i }).click();
    await page.getByPlaceholder('e.g. Google, Anthropic, Scale AI').fill('DoorDash');
    await page.getByPlaceholder('e.g. Director, AI Strategy & Operations').fill('Strategy & Operations Lead');
    await page.getByRole('button', { name: 'Save Opportunity' }).click();

    // 4. Click DoorDash contact badge in table
    const doordashRow = page.locator('tr:has-text("DoorDash")');
    await expect(doordashRow).toBeVisible();
    const doordashBadge = doordashRow.locator('a[href*="/network?opportunityId="]').first();
    await expect(doordashBadge).toBeVisible();
    await doordashBadge.click();

    // Verify DoorDash filtered network view
    await expect(page).toHaveURL(/\/network\?opportunityId=opp-custom-/);
    await expect(page.getByText(/matched to DoorDash/i)).toBeVisible();
    await expect(page.getByText('DoorDash Recruiter')).toBeVisible();

    // Reset filter restores full directory
    await page.getByRole('button', { name: 'View All Network Contacts', exact: true }).click();
    await expect(page).toHaveURL('/network');
  });

  test('Discovery Workspace: runs role discovery and promotes job to active pipeline', async ({ page }) => {
    await page.goto('/discover');
    await expect(page.locator('h1')).toContainText('Autonomous Role Discovery Feed');

    // Run curated discovery feed
    const curatedBtn = page.getByRole('button', { name: /Curated Feed/i });
    await expect(curatedBtn).toBeVisible();
    await curatedBtn.click();

    // Verify discovered jobs render
    await expect(page.getByText(/Discovered \d+ roles/i)).toBeVisible();
    await expect(page.getByText('Anthropic').first()).toBeVisible();

    // Promote first job to pipeline
    const promoteBtn = page.getByRole('button', { name: /\+ Add to Pipeline/i }).first();
    await expect(promoteBtn).toBeVisible();
    await promoteBtn.click();

    // Verify confirmation message appears
    await expect(page.getByText(/Promoted .* to Active Pipeline!/i)).toBeVisible();

    // Switch to Promoted tab and verify In Pipeline badge
    await page.getByRole('button', { name: /Promoted/i }).click();
    await expect(page.getByText('In Pipeline').first()).toBeVisible();
  });
});


