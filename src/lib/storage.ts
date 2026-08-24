import {
  CandidateProfile,
  EvidenceItem,
  CareerRole,
  CandidateSource,
  EducationItem,
  CertificationItem,
} from '@/types/candidate';
import {
  JobOpportunity,
  PipelineStage,
  OpportunityPriority,
  OpportunityUISettings,
  CandidateProvenance,
  FitAnalysisReport,
} from '@/types/opportunity';
import { defaultSyntheticCandidateProfile } from '@/data/candidate';
import { initialOpportunities } from '@/data/opportunities';
import { mergeActionsForStage, buildStageActions, buildRoleActions, generateCustomActionId } from '@/lib/stageActions';
import { collectReferencedEvidence, remediateContaminatedImport } from '@/lib/candidateAdapter';
import { parseLegacyCompensationString } from '@/lib/compensationHelpers';
import { parseLegacyWorkAuthString } from '@/lib/workAuthHelpers';

export const CCC_CANDIDATE_KEY = 'ccc_candidate_v1';
export const CCC_REMEDIATION_MIGRATION_KEY = 'ccc_migration_remediate_bad_import_v1';
const LEGACY_PROFILE_KEY = 'ccc_candidate_profile_v1';
const OPPORTUNITIES_KEY = 'ccc_opportunities_v1';
const SETTINGS_KEY = 'ccc_settings_v1';

export const STORAGE_CHANGE_EVENT = 'ccc_storage_change';
export const CCC_CANDIDATE_CHANGE_EVENT = 'ccc_candidate_change';

// ---------------------------------------------------------------------------
// Stable Module-level Snapshots & Memory Cache
// ---------------------------------------------------------------------------

// Frozen deterministic server snapshots for SSR and initial hydration
const SERVER_OPPORTUNITIES_SNAPSHOT: JobOpportunity[] = Object.freeze(
  normalizeAll([...initialOpportunities])
) as unknown as JobOpportunity[];

const SERVER_CANDIDATE_SNAPSHOT: CandidateProfile = Object.freeze(
  normalizeCandidateProfile(defaultSyntheticCandidateProfile)
);

export function getInitialOpportunitiesServerSnapshot(): JobOpportunity[] {
  return SERVER_OPPORTUNITIES_SNAPSHOT;
}

export function getInitialCandidateServerSnapshot(): CandidateProfile {
  return SERVER_CANDIDATE_SNAPSHOT;
}

// Module-level cached client snapshot references
let cachedOpportunities: JobOpportunity[] | null = null;
let cachedCandidateProfile: CandidateProfile | null = null;

let inMemoryOpportunities: JobOpportunity[] = normalizeAll([...initialOpportunities]);
let inMemoryCandidateProfile: CandidateProfile = normalizeCandidateProfile(defaultSyntheticCandidateProfile);

let storageAvailableChecked = false;
let storageAvailableResult = false;

export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (storageAvailableChecked) return storageAvailableResult;

  try {
    const testKey = '__ccc_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    storageAvailableResult = true;
  } catch {
    storageAvailableResult = false;
  }

  storageAvailableChecked = true;
  return storageAvailableResult;
}

function notifyStorageChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  }
}

function notifyCandidateStorageChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CCC_CANDIDATE_CHANGE_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Candidate Normalization & Validation
// ---------------------------------------------------------------------------

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string');
}

function safeDateString(value: unknown, fallback = '2026-01-01T00:00:00.000Z'): string {
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
}

/**
 * Normalizes a raw candidate profile object.
 * Guarantees a non-null, non-throwing, fully typed CandidateProfile.
 * Automatically converts legacy embedded role.achievements objects into EvidenceItem records.
 * Preserves evidence IDs, descriptions, metrics, citation tags, and skills.
 * Removes orphan evidenceItemIds from roles if they do not match any EvidenceItem.
 * Strips source.rawText if retainRawText === false.
 * Deterministic: repeated reads of the same input produce identical output without fresh timestamps.
 */
