import { CandidateProfile } from '@/types/candidate';
import { DiscoveredJob, DiscoveryQuery } from '@/types/discovery';
import { GeminiSearchDiscoveryProvider } from './geminiDiscovery';
import { CuratedDiscoveryProvider } from './curatedDiscovery';
import { scoreDiscoveryRelevance } from '@/lib/discoveryStorage';
import { getGeminiModel, isGeminiConfigured } from './geminiConfig';
import { sanitizeErrorMessage } from './geminiRetry';

export interface DiscoveryExecutionResult {
  jobs: DiscoveredJob[];
  source: string;
  provider: string;
  durationMs: number;
  totalFound: number;
  groundingEnabled: boolean;
  groundingQueries: string[];
  jobsReturnedByModel: number;
  jobsGrounded: number;
  jobsUrlValid: number;
  jobsVerifiedLive: number;
  jobsRejected: number;
  modelRequested?: string;
  modelUsed?: string;
  sanitizedFailureReason?: string;
  error?: string;
}

/**
 * Server-side discovery execution coordinator.
 * Executes live Google Search Grounded discovery or curated feed.
 */
export async function runDiscoveryForCandidate(
  candidate: CandidateProfile,
  options?: { providerPreference?: 'gemini' | 'curated' }
): Promise<DiscoveryExecutionResult> {
  const startTime = Date.now();
  const isCurated = options?.providerPreference === 'curated';

  const query: DiscoveryQuery = {
    targetRoles: candidate.targetRoles && candidate.targetRoles.length > 0
      ? candidate.targetRoles
      : ['AI GTM, Strategy & Operations Leader', 'Director GTM Operations', 'Head of Business Operations'],
    targetIndustries: candidate.targetIndustries && candidate.targetIndustries.length > 0
      ? candidate.targetIndustries
      : ['Enterprise AI', 'SaaS', 'Cloud Platform'],
    preferredLocations: candidate.preferredLocations && candidate.preferredLocations.length > 0
      ? candidate.preferredLocations
      : ['San Francisco, CA (Hybrid)', 'Remote', 'Silicon Valley'],
    compensationTarget: candidate.compensationTarget || '$220,000 - $350,000',
    seniorityLevel: 'Executive / Director / VP',
  };

  if (isCurated) {
    const curatedProvider = new CuratedDiscoveryProvider();
    const rawJobs = await curatedProvider.discoverJobs(query);
    const durationMs = Date.now() - startTime;

    const scoredJobs: DiscoveredJob[] = rawJobs.map((job) => {
      const scored = scoreDiscoveryRelevance(job, candidate);
      return {
        ...job,
        relevanceScore: scored.relevanceScore,
        relevanceLevel: scored.relevanceLevel,
        relevanceReasons: scored.relevanceReasons,
        matchedPreferences: scored.matchedPreferences,
      };
    });

    return {
      jobs: scoredJobs,
      source: curatedProvider.name,
      provider: curatedProvider.name,
      durationMs,
      totalFound: scoredJobs.length,
      groundingEnabled: false,
      groundingQueries: [],
      jobsReturnedByModel: scoredJobs.length,
      jobsGrounded: 0,
      jobsUrlValid: scoredJobs.length,
      jobsVerifiedLive: 0,
      jobsRejected: 0,
      modelRequested: 'deterministic-rules',
      modelUsed: 'deterministic-rules',
    };
  }

  // Live Grounded Gemini Discovery
  const geminiProvider = new GeminiSearchDiscoveryProvider();
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key is not configured for Live Grounded Job Discovery.');
  }

  try {
    const rawJobs = await geminiProvider.discoverJobs(query);
    const durationMs = Date.now() - startTime;
    const metrics = geminiProvider.lastExecutionMetrics;

    const scoredJobs: DiscoveredJob[] = rawJobs.map((job) => {
      const scored = scoreDiscoveryRelevance(job, candidate);
      return {
        ...job,
        relevanceScore: scored.relevanceScore,
        relevanceLevel: scored.relevanceLevel,
        relevanceReasons: scored.relevanceReasons,
        matchedPreferences: scored.matchedPreferences,
      };
    });

    return {
      jobs: scoredJobs,
      source: geminiProvider.name,
      provider: geminiProvider.name,
      durationMs,
      totalFound: scoredJobs.length,
      groundingEnabled: true,
      groundingQueries: metrics.groundingQueries,
      jobsReturnedByModel: metrics.jobsReturnedByModel,
      jobsGrounded: metrics.jobsGrounded,
      jobsUrlValid: metrics.jobsUrlValid,
      jobsVerifiedLive: metrics.jobsVerifiedLive,
      jobsRejected: metrics.jobsRejected,
      modelRequested: getGeminiModel(),
      modelUsed: scoredJobs[0]?.modelUsed || getGeminiModel(),
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const sanitizedError = sanitizeErrorMessage(err);

    return {
      jobs: [],
      source: geminiProvider.name,
      provider: geminiProvider.name,
      durationMs,
      totalFound: 0,
      groundingEnabled: true,
      groundingQueries: [],
      jobsReturnedByModel: 0,
      jobsGrounded: 0,
      jobsUrlValid: 0,
      jobsVerifiedLive: 0,
      jobsRejected: 0,
      modelRequested: getGeminiModel(),
      sanitizedFailureReason: sanitizedError,
      error: sanitizedError,
    };
  }
}
