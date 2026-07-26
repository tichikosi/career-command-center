import { CandidateProfile, EvidenceItem, CompensationPreferences, WorkAuthorizationDetails } from '@/types/candidate';
import { FitAnalysisReport } from '@/types/opportunity';

export interface ResolvedEvidenceCitation extends EvidenceItem {
  company: string;
  roleTitle: string;
  citationId: string;
}

export function getCandidatePossessiveName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed === 'the candidate') return 'the candidate’s';
  return `${trimmed}’s`;
}

export interface CareerRoleDraft {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  summary: string;
  skills: string[];

  // Read-only preserved metadata/relationship fields
  id?: string;
  evidenceItemIds?: string[];
  sourceIds?: string[];
  displayOrder?: number;
  createdAt?: string;
}

export function normalizeRoleDraft(draft: CareerRoleDraft): CareerRoleDraft {
  const isCurrent = Boolean(draft.isCurrent);
  const rawSkills = Array.isArray(draft.skills) ? draft.skills : [];

  const normalizedSkills: string[] = [];
  const seenLower = new Set<string>();

  for (const s of rawSkills) {
    if (typeof s !== 'string') continue;
    const trimmed = s.trim();
    if (!trimmed) continue;
    const truncated = trimmed.slice(0, 80);
    const lower = truncated.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      normalizedSkills.push(truncated);
    }
    if (normalizedSkills.length >= 30) break;
  }

  return {
    id: draft.id,
    company: (draft.company || '').trim(),
    title: (draft.title || '').trim(),
    location: (draft.location || '').trim(),
    startDate: (draft.startDate || '').trim(),
    endDate: isCurrent ? 'Present' : (draft.endDate || '').trim(),
    isCurrent,
    summary: (draft.summary || '').trim(),
    skills: normalizedSkills,
    evidenceItemIds: Array.isArray(draft.evidenceItemIds) ? [...draft.evidenceItemIds] : [],
    sourceIds: Array.isArray(draft.sourceIds) ? [...draft.sourceIds] : [],
    displayOrder: draft.displayOrder,
    createdAt: draft.createdAt,
  };
}

export function areRoleDraftsEqual(a: CareerRoleDraft, b: CareerRoleDraft): boolean {
  const normA = normalizeRoleDraft(a);
  const normB = normalizeRoleDraft(b);

  if (normA.company !== normB.company) return false;
  if (normA.title !== normB.title) return false;
  if (normA.location !== normB.location) return false;
  if (normA.startDate !== normB.startDate) return false;
  if (normA.endDate !== normB.endDate) return false;
  if (normA.isCurrent !== normB.isCurrent) return false;
  if (normA.summary !== normB.summary) return false;

  if (normA.skills.length !== normB.skills.length) return false;
  for (let i = 0; i < normA.skills.length; i++) {
    if (normA.skills[i] !== normB.skills[i]) return false;
  }

  return true;
}

export interface OverviewDraft {
  name: string;
  headline: string;
  location: string;
  summary: string;
  targetRoles: string[];
  targetIndustries: string[];
  preferredLocations: string[];
  compensationPreferences: CompensationPreferences;
  workAuthorizationDetails: WorkAuthorizationDetails;
  coreCompetencies: string[];
}

function normalizeStringArray(arr: string[] | undefined | null): string[] {
  if (!Array.isArray(arr)) return [];
  const result: string[] = [];
  const seenLower = new Set<string>();

  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      result.push(trimmed);
    }
  }

  return result;
}

