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

/**
 * Hydrates active client state from Supabase cloud repositories for an authenticated user.
 * Guarantees that cloud data becomes the authoritative source of truth, suppressing demo fallbacks.
 */
export async function hydrateCloudStateForUser(userId: string): Promise<void> {
  if (!userId || userId === 'local-executive-user') return;

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

    // 1. Authoritative Candidate Profile Resolution
    if (cloudCandidate && cloudCandidate.name && !isSyntheticOrDemoProfile(cloudCandidate)) {
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
  } catch (err) {
    console.error('[CloudHydration] Error during cloud state hydration:', err);
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