export function normalizeCandidateProfile(raw: unknown): CandidateProfile {
  if (!raw || typeof raw !== 'object') {
    return { ...defaultSyntheticCandidateProfile };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = raw as any;
  const dataMode: CandidateProfile['dataMode'] = r.dataMode === 'user' ? 'user' : 'synthetic';
  const profileUpdatedAt = safeDateString(r.updatedAt, '2026-01-01T00:00:00.000Z');

  // Map of Evidence Items
  const evidenceMap = new Map<string, EvidenceItem>();

  // 1. Process explicit root evidenceItems if present
  const rawEvidenceItems: unknown[] = Array.isArray(r.evidenceItems) ? r.evidenceItems : [];
  for (const item of rawEvidenceItems) {
    if (!item || typeof item !== 'object') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const it = item as any;
    const id = safeString(it.id);
    if (!id) continue;

    const validTypes: EvidenceItem['type'][] = [
      'achievement', 'metric', 'responsibility', 'skill',
      'leadership', 'project', 'industry', 'education', 'certification',
    ];
    const type: EvidenceItem['type'] = validTypes.includes(it.type) ? it.type : 'achievement';
    const validStatus: EvidenceItem['verificationStatus'][] = [
      'candidate-confirmed', 'imported-unverified', 'synthetic',
    ];
    const defaultStatus: EvidenceItem['verificationStatus'] =
      dataMode === 'user' ? 'candidate-confirmed' : 'synthetic';
    const verificationStatus: EvidenceItem['verificationStatus'] = validStatus.includes(it.verificationStatus)
      ? it.verificationStatus
      : defaultStatus;

    const normalizedItem: EvidenceItem = {
      id,
      type,
      title: safeString(it.title, 'Untitled Evidence Item'),
      description: safeString(it.description, ''),
      metric: typeof it.metric === 'string' ? it.metric : undefined,
      organization: typeof it.organization === 'string' ? it.organization : undefined,
      roleId: typeof it.roleId === 'string' ? it.roleId : undefined,
      skills: safeStringArray(it.skills),
      tags: safeStringArray(it.tags),
      sourceId: typeof it.sourceId === 'string' ? it.sourceId : undefined,
      verificationStatus,
      createdAt: safeDateString(it.createdAt, profileUpdatedAt),
      updatedAt: safeDateString(it.updatedAt, profileUpdatedAt),
    };

    evidenceMap.set(id, normalizedItem);
  }

  // 2. Process careerHistory roles & convert legacy embedded achievements if present
  const rawRoles: unknown[] = Array.isArray(r.careerHistory) ? r.careerHistory : [];
  const roleMap = new Map<string, CareerRole>();

  for (const role of rawRoles) {
    if (!role || typeof role !== 'object') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ro = role as any;
    const roleId = safeString(ro.id);
    if (!roleId) continue;

    const roleCompany = safeString(ro.company, 'Unknown Company');
    const roleUpdatedAt = safeDateString(ro.updatedAt, profileUpdatedAt);

    // Extract & convert legacy achievements if present as objects
    const collectedEvidenceIds: string[] = [];

    // First collect explicitly provided evidenceItemIds
    if (Array.isArray(ro.evidenceItemIds)) {
      for (const id of safeStringArray(ro.evidenceItemIds)) {
        if (id && !collectedEvidenceIds.includes(id)) {
          collectedEvidenceIds.push(id);
        }
      }
    }

    // Next inspect ro.achievements for legacy achievement objects
    if (Array.isArray(ro.achievements)) {
      for (const ach of ro.achievements) {
        if (!ach) continue;
        if (typeof ach === 'string' && ach) {
          if (!collectedEvidenceIds.includes(ach)) {
            collectedEvidenceIds.push(ach);
          }
        } else if (typeof ach === 'object' && ach !== null) {
          // Legacy achievement object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = ach as any;
          const achId = safeString(a.id);
          if (!achId) continue;

          if (!collectedEvidenceIds.includes(achId)) {
            collectedEvidenceIds.push(achId);
          }

          // If not already in evidenceMap (or if existing is legacy), convert legacy object
          if (!evidenceMap.has(achId)) {
            const citationId = safeString(a.citationId);
            const tags: string[] = citationId ? [citationId] : [];
            const metric = typeof a.metric === 'string' ? a.metric : undefined;
            const description = safeString(a.description);
            const skills = safeStringArray(a.skillsDemonstrated || a.skills);
            const achUpdatedAt = safeDateString(a.updatedAt, roleUpdatedAt);

            const convertedItem: EvidenceItem = {
              id: achId,
              type: metric ? 'metric' : 'achievement',
              title: metric || citationId || 'Achievement',
              description,
              metric,
              organization: roleCompany,
              roleId,
              skills,
              tags,
              sourceId: dataMode === 'synthetic' ? 'src-synthetic-fixture' : undefined,
              verificationStatus: dataMode === 'user' ? 'candidate-confirmed' : 'synthetic',
              createdAt: safeDateString(a.createdAt, achUpdatedAt),
              updatedAt: achUpdatedAt,
            };

            evidenceMap.set(achId, convertedItem);
          }
        }
      }
    }

    // Role normalization
    const displayOrder = typeof ro.displayOrder === 'number' && !isNaN(ro.displayOrder)
      ? ro.displayOrder
      : (rawRoles.indexOf(role) + 1) * 100;

    const normalizedRole: CareerRole = {
      id: roleId,
      company: roleCompany,
      title: safeString(ro.title, 'Untitled Role'),
      location: safeString(ro.location, ''),
      startDate: safeString(ro.startDate, ''),
      endDate: safeString(ro.endDate, 'Present'),
      isCurrent: typeof ro.isCurrent === 'boolean' ? ro.isCurrent : ro.endDate === 'Present',
      summary: safeString(ro.summary, ''),
      evidenceItemIds: collectedEvidenceIds, // Will be filtered against validEvidenceIdSet
      skills: safeStringArray(ro.skills),
      sourceIds: safeStringArray(ro.sourceIds),
      createdAt: safeDateString(ro.createdAt, profileUpdatedAt),
      updatedAt: roleUpdatedAt,
      displayOrder,
    };

    roleMap.set(roleId, normalizedRole);
  }

  const allEvidenceItems = Array.from(evidenceMap.values());
  const validEvidenceIdSet = new Set(allEvidenceItems.map((e) => e.id));

  // Filter roles to ensure evidenceItemIds contain only valid evidence IDs
  const finalCareerHistory: CareerRole[] = [];
  for (const role of Array.from(roleMap.values())) {
    const validIds = role.evidenceItemIds.filter((evId) => validEvidenceIdSet.has(evId));
    finalCareerHistory.push({
      ...role,
      evidenceItemIds: validIds,
    });
  }

  // Sort careerHistory by displayOrder ascending (preserving deterministic order)
  finalCareerHistory.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  // 3. Candidate Sources
  const rawSources: unknown[] = Array.isArray(r.sources) ? r.sources : [];
  const sourceMap = new Map<string, CandidateSource>();

  // Ensure default synthetic source exists if in synthetic mode and sources array is empty
  if (dataMode === 'synthetic' && rawSources.length === 0) {
    sourceMap.set(defaultSyntheticCandidateProfile.sources[0].id, defaultSyntheticCandidateProfile.sources[0]);
  }

  for (const src of rawSources) {
    if (!src || typeof src !== 'object') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc = src as any;
    const id = safeString(sc.id);
    if (!id) continue;
    const retainRawText = Boolean(sc.retainRawText);
    const rawText = retainRawText && typeof sc.rawText === 'string' ? sc.rawText : undefined;

    const normalizedSource: CandidateSource = {
      id,
      type: safeString(sc.type, 'manual') as CandidateSource['type'],
      name: safeString(sc.name, 'Source Document'),
      importedAt: safeDateString(sc.importedAt, profileUpdatedAt),
      rawText,
      retainRawText,
      fileName: typeof sc.fileName === 'string' ? sc.fileName : undefined,
      dataClassification: sc.dataClassification === 'user-provided' ? 'user-provided' : 'synthetic',
    };

    sourceMap.set(id, normalizedSource);
  }

  // 4. Education & Certifications
  const rawEdu: unknown[] = Array.isArray(r.education) ? r.education : [];
  const education: EducationItem[] = rawEdu
    .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object')
    .map((e, idx) => ({
      id: safeString(e.id, `edu-${idx}`),
      institution: safeString(e.institution, ''),
      degree: safeString(e.degree, ''),
      fieldOfStudy: typeof e.fieldOfStudy === 'string' ? e.fieldOfStudy : undefined,
      startDate: typeof e.startDate === 'string' ? e.startDate : undefined,
      endDate: typeof e.endDate === 'string' ? e.endDate : undefined,
      location: typeof e.location === 'string' ? e.location : undefined,
      notes: typeof e.notes === 'string' ? e.notes : undefined,
    }));

  const rawCert: unknown[] = Array.isArray(r.certifications) ? r.certifications : [];
  const certifications: CertificationItem[] = rawCert
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
    .map((c, idx) => ({
      id: safeString(c.id, `cert-${idx}`),
      name: safeString(c.name, ''),
      issuingOrganization: safeString(c.issuingOrganization, ''),
      issueDate: typeof c.issueDate === 'string' ? c.issueDate : undefined,
      expirationDate: typeof c.expirationDate === 'string' ? c.expirationDate : undefined,
      credentialId: typeof c.credentialId === 'string' ? c.credentialId : undefined,
      verificationUrl: typeof c.verificationUrl === 'string' ? c.verificationUrl : undefined,
    }));

  // Structured Compensation & Migration
    const compensationTarget = typeof r.compensationTarget === 'string' ? r.compensationTarget : undefined;
    let compensationPreferences: CandidateProfile['compensationPreferences'] = undefined;
    if (r.compensationPreferences && typeof r.compensationPreferences === 'object') {
      const cp = r.compensationPreferences;
      const bonusPref = cp.bonusPreference || 'not-important';
      const targetBonusPercent =
        bonusPref !== 'not-important' &&
        typeof cp.targetBonusPercent === 'number' &&
        !isNaN(cp.targetBonusPercent) &&
        cp.targetBonusPercent >= 0 &&
        cp.targetBonusPercent <= 100
          ? cp.targetBonusPercent
          : undefined;

      compensationPreferences = {
        currency: cp.currency || 'USD',
        baseSalaryMin: typeof cp.baseSalaryMin === 'number' && !isNaN(cp.baseSalaryMin) && cp.baseSalaryMin >= 0 ? cp.baseSalaryMin : undefined,
        baseSalaryMax: typeof cp.baseSalaryMax === 'number' && !isNaN(cp.baseSalaryMax) && cp.baseSalaryMax >= 0 ? cp.baseSalaryMax : undefined,
        bonusPreference: bonusPref,
        targetBonusPercent,
        equityPreference: cp.equityPreference || 'not-important',
        notes: typeof cp.notes === 'string' ? cp.notes.trim() || undefined : undefined,
      };
    } else {
      compensationPreferences = parseLegacyCompensationString(compensationTarget);
    }

    // Structured Work Authorization & Migration
    const workAuthorization = typeof r.workAuthorization === 'string' ? r.workAuthorization : undefined;
    const workAuthorizationDetails = r.workAuthorizationDetails && typeof r.workAuthorizationDetails === 'object'
      ? r.workAuthorizationDetails
      : parseLegacyWorkAuthString(workAuthorization);

    return {
      id: safeString(r.id, dataMode === 'user' ? 'cand-user-empty' : 'cand-alex-vance-v1'),
      name: safeString(r.name, ''),
      headline: safeString(r.headline, ''),
      location: safeString(r.location, ''),
      summary: safeString(r.summary, ''),
      targetRoles: safeStringArray(r.targetRoles),
      targetIndustries: safeStringArray(r.targetIndustries),
      preferredLocations: safeStringArray(r.preferredLocations),
      compensationPreferences,
      workAuthorizationDetails,
      compensationTarget,
      workAuthorization,
      coreCompetencies: safeStringArray(r.coreCompetencies),
      careerHistory: finalCareerHistory,
      education,
      certifications,
      evidenceItems: allEvidenceItems,
      sources: Array.from(sourceMap.values()),
      updatedAt: profileUpdatedAt,
      dataMode,
    };
  }

// ---------------------------------------------------------------------------
// Candidate Storage & Stable Snapshot Cache
// ---------------------------------------------------------------------------

/**
 * Returns the current candidate profile.
 * Preserves exact module reference until candidate data is mutated.
 * Migrates legacy `ccc_candidate_profile_v1` seamlessly if present.
 * Persists migrated schema once to local storage without dispatching event loops.
 */
export function getCandidateProfile(): CandidateProfile {
  if (cachedCandidateProfile !== null) {
    return cachedCandidateProfile;
  }

  if (!isLocalStorageAvailable()) {
    cachedCandidateProfile = inMemoryCandidateProfile;
    return cachedCandidateProfile;
  }

  try {
    const raw = window.localStorage.getItem(CCC_CANDIDATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let normalized = normalizeCandidateProfile(parsed);

      // Auditable one-time remediation migration for prior bad import contamination
      const remediationDone = window.localStorage.getItem(CCC_REMEDIATION_MIGRATION_KEY);
      if (remediationDone !== 'true') {
        const remediation = remediateContaminatedImport(normalized);
        if (remediation.contaminatedRecordsFound > 0) {
          normalized = normalizeCandidateProfile(remediation.profile);
          try {
            window.localStorage.setItem(CCC_CANDIDATE_KEY, JSON.stringify(normalized));
            console.log(
              `[StorageMigration] Repaired ${remediation.contaminatedRecordsFound} contaminated records from previous bad import.`
            );
          } catch {
            // Ignore write failure
          }
        }
        try {
          window.localStorage.setItem(CCC_REMEDIATION_MIGRATION_KEY, 'true');
        } catch {
          // Ignore
        }
      }

      // Detect if legacy migration occurred (e.g. parsed lacked root evidenceItems or had fewer evidenceItems than normalized)
      const needsMigrationSave =
        !Array.isArray(parsed.evidenceItems) ||
        normalized.evidenceItems.length > (parsed.evidenceItems?.length ?? 0);

      if (needsMigrationSave) {
        try {
          window.localStorage.setItem(CCC_CANDIDATE_KEY, JSON.stringify(normalized));
        } catch {
          // Ignore write failure
        }
      }

      cachedCandidateProfile = normalized;
      return cachedCandidateProfile;
    }

    // Check legacy key migration (ccc_candidate_profile_v1)
    const legacyRaw = window.localStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw);
      const migrated = normalizeCandidateProfile(parsedLegacy);
      try {
        window.localStorage.setItem(CCC_CANDIDATE_KEY, JSON.stringify(migrated));
      } catch {
        // Ignore write failure
      }
      cachedCandidateProfile = migrated;
      return cachedCandidateProfile;
    }

    // Fall back to default synthetic fixture
    const defaultProfile = normalizeCandidateProfile(defaultSyntheticCandidateProfile);
    try {
      window.localStorage.setItem(CCC_CANDIDATE_KEY, JSON.stringify(defaultProfile));
    } catch {
      // Ignore write failure
    }
    cachedCandidateProfile = defaultProfile;
    return cachedCandidateProfile;
  } catch {
    cachedCandidateProfile = inMemoryCandidateProfile;
    return cachedCandidateProfile;
  }
}

