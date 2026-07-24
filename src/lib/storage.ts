import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity, PipelineStage } from '@/types/opportunity';
import { alexVanceProfile } from '@/data/candidate';
import { initialOpportunities } from '@/data/opportunities';

const PROFILE_KEY = 'ccc_candidate_profile_v1';
const OPPORTUNITIES_KEY = 'ccc_opportunities_v1';
const SETTINGS_KEY = 'ccc_settings_v1';

// Custom event name for intra-tab state synchronization
export const STORAGE_CHANGE_EVENT = 'ccc_storage_change';

// In-memory fallback state for incognito/restricted environments
let inMemoryProfile: CandidateProfile = alexVanceProfile;
let inMemoryOpportunities: JobOpportunity[] = [...initialOpportunities];
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

export function getCandidateProfile(): CandidateProfile {
  if (!isLocalStorageAvailable()) {
    return inMemoryProfile;
  }

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

export function getOpportunities(): JobOpportunity[] {
  if (!isLocalStorageAvailable()) {
    return inMemoryOpportunities;
  }

  try {
    const raw = window.localStorage.getItem(OPPORTUNITIES_KEY);
    if (!raw) {
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(initialOpportunities));
      return initialOpportunities;
    }
    return JSON.parse(raw) as JobOpportunity[];
  } catch {
    return inMemoryOpportunities;
  }
}

export function getOpportunityById(id: string): JobOpportunity | undefined {
  const opps = getOpportunities();
  return opps.find((o) => o.id === id);
}

export function saveOpportunity(opportunity: JobOpportunity): void {
  const opps = getOpportunities();
  const index = opps.findIndex((o) => o.id === opportunity.id);

  let updated: JobOpportunity[];
  if (index >= 0) {
    updated = [...opps];
    updated[index] = { ...opportunity, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...opportunity, updatedAt: new Date().toISOString() }, ...opps];
  }

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(updated));
    } catch {
      inMemoryOpportunities = updated;
    }
  } else {
    inMemoryOpportunities = updated;
  }

  notifyStorageChange();
}

export function updateOpportunityStage(id: string, stage: PipelineStage): void {
  const opps = getOpportunities();
  const updated = opps.map((o) =>
    o.id === id ? { ...o, stage, updatedAt: new Date().toISOString() } : o
  );

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(updated));
    } catch {
      inMemoryOpportunities = updated;
    }
  } else {
    inMemoryOpportunities = updated;
  }

  notifyStorageChange();
}

export function archiveOpportunity(id: string): void {
  updateOpportunityStage(id, 'Archived');
}

export function deleteOpportunity(id: string): void {
  const opps = getOpportunities();
  const updated = opps.filter((o) => o.id !== id);

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(updated));
    } catch {
      inMemoryOpportunities = updated;
    }
  } else {
    inMemoryOpportunities = updated;
  }

  notifyStorageChange();
}

export function resetDemoData(): void {
  inMemoryProfile = alexVanceProfile;
  inMemoryOpportunities = [...initialOpportunities];

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(alexVanceProfile));
      window.localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(initialOpportunities));
      window.localStorage.removeItem(SETTINGS_KEY);
    } catch {
      // Ignore write errors
    }
  }

  notifyStorageChange();
}

export function subscribeToStorage(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener(STORAGE_CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(STORAGE_CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
