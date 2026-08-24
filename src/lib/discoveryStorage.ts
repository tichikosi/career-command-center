import { DiscoveredJob, DiscoveredJobStatus, DiscoveryHistoryItem, RelevanceLevel } from '@/types/discovery';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import { createOpportunity, isLocalStorageAvailable } from './storage';
import { normalizeCompanyName } from './networkParser';

export const CCC_DISCOVERY_JOBS_KEY = 'ccc_discovery_jobs_v1';
export const CCC_DISCOVERY_HISTORY_KEY = 'ccc_discovery_history_v1';
export const CCC_DISCOVERY_CHANGE_EVENT = 'ccc_discovery_change';

const EMPTY_JOBS_SNAPSHOT: DiscoveredJob[] = Object.freeze([]) as unknown as DiscoveredJob[];
const EMPTY_HISTORY_SNAPSHOT: DiscoveryHistoryItem[] = Object.freeze([]) as unknown as DiscoveryHistoryItem[];

let cachedDiscoveredJobs: DiscoveredJob[] | null = null;
let inMemoryDiscoveredJobs: DiscoveredJob[] = [];

let cachedDiscoveryHistory: DiscoveryHistoryItem[] | null = null;
let inMemoryDiscoveryHistory: DiscoveryHistoryItem[] = [];

export function getInitialDiscoveryJobsServerSnapshot(): DiscoveredJob[] {
  return EMPTY_JOBS_SNAPSHOT;
}

export function getInitialDiscoveryHistoryServerSnapshot(): DiscoveryHistoryItem[] {
  return EMPTY_HISTORY_SNAPSHOT;
}

function notifyDiscoveryChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CCC_DISCOVERY_CHANGE_EVENT));
  }
}

