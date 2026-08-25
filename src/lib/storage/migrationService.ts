import { IStorageAdapter } from './interfaces';
import { getCandidateProfile, CCC_CANDIDATE_KEY } from '@/lib/storage';
import { getOpportunities } from '@/lib/storage';
import { getNetworkContacts, NETWORK_STORAGE_KEY, normalizeNetworkContact } from '@/lib/networkStorage';
import { getDiscoveredJobs, getDiscoveryHistory, CCC_DISCOVERY_JOBS_KEY, CCC_DISCOVERY_HISTORY_KEY } from '@/lib/discoveryStorage';
import { MigrationSummary } from '@/types/auth';
import { JobOpportunity } from '@/types/opportunity';
import { DiscoveredJob } from '@/types/discovery';
import { NetworkContact } from '@/types/network';

const CCC_LOCAL_BACKUP_KEY = 'ccc_local_backup_v1';
const CCC_OPPORTUNITIES_KEY = 'ccc_opportunities_v1';

export interface LocalDataSnapshot {
  hasLocalData: boolean;
  candidateProfile: boolean;
  opportunitiesCount: number;
  networkContactsCount: number;
  discoveryJobsCount: number;
  discoveryHistoryCount: number;
}

export interface MigrationProgressUpdate {
  phase:
    | 'backup'
    | 'candidate'
    | 'opportunities'
    | 'network'
    | 'discovery'
    | 'history'
    | 'preferences'
    | 'verifying'
    | 'completed'
    | 'failed';
  stepDescription: string;
  candidateProgress?: { current: number; total: number };
  opportunitiesProgress?: { current: number; total: number };
  networkProgress?: { current: number; total: number };
  discoveryProgress?: { current: number; total: number };
  errors?: string[];
}

/**
 * Guard to identify synthetic or demo candidate profiles that should NOT be migrated into real cloud accounts.
 * Note: Only filters out default demo identity ("Alex Vance") or synthetic data mode.
 * Does NOT filter out customized user profiles that originated from a default ID.
 */
export function isSyntheticOrDemoProfile(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return true;
  const p = profile as Record<string, unknown>;
  if (p.dataMode === 'synthetic') return true;
  if (p.name === 'Alex Vance' || p.name === 'Executive Candidate') return true;
  if (!p.name || typeof p.name !== 'string' || !p.name.trim()) return true;
  return false;
}

/**
 * Guard to identify synthetic demo opportunities.
 */
export function isSyntheticOrDemoOpportunity(opp: unknown): boolean {
  if (!opp || typeof opp !== 'object') return true;
  const o = opp as Record<string, unknown>;
  if (o.source === 'synthetic_benchmark') return true;
  return false;
}

/**
 * Guard to identify synthetic demo network contacts.
 */
export function isSyntheticOrDemoContact(contact: unknown): boolean {
  if (!contact || typeof contact !== 'object') return true;
  const c = contact as Record<string, unknown>;
  if (typeof c.id === 'string' && c.id.startsWith('cont-seed-')) return true;
  return false;
}

/**
 * Guard to identify synthetic demo discovery jobs.
 */
export function isSyntheticOrDemoJob(job: unknown): boolean {
  if (!job || typeof job !== 'object') return true;
  const j = job as Record<string, unknown>;
  if (j.source === 'Curated Demo Fixture' || j.sourceDomain === 'demo.internal') return true;
  return false;
}

