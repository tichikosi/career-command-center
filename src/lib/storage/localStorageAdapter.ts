import {
  ICandidateRepository,
  IOpportunityRepository,
  INetworkRepository,
  IDiscoveryRepository,
  IStorageAdapter,
} from './interfaces';
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
  getContacts() {
    return getNetworkContacts();
  }
  addContacts(contacts: Parameters<typeof saveNetworkContacts>[0]) {
    const existing = getNetworkContacts();
    const merged = [...contacts, ...existing];
    saveNetworkContacts(merged);
    return merged;
  }
  updateContact(id: string, updates: Partial<Parameters<typeof saveNetworkContacts>[0][0]>) {
    const contacts = getNetworkContacts();
    let updatedContact: Parameters<typeof saveNetworkContacts>[0][0] | null = null;
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
  deleteContact(id: string) {
    const contacts = getNetworkContacts();
    const filtered = contacts.filter((c) => c.id !== id);
    saveNetworkContacts(filtered);
  }
  resetDemoData() {
    return resetNetworkDemoData();
  }
  clearAll() {
    return clearNetworkContacts();
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

export const defaultLocalStorageAdapter: IStorageAdapter = {
  candidates: new LocalCandidateRepository(),
  opportunities: new LocalOpportunityRepository(),
  network: new LocalNetworkRepository(),
  discovery: new LocalDiscoveryRepository(),
};