export function normalizeOverviewDraft(draft: OverviewDraft): OverviewDraft {
  const comp = draft.compensationPreferences;
  const auth = draft.workAuthorizationDetails;

  return {
    name: (draft.name || '').trim(),
    headline: (draft.headline || '').trim(),
    location: (draft.location || '').trim(),
    summary: (draft.summary || '').trim(),
    targetRoles: normalizeStringArray(draft.targetRoles),
    targetIndustries: normalizeStringArray(draft.targetIndustries),
    preferredLocations: normalizeStringArray(draft.preferredLocations),
    compensationPreferences: {
      currency: comp?.currency || 'USD',
      baseSalaryMin: typeof comp?.baseSalaryMin === 'number' && !isNaN(comp.baseSalaryMin) && comp.baseSalaryMin >= 0 ? comp.baseSalaryMin : undefined,
      baseSalaryMax: typeof comp?.baseSalaryMax === 'number' && !isNaN(comp.baseSalaryMax) && comp.baseSalaryMax >= 0 ? comp.baseSalaryMax : undefined,
      bonusPreference: comp?.bonusPreference || 'not-important',
      targetBonusPercent:
        (comp?.bonusPreference || 'not-important') !== 'not-important' &&
        typeof comp?.targetBonusPercent === 'number' &&
        !isNaN(comp.targetBonusPercent) &&
        comp.targetBonusPercent >= 0 &&
        comp.targetBonusPercent <= 100
          ? comp.targetBonusPercent
          : undefined,
      equityPreference: comp?.equityPreference || 'not-important',
      notes: (comp?.notes || '').trim() || undefined,
    },
    workAuthorizationDetails: {
      status: auth?.status || 'unspecified',
      visaType: (auth?.visaType || '').trim() || undefined,
      expirationDate: (auth?.expirationDate || '').trim() || undefined,
      sponsorshipRequiredNow: Boolean(auth?.sponsorshipRequiredNow),
      sponsorshipRequiredFuture: Boolean(auth?.sponsorshipRequiredFuture),
      notes: (auth?.notes || '').trim() || undefined,
    },
    coreCompetencies: normalizeStringArray(draft.coreCompetencies),
  };
}

export function isDraftPopulated(draft: OverviewDraft): boolean {
  const norm = normalizeOverviewDraft(draft);
  const comp = norm.compensationPreferences;
  const auth = norm.workAuthorizationDetails;

  const hasCompensation =
    comp.baseSalaryMin !== undefined ||
    comp.baseSalaryMax !== undefined ||
    comp.bonusPreference !== 'not-important' ||
    comp.equityPreference !== 'not-important' ||
    Boolean(comp.notes);

  const hasWorkAuth =
    auth.status !== 'unspecified' && auth.status !== 'prefer-not-to-say' ||
    Boolean(auth.visaType) ||
    Boolean(auth.notes);

  return (
    Boolean(norm.name) ||
    Boolean(norm.headline) ||
    Boolean(norm.location) ||
    Boolean(norm.summary) ||
    hasCompensation ||
    hasWorkAuth ||
    norm.targetRoles.length > 0 ||
    norm.targetIndustries.length > 0 ||
    norm.preferredLocations.length > 0 ||
    norm.coreCompetencies.length > 0
  );
}

export function isCandidatePopulated(
  profile: CandidateProfile | null | undefined,
  normalizedDraft: OverviewDraft
): boolean {
  if (isDraftPopulated(normalizedDraft)) {
    return true;
  }

  if (!profile) {
    return false;
  }

  return (
    (Array.isArray(profile.careerHistory) && profile.careerHistory.length > 0) ||
    (Array.isArray(profile.evidenceItems) && profile.evidenceItems.length > 0) ||
    (Array.isArray(profile.education) && profile.education.length > 0) ||
    (Array.isArray(profile.certifications) && profile.certifications.length > 0)
  );
}

