import { NextResponse } from 'next/server';
import { isGeminiConfigured, getGeminiModel } from '@/lib/server/geminiConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'career-command-center',
    version: '2.0.0',
    geminiConfigured: isGeminiConfigured(),
    model: getGeminiModel(),
    timestamp: new Date().toISOString(),
  });
}