/**
 * Save updated CandidateProfile.
 * Updates in-memory cache and dispatches candidate-scoped storage event.
 */
export function saveCandidateProfile(profile: CandidateProfile): CandidateProfile {
  const normalized = normalizeCandidateProfile({
    ...profile,
    updatedAt: new Date().toISOString(),
  });

  cachedCandidateProfile = normalized;
  inMemoryCandidateProfile = normalized;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(CCC_CANDIDATE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore
    }
  }

  notifyCandidateStorageChange();
  return normalized;
}

/**
 * Resets candidate data to original synthetic benchmark fixture.
 * Does NOT clear opportunities, theme, or settings.
 */
export function resetCandidateDemoData(): void {
  const freshSynthetic = normalizeCandidateProfile(defaultSyntheticCandidateProfile);
  cachedCandidateProfile = freshSynthetic;
  inMemoryCandidateProfile = freshSynthetic;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(CCC_CANDIDATE_KEY, JSON.stringify(freshSynthetic));
    } catch {
      // Ignore
    }
  }

  notifyCandidateStorageChange();
}

/**
 * Clears candidate data, creating a valid empty user candidate profile.
 * Does NOT clear opportunities, theme, or settings.
 */
export function clearCandidateData(): void {
  const emptyCandidateProfile: CandidateProfile = {
    id: 'cand-user-empty',
    name: '',
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
    updatedAt: new Date().toISOString(),
    dataMode: 'user',
  };

  cachedCandidateProfile = emptyCandidateProfile;
  inMemoryCandidateProfile = emptyCandidateProfile;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(CCC_CANDIDATE_KEY, JSON.stringify(emptyCandidateProfile));
    } catch {
      // Ignore
    }
  }

  notifyCandidateStorageChange();
}