export function isDraftEqual(a: OverviewDraft, b: OverviewDraft): boolean {
  const normA = normalizeOverviewDraft(a);
  const normB = normalizeOverviewDraft(b);

  if (normA.name !== normB.name) return false;
  if (normA.headline !== normB.headline) return false;
  if (normA.location !== normB.location) return false;
  if (normA.summary !== normB.summary) return false;

  // Compensation Comparison
  const compA = normA.compensationPreferences;
  const compB = normB.compensationPreferences;
  if (
    compA.currency !== compB.currency ||
    compA.baseSalaryMin !== compB.baseSalaryMin ||
    compA.baseSalaryMax !== compB.baseSalaryMax ||
    compA.bonusPreference !== compB.bonusPreference ||
    compA.targetBonusPercent !== compB.targetBonusPercent ||
    compA.equityPreference !== compB.equityPreference ||
    compA.notes !== compB.notes
  ) {
    return false;
  }

  // Work Authorization Comparison
  const authA = normA.workAuthorizationDetails;
  const authB = normB.workAuthorizationDetails;
  if (
    authA.status !== authB.status ||
    authA.visaType !== authB.visaType ||
    authA.expirationDate !== authB.expirationDate ||
    authA.sponsorshipRequiredNow !== authB.sponsorshipRequiredNow ||
    authA.sponsorshipRequiredFuture !== authB.sponsorshipRequiredFuture ||
    authA.notes !== authB.notes
  ) {
    return false;
  }

  const compareArrays = (arrA: string[], arrB: string[]) => {
    if (arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i++) {
      if (arrA[i] !== arrB[i]) return false;
    }
    return true;
  };

  return (
    compareArrays(normA.targetRoles, normB.targetRoles) &&
    compareArrays(normA.targetIndustries, normB.targetIndustries) &&
    compareArrays(normA.preferredLocations, normB.preferredLocations) &&
    compareArrays(normA.coreCompetencies, normB.coreCompetencies)
  );
}

export type AnalysisFreshness = 'current' | 'stale' | 'unknown';

/**
 * Pure helper to calculate analysis freshness against the active candidate profile.
 * Returns 'current', 'stale', or 'unknown'.
 */
export function getAnalysisFreshness(
  analysis: FitAnalysisReport | null | undefined,
  activeProfile: CandidateProfile | null | undefined
): AnalysisFreshness {
  if (!analysis || !analysis.candidateProvenance) {
    return 'unknown';
  }

  const prov = analysis.candidateProvenance;

  if (prov.provenanceStatus === 'unknown' || !prov.candidateId) {
    return 'unknown';
  }

  if (!activeProfile) {
    return 'stale';
  }

  // Active profile is empty user profile while report was generated for a populated candidate
  const isActiveEmpty =
    activeProfile.dataMode === 'user' &&
    !activeProfile.name &&
    activeProfile.careerHistory.length === 0;

  if (isActiveEmpty && (prov.candidateName || prov.dataMode === 'synthetic')) {
    return 'stale';
  }

  // Compare candidate IDs
  if (prov.candidateId !== activeProfile.id) {
    return 'stale';
  }

  // Compare data modes
  if (prov.dataMode && prov.dataMode !== activeProfile.dataMode) {
    return 'stale';
  }

  // If synthetic fixture and active mode is synthetic, consider current
  if (prov.dataMode === 'synthetic' && activeProfile.dataMode === 'synthetic') {
    return 'current';
  }

  // Compare timestamps if user profile
  if (prov.profileUpdatedAt && activeProfile.updatedAt) {
    if (prov.profileUpdatedAt !== activeProfile.updatedAt) {
      return 'stale';
    }
  }

  return 'current';
}

/**
 * Collects ONLY the EvidenceItem records referenced by an analysis report.
 * Deduplicates items by ID and avoids storing full candidate libraries.
 */
export function collectReferencedEvidence(
  profile: CandidateProfile,
  report: {
    qualifications?: Array<{ supportingEvidenceCitationIds?: string[] }>;
    objections?: Array<{ supportingCitationId?: string }>;
    recommendedStarStories?: Array<{ citationIds?: string[] }>;
  }
): EvidenceItem[] {
  if (!profile || !Array.isArray(profile.evidenceItems)) return [];

  const referencedSet = new Set<string>();

  if (Array.isArray(report.qualifications)) {
    for (const q of report.qualifications) {
      if (Array.isArray(q.supportingEvidenceCitationIds)) {
        for (const id of q.supportingEvidenceCitationIds) {
          if (id) referencedSet.add(id);
        }
      }
    }
  }

  if (Array.isArray(report.objections)) {
    for (const obj of report.objections) {
      if (obj.supportingCitationId) referencedSet.add(obj.supportingCitationId);
    }
  }

  if (Array.isArray(report.recommendedStarStories)) {
    for (const star of report.recommendedStarStories) {
      if (Array.isArray(star.citationIds)) {
        for (const id of star.citationIds) {
          if (id) referencedSet.add(id);
        }
      }
    }
  }

  const result: EvidenceItem[] = [];
  const addedIds = new Set<string>();

  for (const item of profile.evidenceItems) {
    if (!item || !item.id || addedIds.has(item.id)) continue;

    const isReferenced =
      referencedSet.has(item.id) ||
      (Array.isArray(item.tags) && item.tags.some((tag) => referencedSet.has(tag)));

    if (isReferenced) {
      result.push(item);
      addedIds.add(item.id);
    }
  }

  return result;
}

