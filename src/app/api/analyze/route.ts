import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequestSchema } from '@/lib/server/schemas';
import { GeminiFitAnalysisEngine } from '@/lib/server/geminiEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const engine = new GeminiFitAnalysisEngine();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = AnalyzeRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid analysis request schema',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const report = await engine.analyze(parseResult.data);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/analyze] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process analysis request',
        message,
      },
      { status: 500 }
    );
  }
}