export function subscribeToDiscovery(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    cachedDiscoveredJobs = null;
    cachedDiscoveryHistory = null;
    listener();
  };

  window.addEventListener(CCC_DISCOVERY_CHANGE_EVENT, handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener(CCC_DISCOVERY_CHANGE_EVENT, handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

/**
 * Normalizes job URL and company/title for robust deduplication.
 */
export function generateJobFingerprint(company: string, title: string, location?: string): string {
  const normCo = normalizeCompanyName(company || '');
  const normTitle = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normLoc = (location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normCo}::${normTitle}::${normLoc}`;
}

export function deduplicateDiscoveredJobs(
  incomingJobs: DiscoveredJob[],
  existingJobs: DiscoveredJob[],
  activeOpportunities: JobOpportunity[]
): { uniqueJobs: DiscoveredJob[]; duplicatesCount: number } {
  const existingFingerprints = new Set<string>();
  const existingUrls = new Set<string>();

  // Index active opportunities
  activeOpportunities.forEach((opp) => {
    existingFingerprints.add(generateJobFingerprint(opp.company, opp.title, opp.location));
    if (opp.applicationUrl) existingUrls.add(opp.applicationUrl.toLowerCase().trim());
    if (opp.sourceUrl) existingUrls.add(opp.sourceUrl.toLowerCase().trim());
  });

  // Index existing discovery queue
  existingJobs.forEach((job) => {
    existingFingerprints.add(generateJobFingerprint(job.company, job.title, job.location));
    if (job.jobUrl) existingUrls.add(job.jobUrl.toLowerCase().trim());
  });

  const uniqueJobs: DiscoveredJob[] = [];
  let duplicatesCount = 0;

  for (const job of incomingJobs) {
    const fp = generateJobFingerprint(job.company, job.title, job.location);
    const url = job.jobUrl ? job.jobUrl.toLowerCase().trim() : null;

    if (existingFingerprints.has(fp) || (url && existingUrls.has(url))) {
      duplicatesCount++;
    } else {
      existingFingerprints.add(fp);
      if (url) existingUrls.add(url);
      uniqueJobs.push(job);
    }
  }

  return { uniqueJobs, duplicatesCount };
}

export function scoreDiscoveryRelevance(
  job: Partial<DiscoveredJob>,
  candidate: CandidateProfile
): {
  relevanceScore: number;
  relevanceLevel: RelevanceLevel;
  relevanceReasons: string[];
  matchedPreferences: string[];
} {
  let score = 30; // baseline
  const reasons: string[] = [];
  const matchedPrefs: string[] = [];

  const targetRoles = (candidate.targetRoles || []).map((r) => r.toLowerCase());
  const preferredLocations = (candidate.preferredLocations || []).map((l) => l.toLowerCase());
  const targetIndustries = (candidate.targetIndustries || []).map((i) => i.toLowerCase());

  const jobTitle = (job.title || '').toLowerCase();
  const jobLoc = (job.location || '').toLowerCase();
  const jobDesc = `${job.title || ''} ${job.snippet || ''} ${job.description || ''} ${job.company || ''}`.toLowerCase();

  // 1. Role Title Match
  for (const role of targetRoles) {
    const words = role.split(/\s+/).filter((w) => w.length > 2);
    if (words.some((w) => jobTitle.includes(w))) {
      score += 30;
      reasons.push(`Matches target role preference: "${role}"`);
      matchedPrefs.push(role);
      break;
    }
  }

  // 2. Location Match
  if (jobLoc.includes('remote') || jobLoc.includes('anywhere')) {
    score += 20;
    reasons.push('Remote location flexibility');
    matchedPrefs.push('Remote');
  } else {
    for (const loc of preferredLocations) {
      if (jobLoc.includes(loc) || loc.includes(jobLoc)) {
        score += 25;
        reasons.push(`Target location match: "${loc}"`);
        matchedPrefs.push(loc);
        break;
      }
    }
  }

  // 3. Industry / Tech Keywords
  for (const ind of targetIndustries) {
    if (jobDesc.includes(ind)) {
      score += 15;
      reasons.push(`Target industry match: "${ind}"`);
      matchedPrefs.push(ind);
      break;
    }
  }

  // 4. Seniority Signals
  if (/\b(director|vp|vice president|head|lead|chief|principal)\b/i.test(jobTitle)) {
    score += 15;
    reasons.push('Executive seniority level match');
  }

  const finalScore = Math.max(10, Math.min(100, score));
  let level: RelevanceLevel = 'Low Relevance';
  if (finalScore >= 80) level = 'High Potential';
  else if (finalScore >= 50) level = 'Possible Fit';

  return {
    relevanceScore: finalScore,
    relevanceLevel: level,
    relevanceReasons: reasons.length > 0 ? reasons : ['General Market Relevance'],
    matchedPreferences: Array.from(new Set(matchedPrefs)),
  };
}

export function getDiscoveredJobs(): DiscoveredJob[] {
  if (cachedDiscoveredJobs !== null) {
    return cachedDiscoveredJobs;
  }

  if (!isLocalStorageAvailable()) {
    cachedDiscoveredJobs = inMemoryDiscoveredJobs;
    return cachedDiscoveredJobs;
  }

  try {
    const raw = window.localStorage.getItem(CCC_DISCOVERY_JOBS_KEY);
    if (!raw) {
      cachedDiscoveredJobs = [];
      return cachedDiscoveredJobs;
    }
    const parsed = JSON.parse(raw);
    cachedDiscoveredJobs = Array.isArray(parsed) ? parsed : [];
    return cachedDiscoveredJobs;
  } catch {
    cachedDiscoveredJobs = inMemoryDiscoveredJobs;
    return cachedDiscoveredJobs;
  }
}

export function saveDiscoveredJobs(jobs: DiscoveredJob[]): void {
  cachedDiscoveredJobs = jobs;
  inMemoryDiscoveredJobs = jobs;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(CCC_DISCOVERY_JOBS_KEY, JSON.stringify(jobs));
    } catch {
      // Ignore
    }
  }

  notifyDiscoveryChange();
}

export function updateDiscoveredJobStatus(id: string, status: DiscoveredJobStatus): void {
  const jobs = getDiscoveredJobs();
  const updated = jobs.map((j) => (j.id === id ? { ...j, status } : j));
  saveDiscoveredJobs(updated);
}

export function getDiscoveryHistory(): DiscoveryHistoryItem[] {
  if (cachedDiscoveryHistory !== null) {
    return cachedDiscoveryHistory;
  }

  if (!isLocalStorageAvailable()) {
    cachedDiscoveryHistory = inMemoryDiscoveryHistory;
    return cachedDiscoveryHistory;
  }

  try {
    const raw = window.localStorage.getItem(CCC_DISCOVERY_HISTORY_KEY);
    if (!raw) {
      cachedDiscoveryHistory = [];
      return cachedDiscoveryHistory;
    }
    const parsed = JSON.parse(raw);
    cachedDiscoveryHistory = Array.isArray(parsed) ? parsed : [];
    return cachedDiscoveryHistory;
  } catch {
    cachedDiscoveryHistory = inMemoryDiscoveryHistory;
    return cachedDiscoveryHistory;
  }
}

export function recordDiscoveryRun(item: Omit<DiscoveryHistoryItem, 'id'>): DiscoveryHistoryItem {
  const history = getDiscoveryHistory();
  const newItem: DiscoveryHistoryItem = {
    ...item,
    id: `run-${Date.now()}`,
  };

  const updated = [newItem, ...history].slice(0, 50); // Keep last 50 runs
  cachedDiscoveryHistory = updated;
  inMemoryDiscoveryHistory = updated;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(CCC_DISCOVERY_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  notifyDiscoveryChange();
  return newItem;
}

export function promoteDiscoveredJobToOpportunity(job: DiscoveredJob): JobOpportunity {
  const opp = createOpportunity({
    company: job.company,
    title: job.title,
    location: job.location,
    compensation: job.compensation,
    applicationUrl: job.jobUrl,
    rawJobDescription: job.description || job.snippet || `${job.title} at ${job.company}`,
    stage: 'Identified',
    priority: job.relevanceLevel === 'High Potential' ? 'High' : 'Medium',
    notes: `Surfaced via ${job.source} on ${job.discoveredAt.slice(0, 10)}. Relevance: ${job.relevanceLevel} (${job.relevanceScore}%).`,
  });

  updateDiscoveredJobStatus(job.id, 'promoted');
  return opp;
}
