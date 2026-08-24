import { CandidateProfile, EvidenceItem, CareerRole, CompensationPreferences, WorkAuthorizationDetails } from '@/types/candidate';
import { FitAnalysisReport } from '@/types/opportunity';

export interface ResolvedEvidenceCitation extends EvidenceItem {
  company: string;
  roleTitle: string;
  citationId: string;
}

export function getCandidatePossessiveName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'the candidate' || trimmed.toLowerCase() === 'candidate') {
    return "candidate's";
  }
  return `${trimmed}'s`;
}

/**
 * Resolves the user-facing candidate evidence subtitle for an analysis report UI.
 * Prioritizes candidate identity stored in the analysis snapshot / provenance.
 * Falls back to active profile name if current, or neutral fallback if unavailable.
 *
 * Example when candidate is Tanaka Ian Chikosi:
 * "Line-item breakdown matching Tanaka Ian Chikosi's evidence against role specifications"
 *
 * Example when candidate is unspecified / neutral:
 * "Line-item breakdown matching candidate evidence against role specifications"
 */
export function getAnalysisCandidateSubtitle(
  analysis?: FitAnalysisReport | null,
  activeProfile?: CandidateProfile | null
): string {
  const provName = analysis?.candidateProvenance?.candidateName?.trim();
  const profileName = activeProfile?.name?.trim();

  const candidateName = provName || profileName;
  if (candidateName) {
    return `Line-item breakdown matching ${candidateName}'s evidence against role specifications`;
  }
  return 'Line-item breakdown matching candidate evidence against role specifications';
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

  const eligibleEvidence = getEligibleEvidenceForAnalysis(profile);
  const result: EvidenceItem[] = [];
  const addedIds = new Set<string>();

  for (const item of eligibleEvidence) {
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
 * Returns evidence items from candidate profile that are eligible for new analysis.
 * An EvidenceItem is eligible ONLY when its roleId matches an existing CareerRole.id in the active profile.
 */
export function getEligibleEvidenceForAnalysis(
  profile: CandidateProfile | null | undefined
): EvidenceItem[] {
  if (!profile || !Array.isArray(profile.evidenceItems)) return [];

  const validRoleIds = new Set(
    Array.isArray(profile.careerHistory)
      ? profile.careerHistory.map((r) => r.id).filter(Boolean)
      : []
  );

  return profile.evidenceItems.filter(
    (item) => item && typeof item.roleId === 'string' && item.roleId.trim() !== '' && validRoleIds.has(item.roleId)
  );
}

/**
 * Converts a CandidateProfile into the minimal shape required by the analysis engine adapter.
 * Filters evidenceItems so new analyses ONLY consume evidence linked to active existing career roles.
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
  return {
    ...profile,
    evidenceItems: getEligibleEvidenceForAnalysis(profile),
  };
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

export function getOrderedCareerRoles(roles: CareerRole[]): CareerRole[] {
  if (!Array.isArray(roles)) return [];
  const copy = [...roles];
  copy.sort((a, b) => {
    const aOrd = typeof a.displayOrder === 'number' && !isNaN(a.displayOrder) ? a.displayOrder : undefined;
    const bOrd = typeof b.displayOrder === 'number' && !isNaN(b.displayOrder) ? b.displayOrder : undefined;

    if (aOrd !== undefined && bOrd !== undefined) {
      return aOrd - bOrd;
    }
    if (aOrd !== undefined) return -1;
    if (bOrd !== undefined) return 1;
    return roles.indexOf(a) - roles.indexOf(b);
  });
  return copy;
}

export function moveCareerRole(
  roles: CareerRole[],
  roleId: string,
  direction: 'up' | 'down'
): CareerRole[] {
  if (!Array.isArray(roles) || !roleId) return roles;

  const ordered = getOrderedCareerRoles(roles);
  const idx = ordered.findIndex((r) => r.id === roleId);

  if (idx < 0) return roles;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= ordered.length) return roles;

  const currentRole = ordered[idx];
  const targetRole = ordered[targetIdx];

  const currentOrd =
    typeof currentRole.displayOrder === 'number' && !isNaN(currentRole.displayOrder)
      ? currentRole.displayOrder
      : (idx + 1) * 100;

  const targetOrd =
    typeof targetRole.displayOrder === 'number' && !isNaN(targetRole.displayOrder)
      ? targetRole.displayOrder
      : (targetIdx + 1) * 100;

  const updatedCurrent: CareerRole = { ...currentRole, displayOrder: targetOrd };
  const updatedTarget: CareerRole = { ...targetRole, displayOrder: currentOrd };

  const result = roles.map((r) => {
    if (r.id === currentRole.id) return updatedCurrent;
    if (r.id === targetRole.id) return updatedTarget;
    return r;
  });

  return getOrderedCareerRoles(result);
}

export function getEvidenceLinkedToRole(
  profile: CandidateProfile | null | undefined,
  roleId: string
): EvidenceItem[] {
  if (!profile || !roleId) return [];

  const role = Array.isArray(profile.careerHistory)
    ? profile.careerHistory.find((r) => r.id === roleId)
    : undefined;

  const roleEvIds = role && Array.isArray(role.evidenceItemIds) ? new Set(role.evidenceItemIds) : new Set<string>();
  const validRoleIds = new Set(Array.isArray(profile.careerHistory) ? profile.careerHistory.map((r) => r.id) : []);

  const result: EvidenceItem[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(profile.evidenceItems)) {
    for (const ev of profile.evidenceItems) {
      if (!ev || !ev.id) continue;

      const matchesExplicitRole = ev.roleId === roleId;
      const matchesUnassignedRef = roleEvIds.has(ev.id) && (!ev.roleId || !validRoleIds.has(ev.roleId));

      if ((matchesExplicitRole || matchesUnassignedRef) && !seenIds.has(ev.id)) {
        seenIds.add(ev.id);
        result.push(ev);
      }
    }
  }

  return result;
}

export function deleteCareerRoleFromProfile(
  profile: CandidateProfile,
  roleId: string,
  updatedAt: string
): CandidateProfile {
  if (!profile || !roleId) return profile;

  const existingRoles = Array.isArray(profile.careerHistory) ? profile.careerHistory : [];
  const roleExists = existingRoles.some((r) => r.id === roleId);

  if (!roleExists) return profile;

  const updatedCareerHistory = existingRoles.filter((r) => r.id !== roleId);

  const updatedEvidenceItems = Array.isArray(profile.evidenceItems)
    ? profile.evidenceItems.map((ev) => {
        if (ev.roleId === roleId) {
          return {
            ...ev,
            roleId: undefined,
          };
        }
        return ev;
      })
    : [];

  return {
    ...profile,
    careerHistory: updatedCareerHistory,
    evidenceItems: updatedEvidenceItems,
    dataMode: 'user',
    updatedAt,
  };
}

export interface ResumeExtractionInput {
  name?: string;
  headline?: string;
  location?: string;
  summary?: string;
  targetRoles?: string[];
  targetIndustries?: string[];
  preferredLocations?: string[];
  coreCompetencies?: string[];
  careerHistory?: Array<{
    company?: string;
    title?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    summary?: string;
    skills?: string[];
    accomplishments?: Array<{
      title?: string;
      description?: string;
      metric?: string;
      skills?: string[];
    }>;
  }>;
}

/**
 * Converts a structured AI résumé extraction into first-class CareerRole and EvidenceItem entities.
 * Applies "candidate-provided" verification status and provenance metadata.
 */
export function convertResumeExtractionToCandidateEntities(
  extraction: ResumeExtractionInput,
  timestamp = new Date().toISOString()
): {
  roles: CareerRole[];
  evidence: EvidenceItem[];
} {
  const roles: CareerRole[] = [];
  const evidence: EvidenceItem[] = [];

  const rawHistory = Array.isArray(extraction.careerHistory) ? extraction.careerHistory : [];

  rawHistory.forEach((rawRole, roleIdx) => {
    const roleId = `role-imp-${roleIdx + 1}-${Date.now().toString(36)}`;
    const roleEvidenceIds: string[] = [];

    const accomplishments = Array.isArray(rawRole.accomplishments) ? rawRole.accomplishments : [];
    accomplishments.forEach((acc, accIdx) => {
      const evId = `EVID-IMP-${roleIdx + 1}-${accIdx + 1}`;
      roleEvidenceIds.push(evId);

      evidence.push({
        id: evId,
        type: acc.metric ? 'metric' : 'achievement',
        title: acc.title || `${rawRole.title || 'Role'} Achievement`,
        description: acc.description || '',
        metric: acc.metric,
        organization: rawRole.company || '',
        roleId,
        skills: Array.isArray(acc.skills) ? acc.skills : Array.isArray(rawRole.skills) ? rawRole.skills : [],
        tags: ['resume-import', (rawRole.company || 'experience').toLowerCase().replace(/\s+/g, '-')],
        verificationStatus: 'candidate-provided',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

    roles.push({
      id: roleId,
      company: rawRole.company || '',
      title: rawRole.title || '',
      location: rawRole.location || '',
      startDate: rawRole.startDate || '',
      endDate: rawRole.isCurrent ? 'Present' : (rawRole.endDate || 'Present'),
      isCurrent: Boolean(rawRole.isCurrent),
      summary: rawRole.summary || '',
      skills: Array.isArray(rawRole.skills) ? rawRole.skills : [],
      evidenceItemIds: roleEvidenceIds,
      sourceIds: ['source-resume-import'],
      displayOrder: roleIdx + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  return { roles, evidence };
}

export type ResumeIdentityClassification =
  | 'demo-candidate'
  | 'same-person'
  | 'different-person'
  | 'ambiguous';

export interface ResumeReconciliationSummary {
  classification: ResumeIdentityClassification;
  confidenceScore: number;
  nameMatch: boolean;
  employerOverlapCount: number;
  matchingEmployerNames: string[];
  reconciledRolesCount: number;
  newRolesCount: number;
  reconciledEvidenceCount: number;
  newEvidenceCount: number;
  preservedHistoricalEvidenceCount: number;
  activeCandidateName: string;
  importedCandidateName: string;
}

function normalizeTokens(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function normalizeCompany(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(inc|corp|corporation|llc|ltd|limited|co|company)$/, '');
}

/**
 * Classifies the identity relationship between the active profile and an imported résumé.
 */
export function classifyResumeIdentity(
  activeProfile: CandidateProfile,
  extraction: ResumeExtractionInput
): ResumeReconciliationSummary {
  const activeName = (activeProfile.name || '').trim();
  const importedName = (extraction.name || '').trim();

  const isDemo =
    activeProfile.dataMode === 'synthetic' ||
    activeName === 'Alex Vance' ||
    activeProfile.id === 'cand-synthetic-alex-vance';

  const activeTokens = normalizeTokens(activeName);
  const importedTokens = normalizeTokens(importedName);

  const tokenMatches = activeTokens.filter((t) => importedTokens.includes(t));
  const exactMatch = activeName.toLowerCase() === importedName.toLowerCase() && activeName.length > 0;
  const nameMatch = exactMatch || tokenMatches.length >= 2 || (activeTokens.length === 1 && tokenMatches.length === 1);

  const existingRoles = Array.isArray(activeProfile.careerHistory) ? activeProfile.careerHistory : [];
  const importedRoles = Array.isArray(extraction.careerHistory) ? extraction.careerHistory : [];

  const existingCompanyMap = new Set(existingRoles.map((r) => normalizeCompany(r.company)).filter(Boolean));
  const matchingEmployerNames: string[] = [];

  importedRoles.forEach((r) => {
    const norm = normalizeCompany(r.company || '');
    if (norm && existingCompanyMap.has(norm) && !matchingEmployerNames.includes(r.company || '')) {
      matchingEmployerNames.push(r.company || '');
    }
  });

  const employerOverlapCount = matchingEmployerNames.length;

  let classification: ResumeIdentityClassification = 'same-person';
  let confidenceScore = 0.85;

  if (isDemo) {
    classification = 'demo-candidate';
    confidenceScore = 1.0;
  } else if (nameMatch && (employerOverlapCount >= 1 || existingRoles.length === 0)) {
    classification = 'same-person';
    confidenceScore = 0.95;
  } else if (!nameMatch && employerOverlapCount === 0 && existingRoles.length > 0) {
    classification = 'different-person';
    confidenceScore = 0.90;
  } else if (nameMatch && employerOverlapCount === 0 && existingRoles.length >= 2) {
    classification = 'ambiguous';
    confidenceScore = 0.50;
  } else if (!nameMatch && employerOverlapCount >= 2) {
    classification = 'ambiguous';
    confidenceScore = 0.50;
  } else if (existingRoles.length === 0) {
    classification = 'same-person';
    confidenceScore = 0.85;
  }

  return {
    classification,
    confidenceScore,
    nameMatch,
    employerOverlapCount,
    matchingEmployerNames,
    reconciledRolesCount: 0,
    newRolesCount: 0,
    reconciledEvidenceCount: 0,
    newEvidenceCount: 0,
    preservedHistoricalEvidenceCount: (activeProfile.evidenceItems || []).length,
    activeCandidateName: activeName,
    importedCandidateName: importedName,
  };
}

/**
 * Reconciles an imported résumé update into an existing candidate profile.
 * - Matches existing career roles by company/title to avoid duplicates.
 * - Updates existing roles while preserving persistent IDs.
 * - Appends new roles and achievements.
 * - Strictly PRESERVES all historical evidence (absence does NOT delete CCC data).
 * - Strictly PRESERVES user strategy fields (work authorization, compensation, target roles).
 */
export function reconcileResumeUpdateIntoProfile(
  profile: CandidateProfile,
  extraction: ResumeExtractionInput,
  timestamp = new Date().toISOString()
): {
  profile: CandidateProfile;
  summary: ResumeReconciliationSummary;
} {
  const baseSummary = classifyResumeIdentity(profile, extraction);
  const existingRoles = Array.isArray(profile.careerHistory) ? [...profile.careerHistory] : [];
  const existingEvidence = Array.isArray(profile.evidenceItems) ? [...profile.evidenceItems] : [];

  const rawHistory = Array.isArray(extraction.careerHistory) ? extraction.careerHistory : [];

  let reconciledRolesCount = 0;
  let newRolesCount = 0;
  let reconciledEvidenceCount = 0;
  let newEvidenceCount = 0;

  const finalRoles: CareerRole[] = [];
  const finalEvidenceMap = new Map<string, EvidenceItem>();

  // 1. Initialize with all existing evidence — guarantees zero deletion of historical facts
  existingEvidence.forEach((ev) => finalEvidenceMap.set(ev.id, { ...ev }));

  // 2. Reconcile roles & evidence from new resume
  rawHistory.forEach((rawRole, roleIdx) => {
    const rawCompany = (rawRole.company || '').trim();
    const rawTitle = (rawRole.title || '').trim();
    const normRawCompany = normalizeCompany(rawCompany);
    const normRawTitle = normalizeCompany(rawTitle);

    const matchedExistingRoleIndex = existingRoles.findIndex((r) => {
      const normC = normalizeCompany(r.company);
      const normT = normalizeCompany(r.title);
      const companyMatch =
        normC === normRawCompany ||
        (normC.length > 2 && normRawCompany.length > 2 && (normC.includes(normRawCompany) || normRawCompany.includes(normC)));
      const titleOrDateMatch = normT === normRawTitle || r.startDate === rawRole.startDate || r.isCurrent === rawRole.isCurrent;
      return companyMatch && titleOrDateMatch;
    });

    if (matchedExistingRoleIndex >= 0) {
      reconciledRolesCount++;
      const existingRole = existingRoles[matchedExistingRoleIndex];
      existingRoles.splice(matchedExistingRoleIndex, 1);

      const existingEvIds = new Set(existingRole.evidenceItemIds || []);
      const roleEvidenceIds = [...(existingRole.evidenceItemIds || [])];

      const rawAccomplishments = Array.isArray(rawRole.accomplishments) ? rawRole.accomplishments : [];
      rawAccomplishments.forEach((acc, accIdx) => {
        const accDesc = (acc.description || '').trim();
        const accTitle = acc.title || `${rawTitle || 'Role'} Achievement`;
        const accMetric = acc.metric;

        let foundEvId: string | null = null;
        for (const evId of existingEvIds) {
          const ev = finalEvidenceMap.get(evId);
          if (ev) {
            const sameOrg = normalizeCompany(ev.organization || '') === normRawCompany;
            const sameMetric = accMetric && ev.metric === accMetric;
            const sameTitle = ev.title.toLowerCase() === accTitle.toLowerCase();
            if (sameOrg && (sameMetric || sameTitle)) {
              foundEvId = evId;
              break;
            }
          }
        }

        if (foundEvId) {
          reconciledEvidenceCount++;
          const existingEv = finalEvidenceMap.get(foundEvId)!;
          finalEvidenceMap.set(foundEvId, {
            ...existingEv,
            description: accDesc || existingEv.description,
            metric: accMetric || existingEv.metric,
            updatedAt: timestamp,
          });
        } else if (accDesc || accMetric) {
          newEvidenceCount++;
          const newEvId = `EVID-IMP-${roleIdx + 1}-${accIdx + 1}-${Date.now().toString(36)}`;
          roleEvidenceIds.push(newEvId);
          finalEvidenceMap.set(newEvId, {
            id: newEvId,
            type: accMetric ? 'metric' : 'achievement',
            title: accTitle,
            description: accDesc,
            metric: accMetric,
            organization: rawCompany,
            roleId: existingRole.id,
            skills: Array.isArray(acc.skills) ? acc.skills : [],
            tags: ['resume-import', rawCompany.toLowerCase().replace(/\s+/g, '-')],
            verificationStatus: 'candidate-provided',
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      });

      finalRoles.push({
        ...existingRole,
        title: rawTitle || existingRole.title,
        endDate: rawRole.isCurrent ? 'Present' : (rawRole.endDate || existingRole.endDate),
        isCurrent: Boolean(rawRole.isCurrent),
        summary: rawRole.summary || existingRole.summary,
        evidenceItemIds: roleEvidenceIds,
        updatedAt: timestamp,
      });
    } else {
      newRolesCount++;
      const roleId = `role-imp-${roleIdx + 1}-${Date.now().toString(36)}`;
      const roleEvidenceIds: string[] = [];

      const rawAccomplishments = Array.isArray(rawRole.accomplishments) ? rawRole.accomplishments : [];
      rawAccomplishments.forEach((acc, accIdx) => {
        const accDesc = (acc.description || '').trim();
        const accMetric = acc.metric;
        const newEvId = `EVID-IMP-${roleIdx + 1}-${accIdx + 1}-${Date.now().toString(36)}`;
        roleEvidenceIds.push(newEvId);
        newEvidenceCount++;

        finalEvidenceMap.set(newEvId, {
          id: newEvId,
          type: accMetric ? 'metric' : 'achievement',
          title: acc.title || `${rawTitle || 'Role'} Achievement`,
          description: accDesc,
          metric: accMetric,
          organization: rawCompany,
          roleId,
          skills: Array.isArray(acc.skills) ? acc.skills : [],
          tags: ['resume-import', rawCompany.toLowerCase().replace(/\s+/g, '-')],
          verificationStatus: 'candidate-provided',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      });

      finalRoles.push({
        id: roleId,
        company: rawCompany,
        title: rawTitle,
        location: rawRole.location || '',
        startDate: rawRole.startDate || '',
        endDate: rawRole.isCurrent ? 'Present' : (rawRole.endDate || 'Present'),
        isCurrent: Boolean(rawRole.isCurrent),
        summary: rawRole.summary || '',
        skills: Array.isArray(rawRole.skills) ? rawRole.skills : [],
        evidenceItemIds: roleEvidenceIds,
        sourceIds: ['source-resume-import'],
        displayOrder: finalRoles.length + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  });

  // 3. Preserve any remaining existing roles that were omitted from newer resume
  existingRoles.forEach((unmatchedRole) => {
    finalRoles.push(unmatchedRole);
  });

  // 4. Merge competencies
  const combinedCompetencies = Array.from(
    new Set([...(profile.coreCompetencies || []), ...(extraction.coreCompetencies || [])])
  );

  // 5. Preserve user-controlled strategy fields
  const preservedTargetRoles =
    profile.targetRoles && profile.targetRoles.length > 0
      ? profile.targetRoles
      : extraction.targetRoles || [];

  const preservedTargetIndustries =
    profile.targetIndustries && profile.targetIndustries.length > 0
      ? profile.targetIndustries
      : extraction.targetIndustries || [];

  const preservedPreferredLocations =
    profile.preferredLocations && profile.preferredLocations.length > 0
      ? profile.preferredLocations
      : extraction.preferredLocations || [];

  const updatedProfile: CandidateProfile = {
    ...profile,
    name: (profile.name || '').trim() || extraction.name || profile.name,
    headline: extraction.headline || profile.headline,
    location: (profile.location || '').trim() || extraction.location || profile.location,
    summary: extraction.summary || profile.summary,
    coreCompetencies: combinedCompetencies,
    targetRoles: preservedTargetRoles,
    targetIndustries: preservedTargetIndustries,
    preferredLocations: preservedPreferredLocations,
    // Work authorization strictly preserved:
    workAuthorization: profile.workAuthorization,
    workAuthorizationDetails: profile.workAuthorizationDetails,
    // Compensation preferences strictly preserved:
    compensationPreferences: profile.compensationPreferences,
    compensationTarget: profile.compensationTarget,
    careerHistory: finalRoles,
    evidenceItems: Array.from(finalEvidenceMap.values()),
    dataMode: 'user',
    updatedAt: timestamp,
  };

  const summary: ResumeReconciliationSummary = {
    ...baseSummary,
    reconciledRolesCount,
    newRolesCount,
    reconciledEvidenceCount,
    newEvidenceCount,
    preservedHistoricalEvidenceCount: existingEvidence.length,
  };

  return {
    profile: updatedProfile,
    summary,
  };
}

export function mergeResumeExtractionIntoProfile(
  profile: CandidateProfile,
  extraction: ResumeExtractionInput,
  timestamp = new Date().toISOString()
): CandidateProfile {
  const { profile: reconciled } = reconcileResumeUpdateIntoProfile(profile, extraction, timestamp);
  return reconciled;
}

export function replaceProfileWithResumeExtraction(
  profile: CandidateProfile,
  extraction: ResumeExtractionInput,
  timestamp = new Date().toISOString()
): CandidateProfile {
  const { roles, evidence } = convertResumeExtractionToCandidateEntities(extraction, timestamp);

  return {
    ...profile,
    id: profile.id || 'cand-user-profile',
    name: extraction.name || profile.name || '',
    headline: extraction.headline || profile.headline || '',
    location: extraction.location || profile.location || '',
    summary: extraction.summary || profile.summary || '',
    coreCompetencies: Array.isArray(extraction.coreCompetencies) ? extraction.coreCompetencies : [],
    targetRoles: Array.isArray(extraction.targetRoles) ? extraction.targetRoles : profile.targetRoles || [],
    targetIndustries: Array.isArray(extraction.targetIndustries) ? extraction.targetIndustries : profile.targetIndustries || [],
    preferredLocations: Array.isArray(extraction.preferredLocations) ? extraction.preferredLocations : profile.preferredLocations || [],
    // Work authorization strictly preserved:
    workAuthorization: profile.workAuthorization,
    workAuthorizationDetails: profile.workAuthorizationDetails,
    // Compensation preferences strictly preserved:
    compensationPreferences: profile.compensationPreferences,
    compensationTarget: profile.compensationTarget,
    careerHistory: roles,
    evidenceItems: evidence,
    dataMode: 'user',
    updatedAt: timestamp,
  };
}

/**
 * Targeted remediation utility for the specific known bad import bug.
 * Identifies and removes only contaminated records generated with placeholder fingerprints.
 * Preserves all genuine user edits, demo candidate fixtures, and opportunity state.
 */
export function remediateContaminatedImport(profile: CandidateProfile): {
  profile: CandidateProfile;
  contaminatedRecordsFound: number;
} {
  let contaminatedCount = 0;

  // 1. Identify contaminated roles with exact placeholder fingerprints
  const cleanedRoles = (profile.careerHistory || []).filter((role) => {
    const isContaminated =
      (role.company === 'Primary Enterprise Experience' && role.title === 'Executive Professional') ||
      (role.id.startsWith('role-imp-') && role.company === 'Primary Enterprise Experience');

    if (isContaminated) {
      contaminatedCount++;
      return false;
    }
    return true;
  });

  // 2. Identify contaminated evidence items with exact placeholder fingerprints
  const cleanedEvidence = (profile.evidenceItems || []).filter((ev) => {
    const isContaminated =
      (ev.organization === 'Primary Enterprise Experience' && ev.title === 'Strategic Operations Delivery') ||
      (ev.tags?.includes('primary-enterprise-experience') && ev.id.startsWith('EVID-IMP-'));

    if (isContaminated) {
      contaminatedCount++;
      return false;
    }
    return true;
  });

  // 3. Clean target roles if contaminated
  const cleanedTargetRoles = (profile.targetRoles || []).filter((tr) => {
    if (tr === 'Executive Professional' && contaminatedCount > 0) {
      return false;
    }
    return true;
  });

  // 4. Restore candidate name/headline if contaminated placeholder
  let restoredName = profile.name;
  let restoredHeadline = profile.headline;
  let restoredDataMode = profile.dataMode;

  const hasSyntheticRoles = cleanedRoles.some((r) => r.id === 'role-apex' || r.id === 'role-nexus');

  if (profile.name === 'Candidate Name') {
    if (hasSyntheticRoles) {
      restoredName = 'Alex Vance';
      restoredHeadline = 'VP, AI Strategy & Operations';
      restoredDataMode = 'synthetic';
    } else {
      restoredName = '';
    }
    contaminatedCount++;
  }

  const remediated: CandidateProfile = {
    ...profile,
    name: restoredName,
    headline: restoredHeadline,
    targetRoles: cleanedTargetRoles,
    careerHistory: cleanedRoles,
    evidenceItems: cleanedEvidence,
    dataMode: restoredDataMode,
    updatedAt: contaminatedCount > 0 ? new Date().toISOString() : profile.updatedAt,
  };

  return {
    profile: remediated,
    contaminatedRecordsFound: contaminatedCount,
  };
}
