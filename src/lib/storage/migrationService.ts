import { IStorageAdapter } from './interfaces';
import { getCandidateProfile } from '@/lib/storage';
import { getOpportunities } from '@/lib/storage';
import { getNetworkContacts } from '@/lib/networkStorage';
import { getDiscoveredJobs, getDiscoveryHistory } from '@/lib/discoveryStorage';
import { MigrationSummary } from '@/types/auth';

const CCC_LOCAL_BACKUP_KEY = 'ccc_local_backup_v1';

export interface LocalDataSnapshot {
  hasLocalData: boolean;
  candidateProfile: boolean;
  opportunitiesCount: number;
  networkContactsCount: number;
  discoveryJobsCount: number;
  discoveryHistoryCount: number;
}

/**
 * Inspects browser localStorage directly to check if local user data exists for migration.
 * Distinguishes user-persisted data from synthetic fallback fixtures.
 */
export function inspectLocalData(): LocalDataSnapshot {
  if (typeof window === 'undefined') {
    return {
      hasLocalData: false,
      candidateProfile: false,
      opportunitiesCount: 0,
      networkContactsCount: 0,
      discoveryJobsCount: 0,
      discoveryHistoryCount: 0,
    };
  }

  const rawProfileStr = window.localStorage.getItem('ccc_candidate_profile_v1');
  const rawOppsStr = window.localStorage.getItem('ccc_opportunities_v1');
  const rawNetworkStr = window.localStorage.getItem('ccc_network_contacts_v1');
  const rawDiscoveryStr = window.localStorage.getItem('ccc_discovery_jobs_v1');
  const rawHistoryStr = window.localStorage.getItem('ccc_discovery_history_v1');

  let hasCandidate = false;
  if (rawProfileStr) {
    try {
      const p = JSON.parse(rawProfileStr);
      hasCandidate = Boolean(p && (p.dataMode === 'user' || p.name));
    } catch {}
  }

  let oppsCount = 0;
  if (rawOppsStr) {
    try {
      const o = JSON.parse(rawOppsStr);
      if (Array.isArray(o)) oppsCount = o.length;
    } catch {}
  }

  let networkCount = 0;
  if (rawNetworkStr) {
    try {
      const n = JSON.parse(rawNetworkStr);
      if (Array.isArray(n)) networkCount = n.length;
    } catch {}
  }

  let discoveryCount = 0;
  if (rawDiscoveryStr) {
    try {
      const d = JSON.parse(rawDiscoveryStr);
      if (Array.isArray(d)) discoveryCount = d.length;
    } catch {}
  }

  let historyCount = 0;
  if (rawHistoryStr) {
    try {
      const h = JSON.parse(rawHistoryStr);
      if (Array.isArray(h)) historyCount = h.length;
    } catch {}
  }

  const hasLocalData = hasCandidate || oppsCount > 0 || networkCount > 0 || discoveryCount > 0;

  return {
    hasLocalData,
    candidateProfile: hasCandidate,
    opportunitiesCount: oppsCount,
    networkContactsCount: networkCount,
    discoveryJobsCount: discoveryCount,
    discoveryHistoryCount: historyCount,
  };
}

/**
 * Creates a safe local JSON snapshot backup in localStorage before migration begins.
 */
export function createLocalBackup(): void {
  if (typeof window === 'undefined') return;

  try {
    const backup = {
      timestamp: new Date().toISOString(),
      profile: getCandidateProfile(),
      opportunities: getOpportunities(),
      network: getNetworkContacts(),
      discovery: getDiscoveredJobs(),
      history: getDiscoveryHistory(),
    };
    window.localStorage.setItem(CCC_LOCAL_BACKUP_KEY, JSON.stringify(backup));
  } catch (err) {
    console.warn('[MigrationService] Failed to create local backup in localStorage:', err);
  }
}

/**
 * Migrates local data into the target cloud storage adapter for an authenticated user.
 * Idempotent, deduplicated, and preserves IDs and provenance.
 */
