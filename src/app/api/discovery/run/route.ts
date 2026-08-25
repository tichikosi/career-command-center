import { NextRequest, NextResponse } from 'next/server';
import { runDiscoveryForCandidate } from '@/lib/server/discoveryService';
import { CandidateProfile } from '@/types/candidate';
import { defaultSyntheticCandidateProfile } from '@/data/candidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const candidate: CandidateProfile = body?.candidateSnapshot || body?.candidateProfile || defaultSyntheticCandidateProfile;
    const providerPreference = (body?.providerPreference || body?.provider) as 'gemini' | 'curated' | undefined;

    const result = await runDiscoveryForCandidate(candidate, { providerPreference });

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          stats: {
            totalFound: 0,
            durationMs: result.durationMs,
            source: result.source,
            provider: result.provider,
            groundingEnabled: result.groundingEnabled,
            groundingQueries: result.groundingQueries,
            jobsReturnedByModel: result.jobsReturnedByModel,
            jobsGrounded: result.jobsGrounded,
            jobsUrlValid: result.jobsUrlValid,
            jobsVerifiedLive: result.jobsVerifiedLive,
            jobsRejected: result.jobsRejected,
            modelRequested: result.modelRequested,
            modelUsed: result.modelUsed,
            sanitizedFailureReason: result.sanitizedFailureReason,
          },
        },
        { status: 200 } // Return 200 with success: false for clean client-side state handling
      );
    }

    return NextResponse.json({
      success: true,
      jobs: result.jobs,
      stats: {
        totalFound: result.totalFound,
        durationMs: result.durationMs,
        source: result.source,
        provider: result.provider,
        groundingEnabled: result.groundingEnabled,
        groundingQueries: result.groundingQueries,
        jobsReturnedByModel: result.jobsReturnedByModel,
        jobsGrounded: result.jobsGrounded,
        jobsUrlValid: result.jobsUrlValid,
        jobsVerifiedLive: result.jobsVerifiedLive,
        jobsRejected: result.jobsRejected,
        modelRequested: result.modelRequested,
        modelUsed: result.modelUsed,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Discovery run failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
