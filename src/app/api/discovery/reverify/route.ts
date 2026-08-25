import { NextResponse } from 'next/server';
import { validateSafeJobUrl } from '@/lib/server/urlValidator';
import { verifyJobListingContent } from '@/lib/server/listingVerifier';
import { sanitizeErrorMessage } from '@/lib/server/geminiRetry';
import { VerificationStatus } from '@/types/discovery';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, company, jobUrl } = body;

    if (!id || !title || !company) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, title, company.' },
        { status: 400 }
      );
    }

    if (!jobUrl) {
      return NextResponse.json({
        id,
        verificationStatus: 'unverified-legacy' as VerificationStatus,
        failureReason: 'No source URL available for validation.',
        verifiedAt: new Date().toISOString(),
        matchConfidence: 0,
      });
    }

    // Step 1: Run SSRF-safe URL validation and fetch snippet
    const urlResult = await validateSafeJobUrl(jobUrl, {
      timeoutMs: 5000,
      fetchHtmlSnippet: true,
    });

    if (!urlResult.isValid) {
      return NextResponse.json({
        id,
        verificationStatus: (urlResult.status === 404 || urlResult.status === 410 ? 'expired' : 'unreachable') as VerificationStatus,
        failureReason: urlResult.failureReason || `URL check failed with HTTP ${urlResult.status}`,
        verifiedAt: new Date().toISOString(),
        finalCanonicalUrl: urlResult.finalUrl || jobUrl,
        finalDomain: urlResult.finalDomain,
        matchConfidence: 0,
      });
    }

    // Step 2: Run deterministic listing content verifier
    const contentResult = verifyJobListingContent({
      title,
      company,
      url: urlResult.finalUrl || jobUrl,
      htmlContent: urlResult.htmlSnippet,
    });

    let newStatus: VerificationStatus = 'needs-verification';
    if (contentResult.isExpired) {
      newStatus = 'expired';
    } else if (contentResult.isVerifiedListing && contentResult.matchConfidence >= 65) {
      newStatus = 'verified-live';
    }

    return NextResponse.json({
      id,
      verificationStatus: newStatus,
      verifiedAt: new Date().toISOString(),
      matchConfidence: contentResult.matchConfidence,
      finalCanonicalUrl: urlResult.finalUrl || jobUrl,
      finalDomain: urlResult.finalDomain,
      failureReason: contentResult.verificationReason,
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