/**
 * Triggers a browser download of the active candidate profile in clean JSON format.
 * Timestamp generated strictly on user click.
 */
export function exportCandidateData(profileToExport?: CandidateProfile): void {
  if (typeof window === 'undefined') return;

  const target = profileToExport ?? getCandidateProfile();
  const jsonString = JSON.stringify(target, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `candidate_profile_${target.dataMode}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Subscribes to candidate storage changes specifically.
 */
export function subscribeToCandidateStorage(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorageEvent = (e: StorageEvent) => {
    if (!e.key || e.key === CCC_CANDIDATE_KEY) {
      cachedCandidateProfile = null; // Invalidate cache so next getCandidateProfile() re-parses
      listener();
    }
  };

  const handleCustomEvent = () => {
    listener();
  };

  window.addEventListener(CCC_CANDIDATE_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CCC_CANDIDATE_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// ---------------------------------------------------------------------------
// Opportunity normalization & ID deduplication
// ---------------------------------------------------------------------------

function derivePriorityFromScore(score: unknown): OpportunityPriority {
  const n = typeof score === 'number' ? score : 0;
  if (n >= 85) return 'High';
  if (n >= 50) return 'Medium';
  return 'Low';
}

function safePipelineStage(value: unknown): PipelineStage {
  const valid: PipelineStage[] = [
    'Identified', 'Applied', 'Screening', 'Interviewing', 'Offer', 'Archived',
  ];
  return valid.includes(value as PipelineStage)
    ? (value as PipelineStage)
    : 'Identified';
}

function safePriority(value: unknown, fallbackScore: unknown): OpportunityPriority {
  const valid: OpportunityPriority[] = ['High', 'Medium', 'Low'];
  return valid.includes(value as OpportunityPriority)
    ? (value as OpportunityPriority)
    : derivePriorityFromScore(fallbackScore);
}

function deduplicateOpportunities(opps: JobOpportunity[]): JobOpportunity[] {
  const map = new Map<string, JobOpportunity>();
  for (const opp of opps) {
    if (!opp || !opp.id) continue;
    const existing = map.get(opp.id);
    if (!existing) {
      map.set(opp.id, opp);
    } else {
      const existingTime = new Date(existing.updatedAt).getTime() || 0;
      const newTime = new Date(opp.updatedAt).getTime() || 0;
      if (newTime >= existingTime) {
        map.set(opp.id, opp);
      }
    }
  }
  return Array.from(map.values());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOpportunity(raw: any): JobOpportunity {
  const stage = safePipelineStage(raw?.stage);
  const fitScore = raw?.analysis?.overallFitScore;
  const opportunityId = safeString(raw?.id, `opp-${Date.now()}`);
  const nextActions: string[] = Array.isArray(raw?.analysis?.nextActions)
    ? (raw.analysis.nextActions as string[]).filter((x: unknown) => typeof x === 'string')
    : [];

  let actions: JobOpportunity['actions'];

  if (Array.isArray(raw?.actions) && raw.actions.length > 0) {
    actions = mergeActionsForStage(
      opportunityId,
      stage,
      nextActions,
      raw.actions
    );
  } else {
    const stageActions = buildStageActions(stage);
    const roleActions = buildRoleActions(opportunityId, nextActions);
    actions = [...stageActions, ...roleActions];
  }

  const rawAnalysis = raw?.analysis ?? {
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
  };

  const KNOWN_BENCHMARK_IDS = [
    'opp-role-1-ai-strategy',
    'opp-role-2-sales-ops',
    'opp-role-3-data-engineer',
    'opp-role-4-chief-of-staff',
    'opp-role-5-strategy-lead',
  ];
  const isKnownFixture = KNOWN_BENCHMARK_IDS.includes(opportunityId);

  const candidateProvenance: CandidateProvenance = rawAnalysis.candidateProvenance ?? (
    isKnownFixture
      ? {
          candidateId: 'cand-alex-vance-v1',
          candidateName: 'Alex Vance',
          dataMode: 'synthetic',
          profileUpdatedAt: '2026-01-01T00:00:00.000Z',
          analyzedAt: safeString(raw?.createdAt, '2026-01-01T00:00:00.000Z'),
          provenanceStatus: 'inferred',
        }
      : {
          candidateId: null,
          candidateName: null,
          dataMode: null,
          profileUpdatedAt: null,
          analyzedAt: safeString(raw?.createdAt, '2026-01-01T00:00:00.000Z'),
          provenanceStatus: 'unknown',
        }
  );

  const evidenceSnapshot: EvidenceItem[] = Array.isArray(rawAnalysis.evidenceSnapshot)
    ? rawAnalysis.evidenceSnapshot
    : (isKnownFixture
        ? collectReferencedEvidence(defaultSyntheticCandidateProfile, rawAnalysis)
        : []);

  const normalizedAnalysis: FitAnalysisReport = {
    ...rawAnalysis,
    candidateProvenance,
    evidenceSnapshot,
  };

  const normalized: JobOpportunity = {
    id: opportunityId,
    title: safeString(raw?.title, 'Untitled Role'),
    company: safeString(raw?.company, 'Unknown Company'),
    location: safeStringOrUndefined(raw?.location),
    compensation: safeStringOrUndefined(raw?.compensation),
    sourceUrl: safeStringOrUndefined(raw?.sourceUrl),
    rawJobDescription: safeString(raw?.rawJobDescription),
    createdAt: safeString(raw?.createdAt, new Date().toISOString()),
    updatedAt: safeString(raw?.updatedAt, new Date().toISOString()),
    stage,
    analysis: normalizedAnalysis,
    priority: safePriority(raw?.priority, fitScore),
    notes: safeString(raw?.notes),
    followUpDate: safeStringOrUndefined(raw?.followUpDate),
    companyWebsiteUrl: safeStringOrUndefined(raw?.companyWebsiteUrl),
    applicationUrl: safeStringOrUndefined(
      raw?.applicationUrl ?? raw?.sourceUrl
    ),
    actions,
    archivedReason: safeString(raw?.archivedReason),
  };

  return normalized;
}

function safeStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAll(raws: any[]): JobOpportunity[] {
  if (!Array.isArray(raws)) return [];
  const normalizedList = raws.map(normalizeOpportunity);
  return deduplicateOpportunities(normalizedList);
}

// ---------------------------------------------------------------------------
// Opportunities Storage & Stable Snapshot Cache
// ---------------------------------------------------------------------------

export function getOpportunities(): JobOpportunity[] {
  if (cachedOpportunities !== null) {
    return cachedOpportunities;
  }

  if (!isLocalStorageAvailable()) {
    cachedOpportunities = inMemoryOpportunities;
    return cachedOpportunities;
  }

  try {
    const raw = window.localStorage.getItem(OPPORTUNITIES_KEY);
    if (!raw) {
      const normalized = normalizeAll(initialOpportunities);
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(normalized));
      cachedOpportunities = normalized;
      return cachedOpportunities;
    }
    const parsed = JSON.parse(raw);
    const parsedList = Array.isArray(parsed) ? parsed : [];
    const hasQaOpp = parsedList.some((o: JobOpportunity) => o.id === 'opp-qa-test-google-ai-strategy');
    const isQaDeleted = typeof window !== 'undefined' && window.localStorage.getItem('ccc_qa_opp_google_deleted') === 'true';

    let merged = parsedList;
    if (!hasQaOpp && !isQaDeleted) {
      const qaOpp = initialOpportunities.find((o) => o.id === 'opp-qa-test-google-ai-strategy');
      if (qaOpp) {
        merged = [qaOpp, ...merged];
      }
    }

    cachedOpportunities = normalizeAll(merged);
    return cachedOpportunities;
  } catch {
    cachedOpportunities = inMemoryOpportunities;
    return cachedOpportunities;
  }
}

export function getOpportunityById(id: string): JobOpportunity | undefined {
  return getOpportunities().find((o) => o.id === id);
}

export function saveOpportunity(opportunity: JobOpportunity): JobOpportunity {
  const opps = getOpportunities();
  const index = opps.findIndex((o) => o.id === opportunity.id);

  let updated: JobOpportunity[];
  const withTimestamp = { ...opportunity, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    updated = [...opps];
    updated[index] = withTimestamp;
  } else {
    updated = [withTimestamp, ...opps];
  }

  persistOpportunities(updated);
  return withTimestamp;
}

export function createOpportunity(payload: Partial<JobOpportunity>): JobOpportunity {
  const newId = payload.id || `opp-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const opp: JobOpportunity = normalizeOpportunity({
    ...payload,
    id: newId,
    createdAt: payload.createdAt || now,
    updatedAt: now,
    stage: payload.stage || 'Identified',
    priority: payload.priority || 'Medium',
    rawJobDescription: payload.rawJobDescription || '',
    actions: payload.actions || [],
  });

  return saveOpportunity(opp);
}

export function updateOpportunityStage(
  id: string,
  stage: PipelineStage
): JobOpportunity {
  const opps = getOpportunities();
  let updatedTargetOpp: JobOpportunity | undefined = undefined;

  const updatedList = opps.map((o) => {
    if (o.id !== id) return o;

    const nextActions: string[] = o.analysis?.nextActions ?? [];
    const newActions = mergeActionsForStage(id, stage, nextActions, o.actions);

    updatedTargetOpp = {
      ...o,
      stage,
      actions: newActions,
      updatedAt: new Date().toISOString(),
    };
    return updatedTargetOpp;
  });

  if (updatedTargetOpp) {
    persistOpportunities(updatedList);
    return updatedTargetOpp;
  }

  const fallback = getOpportunityById(id)!;
  return fallback;
}

export function archiveOpportunity(id: string): JobOpportunity {
  return updateOpportunityStage(id, 'Archived');
}

export function deleteOpportunity(id: string): void {
  if (id === 'opp-qa-test-google-ai-strategy' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('ccc_qa_opp_google_deleted', 'true');
    } catch {
      // Ignore write error
    }
  }
  const opps = getOpportunities();
  const updated = opps.filter((o) => o.id !== id);
  persistOpportunities(updated);
}