/**
 * Inspects browser localStorage directly to check if legitimate user data exists for migration.
 * Excludes synthetic demo fallback fixtures so new/incognito accounts do not prompt false migrations.
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

  const rawProfileStr =
    window.localStorage.getItem(CCC_CANDIDATE_KEY) ||
    window.localStorage.getItem('ccc_candidate_profile_v1');
  const rawOppsStr = window.localStorage.getItem(CCC_OPPORTUNITIES_KEY);
  const rawNetworkStr =
    window.localStorage.getItem(NETWORK_STORAGE_KEY) ||
    window.localStorage.getItem('ccc_network_contacts_v1');
  const rawDiscoveryStr = window.localStorage.getItem(CCC_DISCOVERY_JOBS_KEY);
  const rawHistoryStr = window.localStorage.getItem(CCC_DISCOVERY_HISTORY_KEY);

  let hasCandidate = false;
  if (rawProfileStr) {
    try {
      const p = JSON.parse(rawProfileStr);
      hasCandidate = !isSyntheticOrDemoProfile(p) && Boolean(p.name && (p.dataMode === 'user' || (p.targetRoles && p.targetRoles.length > 0)));
    } catch {}
  }

  let oppsCount = 0;
  if (rawOppsStr) {
    try {
      const o = JSON.parse(rawOppsStr);
      if (Array.isArray(o)) {
        const realOpps = o.filter((item) => !isSyntheticOrDemoOpportunity(item));
        oppsCount = realOpps.length;
      }
    } catch {}
  }

  let networkCount = 0;
  if (rawNetworkStr) {
    try {
      const n = JSON.parse(rawNetworkStr);
      if (Array.isArray(n)) {
        const realContacts = n.filter((item) => !isSyntheticOrDemoContact(item));
        networkCount = realContacts.length;
      }
    } catch {}
  }

  let discoveryCount = 0;
  if (rawDiscoveryStr) {
    try {
      const d = JSON.parse(rawDiscoveryStr);
      if (Array.isArray(d)) {
        const realJobs = d.filter((item) => !isSyntheticOrDemoJob(item));
        discoveryCount = realJobs.length;
      }
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
 * Features resumable category-aware skipping for already verified categories,
 * granular progress callbacks, strict error catching, chunked batching,
 * and post-write cloud read-back verification against migratable expected sets.
 */
