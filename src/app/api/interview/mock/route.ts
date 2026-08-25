import { NextRequest, NextResponse } from 'next/server';
import { MockQuestionsRequestSchema, MockEvaluationRequestSchema } from '@/lib/server/schemas';
import { MockInterviewEngine } from '@/lib/server/mockInterviewEngine';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const engine = new MockInterviewEngine();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const action = rawBody?.action || 'evaluate';

    if (action === 'generate_questions') {
      const parseResult = MockQuestionsRequestSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid question generation request schema',
            details: parseResult.error.flatten(),
          },
          { status: 400 }
        );
      }

      const { opportunity, candidateSnapshot, difficulty, mode } = parseResult.data;
      const result = await engine.generateQuestions({
        opportunity: opportunity as unknown as JobOpportunity,
        candidate: candidateSnapshot as unknown as CandidateProfile,
        difficulty,
        mode,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Default action: evaluate answer
    const parseResult = MockEvaluationRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid answer evaluation request schema',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { question, questionCategory, candidateAnswer, opportunity, candidateSnapshot, difficulty } = parseResult.data;
    const evaluation = await engine.evaluateAnswer({
      question,
      questionCategory,
      candidateAnswer,
      opportunity: opportunity as unknown as JobOpportunity,
      candidate: candidateSnapshot as unknown as CandidateProfile,
      difficulty,
    });

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/interview/mock] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process mock interview request',
        message,
      },
      { status: 500 }
    );
  }
}
