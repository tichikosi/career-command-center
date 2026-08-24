import { NextRequest, NextResponse } from 'next/server';
import { ServerResumeParser } from '@/lib/server/resumeParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const parser = new ServerResumeParser();

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const text = formData.get('text') as string | null;

      if (!file && !text) {
        return NextResponse.json({ success: false, error: 'No file or text provided' }, { status: 400 });
      }

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');

        const result = await parser.parseResume({
          fileBufferBase64: base64,
          mimeType: file.type || 'application/octet-stream',
          filename: file.name,
        });

        return NextResponse.json(result);
      }

      const result = await parser.parseResume({ text: text || '' });
      return NextResponse.json(result);
    }

    // Handle JSON body
    const body = await req.json();
    const result = await parser.parseResume({
      text: body.text,
      fileBufferBase64: body.fileBufferBase64,
      mimeType: body.mimeType,
      filename: body.filename,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    console.error('[API /api/resume/parse] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extract resume data',
        message,
      },
      { status: 500 }
    );
  }
}
