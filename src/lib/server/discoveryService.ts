import { CandidateProfile } from '@/types/candidate';
import { DiscoveredJob, DiscoveryQuery } from '@/types/discovery';
import { GeminiSearchDiscoveryProvider } from './geminiDiscovery';
import { CuratedDiscoveryProvider } from './curatedDiscovery';
import { scoreDiscoveryRelevance } from '@/lib/discoveryStorage';

export interface DiscoveryExecutionResult {
  jobs: DiscoveredJob[];
  source: string;
  durationMs: number;
  totalFound: number;
}

/**
 * Server-side discovery execution coordinator.
 */
export async function runDiscoveryForCandidate(
  candidate: CandidateProfile,
  options?: { providerPreference?: 'gemini' | 'curated' }
): Promise<DiscoveryExecutionResult> {
  const startTime = Date.now();

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

  let provider = options?.providerPreference === 'curated'
    ? new CuratedDiscoveryProvider()
    : new GeminiSearchDiscoveryProvider();

  const isAvail = await provider.isAvailable();
  if (!isAvail && options?.providerPreference !== 'curated') {
    provider = new CuratedDiscoveryProvider() as unknown as GeminiSearchDiscoveryProvider;
  }

  const rawJobs = await provider.discoverJobs(query);
  const durationMs = Date.now() - startTime;

  // Enhance with active candidate-specific relevance scoring
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
    source: provider.name,
    durationMs,
    totalFound: scoredJobs.length,
  };
}
