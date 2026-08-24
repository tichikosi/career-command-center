import { NextRequest, NextResponse } from 'next/server';
import { runDiscoveryForCandidate } from '@/lib/server/discoveryService';
import { CandidateProfile } from '@/types/candidate';
import { defaultSyntheticCandidateProfile } from '@/data/candidate';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const candidate: CandidateProfile = body?.candidateSnapshot || defaultSyntheticCandidateProfile;
    const providerPreference = body?.providerPreference as 'gemini' | 'curated' | undefined;

    const result = await runDiscoveryForCandidate(candidate, { providerPreference });

    return NextResponse.json({
      success: true,
      jobs: result.jobs,
      stats: {
        totalFound: result.totalFound,
        durationMs: result.durationMs,
        source: result.source,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Discovery run failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
