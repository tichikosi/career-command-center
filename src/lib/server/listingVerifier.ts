import { normalizeCompanyName } from '@/lib/networkParser';

export interface ListingVerificationResult {
  isVerifiedListing: boolean;
  isExpired: boolean;
  isGenericCareersPage: boolean;
  matchConfidence: number; // 0 - 100
  verificationReason: string;
  isAtsDomain: boolean;
}

export interface ListingVerificationInput {
  title: string;
  company: string;
  htmlContent?: string;
  snippet?: string;
  url?: string;
}

const RECOGNIZED_ATS_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'myworkdayjobs.com',
  'workday.com',
  'smartrecruiters.com',
  'bamboohr.com',
  'icims.com',
  'jobvite.com',
  'rippling-ats.com',
  'rippling.com',
  'workable.com',
  'pinpointhq.com',
  'recruitee.com',
];

const EXPIRED_PATTERNS = [
  /\bposition (is|has been) (closed|filled|expired|removed)\b/i,
  /\bjob (is|has been) (closed|filled|expired|removed|archived)\b/i,
  /\bthis position is no longer available\b/i,
  /\bthis role is no longer available\b/i,
  /\bthis job is no longer available\b/i,
  /\bno longer accepting applications\b/i,
  /\bapplication closed\b/i,
  /\bposting has expired\b/i,
  /\b404\s*-\s*page not found\b/i,
  /\bpage not found\b/i,
  /\bthis requisition has closed\b/i,
];

const GENERIC_CAREERS_PATTERNS = [
  /^careers\s*(at|@|-|\|)?/i,
  /^join our team\s*$/i,
  /^explore open roles\s*$/i,
  /^all open positions\s*$/i,
  /^search all jobs\s*$/i,
  /^work with us\s*$/i,
];

/**
 * Deterministically verifies whether a web page or source snippet corresponds to an active, specific job opening.
 */
export function verifyJobListingContent(input: ListingVerificationInput): ListingVerificationResult {
  const { title, company, htmlContent = '', snippet = '', url = '' } = input;

  const combinedText = `${htmlContent} ${snippet}`.toLowerCase();
  const normTargetCompany = normalizeCompanyName(company).toLowerCase();
  const urlLower = url.toLowerCase();

  // 1. Check if domain belongs to a recognized enterprise ATS
  const isAtsDomain = RECOGNIZED_ATS_DOMAINS.some((ats) => urlLower.includes(ats));

  // 2. Check for explicit expiration or removal patterns
  for (const pattern of EXPIRED_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isVerifiedListing: false,
        isExpired: true,
        isGenericCareersPage: false,
        matchConfidence: 0,
        verificationReason: `Expired or closed listing detected: "${pattern.source}"`,
        isAtsDomain,
      };
    }
  }

  // 3. Check for generic careers homepage (without role-specific content)
  // If html text is provided, extract <title> and <h1> to check if page is just a generic job directory
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : '';

  if (pageTitle && GENERIC_CAREERS_PATTERNS.some((p) => p.test(pageTitle))) {
    // Check if the specific job title appears anywhere in the body
    const titleKeywords = title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const keywordMatches = titleKeywords.filter((w) => combinedText.includes(w));

    if (keywordMatches.length === 0) {
      return {
        isVerifiedListing: false,
        isExpired: false,
        isGenericCareersPage: true,
        matchConfidence: 20,
        verificationReason: `Generic careers portal without specific role details (Page title: "${pageTitle}").`,
        isAtsDomain,
      };
    }
  }

  // 4. Score Company Alignment
  let companyScore = 0;
  if (normTargetCompany.length > 0) {
    const companyInText = combinedText.includes(normTargetCompany);
    const companyInUrl = urlLower.includes(normTargetCompany.replace(/[^a-z0-9]/g, ''));

    if (companyInText || companyInUrl) {
      companyScore = 50;
    } else {
      // Split words for multi-word companies
      const coWords = normTargetCompany.split(/\s+/).filter((w) => w.length > 2);
      if (coWords.some((w) => combinedText.includes(w) || urlLower.includes(w))) {
        companyScore = 35;
      }
    }
  } else {
    companyScore = 25;
  }

  // 5. Score Title Alignment
  let titleScore = 0;
  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['and', 'the', 'for', 'with', 'from'].includes(w));

  if (titleWords.length > 0) {
    const matchedTitleWords = titleWords.filter((w) => combinedText.includes(w));
    const titleRatio = matchedTitleWords.length / titleWords.length;

    if (titleRatio >= 0.75) {
      titleScore = 50;
    } else if (titleRatio >= 0.5) {
      titleScore = 35;
    } else if (titleRatio > 0) {
      titleScore = 20;
    }
  } else {
    titleScore = 25;
  }

  // Bonus for ATS domain or application structural signals
  let structuralBonus = 0;
  if (isAtsDomain) structuralBonus += 10;
  if (/\b(responsibilities|qualifications|requirements|about the role|what you'll do|apply for this job|submit application)\b/i.test(combinedText)) {
    structuralBonus += 10;
  }

  const matchConfidence = Math.min(100, companyScore + titleScore + structuralBonus);
  const isVerifiedListing = matchConfidence >= 60;

  const verificationReason = isVerifiedListing
    ? `Verified active listing matching "${company}" and "${title}" (${matchConfidence}% confidence${isAtsDomain ? ' on recognized ATS' : ''}).`
    : `Low listing confidence (${matchConfidence}%): Company match=${companyScore}%, Title match=${titleScore}%.`;

  return {
    isVerifiedListing,
    isExpired: false,
    isGenericCareersPage: false,
    matchConfidence,
    verificationReason,
    isAtsDomain,
  };
}