export async function migrateLocalDataToCloud(
  targetAdapter: IStorageAdapter,
  userId: string,
  onProgress?: (update: MigrationProgressUpdate) => void
): Promise<MigrationSummary> {
  const errors: string[] = [];

  // Step 1: Create local safety backup
  onProgress?.({
    phase: 'backup',
    stepDescription: 'Creating safe local backup...',
  });
  createLocalBackup();

  let candidateMigrated = false;
  let oppsMigrated = 0;
  let networkMigrated = 0;
  let discoveryMigrated = 0;
  let historyMigrated = 0;

  const rawProfileStr =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(CCC_CANDIDATE_KEY) ||
        window.localStorage.getItem('ccc_candidate_profile_v1')
      : null;
  const rawOppsStr =
    typeof window !== 'undefined' ? window.localStorage.getItem(CCC_OPPORTUNITIES_KEY) : null;
  const rawNetworkStr =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(NETWORK_STORAGE_KEY) ||
        window.localStorage.getItem('ccc_network_contacts_v1')
      : null;
  const rawDiscoveryStr =
    typeof window !== 'undefined' ? window.localStorage.getItem(CCC_DISCOVERY_JOBS_KEY) : null;
  const rawHistoryStr =
    typeof window !== 'undefined' ? window.localStorage.getItem(CCC_DISCOVERY_HISTORY_KEY) : null;

  // Pre-calculate expected migratable numbers
  let expectedMigratableCandidate = false;
  let localCandidateProfileObj: Record<string, unknown> | null = null;
  if (rawProfileStr) {
    try {
      const p = JSON.parse(rawProfileStr);
      if (p && !isSyntheticOrDemoProfile(p)) {
        expectedMigratableCandidate = true;
        localCandidateProfileObj = p;
      }
    } catch {}
  }

  let realOpps: JobOpportunity[] = [];
  if (rawOppsStr) {
    try {
      const o = JSON.parse(rawOppsStr);
      if (Array.isArray(o)) {
        realOpps = o.filter((item: JobOpportunity) => !isSyntheticOrDemoOpportunity(item));
      }
    } catch {}
  }
  const expectedMigratableOpps = realOpps.length;

  let realContacts: NetworkContact[] = [];
  if (rawNetworkStr) {
    try {
      const n = JSON.parse(rawNetworkStr);
      if (Array.isArray(n)) {
        realContacts = n
          .filter((c: NetworkContact) => !isSyntheticOrDemoContact(c))
          .map(normalizeNetworkContact);
      }
    } catch {}
  }
  const expectedMigratableContacts = realContacts.length;

  let realJobs: DiscoveredJob[] = [];
  if (rawDiscoveryStr) {
    try {
      const d = JSON.parse(rawDiscoveryStr);
      if (Array.isArray(d)) {
        realJobs = d.filter((j: DiscoveredJob) => !isSyntheticOrDemoJob(j));
      }
    } catch {}
  }
  const expectedMigratableJobs = realJobs.length;

  // Pre-flight check: identify categories already verified in cloud to enable instant resume
  let alreadyVerifiedCandidate = false;
  let alreadyVerifiedOpps = false;
  let alreadyVerifiedNetwork = false;
  let alreadyVerifiedDiscovery = false;

  try {
    const [existingProfile, existingOpps, existingContacts, existingJobs] = await Promise.all([
      Promise.resolve(targetAdapter.candidates.getProfile(userId)).catch(() => null),
      Promise.resolve(targetAdapter.opportunities.getAll(userId)).catch(() => []),
      Promise.resolve(targetAdapter.network.getContacts(userId)).catch(() => []),
      Promise.resolve(targetAdapter.discovery.getJobs(userId)).catch(() => []),
    ]);

    if (
      expectedMigratableCandidate &&
      existingProfile &&
      existingProfile.name &&
      !isSyntheticOrDemoProfile(existingProfile)
    ) {
      alreadyVerifiedCandidate = true;
    }
    if (expectedMigratableOpps > 0 && existingOpps.length >= expectedMigratableOpps) {
      alreadyVerifiedOpps = true;
    }
    if (
      expectedMigratableContacts > 0 &&
      existingContacts.length >= Math.min(expectedMigratableContacts, 1000)
    ) {
      alreadyVerifiedNetwork = true;
    }
    if (expectedMigratableJobs > 0 && existingJobs.length >= expectedMigratableJobs) {
      alreadyVerifiedDiscovery = true;
    }
  } catch {
    // Non-blocking pre-check
  }

  // Step 2: Candidate Profile Migration
  if (expectedMigratableCandidate && localCandidateProfileObj) {
    if (alreadyVerifiedCandidate) {
      candidateMigrated = true;
      onProgress?.({
        phase: 'candidate',
        stepDescription: 'Candidate profile already verified in cloud.',
        candidateProgress: { current: 1, total: 1 },
      });
    } else {
      try {
        onProgress?.({
          phase: 'candidate',
          stepDescription: `Migrating candidate profile for ${localCandidateProfileObj.name}...`,
          candidateProgress: { current: 0, total: 1 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await targetAdapter.candidates.saveProfile(localCandidateProfileObj as any, userId);
        candidateMigrated = true;
        onProgress?.({
          phase: 'candidate',
          stepDescription: 'Candidate profile migrated successfully.',
          candidateProgress: { current: 1, total: 1 },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Candidate Profile: ${msg}`);
      }
    }
  }

  // Step 3: Opportunities Migration
  if (expectedMigratableOpps > 0) {
    if (alreadyVerifiedOpps) {
      oppsMigrated = expectedMigratableOpps;
      onProgress?.({
        phase: 'opportunities',
        stepDescription: `Opportunities already verified in cloud (${expectedMigratableOpps} verified).`,
        opportunitiesProgress: { current: expectedMigratableOpps, total: expectedMigratableOpps },
      });
    } else {
      try {
        const total = realOpps.length;
        for (let idx = 0; idx < total; idx++) {
          const opp = realOpps[idx];
          onProgress?.({
            phase: 'opportunities',
            stepDescription: `Migrating opportunity ${idx + 1} of ${total}: ${opp.company} (${opp.title})...`,
            opportunitiesProgress: { current: idx + 1, total },
          });
          await targetAdapter.opportunities.save(opp, userId);
          oppsMigrated++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Opportunities: ${msg}`);
      }
    }
  }

  // Step 4: Network Contacts Migration (Resumable chunked batching)
  if (expectedMigratableContacts > 0) {
    if (alreadyVerifiedNetwork) {
      networkMigrated = expectedMigratableContacts;
      onProgress?.({
        phase: 'network',
        stepDescription: `Network contacts already verified in cloud (${expectedMigratableContacts} contacts).`,
        networkProgress: { current: expectedMigratableContacts, total: expectedMigratableContacts },
      });
    } else {
      try {
        const total = realContacts.length;
        const chunkSize = 500;
        for (let i = 0; i < total; i += chunkSize) {
          const currentChunkEnd = Math.min(i + chunkSize, total);
          onProgress?.({
            phase: 'network',
            stepDescription: `Migrating network contacts: ${currentChunkEnd} of ${total}...`,
            networkProgress: { current: currentChunkEnd, total },
          });
          const chunk = realContacts.slice(i, currentChunkEnd);
          await targetAdapter.network.addContacts(chunk, userId);
          networkMigrated = currentChunkEnd;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Network Contacts: ${msg}`);
      }
    }
  }

  // Step 5: Discovery Jobs Migration
  if (expectedMigratableJobs > 0) {
    if (alreadyVerifiedDiscovery) {
      discoveryMigrated = expectedMigratableJobs;
      onProgress?.({
        phase: 'discovery',
        stepDescription: `Discovered jobs already verified in cloud (${expectedMigratableJobs} jobs).`,
        discoveryProgress: { current: expectedMigratableJobs, total: expectedMigratableJobs },
      });
    } else {
      try {
        onProgress?.({
          phase: 'discovery',
          stepDescription: `Migrating ${expectedMigratableJobs} discovered jobs...`,
          discoveryProgress: { current: expectedMigratableJobs, total: expectedMigratableJobs },
        });
        await targetAdapter.discovery.saveJobs(realJobs, userId);
        discoveryMigrated = expectedMigratableJobs;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Discovery Jobs: ${msg}`);
      }
    }
  }

  // Step 6: Discovery History Migration (OPTIONAL category)
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
      console.warn('[MigrationService] Non-blocking discovery history migration notice:', msg);
      // Discovery history is optional historical telemetry; does not block user account
    }
  }

  // Step 7: Update User Preferences (REQUIRED category)
  if (targetAdapter.preferences) {
    try {
      await targetAdapter.preferences.savePreferences(
        {
          migrationCompleted: errors.length === 0,
          migrationCompletedAt: new Date().toISOString(),
        },
        userId
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`User Preferences: ${msg}`);
    }
  }

  // Step 8: Cloud Read-Back Verification Step
  onProgress?.({
    phase: 'verifying',
    stepDescription: 'Verifying cloud data persistence...',
  });

  const verificationErrors: string[] = [];
  try {
    if (expectedMigratableCandidate) {
      const verifiedProfile = await targetAdapter.candidates.getProfile(userId);
      if (!verifiedProfile || !verifiedProfile.name || isSyntheticOrDemoProfile(verifiedProfile)) {
        verificationErrors.push('Candidate Profile verification failed: Profile record not verified in cloud.');
      }
    }
    if (expectedMigratableOpps > 0) {
      const verifiedOpps = await targetAdapter.opportunities.getAll(userId);
      if (verifiedOpps.length < expectedMigratableOpps) {
        verificationErrors.push(
          `Opportunities verification failed: Expected ${expectedMigratableOpps} opportunities, found ${verifiedOpps.length} in cloud.`
        );
      }
    }
    if (expectedMigratableContacts > 0) {
      const verifiedContacts = await targetAdapter.network.getContacts(userId);
      if (verifiedContacts.length === 0) {
        verificationErrors.push(
          `Network Contacts verification failed: Expected ${expectedMigratableContacts} contacts, found 0 in cloud.`
        );
      }
    }
    if (expectedMigratableJobs > 0) {
      const verifiedJobs = await targetAdapter.discovery.getJobs(userId);
      if (verifiedJobs.length < expectedMigratableJobs) {
        verificationErrors.push(
          `Discovery Jobs verification failed: Expected ${expectedMigratableJobs} discovery jobs, found ${verifiedJobs.length} in cloud.`
        );
      }
    }
  } catch (verifErr) {
    const msg = verifErr instanceof Error ? verifErr.message : String(verifErr);
    verificationErrors.push(`Cloud Read-Back Verification Error: ${msg}`);
  }

  const allErrors = [...errors, ...verificationErrors];
  const hasSuccessfulWrites =
    candidateMigrated || oppsMigrated > 0 || networkMigrated > 0 || discoveryMigrated > 0;

  let status: 'success' | 'partial' | 'failed' = 'failed';
  if (allErrors.length === 0 && hasSuccessfulWrites) {
    status = 'success';
    onProgress?.({
      phase: 'completed',
      stepDescription: 'Migration and cloud verification completed successfully.',
    });
  } else if (hasSuccessfulWrites && allErrors.length > 0) {
    status = 'partial';
    onProgress?.({
      phase: 'failed',
      stepDescription: 'Migration partially completed with some verification errors.',
      errors: allErrors,
    });
  } else {
    status = 'failed';
    onProgress?.({
      phase: 'failed',
      stepDescription: 'Migration failed. No records were verified in the cloud.',
      errors: allErrors.length > 0 ? allErrors : ['No local records were available or written.'],
    });
  }

  return {
    candidateProfileMigrated: candidateMigrated,
    opportunitiesCount: oppsMigrated,
    networkContactsCount: networkMigrated,
    discoveryJobsCount: discoveryMigrated,
    discoveryHistoryCount: historyMigrated,
    analysisReportsCount: 0,
    timestamp: new Date().toISOString(),
    status,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}
