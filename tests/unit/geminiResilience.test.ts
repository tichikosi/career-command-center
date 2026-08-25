import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWithResilience, isTransientGeminiError, sanitizeErrorMessage, calculateRetryDelay } from '@/lib/server/geminiRetry';
import { FitAnalysisReportSchema } from '@/lib/server/schemas';

describe('Gemini Resilience & Retry Policy Unit Tests', () => {
  const instantSleep = vi.fn(async () => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. succeeds on first attempt without retrying when primary model succeeds', async () => {
    const mockFn = vi.fn().mockResolvedValue({ status: 'ok', data: 'report-content' });

    const result = await executeWithResilience(
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      mockFn,
      { sleepFn: instantSleep, maxAttemptsPerModel: 3 }
    );

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('gemini-3.7-flash');
    expect(result.actualModel).toBe('gemini-3.7-flash');
    expect(result.requestedModel).toBe('gemini-3.7-flash');
    expect(result.attemptCount).toBe(1);
    expect(result.failoverOccurred).toBe(false);
    expect(result.result).toEqual({ status: 'ok', data: 'report-content' });
    expect(instantSleep).not.toHaveBeenCalled();
  });

  it('2. retries when primary model returns 503 and succeeds on retry', async () => {
    const error503 = new Error(JSON.stringify({
      error: { code: 503, message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' }
    }));
    (error503 as unknown as { status: number }).status = 503;

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error503)
      .mockResolvedValueOnce({ status: 'ok', data: 'recovered' });

    const result = await executeWithResilience(
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      mockFn,
      { sleepFn: instantSleep, maxAttemptsPerModel: 3 }
    );

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, 'gemini-3.7-flash');
    expect(mockFn).toHaveBeenNthCalledWith(2, 'gemini-3.7-flash');
    expect(instantSleep).toHaveBeenCalledTimes(1);
    expect(result.actualModel).toBe('gemini-3.7-flash');
    expect(result.attemptCount).toBe(2);
    expect(result.failoverOccurred).toBe(false);
  });

  it('3. fails over to gemini-3.6-flash when gemini-3.7-flash repeatedly returns 503', async () => {
    const error503 = new Error(JSON.stringify({
      error: { code: 503, message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' }
    }));
    (error503 as unknown as { status: number }).status = 503;

    const mockFn = vi.fn()
      // Primary 3.7 fails 3 times
      .mockRejectedValueOnce(error503)
      .mockRejectedValueOnce(error503)
      .mockRejectedValueOnce(error503)
      // Failover 3.6 succeeds on first attempt
      .mockResolvedValueOnce({ status: 'ok', data: '3.6-success' });

    const result = await executeWithResilience(
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      mockFn,
      { sleepFn: instantSleep, maxAttemptsPerModel: 3 }
    );

    expect(mockFn).toHaveBeenCalledTimes(4); // 3 primary + 1 failover
    expect(mockFn).toHaveBeenNthCalledWith(1, 'gemini-3.7-flash');
    expect(mockFn).toHaveBeenNthCalledWith(2, 'gemini-3.7-flash');
    expect(mockFn).toHaveBeenNthCalledWith(3, 'gemini-3.7-flash');
    expect(mockFn).toHaveBeenNthCalledWith(4, 'gemini-3.6-flash');
    expect(result.actualModel).toBe('gemini-3.6-flash');
    expect(result.requestedModel).toBe('gemini-3.7-flash');
    expect(result.failoverOccurred).toBe(true);
    expect(result.attemptCount).toBe(4);
  });

  it('4. throws after both primary and failover models exhaust transient failures', async () => {
    const error503 = new Error(JSON.stringify({
      error: { code: 503, message: 'UNAVAILABLE', status: 'UNAVAILABLE' }
    }));
    (error503 as unknown as { status: number }).status = 503;

    const mockFn = vi.fn().mockRejectedValue(error503);

    await expect(
      executeWithResilience(
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        mockFn,
        { sleepFn: instantSleep, maxAttemptsPerModel: 3 }
      )
    ).rejects.toThrow();

    // 3 attempts on 3.7 + 3 attempts on 3.6 = 6 total
    expect(mockFn).toHaveBeenCalledTimes(6);
  });

  it('5. does NOT retry repeatedly on non-transient 400 invalid argument or API key error', async () => {
    const authError = new Error(JSON.stringify({
      error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' }
    }));
    (authError as unknown as { status: number }).status = 400;

    const mockFn = vi.fn().mockRejectedValue(authError);

    await expect(
      executeWithResilience(
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        mockFn,
        { sleepFn: instantSleep, maxAttemptsPerModel: 3 }
      )
    ).rejects.toThrow();

    // Should fail immediately on attempt 1 with zero retries or model switches
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(instantSleep).not.toHaveBeenCalled();
  });

  it('6. does NOT trigger model failover on validation errors', async () => {
    const validationError = new Error('ZodValidationError: Missing required field "executiveSummary"');

    const mockFn = vi.fn().mockRejectedValue(validationError);

    await expect(
      executeWithResilience(
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        mockFn,
        { sleepFn: instantSleep, maxAttemptsPerModel: 3 }
      )
    ).rejects.toThrow();

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(instantSleep).not.toHaveBeenCalled();
  });

  it('7. execution metadata identifies actual model correctly and calculates backoff properly', () => {
    expect(calculateRetryDelay(1)).toBe(0);
    const delay2 = calculateRetryDelay(2, 1000, 200);
    expect(delay2).toBeGreaterThanOrEqual(1000);
    expect(delay2).toBeLessThanOrEqual(1200);

    const delay3 = calculateRetryDelay(3, 1000, 200);
    expect(delay3).toBeGreaterThanOrEqual(2000);
    expect(delay3).toBeLessThanOrEqual(2200);
  });

  it('8. failover does not alter FitAnalysisReport schema validity', () => {
    const validReportSample = {
      executiveSummary: 'Strong candidate profile fit.',
      likelyMandate: 'Scale engineering operations.',
      keyRequirements: ['Architecture', 'Leadership'],
      overallFitScore: 92,
      scoreExplanation: 'Aligned background.',
      recommendation: 'Apply' as const,
      positioningNarrative: 'Enterprise leader pitch.',
      qualifications: [
        {
          id: 'q1',
          category: 'Required' as const,
          qualification: 'Leadership',
          matchType: 'Strong Match' as const,
          explanation: 'Verified background.',
          supportingEvidenceCitationIds: ['EVID-01'],
        },
      ],
      objections: [],
      recruiterQuestions: ['Question 1'],
      hiringManagerQuestions: ['Question 2'],
      recommendedStarStories: [],
      nextActions: ['Action 1'],
      // Resilience fields
      requestedModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.6-flash',
      engineType: 'gemini' as const,
      attemptCount: 4,
      failoverOccurred: true,
      fallbackOccurred: false,
      sanitizedFailureReason: 'Primary model unavailable.',
    };

    const parsed = FitAnalysisReportSchema.safeParse(validReportSample);
    expect(parsed.success).toBe(true);
  });

  it('9. sanitizes error messages and strips keys/tokens safely', () => {
    const secretMsg = 'Call to https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyD-fakeKey1234567890abcdefghijklm failed with status 400';
    const sanitized = sanitizeErrorMessage(new Error(secretMsg));
    expect(sanitized).not.toContain('AIzaSyD-fakeKey');
    expect(sanitized).toContain('[REDACTED');
  });

  it('10. classifies transient vs permanent errors correctly', () => {
    expect(isTransientGeminiError({ status: 503 })).toBe(true);
    expect(isTransientGeminiError({ status: 429 })).toBe(true);
    expect(isTransientGeminiError({ status: 500 })).toBe(true);
    expect(isTransientGeminiError(new Error('This model is currently experiencing high demand'))).toBe(true);
    expect(isTransientGeminiError(new Error('fetch failed ECONNRESET'))).toBe(true);

    expect(isTransientGeminiError({ status: 400 })).toBe(false);
    expect(isTransientGeminiError({ status: 401 })).toBe(false);
    expect(isTransientGeminiError({ status: 403 })).toBe(false);
    expect(isTransientGeminiError(new Error('API key not valid'))).toBe(false);
  });
});
