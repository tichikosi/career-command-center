import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudNetworkRepository } from '@/lib/storage/cloudRepositories';
import { hydrateCloudStateForUser } from '@/lib/storage/cloudHydration';
import { MockCloudStorageAdapter } from '@/lib/storage/mockCloudRepository';
import { inspectLocalData, isSyntheticOrDemoProfile } from '@/lib/storage/migrationService';
import { NetworkContact } from '@/types/network';
import { getCandidateProfile, resetCandidateDemoData } from '@/lib/storage';
import { SupabaseClient } from '@supabase/supabase-js';

// In-memory localStorage mock
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

describe('V3.2 Cloud Pagination & Migration State Precision Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCandidateDemoData();
  });

  describe('CloudNetworkRepository Pagination', () => {
    it('paginates and accumulates all 3,438 contacts across multiple range pages', async () => {
      const totalContacts = 3438;
      const fakeDb: Record<string, unknown>[] = Array.from({ length: totalContacts }, (_, idx) => ({
        id: `contact-${idx + 1}`,
        user_id: 'user-tanaka-3438',
        name: `Executive Contact ${idx + 1}`,
        company: idx % 2 === 0 ? 'Google' : 'Scale AI',
        position: 'Director',
        email: `contact${idx + 1}@example.com`,
        linkedin_url: `https://linkedin.com/in/contact${idx + 1}`,
        connection_date: '2026-01-01',
        source: 'linkedin_csv',
        created_at: new Date().toISOString(),
        notes: null,
      }));

      const rangesRequested: [number, number][] = [];

      const mockSupabase = {
        from: (table: string) => {
          expect(table).toBe('network_contacts');
          let currentUserId: string | undefined;
          let rangeFrom = 0;
          let rangeTo = 999;

          const queryBuilder = {
            select: () => queryBuilder,
            order: () => queryBuilder,
            eq: (field: string, val: string) => {
              if (field === 'user_id') currentUserId = val;
              return queryBuilder;
            },
            range: (from: number, to: number) => {
              rangeFrom = from;
              rangeTo = to;
              rangesRequested.push([from, to]);
              return queryBuilder;
            },
            then: (resolve: (res: { data: Record<string, unknown>[]; error: null }) => void) => {
              const filtered = currentUserId
                ? fakeDb.filter((r) => r.user_id === currentUserId)
                : fakeDb;
              const slice = filtered.slice(rangeFrom, rangeTo + 1);
              resolve({ data: slice, error: null });
            },
          };
          return queryBuilder;
        },
      } as unknown as SupabaseClient;

      const repo = new CloudNetworkRepository(mockSupabase);
      const contacts = await repo.getContacts('user-tanaka-3438');

      expect(contacts).toHaveLength(3438);
      expect(contacts[0].id).toBe('contact-1');
      expect(contacts[3437].id).toBe('contact-3438');

      // Verify pagination ranges: [0, 999], [1000, 1999], [2000, 2999], [3000, 3999]
      expect(rangesRequested).toEqual([
        [0, 999],
        [1000, 1999],
        [2000, 2999],
        [3000, 3999],
      ]);
    });

    it('handles exactly 1,000 contacts without early truncation', async () => {
      const fakeDb: Record<string, unknown>[] = Array.from({ length: 1000 }, (_, idx) => ({
        id: `contact-${idx + 1}`,
        user_id: 'user-exact-1000',
        name: `Contact ${idx + 1}`,
        company: 'Anthropic',
        created_at: new Date().toISOString(),
      }));

      const rangesRequested: [number, number][] = [];

      const mockSupabase = {
        from: () => {
          let rangeFrom = 0;
          let rangeTo = 999;

          const queryBuilder = {
            select: () => queryBuilder,
            order: () => queryBuilder,
            eq: () => queryBuilder,
            range: (from: number, to: number) => {
              rangeFrom = from;
              rangeTo = to;
              rangesRequested.push([from, to]);
              return queryBuilder;
            },
            then: (resolve: (res: { data: Record<string, unknown>[]; error: null }) => void) => {
              const slice = fakeDb.slice(rangeFrom, rangeTo + 1);
              resolve({ data: slice, error: null });
            },
          };
          return queryBuilder;
        },
      } as unknown as SupabaseClient;

      const repo = new CloudNetworkRepository(mockSupabase);
      const contacts = await repo.getContacts('user-exact-1000');

      expect(contacts).toHaveLength(1000);
      // First page fetched 1000, second page fetched empty slice (0 items)
      expect(rangesRequested).toEqual([
        [0, 999],
        [1000, 1999],
      ]);
    });

    it('returns empty array when 0 contacts exist', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            order: () => ({
              range: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const repo = new CloudNetworkRepository(mockSupabase);
      const contacts = await repo.getContacts('user-empty');
      expect(contacts).toEqual([]);
    });

    it('defensively deduplicates any duplicate IDs across pages', async () => {
      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `c${i + 1}`,
        name: `Contact ${i + 1}`,
        company: 'Google',
      }));
      const page2 = [
        { id: 'c1000', name: 'Contact 1000 duplicate', company: 'Google' },
        { id: 'c1001', name: 'Contact 1001 new', company: 'Google' },
      ];
      const mockPages = [page1, page2];
      let pageIdx = 0;

      const mockSupabase = {
        from: () => {
          const queryBuilder = {
            select: () => queryBuilder,
            order: () => queryBuilder,
            range: () => queryBuilder,
            eq: () => queryBuilder,
            then: (resolve: (res: { data: Record<string, unknown>[]; error: null }) => void) => {
              const data = mockPages[pageIdx++] || [];
              resolve({ data, error: null });
            },
          };
          return queryBuilder;
        },
      } as unknown as SupabaseClient;

      const repo = new CloudNetworkRepository(mockSupabase);
      const contacts = await repo.getContacts('user-dupe');
      expect(contacts).toHaveLength(1001);
      expect(contacts[0].id).toBe('c1');
      expect(contacts[999].id).toBe('c1000');
      expect(contacts[1000].id).toBe('c1001');
    });
  });

  describe('Migration Banner Suppression & Source of Truth', () => {
    it('sets ccc_migrated flag and suppresses migration banner when cloud state hydrates successfully', async () => {
      const mockAdapter = new MockCloudStorageAdapter();
      const tanakaContacts: NetworkContact[] = Array.from({ length: 3438 }, (_, i) => ({
        id: `contact-${i + 1}`,
        fullName: `Contact ${i + 1}`,
        company: 'Palantir',
        position: 'Director',
        email: `c${i + 1}@example.com`,
        source: 'linkedin_csv',
        importedAt: new Date().toISOString(),
      }));

      await mockAdapter.network.addContacts(tanakaContacts, 'user-tanaka-cloud');
      await mockAdapter.candidates.saveProfile(
        {
          id: 'cand-tanaka-1',
          name: 'Tanaka Ian Chikosi',
          headline: 'VP Operations',
          location: 'San Francisco, CA',
          summary: 'Executive',
          targetRoles: ['VP Ops'],
          targetIndustries: ['Enterprise AI'],
          preferredLocations: ['SF'],
          coreCompetencies: [],
          careerHistory: [],
          education: [],
          certifications: [],
          evidenceItems: [],
          sources: [],
          updatedAt: new Date().toISOString(),
          dataMode: 'user',
        },
        'user-tanaka-cloud'
      );

      const repoManager = await import('@/lib/storage/repositoryManager');
      vi.spyOn(repoManager, 'getActiveStorageAdapter').mockReturnValue(mockAdapter);

      // Hydrate state for Tanaka
      const res = await hydrateCloudStateForUser('user-tanaka-cloud');
      expect(res.hasCloudData).toBe(true);
      expect(res.contactsCount).toBe(3438);

      // Verify that the completion flag was recorded in local storage
      expect(window.localStorage.getItem('ccc_migrated_user-tanaka-cloud')).toBe('true');
    });

    it('identifies unauthenticated demo Alex Vance as synthetic and does not trigger migration', () => {
      const profile = getCandidateProfile();
      expect(profile.name).toBe('Alex Vance');
      expect(isSyntheticOrDemoProfile(profile)).toBe(true);

      const local = inspectLocalData();
      expect(local.hasLocalData).toBe(false);
    });
  });
});