export function toggleActionCompleted(
  opportunityId: string,
  actionId: string
): JobOpportunity | undefined {
  const opps = getOpportunities();
  let updatedTargetOpp: JobOpportunity | undefined = undefined;

  const updatedList = opps.map((o) => {
    if (o.id !== opportunityId) return o;
    const nowStr = new Date().toISOString();
    const newActions = o.actions.map((a) => {
      if (a.id !== actionId) return a;
      const isCompleting = !a.completed;
      return {
        ...a,
        completed: isCompleting,
        completedAt: isCompleting ? nowStr : undefined,
      };
    });
    updatedTargetOpp = { ...o, actions: newActions, updatedAt: nowStr };
    return updatedTargetOpp;
  });

  if (updatedTargetOpp) {
    persistOpportunities(updatedList);
  }
  return updatedTargetOpp;
}

export function updateOpportunityFollowUpDate(
  id: string,
  followUpDate: string | undefined
): JobOpportunity {
  const opps = getOpportunities();
  let updatedTargetOpp: JobOpportunity | undefined = undefined;

  const updatedList = opps.map((o) => {
    if (o.id !== id) return o;
    const cleanDate = typeof followUpDate === 'string' && followUpDate.trim().length > 0
      ? followUpDate.trim()
      : undefined;
    updatedTargetOpp = {
      ...o,
      followUpDate: cleanDate,
      updatedAt: new Date().toISOString(),
    };
    return updatedTargetOpp;
  });

  if (updatedTargetOpp) {
    persistOpportunities(updatedList);
    return updatedTargetOpp;
  }

  return getOpportunityById(id)!;
}

