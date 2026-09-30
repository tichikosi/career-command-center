import { NextRequest, NextResponse } from 'next/server';
import {
  MockQuestionsRequestSchema,
  MockEvaluationRequestSchema,
  ConversationalTurnRequestSchema,
} from '@/lib/server/schemas';
import { MockInterviewEngine } from '@/lib/server/mockInterviewEngine';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import { VoiceDeliveryMetrics } from '@/types/interview';

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

      const { opportunity, candidateSnapshot, difficulty, mode, persona } = parseResult.data;
      const result = await engine.generateQuestions({
        opportunity: opportunity as unknown as JobOpportunity,
        candidate: candidateSnapshot as unknown as CandidateProfile,
        difficulty,
        mode,
        persona,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (action === 'conversational_turn') {
      const parseResult = ConversationalTurnRequestSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid conversational turn request schema',
            details: parseResult.error.flatten(),
          },
          { status: 400 }
        );
      }

      const {
        question,
        candidateAnswer,
        conversationHistory,
        persona,
        difficulty,
        opportunity,
        candidateSnapshot,
      } = parseResult.data;

      const result = await engine.generateDynamicFollowUp({
        question,
        candidateAnswer,
        conversationHistory,
        persona,
        difficulty,
        opportunity: opportunity as unknown as JobOpportunity,
        candidate: candidateSnapshot as unknown as CandidateProfile,
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

    const {
      question,
      questionCategory,
      candidateAnswer,
      opportunity,
      candidateSnapshot,
      difficulty,
      answerMode,
      transcriptSource,
      deliveryMetrics,
      persona,
    } = parseResult.data;

    const evaluation = await engine.evaluateAnswer({
      question,
      questionCategory,
      candidateAnswer,
      opportunity: opportunity as unknown as JobOpportunity,
      candidate: candidateSnapshot as unknown as CandidateProfile,
      difficulty,
      answerMode,
      transcriptSource,
      deliveryMetrics: deliveryMetrics as VoiceDeliveryMetrics | undefined,
      persona,
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
