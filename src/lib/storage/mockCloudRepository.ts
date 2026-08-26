import {
  ICandidateRepository,
  IOpportunityRepository,
  INetworkRepository,
  IDiscoveryRepository,
  IPreferencesRepository,
  IActivityRepository,
  IInterviewPrepRepository,
  IInterviewSessionRepository,
  IStorageAdapter,
} from './interfaces';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity, PipelineStage, OpportunityAction, FitAnalysisReport } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { DiscoveredJob, DiscoveredJobStatus, DiscoveryHistoryItem } from '@/types/discovery';
import { UserPreferences } from '@/types/auth';
import { OpportunityActivity, InterviewPreparation, InterviewSession } from '@/types/interview';

/**
 * Deterministic In-Memory Cloud Storage Adapter for Unit Testing & Isolation.
 * Allows multiple user IDs with separate state stores.
 */
export class MockCloudStorageAdapter implements IStorageAdapter {
  public candidateProfiles = new Map<string, CandidateProfile>();
  public opportunitiesMap = new Map<string, JobOpportunity[]>();
  public contactsMap = new Map<string, NetworkContact[]>();
  public discoveryJobsMap = new Map<string, DiscoveredJob[]>();
  public discoveryHistoryMap = new Map<string, DiscoveryHistoryItem[]>();
  public userPreferences = new Map<string, UserPreferences>();
  public actions = new Map<string, (OpportunityAction & { opportunityId: string; userId: string })[]>();
  public activitiesMap = new Map<string, OpportunityActivity[]>();
  public interviewPrepMap = new Map<string, InterviewPreparation[]>();
  public interviewSessionsMap = new Map<string, InterviewSession[]>();

  public candidates: ICandidateRepository;
  public opportunities: IOpportunityRepository;
  public network: INetworkRepository;
  public discovery: IDiscoveryRepository;
  public preferences: IPreferencesRepository;
  public activities: IActivityRepository;
  public interviewPrep: IInterviewPrepRepository;
  public interviewSessions: IInterviewSessionRepository;