/**
 * Converts a CandidateProfile into the minimal shape required by the analysis engine adapter.
 * Ensures pure, safe conversion without fabricating evidence when the profile is empty.
 */
export function toAnalysisCandidate(profile: CandidateProfile): CandidateProfile {
  if (!profile || typeof profile !== 'object') {
    return {
      id: 'cand-empty',
      name: 'Unconfigured Candidate',
      headline: '',
      location: '',
      summary: '',
      targetRoles: [],
      targetIndustries: [],
      preferredLocations: [],
      coreCompetencies: [],
      careerHistory: [],
      education: [],
      certifications: [],
      evidenceItems: [],
      sources: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      dataMode: 'user',
    };
  }
  return profile;
}

/**
 * Resolves supporting evidence items for an analysis report.
 * 1. Resolves from report.evidenceSnapshot if present
 * 2. Otherwise resolves from activeProfile ONLY when analysis freshness is 'current'
 * 3. Returns empty array if snapshot is unavailable and report is stale
 */
export function resolveEvidenceForReportCitations(
  report: FitAnalysisReport,
  activeProfile: CandidateProfile | null | undefined,
  citationIds: string[]
): ResolvedEvidenceCitation[] {
  if (!Array.isArray(citationIds) || citationIds.length === 0) {
    return [];
  }

  const itemsToSearch: EvidenceItem[] = Array.isArray(report.evidenceSnapshot) && report.evidenceSnapshot.length > 0
    ? report.evidenceSnapshot
    : (getAnalysisFreshness(report, activeProfile) === 'current' && activeProfile?.evidenceItems
        ? activeProfile.evidenceItems
        : []);

  if (itemsToSearch.length === 0) {
    return [];
  }

  const citationSet = new Set(citationIds);
  const result: ResolvedEvidenceCitation[] = [];

  const roleMap = new Map<string, { company: string; title: string }>();
  if (activeProfile && Array.isArray(activeProfile.careerHistory)) {
    for (const role of activeProfile.careerHistory) {
      if (role && role.id) {
        roleMap.set(role.id, { company: role.company || 'Unknown Company', title: role.title || 'Role' });
      }
    }
  }

  for (const item of itemsToSearch) {
    if (!item) continue;

    const matchesCitation =
      citationSet.has(item.id) ||
      (Array.isArray(item.tags) && item.tags.some((tag) => citationSet.has(tag)));

    if (matchesCitation) {
      const roleInfo = item.roleId ? roleMap.get(item.roleId) : undefined;
      const citationId = (item.tags && item.tags.find((t) => t.startsWith('EVID-'))) || item.id;

      result.push({
        ...item,
        company: roleInfo?.company ?? item.organization ?? 'General Experience',
        roleTitle: roleInfo?.title ?? 'Evidence Record',
        citationId,
      });
    }
  }

  return result;
}

/**
 * Legacy compatibility export for direct profile citation resolution
 */
export function resolveEvidenceForCitations(
  profile: CandidateProfile | null | undefined,
  citationIds: string[]
): ResolvedEvidenceCitation[] {
  if (!profile) return [];
  const dummyReport: FitAnalysisReport = {
    executiveSummary: '',
    likelyMandate: '',
    keyRequirements: [],
    overallFitScore: 0,
    scoreExplanation: '',
    recommendation: 'Monitor',
    positioningNarrative: '',
    qualifications: [],
    objections: [],
    recruiterQuestions: [],
    hiringManagerQuestions: [],
    recommendedStarStories: [],
    nextActions: [],
    evidenceSnapshot: profile.evidenceItems,
  };
  return resolveEvidenceForReportCitations(dummyReport, profile, citationIds);
}
