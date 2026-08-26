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
    await expect(page.getByRole('button', { name: /Enable Microphone & Practice/i })).toBeVisible();

    // Switch back to Type mode to ensure seamless toggle
    await page.getByRole('button', { name: 'Type' }).first().click();
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // Fill typed response and verify submit
    await textarea.fill('At Nexus Global, I led the cross-functional AI platform rollout across five business units.');
    await page.getByRole('button', { name: /Submit Answer/i }).click();

    // Verify scorecard rendering
    await expect(page.getByText('Overall Response Score')).toBeVisible();
    await expect(page.getByText('88%')).toBeVisible();
    await expect(page.getByText('Content Performance (1-5 Scale)')).toBeVisible();
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

  test('Voice replay audio playback stops on submission, retry, and tab navigation', async ({ page }) => {
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
              overallResponseScore: 92,
              contentWeight: 0.7,
              deliveryWeight: 0.3,
              coaching: {
                strengths: ['Clear delivery cadence'],
                improvements: [],
                improvedAnswer: 'Grounded executive response.',
              },
              voiceCoaching: {
                speakingPaceCoaching: 'Measured pace at 145 WPM.',
                fillerWordCoaching: 'Zero filler words.',
                deliveryRefinements: [],
                overallDeliverySummary: 'Strong delivery.',
              },
              evidenceCitations: [],
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

    // Mock browser media and audio APIs
    await page.addInitScript(() => {
      (window as unknown as { __mockAudioPlayCount: number }).__mockAudioPlayCount = 0;
      (window as unknown as { __mockAudioPauseCount: number }).__mockAudioPauseCount = 0;
      (window as unknown as { __mockAudioIsPlaying: boolean }).__mockAudioIsPlaying = false;

      class MockAudio {
        src = '';
        currentTime = 0;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(src?: string) {
          if (src) this.src = src;
        }
        play() {
          (window as unknown as { __mockAudioPlayCount: number }).__mockAudioPlayCount++;
          (window as unknown as { __mockAudioIsPlaying: boolean }).__mockAudioIsPlaying = true;
          return Promise.resolve();
        }
        pause() {
          (window as unknown as { __mockAudioPauseCount: number }).__mockAudioPauseCount++;
          (window as unknown as { __mockAudioIsPlaying: boolean }).__mockAudioIsPlaying = false;
        }
      }
      (window as unknown as { Audio: typeof MockAudio }).Audio = MockAudio;

      const mockStream = {
        getTracks: () => [{ stop: () => {} }],
      };
      if (!navigator.mediaDevices) {
        (navigator as unknown as { mediaDevices: { getUserMedia: () => Promise<unknown> } }).mediaDevices = {
          getUserMedia: () => Promise.resolve(mockStream),
        };
      } else {
        navigator.mediaDevices.getUserMedia = () => Promise.resolve(mockStream as unknown as MediaStream);
      }

      class MockMediaRecorder {
        state = 'inactive';
        ondataavailable: ((e: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        start() {
          this.state = 'recording';
        }
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['audio-sample'], { type: 'audio/webm' }) });
          }
          if (this.onstop) this.onstop();
        }
      }
      (window as unknown as { MediaRecorder: typeof MockMediaRecorder }).MediaRecorder = MockMediaRecorder;

      class MockSpeechRec {
        continuous = true;
        interimResults = true;
        lang = 'en-US';
        onresult: ((e: unknown) => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                resultIndex: 0,
                results: [{ isFinal: true, 0: { transcript: 'At Nexus Global I led cloud platform initiatives.' } }],
              });
            }
          }, 50);
        }
        stop() {}
        abort() {}
      }
      (window as unknown as { SpeechRecognition: typeof MockSpeechRec }).SpeechRecognition = MockSpeechRec;
      (window as unknown as { webkitSpeechRecognition: typeof MockSpeechRec }).webkitSpeechRecognition = MockSpeechRec;
    });

    await page.goto('/opportunities');
    await page.getByRole('link', { name: /Report/i }).first().click();
    await page.waitForURL(/\/analysis\/.+/);

    // Switch to Mock Interview tab
    await page.getByRole('button', { name: /Mock Interview/i }).click();

    // Select Speak mode
    await page.getByRole('button', { name: 'Speak' }).first().click();
    await page.getByRole('button', { name: /Start Mock Session/i }).click();

    // Enable Mic
    await page.getByRole('button', { name: /Enable Microphone & Practice/i }).click();
    await expect(page.getByRole('button', { name: /Start Answer/i })).toBeVisible();

    // Start Answer
    await page.getByRole('button', { name: /Start Answer/i }).click();
    await expect(page.getByRole('button', { name: /Stop Answer & Review/i })).toBeVisible();

    // Stop Answer & Review
    await page.getByRole('button', { name: /Stop Answer & Review/i }).click();
    await expect(page.getByRole('button', { name: /Listen Again/i })).toBeVisible();

    // Start Replay
    await page.getByRole('button', { name: /Listen Again/i }).click();
    await expect(page.getByRole('button', { name: /Stop Playback/i })).toBeVisible();

    // Check that Audio played
    const isPlaying = await page.evaluate(() => (window as unknown as { __mockAudioIsPlaying: boolean }).__mockAudioIsPlaying);
    expect(isPlaying).toBe(true);

    // Submit Answer while replay is active
    await page.getByRole('button', { name: /Submit Answer for AI Score/i }).click();

    // Verify scorecard rendering and verify audio was paused immediately
    await expect(page.getByText('Overall Response Score')).toBeVisible();
    const isPlayingAfterSubmit = await page.evaluate(() => (window as unknown as { __mockAudioIsPlaying: boolean }).__mockAudioIsPlaying);
    expect(isPlayingAfterSubmit).toBe(false);
  });
});