  constructor() {
    this.candidates = {
      getProfile: async (userId = 'default-user'): Promise<CandidateProfile> => {
        let p = this.candidateProfiles.get(userId);
        if (!p) {
          for (const cand of this.candidateProfiles.values()) {
            if (cand.id === userId) {
              p = cand;
              break;
            }
          }
        }
        if (p) return JSON.parse(JSON.stringify(p));
        return {
          id: `cand-${userId}`,
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
      },
      saveProfile: async (profile: CandidateProfile, userId = 'default-user'): Promise<CandidateProfile> => {
        const clone = JSON.parse(JSON.stringify(profile));
        this.candidateProfiles.set(userId, clone);
        return clone;
      },
      resetDemoData: async (userId = 'default-user'): Promise<void> => {
        this.candidateProfiles.delete(userId);
      },
      clearData: async (userId = 'default-user'): Promise<void> => {
        this.candidateProfiles.delete(userId);
      },
    };

    this.opportunities = {
      getAll: async (userId = 'default-user'): Promise<JobOpportunity[]> => {
        const opps = this.opportunitiesMap.get(userId) || [];
        return JSON.parse(JSON.stringify(opps));
      },
      getById: async (id: string, userId = 'default-user'): Promise<JobOpportunity | undefined> => {
        const opps = this.opportunitiesMap.get(userId) || [];
        const found = opps.find((o) => o.id === id);
        return found ? JSON.parse(JSON.stringify(found)) : undefined;
      },
      save: async (opportunity: JobOpportunity, userId = 'default-user'): Promise<JobOpportunity> => {
        const list = this.opportunitiesMap.get(userId) || [];
        const index = list.findIndex((o) => o.id === opportunity.id);
        const clone = JSON.parse(JSON.stringify(opportunity));
        if (index >= 0) {
          list[index] = clone;
        } else {
          list.push(clone);
        }
        this.opportunitiesMap.set(userId, list);
        return clone;
      },
      create: async (payload: Partial<JobOpportunity>, userId = 'default-user'): Promise<JobOpportunity> => {
        const defaultAnalysis: FitAnalysisReport = {
          overallFitScore: 70,
          scoreExplanation: 'Initial role alignment analysis',
          recommendation: 'Monitor',
          executiveSummary: payload.notes || `${payload.title || 'Role'} at ${payload.company || 'Company'}`,
          likelyMandate: 'Executive Strategy & Operations',
          keyRequirements: [],
          positioningNarrative: '',
          qualifications: [],
          objections: [],
          recruiterQuestions: [],
          hiringManagerQuestions: [],
          recommendedStarStories: [],
          nextActions: [],
        };

        const item: JobOpportunity = {
          id: payload.id || `opp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          company: payload.company || 'Unknown',
          title: payload.title || 'Untitled',
          location: payload.location || '',
          compensation: payload.compensation,
          sourceUrl: payload.sourceUrl,
          applicationUrl: payload.applicationUrl,
          rawJobDescription: payload.rawJobDescription || '',
          stage: payload.stage || 'Identified',
          priority: payload.priority || 'Medium',
          notes: payload.notes || '',
          verificationStatus: payload.verificationStatus,
          verifiedAt: payload.verifiedAt,
          sourceDomain: payload.sourceDomain,
          analysis: payload.analysis || defaultAnalysis,
          actions: payload.actions || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return this.opportunities.save(item, userId);
      },
      updateStage: async (id: string, stage: PipelineStage, userId = 'default-user'): Promise<JobOpportunity> => {
        const opp = await this.opportunities.getById(id, userId);
        if (!opp) throw new Error(`Not found: ${id}`);
        opp.stage = stage;
        opp.updatedAt = new Date().toISOString();
        return this.opportunities.save(opp, userId);
      },
      delete: async (id: string, userId = 'default-user'): Promise<void> => {
        const list = this.opportunitiesMap.get(userId) || [];
        this.opportunitiesMap.set(
          userId,
          list.filter((o) => o.id !== id)
        );
      },
      saveAction: async (opportunityId: string, action: OpportunityAction, userId = 'default-user'): Promise<void> => {
        const current = this.actions.get(userId) || [];
        const index = current.findIndex((a) => a.id === action.id);
        const entry = { ...action, opportunityId, userId };
        if (index >= 0) {
          current[index] = entry;
        } else {
          current.push(entry);
        }
        this.actions.set(userId, current);
      },
    };

    this.network = {
      getContacts: async (userId = 'default-user'): Promise<NetworkContact[]> => {
        const list = this.contactsMap.get(userId) || [];
        return JSON.parse(JSON.stringify(list));
      },
      addContacts: async (contacts: NetworkContact[], userId = 'default-user'): Promise<NetworkContact[]> => {
        const list = this.contactsMap.get(userId) || [];
        const clones: NetworkContact[] = JSON.parse(JSON.stringify(contacts));
        const contactMap = new Map<string, NetworkContact>();
        list.forEach((c) => contactMap.set(c.id, c));
        clones.forEach((c) => contactMap.set(c.id, c));
        const merged = Array.from(contactMap.values());
        this.contactsMap.set(userId, merged);
        return clones;
      },
      updateContact: async (id: string, updates: Partial<NetworkContact>, userId = 'default-user'): Promise<NetworkContact | null> => {
        const list = this.contactsMap.get(userId) || [];
        const idx = list.findIndex((c) => c.id === id);
        if (idx === -1) return null;
        const updated = { ...list[idx], ...updates };
        list[idx] = updated;
        this.contactsMap.set(userId, list);
        return JSON.parse(JSON.stringify(updated));
      },
      deleteContact: async (id: string, userId = 'default-user'): Promise<void> => {
        const list = this.contactsMap.get(userId) || [];
        this.contactsMap.set(
          userId,
          list.filter((c) => c.id !== id)
        );
      },
      clearAll: async (userId = 'default-user'): Promise<void> => {
        this.contactsMap.delete(userId);
      },
    };

    this.discovery = {
      getJobs: async (userId = 'default-user'): Promise<DiscoveredJob[]> => {
        const list = this.discoveryJobsMap.get(userId) || [];
        return JSON.parse(JSON.stringify(list));
      },
      saveJobs: async (jobs: DiscoveredJob[], userId = 'default-user'): Promise<void> => {
        const clones: DiscoveredJob[] = JSON.parse(JSON.stringify(jobs));
        this.discoveryJobsMap.set(userId, clones);
      },
      updateStatus: async (id: string, status: DiscoveredJobStatus, userId = 'default-user'): Promise<void> => {
        const list = this.discoveryJobsMap.get(userId) || [];
        const found = list.find((j) => j.id === id);
        if (found) {
          found.status = status;
        }
      },
      updateJob: async (id: string, updates: Partial<DiscoveredJob>, userId = 'default-user'): Promise<DiscoveredJob | null> => {
        const list = this.discoveryJobsMap.get(userId) || [];
        const idx = list.findIndex((j) => j.id === id);
        if (idx === -1) return null;
        const updated = { ...list[idx], ...updates };
        list[idx] = updated;
        return JSON.parse(JSON.stringify(updated));
      },
      getHistory: async (userId = 'default-user'): Promise<DiscoveryHistoryItem[]> => {
        const list = this.discoveryHistoryMap.get(userId) || [];
        return JSON.parse(JSON.stringify(list));
      },
      recordRun: async (run: Omit<DiscoveryHistoryItem, 'id'>, userId = 'default-user'): Promise<DiscoveryHistoryItem> => {
        const list = this.discoveryHistoryMap.get(userId) || [];
        const item: DiscoveryHistoryItem = {
          id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...run,
        };
        list.unshift(item);
        this.discoveryHistoryMap.set(userId, list);
        return JSON.parse(JSON.stringify(item));
      },
    };

    this.preferences = {
      getPreferences: async (userId = 'default-user'): Promise<UserPreferences> => {
        const pref = this.userPreferences.get(userId);
        if (pref) return JSON.parse(JSON.stringify(pref));
        return {
          userId,
          discoveryEnabled: true,
          discoveryCadence: 'daily_weekday',
          emailNotificationsEnabled: false,
          migrationCompleted: false,
        };
      },
      savePreferences: async (prefs: Partial<UserPreferences>, userId = 'default-user'): Promise<UserPreferences> => {
        const current = await this.preferences.getPreferences(userId);
        const updated: UserPreferences = {
          ...current,
          ...prefs,
          userId,
          updatedAt: new Date().toISOString(),
        };
        this.userPreferences.set(userId, updated);
        return JSON.parse(JSON.stringify(updated));
      },
    };

    // V3.3 Repositories
    this.activities = {
      getActivities: async (opportunityId: string, userId = 'default-user'): Promise<OpportunityActivity[]> => {
        const key = `${userId}:${opportunityId}`;
        return JSON.parse(JSON.stringify(this.activitiesMap.get(key) || []));
      },
      getAllActivities: async (userId = 'default-user'): Promise<OpportunityActivity[]> => {
        const result: OpportunityActivity[] = [];
        for (const [key, acts] of this.activitiesMap.entries()) {
          if (key.startsWith(`${userId}:`)) result.push(...acts);
        }
        return JSON.parse(JSON.stringify(result.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())));
      },
      recordActivity: async (activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>, userId = 'default-user'): Promise<OpportunityActivity> => {
        const now = new Date().toISOString();
        const entry: OpportunityActivity = {
          ...activity,
          id: `act-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now,
          updatedAt: now,
        };
        const key = `${userId}:${activity.opportunityId}`;
        const existing = this.activitiesMap.get(key) || [];
        existing.unshift(entry);
        this.activitiesMap.set(key, existing);
        return JSON.parse(JSON.stringify(entry));
      },
      updateActivity: async (id: string, updates: Partial<OpportunityActivity>, userId = 'default-user'): Promise<OpportunityActivity | null> => {
        for (const [key, acts] of this.activitiesMap.entries()) {
          if (!key.startsWith(`${userId}:`)) continue;
          const idx = acts.findIndex((a) => a.id === id);
          if (idx >= 0) {
            acts[idx] = { ...acts[idx], ...updates, updatedAt: new Date().toISOString() };
            return JSON.parse(JSON.stringify(acts[idx]));
          }
        }
        return null;
      },
      deleteActivity: async (id: string, userId = 'default-user'): Promise<void> => {
        for (const [key, acts] of this.activitiesMap.entries()) {
          if (!key.startsWith(`${userId}:`)) continue;
          const idx = acts.findIndex((a) => a.id === id);
          if (idx >= 0) {
            acts.splice(idx, 1);
            return;
          }
        }
      },
    };

    this.interviewPrep = {
      getActivePrep: async (opportunityId: string, userId = 'default-user'): Promise<InterviewPreparation | null> => {
        const key = `${userId}:${opportunityId}`;
        const preps = this.interviewPrepMap.get(key) || [];
        const active = preps.find((p) => p.isActive);
        return active ? JSON.parse(JSON.stringify(active)) : null;
      },
      savePrep: async (prep: InterviewPreparation, userId = 'default-user'): Promise<InterviewPreparation> => {
        const key = `${userId}:${prep.opportunityId}`;
        const existing = this.interviewPrepMap.get(key) || [];
        existing.forEach((p) => { p.isActive = false; });
        existing.unshift({ ...prep, isActive: true });
        this.interviewPrepMap.set(key, existing);
        return JSON.parse(JSON.stringify(prep));
      },
      getHistory: async (opportunityId: string, userId = 'default-user'): Promise<InterviewPreparation[]> => {
        const key = `${userId}:${opportunityId}`;
        return JSON.parse(JSON.stringify(this.interviewPrepMap.get(key) || []));
      },
      deletePrep: async (id: string, userId = 'default-user'): Promise<void> => {
        for (const [key, preps] of this.interviewPrepMap.entries()) {
          if (!key.startsWith(`${userId}:`)) continue;
          const idx = preps.findIndex((p) => p.id === id);
          if (idx >= 0) { preps.splice(idx, 1); return; }
        }
      },
    };

    this.interviewSessions = {
      getSessions: async (opportunityId: string, userId = 'default-user'): Promise<InterviewSession[]> => {
        const key = `${userId}:${opportunityId}`;
        return JSON.parse(JSON.stringify(this.interviewSessionsMap.get(key) || []));
      },
      saveSession: async (session: InterviewSession, userId = 'default-user'): Promise<InterviewSession> => {
        const key = `${userId}:${session.opportunityId}`;
        const existing = this.interviewSessionsMap.get(key) || [];
        const idx = existing.findIndex((s) => s.id === session.id);
        if (idx >= 0) existing[idx] = session;
        else existing.unshift(session);
        this.interviewSessionsMap.set(key, existing);
        return JSON.parse(JSON.stringify(session));
      },
      deleteSession: async (id: string, userId = 'default-user'): Promise<void> => {
        for (const [key, sessions] of this.interviewSessionsMap.entries()) {
          if (!key.startsWith(`${userId}:`)) continue;
          const idx = sessions.findIndex((s) => s.id === id);
          if (idx >= 0) { sessions.splice(idx, 1); return; }
        }
      },
    };
  }
}
