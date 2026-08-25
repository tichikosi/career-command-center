import { NextRequest, NextResponse } from 'next/server';
import { InterviewPrepRequestSchema } from '@/lib/server/schemas';
import { InterviewPrepEngine } from '@/lib/server/interviewPrepEngine';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const engine = new InterviewPrepEngine();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = InterviewPrepRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid interview prep request schema',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { opportunity, candidateSnapshot, analysisReport } = parseResult.data;

    const prep = await engine.generatePrep({
      opportunity: opportunity as unknown as JobOpportunity,
      candidate: candidateSnapshot as unknown as CandidateProfile,
      analysisReport: analysisReport as unknown as any,
    });

    return NextResponse.json({
      success: true,
      prep,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/interview/prep] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate interview prep',
        message,
      },
      { status: 500 }
    );
  }
}