export function updateOpportunityNotes(
  id: string,
  notes: string
): JobOpportunity {
  const opps = getOpportunities();
  let updatedTargetOpp: JobOpportunity | undefined = undefined;

  const updatedList = opps.map((o) => {
    if (o.id !== id) return o;
    updatedTargetOpp = {
      ...o,
      notes: (notes || '').trim(),
      updatedAt: new Date().toISOString(),
    };
    return updatedTargetOpp;
  });

  if (updatedTargetOpp) {
    persistOpportunities(updatedList);
    return updatedTargetOpp;
  }

  return getOpportunityById(id)!;
}

export function addCustomAction(
  opportunityId: string,
  text: string,
  id?: string
): JobOpportunity | undefined {
  const actionId = id || generateCustomActionId();
  const opps = getOpportunities();
  let updatedTargetOpp: JobOpportunity | undefined = undefined;

  const updatedList = opps.map((o) => {
    if (o.id !== opportunityId) return o;
    const newAction: JobOpportunity['actions'][0] = {
      id: actionId,
      text,
      source: 'custom',
      completed: false,
      createdAt: new Date().toISOString(),
    };
    updatedTargetOpp = {
      ...o,
      actions: [...o.actions, newAction],
      updatedAt: new Date().toISOString(),
    };
    return updatedTargetOpp;
  });

  if (updatedTargetOpp) {
    persistOpportunities(updatedList);
  }
  return updatedTargetOpp;
}

