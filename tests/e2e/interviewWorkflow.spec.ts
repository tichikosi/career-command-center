import { test, expect } from '@playwright/test';

test.describe('V3.3 Interview War Room, Activity Timeline & Application Intelligence E2E', () => {
  test('Opportunity operating hub loads all V3.3 tabs: Timeline, War Room, Mock Interview, Follow-Up', async ({ page }) => {
    await page.goto('/opportunities');
    const reportLink = page.getByRole('link', { name: /Report/i }).first();
    await expect(reportLink).toBeVisible();
    await reportLink.click();
    await page.waitForURL(/\/analysis\/.+/);

    await expect(page.locator('h1')).toBeVisible();

    // Check tab headers
    await expect(page.getByRole('button', { name: /Activity & Timeline/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Interview War Room/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mock Interview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Smart Follow-Up/i })).toBeVisible();
  });

  test('Activity Timeline supports recording notes, scheduling interviews, and tracking stage changes', async ({ page }) => {
    await page.goto('/opportunities');
    await page.getByRole('link', { name: /Report/i }).first().click();
    await page.waitForURL(/\/analysis\/.+/);
    await expect(page.locator('h1')).toBeVisible();

    // Switch to Activity & Timeline tab
    await page.getByRole('button', { name: /Activity & Timeline/i }).click();
    await expect(page.getByText('Opportunity Activity & Timeline')).toBeVisible();

    // 1. Add Note / Activity
    await page.getByRole('button', { name: /Add Note \/ Activity/i }).click();
    await expect(page.getByText('Record Timeline Activity')).toBeVisible();

    await page.getByPlaceholder(/e.g. Discussed compensation/i).fill('Spoke with VP of Talent regarding scope');
    await page.getByPlaceholder(/Key takeaways/i).fill('Great conversation. Next step is technical interview.');
    await page.getByRole('button', { name: 'Record Activity' }).click();

    // Verify activity appears in timeline
    await expect(page.getByText('Spoke with VP of Talent regarding scope')).toBeVisible();

    // 2. Schedule / Log Interview
    await page.getByRole('button', { name: /Schedule \/ Log Interview/i }).click();
    await expect(page.getByText('Record or Schedule Interview')).toBeVisible();

    await page.getByPlaceholder('e.g. Sarah Jenkins').fill('Dr. Robert Chen');
    await page.getByPlaceholder('e.g. VP of Engineering').fill('Chief Architect');
    await page.getByRole('button', { name: 'Schedule Interview' }).click();

    // Verify scheduled interview appears in timeline
    await expect(page.getByText(/Scheduled Interview.*Dr\. Robert Chen/i)).toBeVisible();

    // 3. Change stage in header dropdown and verify automated stage activity
    const stageSelect = page.getByLabel('Pipeline stage');
    await stageSelect.selectOption('Screening');
    await expect(page.getByText(/Pipeline Stage Changed to Screening/i)).toBeVisible();
  });

  test('Interview War Room generates grounded briefing with positioning and story bank', async ({ page }) => {
    // Mock the /api/interview/prep API endpoint
    await page.route('**/api/interview/prep', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          prep: {
            id: 'prep-mock-e2e',
            opportunityId: 'opp-qa-test-google-ai-strategy',
            candidateProfileId: 'cand-tanaka',
            executiveRoleBrief: 'Executive role driving scalable engineering architecture and cloud transformation.',
            candidatePositioning: 'Senior engineering leader with proven scale and organizational impact.',
            strongestFitThemes: ['Platform Reliability', 'High Scale Systems', 'Executive Leadership'],
            materialGaps: [],
            whyThisCompany: 'Strong market positioning and innovation focus.',
            whyThisRole: 'Direct alignment with distributed systems mandate.',
            whyYou: 'Deep domain expertise delivering high-impact transformations.',
            questionsToAsk: ['What is the team charter?', 'How is success measured in year 1?'],
            first90DaysPoints: ['Meet key stakeholders', 'Audit platform reliability', 'Define Q3 roadmap'],
            riskFlags: [],
            questions: [
              {
                id: 'q1',
                question: 'How do you approach scaling distributed systems under high concurrency?',
                category: 'technical',
                expectedFocus: 'Architecture and reliability',
                suggestedApproach: 'Use STAR story emphasizing measurable throughput and SLA',
                relevantEvidenceIds: ['EVID-IMP-01'],
              },
            ],
            storyBank: [
              {
                id: 's1',
                title: 'Core Platform Scalability Transformation',
                situation: 'Core services experienced high load during peak traffic.',
                task: 'Redesign platform architecture for multi-region active-active resilience.',
                action: 'Implemented distributed event pipeline and optimized queries.',
                result: 'Achieved 99.999% SLA with 30% latency reduction.',
                evidenceIds: ['EVID-IMP-01'],
                applicableQuestionIds: ['q1'],
              },
            ],
            companyIntelligence: { available: false, unavailableReason: 'Live company intelligence unavailable' },
            compensationResearch: { available: false },
            readinessScore: {
              overall: 88,
              dimensions: {
                roleUnderstanding: 90,
                candidatePositioning: 85,
                storyPreparation: 90,
                gapMitigation: 85,
                companyKnowledge: 80,
                questionReadiness: 90,
              },
            },
            generatedAt: new Date().toISOString(),
            requestedModel: 'gemini-3.7-flash',
            actualModel: 'gemini-3.7-flash',
            executionMode: 'gemini',
            isActive: true,
          },
        }),
      });
    });

    // Open opportunity and switch to War Room
    await page.goto('/opportunities');
    await page.getByRole('link', { name: /Report/i }).first().click();
    await page.waitForURL(/\/analysis\/.+/);
    await expect(page.locator('h1')).toBeVisible();

    await page.getByRole('button', { name: /Interview War Room/i }).click();

    // Click Generate Interview Brief
    const generateBtn = page.getByRole('button', { name: /Generate Interview Brief|Generate Interview War Room/i }).first();
    await generateBtn.click();

    // Verify War Room sections rendered
    await expect(page.getByText('Interview Prep Readiness')).toBeVisible();
    await expect(page.getByText('Executive Interview Cheat Sheet')).toBeVisible();

    // Check Strategy Subtab
    await page.getByRole('button', { name: /Strategy & Positioning/i }).click();
    await expect(page.getByText('Executive Role Brief')).toBeVisible();
    await expect(page.getByText('Candidate Positioning Narrative')).toBeVisible();
    await expect(page.getByText('Platform Reliability', { exact: true })).toBeVisible();

    // Check Question Subtab
    await page.getByRole('button', { name: /Anticipated Questions/i }).click();
    await expect(page.getByText(/How do you approach scaling distributed systems/i)).toBeVisible();

    // Check Story Bank Subtab
    await page.getByRole('button', { name: /Grounded Story Bank/i }).click();
    await expect(page.getByText('Core Platform Scalability Transformation')).toBeVisible();
  });

  test('Mock Interview simulates interactive question answering and scoring', async ({ page }) => {
    // Mock /api/interview/mock API
    await page.route('**/api/interview/mock', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.action === 'generate_questions') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            questions: [
              { id: 'mq-1', question: 'Describe how you scale engineering teams during hypergrowth.', category: 'strategic' },
            ],
            requestedModel: 'gemini-3.7-flash',
            actualModel: 'gemini-3.7-flash',
            executionMode: 'gemini',
          }),
        });
      } else if (body.action === 'evaluate' || body.action === 'evaluate_answer') {
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
              coaching: {
                strengths: ['Clear strategic framing', 'Measurable metrics referenced'],
                improvements: ['Could mention specific tooling used'],
                improvedAnswer: 'Enhanced framing with grounded executive focus.',
              },
              evidenceCitations: ['EVID-IMP-01'],
              requestedModel: 'gemini-3.7-flash',
              actualModel: 'gemini-3.7-flash',
              executionMode: 'gemini',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Open opportunity and switch to Mock Interview
    await page.goto('/opportunities');
    await page.getByRole('link', { name: /Report/i }).first().click();
    await page.waitForURL(/\/analysis\/.+/);
    await expect(page.locator('h1')).toBeVisible();

    await page.getByRole('button', { name: /Mock Interview/i }).click();
    await expect(page.getByText('Interactive Mock Interview Simulator')).toBeVisible();

    // Start mock session
    await page.getByRole('button', { name: /Start (New )?Mock Session/i }).click();

    // Verify question is visible
    await expect(page.getByText(/Describe how you scale engineering teams/i)).toBeVisible();

    // Fill answer and submit
    await page.locator('textarea').fill(
      'At my previous company, I scaled the engineering department across multiple pods while maintaining high deployment velocity.'
    );
    await page.getByRole('button', { name: /Submit Answer for AI Score/i }).click();

    // Verify scores and feedback
    await expect(page.getByText('Score Dimensions (1-5 Scale)')).toBeVisible();
    await expect(page.getByText('Clear strategic framing')).toBeVisible();

    // Finish session
    await page.getByRole('button', { name: /Finish Mock Session/i }).click();

    // Verify session saved in history
    await expect(page.getByText(/Saved Mock Interview Sessions/i)).toBeVisible();
  });

  test('Dashboard displays Application Intelligence and Next Best Career Action', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Application Intelligence & Tactical Momentum/i)).toBeVisible();
    await expect(page.getByText('Upcoming Interviews', { exact: true })).toBeVisible();
    await expect(page.getByText(/Stale Applications/i)).toBeVisible();
    await expect(page.getByText(/Recent Milestone Activity/i)).toBeVisible();
  });
});
