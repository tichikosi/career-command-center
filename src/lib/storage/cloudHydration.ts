import { getActiveStorageAdapter } from './repositoryManager';
import {
  hydrateCandidateProfileFromCloud,
  hydrateOpportunitiesFromCloud,
  getCandidateProfile,
  clearCandidateData,
  resetCandidateDemoData,
} from '@/lib/storage';
import { isSyntheticOrDemoProfile } from './migrationService';
import { saveNetworkContacts, resetNetworkDemoData } from '@/lib/networkStorage';
import { saveDiscoveredJobs, resetDiscoveryDemoData } from '@/lib/discoveryStorage';

export interface CloudHydrationResult {
  hasCloudData: boolean;
  hasCloudCandidate: boolean;
  oppsCount: number;
  contactsCount: number;
  jobsCount: number;
}

/**
 * Hydrates active client state from Supabase cloud repositories for an authenticated user.
 * Guarantees that cloud data becomes the authoritative source of truth, suppressing demo fallbacks.
 */
export async function hydrateCloudStateForUser(userId: string): Promise<CloudHydrationResult> {
  if (!userId || userId === 'local-executive-user') {
    return {
      hasCloudData: false,
      hasCloudCandidate: false,
      oppsCount: 0,
      contactsCount: 0,
      jobsCount: 0,
    };
  }

  const adapter = getActiveStorageAdapter();

  try {
    const [cloudCandidate, cloudOpps, cloudContacts, cloudJobs] = await Promise.all([
      Promise.resolve(adapter.candidates.getProfile(userId)).catch((err) => {
        console.warn('[CloudHydration] Candidate fetch notice:', err);
        return null;
      }),
      Promise.resolve(adapter.opportunities.getAll(userId)).catch((err) => {
        console.warn('[CloudHydration] Opportunities fetch notice:', err);
        return [];
      }),
      Promise.resolve(adapter.network.getContacts(userId)).catch((err) => {
        console.warn('[CloudHydration] Network fetch notice:', err);
        return [];
      }),
      Promise.resolve(adapter.discovery.getJobs(userId)).catch((err) => {
        console.warn('[CloudHydration] Discovery fetch notice:', err);
        return [];
      }),
    ]);

    const hasCloudCandidate = Boolean(cloudCandidate && cloudCandidate.name && !isSyntheticOrDemoProfile(cloudCandidate));
    const oppsCount = cloudOpps ? cloudOpps.length : 0;
    const contactsCount = cloudContacts ? cloudContacts.length : 0;
    const jobsCount = cloudJobs ? cloudJobs.length : 0;
    const hasCloudData = hasCloudCandidate || oppsCount > 0 || contactsCount > 0 || jobsCount > 0;

    // 1. Authoritative Candidate Profile Resolution
    if (hasCloudCandidate && cloudCandidate) {
      hydrateCandidateProfileFromCloud(cloudCandidate);
    } else {
      // Cloud candidate is empty for this authenticated account.
      // If local storage is currently holding the synthetic Alex Vance demo, clear it so the authenticated user sees clean onboarding.
      const currentLocal = getCandidateProfile();
      if (isSyntheticOrDemoProfile(currentLocal)) {
        clearCandidateData();
      }
    }

    // 2. Opportunities Resolution
    if (cloudOpps && cloudOpps.length > 0) {
      hydrateOpportunitiesFromCloud(cloudOpps);
    }

    // 3. Network Contacts Resolution
    if (cloudContacts && cloudContacts.length > 0) {
      saveNetworkContacts(cloudContacts);
    }

    // 4. Discovery Jobs Resolution
    if (cloudJobs && cloudJobs.length > 0) {
      saveDiscoveredJobs(cloudJobs);
    }

    // 5. Mark cloud data as authoritative in local storage so migration banner is not falsely prompted
    if (hasCloudData && typeof window !== 'undefined') {
      window.localStorage.setItem(`ccc_migrated_${userId}`, 'true');
    }

    return {
      hasCloudData,
      hasCloudCandidate,
      oppsCount,
      contactsCount,
      jobsCount,
    };
  } catch (err) {
    console.error('[CloudHydration] Error during cloud state hydration:', err);
    return {
      hasCloudData: false,
      hasCloudCandidate: false,
      oppsCount: 0,
      contactsCount: 0,
      jobsCount: 0,
    };
  }
}

/**
 * Resets local client state back to clean demo baseline on user sign-out.
 */
export function resetStateOnSignOut(): void {
  resetCandidateDemoData();
  resetNetworkDemoData();
  resetDiscoveryDemoData();
}