export async function migrateLocalDataToCloud(
  targetAdapter: IStorageAdapter,
  userId: string
): Promise<MigrationSummary> {
  // Step 1: Create local safety backup
  createLocalBackup();

  const errors: string[] = [];
  let candidateMigrated = false;
  let oppsMigrated = 0;
  let networkMigrated = 0;
  let discoveryMigrated = 0;
  let historyMigrated = 0;

  const rawProfileStr = typeof window !== 'undefined' ? window.localStorage.getItem('ccc_candidate_profile_v1') : null;
  const rawOppsStr = typeof window !== 'undefined' ? window.localStorage.getItem('ccc_opportunities_v1') : null;
  const rawNetworkStr = typeof window !== 'undefined' ? window.localStorage.getItem('ccc_network_contacts_v1') : null;
  const rawDiscoveryStr = typeof window !== 'undefined' ? window.localStorage.getItem('ccc_discovery_jobs_v1') : null;
  const rawHistoryStr = typeof window !== 'undefined' ? window.localStorage.getItem('ccc_discovery_history_v1') : null;

  // Step 2: Candidate Profile Migration
  if (rawProfileStr) {
    try {
      const localProfile = JSON.parse(rawProfileStr);
      if (localProfile) {
        await targetAdapter.candidates.saveProfile(localProfile, userId);
        candidateMigrated = true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Candidate Profile Migration Error: ${msg}`);
    }
  }

  // Step 3: Opportunities Migration
  if (rawOppsStr) {
    try {
      const localOpps = JSON.parse(rawOppsStr);
      if (Array.isArray(localOpps) && localOpps.length > 0) {
        for (const opp of localOpps) {
          await targetAdapter.opportunities.save(opp, userId);
          oppsMigrated++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Opportunities Migration Error: ${msg}`);
    }
  }

  // Step 4: Network Contacts Migration (Chunked batching for 3,400+ contacts)
  if (rawNetworkStr) {
    try {
      const localContacts = JSON.parse(rawNetworkStr);
      if (Array.isArray(localContacts) && localContacts.length > 0) {
        await targetAdapter.network.addContacts(localContacts, userId);
        networkMigrated = localContacts.length;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Network Contacts Migration Error: ${msg}`);
    }
  }

  // Step 5: Discovery Jobs Migration
  if (rawDiscoveryStr) {
    try {
      const localDiscovery = JSON.parse(rawDiscoveryStr);
      if (Array.isArray(localDiscovery) && localDiscovery.length > 0) {
        await targetAdapter.discovery.saveJobs(localDiscovery, userId);
        discoveryMigrated = localDiscovery.length;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Discovery Jobs Migration Error: ${msg}`);
    }
  }

  // Step 6: Discovery History Migration
  if (rawHistoryStr) {
    try {
      const localHistory = JSON.parse(rawHistoryStr);
      if (Array.isArray(localHistory) && localHistory.length > 0) {
        for (const item of localHistory) {
          await targetAdapter.discovery.recordRun(item, userId);
          historyMigrated++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Discovery History Migration Error: ${msg}`);
    }
  }

  // Step 7: Update Preferences Migration Status
  if (targetAdapter.preferences) {
    try {
      await targetAdapter.preferences.savePreferences(
        {
          migrationCompleted: true,
          migrationCompletedAt: new Date().toISOString(),
        },
        userId
      );
    } catch {
      // Non-blocking
    }
  }

  const status = errors.length === 0 ? 'success' : oppsMigrated > 0 || networkMigrated > 0 ? 'partial' : 'failed';

  return {
    candidateProfileMigrated: candidateMigrated,
    opportunitiesCount: oppsMigrated,
    networkContactsCount: networkMigrated,
    discoveryJobsCount: discoveryMigrated,
    discoveryHistoryCount: historyMigrated,
    analysisReportsCount: 0,
    timestamp: new Date().toISOString(),
    status,
    errors: errors.length > 0 ? errors : undefined,
  };
}
