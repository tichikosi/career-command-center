import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  inspectLocalData,
  migrateLocalDataToCloud,
  isSyntheticOrDemoProfile,
  isSyntheticOrDemoOpportunity,
  isSyntheticOrDemoContact,
  isSyntheticOrDemoJob,
  MigrationProgressUpdate,
} from '@/lib/storage/migrationService';
import { MockCloudStorageAdapter } from '@/lib/storage/mockCloudRepository';
import { NETWORK_STORAGE_KEY } from '@/lib/networkStorage';
import { CCC_CANDIDATE_KEY } from '@/lib/storage';

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

describe('V3.2 Cloud Migration Write Path & Authenticated Demo Safety', () => {
  let mockAdapter: MockCloudStorageAdapter;

  beforeEach(() => {
    mockAdapter = new MockCloudStorageAdapter();
    window.localStorage.clear();
  });

  describe('Demo & Synthetic Data Exclusion Guards', () => {
    it('correctly identifies Alex Vance and synthetic profiles as demo fixtures', () => {
      expect(isSyntheticOrDemoProfile({ name: 'Alex Vance', dataMode: 'synthetic' })).toBe(true);
      expect(isSyntheticOrDemoProfile({ name: 'Alex Vance', dataMode: 'user' })).toBe(true);
      expect(isSyntheticOrDemoProfile({ name: 'Executive Candidate', dataMode: 'synthetic' })).toBe(true);
      expect(isSyntheticOrDemoProfile(null)).toBe(true);
      expect(isSyntheticOrDemoProfile({ name: '' })).toBe(true);

      // Real user profile with custom name must pass guard even if it had legacy ID
      expect(
        isSyntheticOrDemoProfile({
          id: 'cand-alex-vance-v1',
          name: 'Tanaka Ian Chikosi',
          dataMode: 'user',
        })
      ).toBe(false);
    });

    it('correctly identifies benchmark demo opportunities', () => {
      expect(isSyntheticOrDemoOpportunity({ source: 'synthetic_benchmark' })).toBe(true);
      expect(
        isSyntheticOrDemoOpportunity({
          id: 'real-opp-1',
          company: 'Palantir Technologies',
          title: 'Director of Operations',
          stage: 'Applied',
        })
      ).toBe(false);
    });

    it('correctly identifies seed fixture contacts', () => {
      expect(isSyntheticOrDemoContact({ id: 'cont-seed-1', name: 'Demo Contact' })).toBe(true);
      expect(
        isSyntheticOrDemoContact({
          id: 'cont-real-99',
          name: 'Sarah Chen',
          company: 'Palantir',
        })
      ).toBe(false);
    });

    it('correctly identifies curated demo discovery jobs', () => {
      expect(isSyntheticOrDemoJob({ source: 'Curated Demo Fixture' })).toBe(true);
      expect(isSyntheticOrDemoJob({ sourceDomain: 'demo.internal' })).toBe(true);
      expect(
        isSyntheticOrDemoJob({
          id: 'job-real-1',
          source: 'Google Search Grounding',
          sourceDomain: 'greenhouse.io',
        })
      ).toBe(false);
    });

    it('inspectLocalData ignores demo-only fixtures so fresh Incognito accounts show 0', () => {
      // Seed default demo fixtures
      window.localStorage.setItem(
        CCC_CANDIDATE_KEY,
        JSON.stringify({
          id: 'cand-alex-vance-v1',
          name: 'Alex Vance',
          dataMode: 'synthetic',
        })
      );
      window.localStorage.setItem(
        'ccc_opportunities_v1',
        JSON.stringify([{ id: 'opp-role-1', company: 'Anthropic', source: 'synthetic_benchmark' }])
      );
      window.localStorage.setItem(
        NETWORK_STORAGE_KEY,
        JSON.stringify([
          { id: 'cont-seed-1', name: 'Seed 1' },
          { id: 'cont-seed-2', name: 'Seed 2' },
          { id: 'cont-seed-3', name: 'Seed 3' },
          { id: 'cont-seed-4', name: 'Seed 4' },
          { id: 'cont-seed-5', name: 'Seed 5' },
          { id: 'cont-seed-6', name: 'Seed 6' },
        ])
      );
      window.localStorage.setItem(
        'ccc_discovery_jobs_v1',
        JSON.stringify([{ id: 'disc-demo-1', source: 'Curated Demo Fixture' }])
      );

      const snapshot = inspectLocalData();
      expect(snapshot.hasLocalData).toBe(false);
      expect(snapshot.candidateProfile).toBe(false);
      expect(snapshot.opportunitiesCount).toBe(0);
      expect(snapshot.networkContactsCount).toBe(0);
      expect(snapshot.discoveryJobsCount).toBe(0);
    });
  });

  describe('Controlled Test Fixtures Write Path (1 Candidate, 2 Opps, 3 Contacts, 2 Discovery)', () => {
    beforeEach(() => {
      window.localStorage.setItem(
        CCC_CANDIDATE_KEY,
        JSON.stringify({
          id: 'cand-alex-vance-v1',
          name: 'Tanaka Ian Chikosi',
          dataMode: 'user',
          headline: 'VP Strategy & Operations',
          targetRoles: ['Chief of Staff', 'VP Operations'],
          careerHistory: [{ id: 'role-1', title: 'VP Strategy', company: 'Palantir' }],
        })
      );

      window.localStorage.setItem(
        'ccc_opportunities_v1',
        JSON.stringify([
          {
            id: 'opp-1',
            company: 'Palantir',
            title: 'Director Operations',
            stage: 'Applied',
            priority: 'High',
            actions: [{ id: 'act-1', text: 'Prepare interview presentation', completed: false }],
          },
          {
            id: 'opp-2',
            company: 'Anduril Industries',
            title: 'VP Strategy',
            stage: 'Interviewing',
            priority: 'High',
          },
        ])
      );

      window.localStorage.setItem(
        NETWORK_STORAGE_KEY,
        JSON.stringify([
          { id: 'c-1', fullName: 'Alice Smith', company: 'Palantir', position: 'VP Eng' },
          { id: 'c-2', fullName: 'Bob Jones', company: 'Anduril', position: 'Director BD' },
          { id: 'c-3', fullName: 'Carol Danvers', company: 'SpaceX', position: 'VP Ops' },
        ])
      );

      window.localStorage.setItem(
        'ccc_discovery_jobs_v1',
        JSON.stringify([
          {
            id: 'disc-1',
            company: 'OpenAI',
            title: 'Head of Operations',
            source: 'Google Search Grounding',
            workflowStatus: 'saved',
          },
          {
            id: 'disc-2',
            company: 'Anthropic',
            title: 'Chief of Staff',
            source: 'Google Search Grounding',
            workflowStatus: 'promoted',
          },
        ])
      );
    });

    it('successfully migrates all real fixtures with authenticated userId and verifies read-back', async () => {
      const progressSteps: MigrationProgressUpdate[] = [];
      const summary = await migrateLocalDataToCloud(mockAdapter, 'auth-user-live-123', (p) => {
        progressSteps.push(p);
      });

      expect(summary.status).toBe('success');
      expect(summary.candidateProfileMigrated).toBe(true);
      expect(summary.opportunitiesCount).toBe(2);
      expect(summary.networkContactsCount).toBe(3);
      expect(summary.discoveryJobsCount).toBe(2);
      expect(summary.errors).toBeUndefined();

      // Verify progress callbacks emitted
      expect(progressSteps.some((p) => p.phase === 'backup')).toBe(true);
      expect(progressSteps.some((p) => p.phase === 'candidate')).toBe(true);
      expect(progressSteps.some((p) => p.phase === 'opportunities')).toBe(true);
      expect(progressSteps.some((p) => p.phase === 'network')).toBe(true);
      expect(progressSteps.some((p) => p.phase === 'discovery')).toBe(true);
      expect(progressSteps.some((p) => p.phase === 'verifying')).toBe(true);
      expect(progressSteps.some((p) => p.phase === 'completed')).toBe(true);

      // Verify Cloud Storage Adapter has records under authenticated userId
      const cloudProfile = await mockAdapter.candidates.getProfile('auth-user-live-123');
      expect(cloudProfile.name).toBe('Tanaka Ian Chikosi');

      const cloudOpps = await mockAdapter.opportunities.getAll('auth-user-live-123');
      expect(cloudOpps).toHaveLength(2);

      const cloudContacts = await mockAdapter.network.getContacts('auth-user-live-123');
      expect(cloudContacts).toHaveLength(3);

      const cloudJobs = await mockAdapter.discovery.getJobs('auth-user-live-123');
      expect(cloudJobs).toHaveLength(2);
    });

    it('supports resumable skipping of already verified cloud categories on retry', async () => {
      // First migration run writes all records
      const firstSummary = await migrateLocalDataToCloud(mockAdapter, 'auth-user-live-123');
      expect(firstSummary.status).toBe('success');

      // Second migration run detects that opportunities, network, and discovery jobs are already verified
      const progressSteps: MigrationProgressUpdate[] = [];
      const secondSummary = await migrateLocalDataToCloud(mockAdapter, 'auth-user-live-123', (p) => {
        progressSteps.push(p);
      });

      expect(secondSummary.status).toBe('success');
      expect(secondSummary.candidateProfileMigrated).toBe(true);
      expect(secondSummary.opportunitiesCount).toBe(2);
      expect(secondSummary.networkContactsCount).toBe(3);
      expect(secondSummary.discoveryJobsCount).toBe(2);

      // Verify skip notices in progress updates
      expect(progressSteps.some((p) => p.stepDescription.includes('already verified in cloud'))).toBe(true);
    });

    it('fails migration and surfaces errors when candidate cloud write fails', async () => {
      vi.spyOn(mockAdapter.candidates, 'saveProfile').mockRejectedValueOnce(
        new Error('permission denied for table candidate_profiles (Code: 42501)')
      );

      const summary = await migrateLocalDataToCloud(mockAdapter, 'auth-user-candidate-fail');

      expect(summary.status).not.toBe('success');
      expect(summary.errors).toBeDefined();
      expect(summary.errors?.some((e) => e.includes('Candidate Profile'))).toBe(true);
    });

    it('handles high-scale 3,400+ network contact chunked batching', async () => {
      const largeContacts = Array.from({ length: 3438 }, (_, i) => ({
        id: `contact-${i}`,
        fullName: `Contact ${i}`,
        company: `Company ${i % 100}`,
        position: 'Executive Leader',
      }));

      window.localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(largeContacts));

      let maxBatchReported = 0;
      const summary = await migrateLocalDataToCloud(mockAdapter, 'auth-user-large-scale', (p) => {
        if (p.networkProgress) {
          maxBatchReported = Math.max(maxBatchReported, p.networkProgress.current);
        }
      });

      expect(summary.status).toBe('success');
      expect(summary.networkContactsCount).toBe(3438);
      expect(maxBatchReported).toBe(3438);

      const cloudContacts = await mockAdapter.network.getContacts('auth-user-large-scale');
      expect(cloudContacts).toHaveLength(3438);
    });
  });
});
