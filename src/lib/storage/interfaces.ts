import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity, PipelineStage } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { DiscoveredJob, DiscoveredJobStatus, DiscoveryHistoryItem } from '@/types/discovery';

export interface ICandidateRepository {
  getProfile(): Promise<CandidateProfile> | CandidateProfile;
  saveProfile(profile: CandidateProfile): Promise<CandidateProfile> | CandidateProfile;
  resetDemoData(): Promise<void> | void;
  clearData(): Promise<void> | void;
}

export interface IOpportunityRepository {
  getAll(): Promise<JobOpportunity[]> | JobOpportunity[];
  getById(id: string): Promise<JobOpportunity | undefined> | (JobOpportunity | undefined);
  save(opportunity: JobOpportunity): Promise<JobOpportunity> | JobOpportunity;
  create(payload: Partial<JobOpportunity>): Promise<JobOpportunity> | JobOpportunity;
  updateStage(id: string, stage: PipelineStage): Promise<JobOpportunity> | JobOpportunity;
  delete(id: string): Promise<void> | void;
}

export interface INetworkRepository {
  getContacts(): Promise<NetworkContact[]> | NetworkContact[];
  addContacts(contacts: NetworkContact[]): Promise<NetworkContact[]> | NetworkContact[];
  updateContact(id: string, updates: Partial<NetworkContact>): Promise<NetworkContact | null> | (NetworkContact | null);
  deleteContact(id: string): Promise<void> | void;
  clearAll(): Promise<void> | void;
}

export interface IDiscoveryRepository {
  getJobs(): Promise<DiscoveredJob[]> | DiscoveredJob[];
  saveJobs(jobs: DiscoveredJob[]): Promise<void> | void;
  updateStatus(id: string, status: DiscoveredJobStatus): Promise<void> | void;
  getHistory(): Promise<DiscoveryHistoryItem[]> | DiscoveryHistoryItem[];
  recordRun(run: Omit<DiscoveryHistoryItem, 'id'>): Promise<DiscoveryHistoryItem> | DiscoveryHistoryItem;
}

export interface IStorageAdapter {
  candidates: ICandidateRepository;
  opportunities: IOpportunityRepository;
  network: INetworkRepository;
  discovery: IDiscoveryRepository;
}
