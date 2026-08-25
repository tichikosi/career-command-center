import { describe, it, expect, beforeEach } from 'vitest';
import { MockCloudStorageAdapter } from '@/lib/storage/mockCloudRepository';
import { inspectLocalData, migrateLocalDataToCloud } from '@/lib/storage/migrationService';

// Mock localStorage in memory for node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: localStorageMock,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
} else {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

describe('V3.2 Local-to-Cloud Migration Service', () => {
  let mockAdapter: MockCloudStorageAdapter;

  beforeEach(() => {
    mockAdapter = new MockCloudStorageAdapter();
    window.localStorage.clear();
  });

  it('correctly inspects empty local data when no keys exist', () => {
    const snapshot = inspectLocalData();
    expect(snapshot.hasLocalData).toBe(false);
    expect(snapshot.opportunitiesCount).toBe(0);
    expect(snapshot.networkContactsCount).toBe(0);
  });

  it('detects user profile and opportunities in local storage', () => {
    window.localStorage.setItem(
      'ccc_candidate_profile_v1',
      JSON.stringify({
        id: 'user-profile-1',
        name: 'Tanaka Ian Chikosi',
        dataMode: 'user',
        careerHistory: [{ role: 'VP Strategy' }],
      })
    );

    window.localStorage.setItem(
      'ccc_opportunities_v1',
      JSON.stringify([
        { id: 'opp-1', company: 'Palantir', title: 'Director Operations', stage: 'Applied' },
      ])
    );

    const snapshot = inspectLocalData();
    expect(snapshot.hasLocalData).toBe(true);
    expect(snapshot.candidateProfile).toBe(true);
    expect(snapshot.opportunitiesCount).toBe(1);
  });

  it('migrates local data to target storage adapter safely and creates safety backup', async () => {
    window.localStorage.setItem(
      'ccc_candidate_profile_v1',
      JSON.stringify({
        id: 'user-profile-1',
        name: 'Tanaka Ian Chikosi',
        dataMode: 'user',
        targetRoles: ['Chief of Staff', 'VP Strategy'],
      })
    );

    window.localStorage.setItem(
      'ccc_opportunities_v1',
      JSON.stringify([
        { id: 'opp-1', company: 'Palantir', title: 'Director Operations', stage: 'Applied' },
        { id: 'opp-2', company: 'Anduril', title: 'VP Strategy', stage: 'Identified' },
      ])
    );

    window.localStorage.setItem(
      'ccc_network_contacts_v1',
      JSON.stringify([
        { id: 'cont-1', name: 'John Doe', company: 'Palantir', title: 'VP' },
      ])
    );

    const summary = await migrateLocalDataToCloud(mockAdapter, 'auth-user-999');

    expect(summary.status).toBe('success');
    expect(summary.candidateProfileMigrated).toBe(true);
    expect(summary.opportunitiesCount).toBe(2);
    expect(summary.networkContactsCount).toBe(1);

    // Verify backup created in localStorage
    const backupStr = window.localStorage.getItem('ccc_local_backup_v1');
    expect(backupStr).not.toBeNull();
    const backup = JSON.parse(backupStr!);
    expect(backup.profile.name).toBe('Tanaka Ian Chikosi');

    // Verify migrated data is accessible in target cloud adapter for user
    const cloudCandidate = await mockAdapter.candidates.getProfile('auth-user-999');
    expect(cloudCandidate.name).toBe('Tanaka Ian Chikosi');

    const cloudOpps = await mockAdapter.opportunities.getAll('auth-user-999');
    expect(cloudOpps).toHaveLength(2);

    const cloudContacts = await mockAdapter.network.getContacts('auth-user-999');
    expect(cloudContacts).toHaveLength(1);
  });

  it('does NOT delete local storage keys after migration (retains local resilience)', async () => {
    window.localStorage.setItem(
      'ccc_opportunities_v1',
      JSON.stringify([{ id: 'opp-1', company: 'Palantir', title: 'Director' }])
    );

    await migrateLocalDataToCloud(mockAdapter, 'auth-user-123');

    // Verify original local data remains intact
    const stillLocal = window.localStorage.getItem('ccc_opportunities_v1');
    expect(stillLocal).not.toBeNull();
  });
});
