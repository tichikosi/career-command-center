import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity, PipelineStage, OpportunityAction, FitAnalysisReport } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { DiscoveredJob, DiscoveredJobStatus, DiscoveryHistoryItem } from '@/types/discovery';
import { UserPreferences } from '@/types/auth';
import { OpportunityActivity, InterviewPreparation, InterviewSession } from '@/types/interview';

export interface ICandidateRepository {
  getProfile(userId?: string): Promise<CandidateProfile> | CandidateProfile;
  saveProfile(profile: CandidateProfile, userId?: string): Promise<CandidateProfile> | CandidateProfile;
  resetDemoData(userId?: string): Promise<void> | void;
  clearData(userId?: string): Promise<void> | void;
}

export interface IOpportunityRepository {
  getAll(userId?: string): Promise<JobOpportunity[]> | JobOpportunity[];
  getById(id: string, userId?: string): Promise<JobOpportunity | undefined> | (JobOpportunity | undefined);
  save(opportunity: JobOpportunity, userId?: string): Promise<JobOpportunity> | JobOpportunity;
  create(payload: Partial<JobOpportunity>, userId?: string): Promise<JobOpportunity> | JobOpportunity;
  updateStage(id: string, stage: PipelineStage, userId?: string): Promise<JobOpportunity> | JobOpportunity;
  delete(id: string, userId?: string): Promise<void> | void;
  saveAction?(opportunityId: string, action: OpportunityAction, userId?: string): Promise<void> | void;
  toggleAction?(opportunityId: string, actionId: string, userId?: string): Promise<void> | void;
}

export interface INetworkRepository {
  getContacts(userId?: string): Promise<NetworkContact[]> | NetworkContact[];
  addContacts(contacts: NetworkContact[], userId?: string): Promise<NetworkContact[]> | NetworkContact[];
  updateContact(id: string, updates: Partial<NetworkContact>, userId?: string): Promise<NetworkContact | null> | (NetworkContact | null);
  deleteContact(id: string, userId?: string): Promise<void> | void;
  clearAll(userId?: string): Promise<void> | void;
  resetDemoData?(userId?: string): Promise<void> | void;
}

export interface IDiscoveryRepository {
  getJobs(userId?: string): Promise<DiscoveredJob[]> | DiscoveredJob[];
  saveJobs(jobs: DiscoveredJob[], userId?: string): Promise<void> | void;
  updateStatus(id: string, status: DiscoveredJobStatus, userId?: string): Promise<void> | void;
  updateJob?(id: string, updates: Partial<DiscoveredJob>, userId?: string): Promise<DiscoveredJob | null> | (DiscoveredJob | null);
  getHistory(userId?: string): Promise<DiscoveryHistoryItem[]> | DiscoveryHistoryItem[];
  recordRun(run: Omit<DiscoveryHistoryItem, 'id'>, userId?: string): Promise<DiscoveryHistoryItem> | DiscoveryHistoryItem;
}

export interface IAnalysisRepository {
  getReport(opportunityId: string, userId?: string): Promise<FitAnalysisReport | undefined> | (FitAnalysisReport | undefined);
  saveReport(opportunityId: string, report: FitAnalysisReport, userId?: string): Promise<void> | void;
  getHistory(opportunityId: string, userId?: string): Promise<FitAnalysisReport[]> | FitAnalysisReport[];
}

export interface IPreferencesRepository {
  getPreferences(userId?: string): Promise<UserPreferences> | UserPreferences;
  savePreferences(prefs: Partial<UserPreferences>, userId?: string): Promise<UserPreferences> | UserPreferences;
}

export interface IActivityRepository {
  getActivities(opportunityId: string, userId?: string): Promise<OpportunityActivity[]>;
  getAllActivities(userId?: string): Promise<OpportunityActivity[]>;
  recordActivity(activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>, userId?: string): Promise<OpportunityActivity>;
  updateActivity(id: string, updates: Partial<OpportunityActivity>, userId?: string): Promise<OpportunityActivity | null>;
  deleteActivity(id: string, userId?: string): Promise<void>;
}

export interface IInterviewPrepRepository {
  getActivePrep(opportunityId: string, userId?: string): Promise<InterviewPreparation | null>;
  savePrep(prep: InterviewPreparation, userId?: string): Promise<InterviewPreparation>;
  getHistory(opportunityId: string, userId?: string): Promise<InterviewPreparation[]>;
  deletePrep(id: string, userId?: string): Promise<void>;
}

export interface IInterviewSessionRepository {
  getSessions(opportunityId: string, userId?: string): Promise<InterviewSession[]>;
  saveSession(session: InterviewSession, userId?: string): Promise<InterviewSession>;
  deleteSession(id: string, userId?: string): Promise<void>;
}

export interface IStorageAdapter {
  candidates: ICandidateRepository;
  opportunities: IOpportunityRepository;
  network: INetworkRepository;
  discovery: IDiscoveryRepository;
  analysis?: IAnalysisRepository;
  preferences?: IPreferencesRepository;
  activities?: IActivityRepository;
  interviewPrep?: IInterviewPrepRepository;
  interviewSessions?: IInterviewSessionRepository;
}
