import { NextRequest, NextResponse } from 'next/server';
import { FollowUpComposeRequestSchema } from '@/lib/server/schemas';
import { FollowUpComposerEngine } from '@/lib/server/followUpComposerEngine';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const engine = new FollowUpComposerEngine();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = FollowUpComposeRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid follow-up compose request schema',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { opportunity, candidateSnapshot, actionType, tone, recipientRole, recipientName, keyPoints, customContext } = parseResult.data;

    const draft = await engine.composeDraft({
      opportunity: opportunity as unknown as JobOpportunity,
      candidate: candidateSnapshot as unknown as CandidateProfile,
      actionType,
      tone,
      recipientRole,
      recipientName,
      keyPoints,
      customContext,
    });

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/interview/follow-up] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compose follow-up draft',
        message,
      },
      { status: 500 }
    );
  }
}
