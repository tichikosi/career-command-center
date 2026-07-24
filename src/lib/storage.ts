import { CandidateProfile } from '@/types/candidate';
import {
  JobOpportunity,
  PipelineStage,
  OpportunityPriority,
  OpportunityUISettings,
} from '@/types/opportunity';
import { alexVanceProfile } from '@/data/candidate';
import { initialOpportunities } from '@/data/opportunities';
import { mergeActionsForStage, buildStageActions, buildRoleActions } from '@/lib/stageActions';

const PROFILE_KEY = 'ccc_candidate_profile_v1';
const OPPORTUNITIES_KEY = 'ccc_opportunities_v1';
const SETTINGS_KEY = 'ccc_settings_v1';

export const STORAGE_CHANGE_EVENT = 'ccc_storage_change';

// ---------------------------------------------------------------------------
// Stable Module-level Snapshots & Memory Cache
// ---------------------------------------------------------------------------

// Frozen deterministic server snapshot for SSR and initial hydration
const SERVER_SNAPSHOT: JobOpportunity[] = Object.freeze(normalizeAll([...initialOpportunities])) as unknown as JobOpportunity[];

export function getInitialOpportunitiesServerSnapshot(): JobOpportunity[] {
  return SERVER_SNAPSHOT;
}

// Module-level cached client snapshot reference (reassigned ONLY when data mutates)
let cachedOpportunities: JobOpportunity[] | null = null;
let inMemoryProfile: CandidateProfile = alexVanceProfile;
let inMemoryOpportunities: JobOpportunity[] = normalizeAll([...initialOpportunities]);
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

// ---------------------------------------------------------------------------
// Opportunity normalization — supply defaults for any missing V1.1A fields.
// ---------------------------------------------------------------------------

function derivePriorityFromScore(score: unknown): OpportunityPriority {
  const n = typeof score === 'number' ? score : 0;
  if (n >= 85) return 'High';
  if (n >= 50) return 'Medium';
  return 'Low';
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
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

/**
 * Normalize a raw stored/parsed object into a fully-typed JobOpportunity.
 * Safe to call on legacy V1 records that are missing V1.1A fields.
 * Never throws.
 */
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
    analysis: raw?.analysis ?? {
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
    },
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAll(raws: any[]): JobOpportunity[] {
  if (!Array.isArray(raws)) return [];
  return raws.map(normalizeOpportunity);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function getCandidateProfile(): CandidateProfile {
  if (!isLocalStorageAvailable()) return inMemoryProfile;

  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(alexVanceProfile));
      return alexVanceProfile;
    }
    return JSON.parse(raw) as CandidateProfile;
  } catch {
    return inMemoryProfile;
  }
}

// ---------------------------------------------------------------------------
// Opportunities Storage & Stable Snapshot Cache
// ---------------------------------------------------------------------------

/**
 * Returns the array of opportunities.
 * Returns the exact same array reference until a mutation occurs.
 */
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
    cachedOpportunities = normalizeAll(parsed);
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

/**
 * Single Authoritative Stage Updater
 * Updates stage and re-merges stage actions using central templates.
 * Preserves role-specific actions, custom actions, and completion state.
 * Returns the complete updated JobOpportunity.
 */
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

  // Fallback if ID not found
  const fallback = getOpportunityById(id)!;
  return fallback;
}

export function archiveOpportunity(id: string): JobOpportunity {
  return updateOpportunityStage(id, 'Archived');
}

export function deleteOpportunity(id: string): void {
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
    const newActions = o.actions.map((a) =>
      a.id === actionId ? { ...a, completed: !a.completed } : a
    );
    updatedTargetOpp = { ...o, actions: newActions, updatedAt: new Date().toISOString() };
    return updatedTargetOpp;
  });

  if (updatedTargetOpp) {
    persistOpportunities(updatedList);
  }
  return updatedTargetOpp;
}

export function addCustomAction(
  opportunityId: string,
  text: string,
  id: string
): JobOpportunity | undefined {
  const opps = getOpportunities();
  let updatedTargetOpp: JobOpportunity | undefined = undefined;

  const updatedList = opps.map((o) => {
    if (o.id !== opportunityId) return o;
    const newAction: JobOpportunity['actions'][0] = {
      id,
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

export function resetDemoData(): void {
  inMemoryProfile = alexVanceProfile;
  const freshOpps = normalizeAll([...initialOpportunities]);
  inMemoryOpportunities = freshOpps;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(alexVanceProfile));
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(freshOpps));
      window.localStorage.removeItem(SETTINGS_KEY);
    } catch {
      // Ignore write errors
    }
  }

  persistOpportunities(freshOpps);
}

export function subscribeToStorage(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorageEvent = (e: StorageEvent) => {
    if (!e.key || e.key === OPPORTUNITIES_KEY) {
      cachedOpportunities = null; // Invalidate cache so next getOpportunities() re-parses
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
};

export function getUISettings(): OpportunityUISettings {
  if (!isLocalStorageAvailable()) return { ...DEFAULT_SETTINGS };

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
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
  cachedOpportunities = opps;
  inMemoryOpportunities = opps;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(opps));
    } catch {
      // Ignore
    }
  }
  notifyStorageChange();
}
