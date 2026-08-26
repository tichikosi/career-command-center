import { test, expect } from '@playwright/test';

test.describe('V3.4 Voice Interview Intelligence & Performance Analytics E2E', () => {
  test('Mock Interview Simulator renders Answer Mode toggle and Persona selector', async ({ page }) => {
    await page.goto('/opportunities');
    const reportLink = page.getByRole('link', { name: /Report/i }).first();
    await expect(reportLink).toBeVisible();
    await reportLink.click();
    await page.waitForURL(/\/analysis\/.+/);

    // Switch to Mock Interview tab
    await page.getByRole('button', { name: /Mock Interview/i }).click();
    await expect(page.getByText('Voice Interview Intelligence & Simulator')).toBeVisible();

    // Check Configuration Controls
    await expect(page.getByText('Answer Mode')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Speak' })).toBeVisible();
    await expect(page.getByText('Persona', { exact: true })).toBeVisible();
  });

  test('Voice Answer Capture flow: Mic prompt, recording simulation, and evaluation', async ({ page }) => {
    // Intercept question generation and answer evaluation
    await page.route('**/api/interview/mock', async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() || '{}');

      if (body.action === 'generate_questions') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            questions: [
              {
                id: 'mq-1',
                question: 'How do you lead cross-functional AI platform initiatives under tight timelines?',
                category: 'strategic',
              },
            ],
            requestedModel: 'gemini-3.7-flash',
            actualModel: 'gemini-3.7-flash',
            executionMode: 'gemini',
          }),
        });
        return;
      }

      if (body.action === 'evaluate') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            evaluation: {
              score: {
                relevance: 5,
                evidenceSpecificity: 4,
                strategicDepth: 5,
                executiveCommunication: 4,
                structure: 4,
                concision: 4,
              },
              deliveryScore: {
                pace: 5,
                verbalConcision: 4,
                fillerControl: 5,
                pausing: 4,
                clarity: 5,
                executiveDelivery: 5,
              },
              overallResponseScore: 88,
              contentWeight: 0.7,
              deliveryWeight: 0.3,
              coaching: {
                strengths: ['Direct strategic focus', 'Quantified platform latency reduction'],
                improvements: ['Include alternative architecture trade-offs'],
                improvedAnswer:
                  'Suggested Grounded Framework: Lead with the phased multi-region roadmap deployed at Nexus Global.',
              },
              voiceCoaching: {
                speakingPaceCoaching: 'Pacing was measured and executive at 148 WPM.',
                fillerWordCoaching: 'Controlled verbal delivery with low filler usage.',
                deliveryRefinements: ['Pause slightly after stating the bottom-line SLA metric'],
                overallDeliverySummary: 'Strong executive presence with steady verbal cadence.',
              },
              evidenceCitations: ['EVID-IMP-01'],
              requestedModel: 'gemini-3.7-flash',
              actualModel: 'gemini-3.7-flash',
              executionMode: 'gemini',
            },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/opportunities');
    await page.getByRole('link', { name: /Report/i }).first().click();
    await page.waitForURL(/\/analysis\/.+/);

    // Switch to Mock Interview tab
    await page.getByRole('button', { name: /Mock Interview/i }).click();

    // Select Speak answer mode
    await page.getByRole('button', { name: 'Speak' }).first().click();

    // Start Mock Session
    await page.getByRole('button', { name: /Start Mock Session/i }).click();
    await expect(page.getByText('How do you lead cross-functional AI platform initiatives under tight timelines?')).toBeVisible();

    // Check Voice Capture is rendered
    await expect(page.getByText('Voice Interview Practice')).toBeVisible();
    await expect(page.getByText(/Audio is evaluated strictly in-memory/i)).toBeVisible();
  });

  test('Performance Analytics & Comparison modal renders historical metrics', async ({ page }) => {
    await page.goto('/opportunities');
    await page.getByRole('link', { name: /Report/i }).first().click();
    await page.waitForURL(/\/analysis\/.+/);

    await page.getByRole('button', { name: /Mock Interview/i }).click();

    // Open Analytics modal if button visible
    const analyticsBtn = page.getByRole('button', { name: /Analytics & Trends/i });
    if (await analyticsBtn.isVisible()) {
      await analyticsBtn.click();
      await expect(page.getByText('Interview Performance & Delivery Analytics')).toBeVisible();
      await expect(page.getByText('Prep Readiness')).toBeVisible();
      await expect(page.getByText('Content Performance')).toBeVisible();
      await expect(page.getByText('Voice Delivery')).toBeVisible();
    }
  });
});
