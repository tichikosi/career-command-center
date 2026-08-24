import { NextRequest, NextResponse } from 'next/server';
import { runDiscoveryForCandidate } from '@/lib/server/discoveryService';
import { defaultSyntheticCandidateProfile } from '@/data/candidate';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // Verify Bearer authorization if CRON_SECRET is configured
  if (cronSecret && cronSecret.trim().length > 0) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
    }
  }

  try {
    const result = await runDiscoveryForCandidate(defaultSyntheticCandidateProfile);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      source: result.source,
      totalFound: result.totalFound,
      durationMs: result.durationMs,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cron execution failed' },
      { status: 500 }
    );
  }
}
