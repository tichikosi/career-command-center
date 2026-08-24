import { NetworkContact } from '@/types/network';
import { OpportunityAction } from '@/types/opportunity';
import { normalizeCompanyName } from './networkParser';

export interface RankedContactMatch {
  contact: NetworkContact;
  relevanceScore: number;
  matchReasons: string[];
}

/**
 * Deterministically matches professional network contacts to a given target company name.
 */
export function findMatchingContacts(
  companyName: string | null | undefined,
  contacts: NetworkContact[]
): NetworkContact[] {
  if (!companyName || !Array.isArray(contacts)) return [];

  const targetNorm = normalizeCompanyName(companyName);
  if (!targetNorm) return [];

  return contacts.filter((contact) => {
    if (!contact.company) return false;
    const contactCoNorm = normalizeCompanyName(contact.company);
    if (!contactCoNorm) return false;

    // Exact normalized match or strong substring containment
    return (
      contactCoNorm === targetNorm ||
      contactCoNorm.includes(targetNorm) ||
      targetNorm.includes(contactCoNorm)
    );
  });
}

const SENIORITY_PATTERNS: Array<{ regex: RegExp; score: number; label: string }> = [
  { regex: /\b(chief|c-level|ceo|coo|cto|cpo|cro|cmo|cfo|president|partner|executive vice president|evp|senior vice president|svp|vp|vice president)\b/i, score: 30, label: 'Executive Leadership' },
  { regex: /\b(senior director|sr\.? director|director|head of|managing director)\b/i, score: 25, label: 'Director & Department Leadership' },
  { regex: /\b(principal|staff|lead|senior manager|sr\.? manager|manager|senior|sr\.?)\b/i, score: 15, label: 'Senior / Lead Role' },
];

const TALENT_PATTERNS = /\b(recruiter|recruiting|talent acquisition|talent|sourcer|headhunter|people partner|hrbp|human resources|staffing)\b/i;

const FUNCTIONAL_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'strategy', 'operations', 'bizops', 'gtm',
  'sales', 'revops', 'revenue', 'product', 'engineering', 'marketing', 'data', 'analytics', 'growth',
  'enablement', 'transformation', 'program management',
];

/**
 * Deterministically ranks matched network contacts by executive relevance,
 * functional alignment to the target opportunity, and hiring/recruiting presence.
 */
export function rankMatchedContacts(
  contacts: NetworkContact[],
  targetTitle?: string,
  targetCompany?: string
): RankedContactMatch[] {
  if (!Array.isArray(contacts) || contacts.length === 0) return [];

  const targetCompanyNorm = targetCompany ? normalizeCompanyName(targetCompany) : '';
  const targetTitleWords = targetTitle
    ? targetTitle.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
    : [];

  const ranked: RankedContactMatch[] = contacts.map((contact) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Company Match Fidelity
    if (contact.company) {
      const contactCoNorm = normalizeCompanyName(contact.company);
      if (targetCompanyNorm && contactCoNorm === targetCompanyNorm) {
        score += 50;
        reasons.push('Direct Company Match');
      } else if (targetCompanyNorm && (contactCoNorm.includes(targetCompanyNorm) || targetCompanyNorm.includes(contactCoNorm))) {
        score += 25;
        reasons.push('Company Affiliate / Subsidiary Match');
      }
    }

    const pos = (contact.position || '').toLowerCase();

    // 2. Seniority Signals
    for (const { regex, score: seniorityScore, label } of SENIORITY_PATTERNS) {
      if (regex.test(pos)) {
        score += seniorityScore;
        reasons.push(label);
        break;
      }
    }

    // 3. Talent / Recruiting Role
    if (TALENT_PATTERNS.test(pos)) {
      score += 25;
      reasons.push('Talent & Hiring Team');
    }

    // 4. Functional Alignment to Target Title
    let functionalMatchCount = 0;
    for (const kw of FUNCTIONAL_KEYWORDS) {
      if (targetTitle && targetTitle.toLowerCase().includes(kw) && pos.includes(kw)) {
        functionalMatchCount++;
        reasons.push(`Domain Alignment: ${kw.toUpperCase()}`);
      }
    }
    if (functionalMatchCount > 0) {
      score += Math.min(45, functionalMatchCount * 20);
    }

    // 5. Keyword Overlap with Target Title
    let overlapCount = 0;
    for (const word of targetTitleWords) {
      if (pos.includes(word) && !['the', 'and', 'for', 'with'].includes(word)) {
        overlapCount++;
      }
    }
    if (overlapCount > 0 && functionalMatchCount === 0) {
      score += Math.min(15, overlapCount * 5);
      reasons.push('Title Keyword Similarity');
    }

    if (reasons.length === 0) {
      reasons.push('Network Connection');
    }

    return {
      contact,
      relevanceScore: score,
      matchReasons: reasons,
    };
  });

  // Deterministic multi-tier sort:
  // 1. Relevance Score (descending)
  // 2. Connected On Date (descending)
  // 3. Full Name (alphabetical)
  return ranked.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    const dateA = a.contact.connectedOn || '';
    const dateB = b.contact.connectedOn || '';
    if (dateB !== dateA) {
      return dateB.localeCompare(dateA);
    }
    return a.contact.fullName.localeCompare(b.contact.fullName);
  });
}

/**
 * Creates a structured opportunity outreach action from a matched network contact.
 */
export function generateSuggestedOutreachAction(
  contact: NetworkContact,
  opportunityId: string
): OpportunityAction {
  const roleText = contact.position ? `, ${contact.position}` : '';
  const companyText = contact.company ? ` at ${contact.company}` : '';

  return {
    id: `action-outreach-${contact.id}-${opportunityId}`,
    text: `Reach out to ${contact.fullName}${roleText}${companyText} for team mandate context and internal referral.`,
    source: 'custom',
    completed: false,
    createdAt: new Date().toISOString(),
  };
}
