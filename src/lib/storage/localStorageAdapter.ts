import {
  ICandidateRepository,
  IOpportunityRepository,
  INetworkRepository,
  IDiscoveryRepository,
  IActivityRepository,
  IInterviewPrepRepository,
  IInterviewSessionRepository,
  IStorageAdapter,
} from './interfaces';
import { OpportunityActivity, InterviewPreparation, InterviewSession } from '@/types/interview';
import { NetworkContact } from '@/types/network';
import {
  getCandidateProfile,
  saveCandidateProfile,
  resetCandidateDemoData,
  clearCandidateData,
  getOpportunities,
  getOpportunityById,
  saveOpportunity,
  createOpportunity,
  updateOpportunityStage,
  deleteOpportunity,
} from '@/lib/storage';
import {
  getNetworkContacts,
  saveNetworkContacts,
  resetNetworkDemoData,
  clearNetworkContacts,
} from '@/lib/networkStorage';
import {
  getDiscoveredJobs,
  saveDiscoveredJobs,
  updateDiscoveredJobStatus,
  getDiscoveryHistory,
  recordDiscoveryRun,
} from '@/lib/discoveryStorage';

export class LocalCandidateRepository implements ICandidateRepository {
  getProfile() {
    return getCandidateProfile();
  }
  saveProfile(profile: Parameters<typeof saveCandidateProfile>[0]) {
    return saveCandidateProfile(profile);
  }
  resetDemoData() {
    return resetCandidateDemoData();
  }
  clearData() {
    return clearCandidateData();
  }
}

export class LocalOpportunityRepository implements IOpportunityRepository {
  getAll() {
    return getOpportunities();
  }
  getById(id: string) {
    return getOpportunityById(id);
  }
  save(opportunity: Parameters<typeof saveOpportunity>[0]) {
    return saveOpportunity(opportunity);
  }
  create(payload: Parameters<typeof createOpportunity>[0]) {
    return createOpportunity(payload);
  }
  updateStage(id: string, stage: Parameters<typeof updateOpportunityStage>[1]) {
    return updateOpportunityStage(id, stage);
  }
  delete(id: string) {
    return deleteOpportunity(id);
  }
}

export class LocalNetworkRepository implements INetworkRepository {
  getContacts(): NetworkContact[] {
    return getNetworkContacts();
  }
  addContacts(contacts: NetworkContact[]): NetworkContact[] {
    const existing = getNetworkContacts();
    const merged = [...contacts, ...existing];
    saveNetworkContacts(merged);
    return merged;
  }
  updateContact(id: string, updates: Partial<NetworkContact>): NetworkContact | null {
    const contacts = getNetworkContacts();
    let updatedContact: NetworkContact | null = null;
    const updatedList = contacts.map((c) => {
      if (c.id === id) {
        updatedContact = { ...c, ...updates };
        return updatedContact;
      }
      return c;
    });
    if (updatedContact) {
      saveNetworkContacts(updatedList);
    }
    return updatedContact;
  }
  deleteContact(id: string): void {
    const contacts = getNetworkContacts();
    const filtered = contacts.filter((c) => c.id !== id);
    saveNetworkContacts(filtered);
  }
  resetDemoData(): void {
    resetNetworkDemoData();
  }
  clearAll(): void {
    clearNetworkContacts();
  }
}

export class LocalDiscoveryRepository implements IDiscoveryRepository {
  getJobs() {
    return getDiscoveredJobs();
  }
  saveJobs(jobs: Parameters<typeof saveDiscoveredJobs>[0]) {
    return saveDiscoveredJobs(jobs);
  }
  updateStatus(id: string, status: Parameters<typeof updateDiscoveredJobStatus>[1]) {
    return updateDiscoveredJobStatus(id, status);
  }
  getHistory() {
    return getDiscoveryHistory();
  }
  recordRun(run: Parameters<typeof recordDiscoveryRun>[0]) {
    return recordDiscoveryRun(run);
  }
}

// ---------------------------------------------------------------------------
// V3.3 Local Repositories
// ---------------------------------------------------------------------------

const ACTIVITIES_KEY = 'ccc_activities_v1';
const INTERVIEW_PREP_KEY = 'ccc_interview_prep_v1';
const INTERVIEW_SESSIONS_KEY = 'ccc_interview_sessions_v1';

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage quota exceeded — silent
  }
}