/**
 * Resets opportunities demo data ONLY.
 * Does NOT reset candidate profile, theme, or UI settings.
 */
export function resetDemoData(): void {
  const freshOpps = normalizeAll([...initialOpportunities]);
  cachedOpportunities = freshOpps;
  inMemoryOpportunities = freshOpps;

  if (isLocalStorageAvailable()) {
    try {
      const currentSettings = getUISettings();
      window.localStorage.removeItem('ccc_qa_opp_google_deleted');
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(freshOpps));
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch {
      // Ignore write errors
    }
  }

  notifyStorageChange();
}

export function subscribeToStorage(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorageEvent = (e: StorageEvent) => {
    if (!e.key || e.key === OPPORTUNITIES_KEY) {
      cachedOpportunities = null;
      listener();
    }
  };

  const handleCustomEvent = () => {
    listener();
  };

  window.addEventListener(STORAGE_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(STORAGE_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// ---------------------------------------------------------------------------
// UI Settings (sort/filter state persistence)
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: OpportunityUISettings = {
  sortField: 'createdAt',
  sortDirection: 'desc',
  stageFilter: 'All',
  recommendationFilter: 'All',
  priorityFilter: 'All',
  followUpFilter: 'All',
  searchTerm: '',
  themeMode: 'system',
  viewMode: 'table',
};

export function getUISettings(): OpportunityUISettings {
  if (!isLocalStorageAvailable()) return { ...DEFAULT_SETTINGS };

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const themeMode =
      parsed.themeMode === 'light' ||
      parsed.themeMode === 'dark' ||
      parsed.themeMode === 'system'
        ? parsed.themeMode
        : 'system';
    const viewMode = parsed.viewMode === 'board' ? 'board' : 'table';

    return { ...DEFAULT_SETTINGS, ...parsed, themeMode, viewMode };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveUISettings(settings: Partial<OpportunityUISettings>): void {
  if (!isLocalStorageAvailable()) return;

  try {
    const current = getUISettings();
    const merged = { ...current, ...settings };
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function persistOpportunities(opps: JobOpportunity[]): void {
  const deduplicated = deduplicateOpportunities(opps);
  cachedOpportunities = deduplicated;
  inMemoryOpportunities = deduplicated;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(deduplicated));
    } catch {
      // Ignore
    }
  }
  notifyStorageChange();
}
