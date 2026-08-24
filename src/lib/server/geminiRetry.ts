/**
 * Server-side Gemini Resilience, Retry, and Model Failover Utility.
 * Implements bounded exponential backoff with jitter and graceful model degradation.
 */

export interface ResilienceExecutionResult<T> {
  result: T;
  actualModel: string;
  requestedModel: string;
  attemptCount: number;
  failoverOccurred: boolean;
  sanitizedFailureReason?: string;
}

export interface RetryOptions {
  maxAttemptsPerModel?: number;
  sleepFn?: (ms: number) => Promise<void>;
  baseDelayMs?: number;
  jitterMs?: number;
}

/**
 * Determines whether a Gemini API / Network error is transient and eligible for retry.
 */
export function isTransientGeminiError(err: unknown): boolean {
  if (!err) return false;

  // Extract status code if present
  let status: number | null = null;
  if (typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    status = (err as { status: number }).status;
  }

  // Extract message string
  const message = err instanceof Error ? err.message : String(err);
  const lowerMsg = message.toLowerCase();

  // Explicit Non-transient / Permanent Errors (DO NOT RETRY)
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('invalid_argument') ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('unauthenticated')
  ) {
    return false;
  }

  // Explicit Transient HTTP Status Codes
  if (
    status === 408 || // Request Timeout
    status === 429 || // Resource Exhausted / Rate Limit
    status === 500 || // Internal Server Error
    status === 502 || // Bad Gateway
    status === 503 || // Service Unavailable / High Demand
    status === 504    // Gateway Timeout
  ) {
    return true;
  }

  // Transient Error Messages and SDK Keywords
  if (
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('too many requests') ||
    lowerMsg.includes('overloaded') ||
    lowerMsg.includes('deadline exceeded') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('und_err_connect_timeout')
  ) {
    return true;
  }

  return false;
}

/**
 * Sanitizes error messages to remove any potential keys, tokens, or sensitive data.
 */
export function sanitizeErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  let message = err instanceof Error ? err.message : String(err);

  // Strip anything looking like API keys (AIza..., AQ..., bearer tokens)
  message = message.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
  message = message.replace(/AQ\.[0-9A-Za-z-_]{30,}/g, '[REDACTED_AUTH_TOKEN]');
  message = message.replace(/(key=)[^\s&]+/g, '$1[REDACTED]');
  message = message.replace(/(Bearer\s+)[^\s]+/g, '$1[REDACTED]');

  return message;
}

/**
 * Calculates bounded delay with jitter for a given retry attempt.
 */
export function calculateRetryDelay(attempt: number, baseDelayMs = 1000, maxJitterMs = 300): number {
  if (attempt <= 1) return 0;
  // Attempt 2: ~1s + jitter
  // Attempt 3: ~2s + jitter
  const backoffFactor = Math.pow(2, attempt - 2);
  const jitter = Math.floor(Math.random() * maxJitterMs);
  return baseDelayMs * backoffFactor + jitter;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Executes an operation with bounded retry and automatic failover from primary to secondary model.
 */
export async function executeWithResilience<T>(
  primaryModel: string,
  failoverModel: string,
  fn: (model: string) => Promise<T>,
  options: RetryOptions = {}
): Promise<ResilienceExecutionResult<T>> {
  const maxAttempts = options.maxAttemptsPerModel ?? 3;
  const sleep = options.sleepFn ?? defaultSleep;
  const baseDelay = options.baseDelayMs ?? 1000;
  const jitter = options.jitterMs ?? 300;

  let totalAttempts = 0;
  let lastError: unknown = null;

  // Phase 1: Attempt Primary Model with bounded retries
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    totalAttempts++;
    try {
      if (attempt > 1) {
        const delay = calculateRetryDelay(attempt, baseDelay, jitter);
        if (delay > 0) {
          await sleep(delay);
        }
      }

      const result = await fn(primaryModel);
      return {
        result,
        actualModel: primaryModel,
        requestedModel: primaryModel,
        attemptCount: totalAttempts,
        failoverOccurred: false,
      };
    } catch (err: unknown) {
      lastError = err;
      const isTransient = isTransientGeminiError(err);
      const sanitized = sanitizeErrorMessage(err);

      console.warn(
        `[GeminiResilience] Primary model (${primaryModel}) attempt ${attempt}/${maxAttempts} failed: ${sanitized} (transient: ${isTransient})`
      );

      // If not transient, do not retry or fail over — fail immediately
      if (!isTransient) {
        throw err;
      }
    }
  }

  // Phase 2: If primary model failed with transient errors, attempt Failover Model
  if (failoverModel && failoverModel !== primaryModel) {
    console.warn(
      `[GeminiResilience] Primary model (${primaryModel}) exhausted ${maxAttempts} attempts. Initiating failover to ${failoverModel}...`
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      totalAttempts++;
      try {
        if (attempt > 1) {
          const delay = calculateRetryDelay(attempt, baseDelay, jitter);
          if (delay > 0) {
            await sleep(delay);
          }
        }

        const result = await fn(failoverModel);
        return {
          result,
          actualModel: failoverModel,
          requestedModel: primaryModel,
          attemptCount: totalAttempts,
          failoverOccurred: true,
          sanitizedFailureReason: `Primary model (${primaryModel}) unavailable. Succeeded via failover to ${failoverModel}.`,
        };
      } catch (err: unknown) {
        lastError = err;
        const isTransient = isTransientGeminiError(err);
        const sanitized = sanitizeErrorMessage(err);

        console.warn(
          `[GeminiResilience] Failover model (${failoverModel}) attempt ${attempt}/${maxAttempts} failed: ${sanitized} (transient: ${isTransient})`
        );

        if (!isTransient) {
          throw err;
        }
      }
    }
  }

  // Phase 3: Both primary and failover models exhausted
  const finalError = lastError instanceof Error ? lastError : new Error(sanitizeErrorMessage(lastError));
  throw finalError;
}