export class LocalActivityRepository implements IActivityRepository {
  async getActivities(opportunityId: string): Promise<OpportunityActivity[]> {
    const all = readLocalJson<OpportunityActivity[]>(ACTIVITIES_KEY, []);
    return all
      .filter((a) => a.opportunityId === opportunityId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  async getAllActivities(): Promise<OpportunityActivity[]> {
    return readLocalJson<OpportunityActivity[]>(ACTIVITIES_KEY, [])
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  async recordActivity(activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<OpportunityActivity> {
    const now = new Date().toISOString();
    const entry: OpportunityActivity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    const all = readLocalJson<OpportunityActivity[]>(ACTIVITIES_KEY, []);
    all.unshift(entry);
    writeLocalJson(ACTIVITIES_KEY, all);
    return entry;
  }

  async updateActivity(id: string, updates: Partial<OpportunityActivity>): Promise<OpportunityActivity | null> {
    const all = readLocalJson<OpportunityActivity[]>(ACTIVITIES_KEY, []);
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    writeLocalJson(ACTIVITIES_KEY, all);
    return all[idx];
  }

  async deleteActivity(id: string): Promise<void> {
    const all = readLocalJson<OpportunityActivity[]>(ACTIVITIES_KEY, []);
    writeLocalJson(ACTIVITIES_KEY, all.filter((a) => a.id !== id));
  }
}

export class LocalInterviewPrepRepository implements IInterviewPrepRepository {
  async getActivePrep(opportunityId: string): Promise<InterviewPreparation | null> {
    const all = readLocalJson<InterviewPreparation[]>(INTERVIEW_PREP_KEY, []);
    return all.find((p) => p.opportunityId === opportunityId && p.isActive) || null;
  }

  async savePrep(prep: InterviewPreparation): Promise<InterviewPreparation> {
    const all = readLocalJson<InterviewPreparation[]>(INTERVIEW_PREP_KEY, []);
    // Deactivate previous
    const updated = all.map((p) =>
      p.opportunityId === prep.opportunityId && p.isActive ? { ...p, isActive: false } : p
    );
    updated.unshift({ ...prep, isActive: true });
    writeLocalJson(INTERVIEW_PREP_KEY, updated);
    return prep;
  }

  async getHistory(opportunityId: string): Promise<InterviewPreparation[]> {
    const all = readLocalJson<InterviewPreparation[]>(INTERVIEW_PREP_KEY, []);
    return all.filter((p) => p.opportunityId === opportunityId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  async deletePrep(id: string): Promise<void> {
    const all = readLocalJson<InterviewPreparation[]>(INTERVIEW_PREP_KEY, []);
    writeLocalJson(INTERVIEW_PREP_KEY, all.filter((p) => p.id !== id));
  }
}

export class LocalInterviewSessionRepository implements IInterviewSessionRepository {
  async getSessions(opportunityId: string): Promise<InterviewSession[]> {
    const all = readLocalJson<InterviewSession[]>(INTERVIEW_SESSIONS_KEY, []);
    return all.filter((s) => s.opportunityId === opportunityId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async saveSession(session: InterviewSession): Promise<InterviewSession> {
    const all = readLocalJson<InterviewSession[]>(INTERVIEW_SESSIONS_KEY, []);
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      all[idx] = session;
    } else {
      all.unshift(session);
    }
    writeLocalJson(INTERVIEW_SESSIONS_KEY, all);
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    const all = readLocalJson<InterviewSession[]>(INTERVIEW_SESSIONS_KEY, []);
    writeLocalJson(INTERVIEW_SESSIONS_KEY, all.filter((s) => s.id !== id));
  }
}

export const defaultLocalStorageAdapter: IStorageAdapter = {
  candidates: new LocalCandidateRepository(),
  opportunities: new LocalOpportunityRepository(),
  network: new LocalNetworkRepository(),
  discovery: new LocalDiscoveryRepository(),
  activities: new LocalActivityRepository(),
  interviewPrep: new LocalInterviewPrepRepository(),
  interviewSessions: new LocalInterviewSessionRepository(),
};
