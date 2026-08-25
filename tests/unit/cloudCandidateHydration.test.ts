import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hydrateCandidateProfileFromCloud,
  getCandidateProfile,
  resetCandidateDemoData,
} from '@/lib/storage';
import { hydrateCloudStateForUser, resetStateOnSignOut } from '@/lib/storage/cloudHydration';
import { MockCloudStorageAdapter } from '@/lib/storage/mockCloudRepository';
import { isSyntheticOrDemoProfile } from '@/lib/storage/migrationService';
import { CandidateProfile } from '@/types/candidate';

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

describe('V3.2 Cloud Candidate Read-Path & Source of Truth', () => {
  let mockAdapter: MockCloudStorageAdapter;

  beforeEach(() => {
    mockAdapter = new MockCloudStorageAdapter();
    window.localStorage.clear();
    resetCandidateDemoData();
  });

  it('unauthenticated demo mode initializes with Alex Vance', () => {
    const profile = getCandidateProfile();
    expect(profile.name).toBe('Alex Vance');
    expect(profile.dataMode).toBe('synthetic');
    expect(isSyntheticOrDemoProfile(profile)).toBe(true);
  });

  it('authenticated user with real cloud profile hydrates and overrides local Alex Vance', async () => {
    // 1. Initially local storage has synthetic Alex Vance
    expect(getCandidateProfile().name).toBe('Alex Vance');

    // 2. Real Tanaka profile saved in Cloud Adapter under userId
    const tanakaCloudProfile: CandidateProfile = {
      id: 'cand-tanaka-live',
      name: 'Tanaka Ian Chikosi',
      headline: 'VP Strategy & Operations',
      location: 'San Francisco, CA',
      summary: 'Executive leader in AI and product operations',
      targetRoles: ['VP Operations', 'Chief of Staff'],
      targetIndustries: ['AI', 'Enterprise Software'],
      preferredLocations: ['San Francisco, CA', 'Remote'],
      coreCompetencies: ['Executive Leadership', 'Operational Scaling'],
      careerHistory: [
        {
          id: 'role-1',
          company: 'Palantir Technologies',
          title: 'Director of Operations',
          location: 'San Francisco, CA',
          startDate: '2021-01',
          endDate: 'Present',
          isCurrent: true,
          summary: 'Led enterprise deployment operations',
          evidenceItemIds: ['ev-1'],
          skills: ['Strategy', 'Operations'],
          createdAt: '2021-01-01T00:00:00Z',
          updatedAt: '2021-01-01T00:00:00Z',
        },
      ],
      education: [],
      certifications: [],
      evidenceItems: [
        {
          id: 'ev-1',
          type: 'achievement',
          title: 'Scaled Operations 300%',
          description: 'Grew deployment velocity from 10 to 40 per quarter',
          skills: ['Scaling'],
          tags: ['leadership'],
          verificationStatus: 'candidate-confirmed',
          createdAt: '2021-01-01T00:00:00Z',
          updatedAt: '2021-01-01T00:00:00Z',
        },
      ],
      sources: [],
      updatedAt: '2026-08-25T00:00:00Z',
      dataMode: 'user',
    };

    await mockAdapter.candidates.saveProfile(tanakaCloudProfile, 'auth-user-tanaka-123');

    // 3. Spy on getActiveStorageAdapter to return our mockAdapter with Tanaka
    const repoManager = await import('@/lib/storage/repositoryManager');
    vi.spyOn(repoManager, 'getActiveStorageAdapter').mockReturnValue(mockAdapter);

    // 4. Hydrate cloud state for this authenticated user
    await hydrateCloudStateForUser('auth-user-tanaka-123');

    // 5. Candidate profile must now resolve directly to Tanaka Ian Chikosi
    const activeCandidate = getCandidateProfile();
    expect(activeCandidate.name).toBe('Tanaka Ian Chikosi');
    expect(activeCandidate.headline).toBe('VP Strategy & Operations');
    expect(activeCandidate.dataMode).toBe('user');
    expect(activeCandidate.careerHistory).toHaveLength(1);
    expect(activeCandidate.evidenceItems).toHaveLength(1);
    expect(isSyntheticOrDemoProfile(activeCandidate)).toBe(false);
  });

  it('authenticated user with empty cloud profile clears demo fallback to show clean onboarding', async () => {
    // Cloud adapter has no candidate for new-user-empty
    const repoManager = await import('@/lib/storage/repositoryManager');
    vi.spyOn(repoManager, 'getActiveStorageAdapter').mockReturnValue(mockAdapter);

    await hydrateCloudStateForUser('new-user-empty');

    const activeCandidate = getCandidateProfile();
    expect(activeCandidate.name).toBe('');
    expect(activeCandidate.dataMode).toBe('user');
    expect(activeCandidate.careerHistory).toHaveLength(0);
  });

  it('signOut cleanly resets client state back to demo baseline', () => {
    hydrateCandidateProfileFromCloud({
      id: 'cand-custom',
      name: 'Custom User',
      headline: '',
      location: '',
      summary: '',
      targetRoles: [],
      targetIndustries: [],
      preferredLocations: [],
      coreCompetencies: [],
      careerHistory: [],
      education: [],
      certifications: [],
      evidenceItems: [],
      sources: [],
      updatedAt: new Date().toISOString(),
      dataMode: 'user',
    });

    expect(getCandidateProfile().name).toBe('Custom User');

    // On sign out
    resetStateOnSignOut();

    const profileAfterSignOut = getCandidateProfile();
    expect(profileAfterSignOut.name).toBe('Alex Vance');
    expect(profileAfterSignOut.dataMode).toBe('synthetic');
  });

  it('CloudCandidateRepository successfully fetches candidate when candidate id differs from auth user id', async () => {
    const authUserId = '2bd4618e-4a6f-45fe-89cb-72c01994a5ea';
    const fakeRow = {
      id: 'cand-tanaka-custom-id',
      user_id: authUserId,
      name: 'Tanaka Ian Chikosi',
      headline: 'VP Strategy & Operations',
      location: 'San Francisco, CA',
      summary: 'Executive AI operations leader',
      target_roles: ['VP Operations'],
      target_industries: ['AI'],
      preferred_locations: ['San Francisco, CA'],
      core_competencies: ['Scaling'],
      career_history: [],
      education: [],
      certifications: [],
      evidence_items: [],
      sources: [],
      updated_at: '2026-08-25T01:00:00Z',
      data_mode: 'user',
    };

    let queriedFilter = '';
    const mockSupabase = {
      from: (table: string) => {
        expect(table).toBe('candidate_profiles');
        const queryBuilder = {
          select: () => queryBuilder,
          order: () => queryBuilder,
          or: (filterStr: string) => {
            queriedFilter = filterStr;
            return queryBuilder;
          },
          eq: (field: string, val: string) => {
            queriedFilter = `${field}.eq.${val}`;
            return queryBuilder;
          },
          limit: (n: number) => {
            expect(n).toBe(1);
            return Promise.resolve({ data: [fakeRow], error: null });
          },
        };
        return queryBuilder;
      },
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const { CloudCandidateRepository } = await import('@/lib/storage/cloudRepositories');
    const repo = new CloudCandidateRepository(mockSupabase);
    const profile = await repo.getProfile(authUserId);

    expect(profile.name).toBe('Tanaka Ian Chikosi');
    expect(profile.id).toBe('cand-tanaka-custom-id');
    expect(queriedFilter).toContain(authUserId);
  });

  it('CloudCandidateRepository resolves newest candidate when multiple rows exist in Supabase without PGRST116 error', async () => {
    const authUserId = '2bd4618e-4a6f-45fe-89cb-72c01994a5ea';
    const olderRow = {
      id: 'cand-tanaka-old',
      user_id: authUserId,
      name: 'Tanaka Old',
      headline: 'Director',
      updated_at: '2026-08-24T00:00:00Z',
      data_mode: 'user',
    };
    const newerRow = {
      id: 'cand-tanaka-new',
      user_id: authUserId,
      name: 'Tanaka Ian Chikosi',
      headline: 'VP Operations',
      updated_at: '2026-08-25T02:00:00Z',
      data_mode: 'user',
    };

    const allRows = [newerRow, olderRow];

    const mockSupabase = {
      from: () => {
        const queryBuilder = {
          select: () => queryBuilder,
          order: (field: string, opts: { ascending: boolean }) => {
            expect(field).toBe('updated_at');
            expect(opts.ascending).toBe(false);
            return queryBuilder;
          },
          or: () => queryBuilder,
          limit: (n: number) => {
            expect(n).toBe(1);
            // Simulate PostgreSQL returning the first ordered row (newerRow)
            return Promise.resolve({ data: allRows.slice(0, n), error: null });
          },
        };
        return queryBuilder;
      },
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const { CloudCandidateRepository } = await import('@/lib/storage/cloudRepositories');
    const repo = new CloudCandidateRepository(mockSupabase);
    const profile = await repo.getProfile(authUserId);

    expect(profile.name).toBe('Tanaka Ian Chikosi');
    expect(profile.id).toBe('cand-tanaka-new');
  });

  it('cloud candidate hydrates even if ccc_migrated flag is already true in localStorage', async () => {
    const authUserId = 'user-migrated-previously';
    window.localStorage.setItem(`ccc_migrated_${authUserId}`, 'true');

    const tanakaCloudProfile: CandidateProfile = {
      id: 'cand-tanaka-persisted',
      name: 'Tanaka Ian Chikosi',
      headline: 'VP Strategy & Operations',
      location: 'San Francisco, CA',
      summary: 'Executive leader',
      targetRoles: ['VP Operations'],
      targetIndustries: ['AI'],
      preferredLocations: ['SF'],
      coreCompetencies: [],
      careerHistory: [],
      education: [],
      certifications: [],
      evidenceItems: [],
      sources: [],
      updatedAt: '2026-08-25T00:00:00Z',
      dataMode: 'user',
    };

    await mockAdapter.candidates.saveProfile(tanakaCloudProfile, authUserId);
    const repoManager = await import('@/lib/storage/repositoryManager');
    vi.spyOn(repoManager, 'getActiveStorageAdapter').mockReturnValue(mockAdapter);

    await hydrateCloudStateForUser(authUserId);

    const active = getCandidateProfile();
    expect(active.name).toBe('Tanaka Ian Chikosi');
    expect(active.dataMode).toBe('user');
  });

  it('CloudCandidateRepository.saveProfile targets onConflict: user_id when userId is provided', async () => {
    const authUserId = '2bd4618e-4a6f-45fe-89cb-72c01994a5ea';
    let upsertedPayload: Record<string, unknown> | null = null;
    let onConflictTarget: string | null = null;

    const mockSupabase = {
      from: (table: string) => {
        expect(table).toBe('candidate_profiles');
        return {
          upsert: (payload: Record<string, unknown>, opts: { onConflict: string }) => {
            upsertedPayload = payload;
            onConflictTarget = opts.onConflict;
            return Promise.resolve({ error: null });
          },
        };
      },
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const { CloudCandidateRepository } = await import('@/lib/storage/cloudRepositories');
    const repo = new CloudCandidateRepository(mockSupabase);

    const profileToSave: CandidateProfile = {
      id: 'cand-custom-domain-id',
      name: 'Tanaka Ian Chikosi',
      headline: 'VP Strategy & Operations',
      location: 'San Francisco, CA',
      summary: 'Executive Leader',
      targetRoles: ['VP Ops'],
      targetIndustries: ['AI'],
      preferredLocations: ['SF'],
      coreCompetencies: [],
      careerHistory: [],
      education: [],
      certifications: [],
      evidenceItems: [],
      sources: [],
      updatedAt: '2026-08-25T00:00:00Z',
      dataMode: 'user',
    };

    const saved = await repo.saveProfile(profileToSave, authUserId);
    expect(saved.name).toBe('Tanaka Ian Chikosi');
    expect(onConflictTarget).toBe('user_id');
    expect(upsertedPayload).not.toBeNull();
    expect((upsertedPayload as Record<string, unknown>).user_id).toBe(authUserId);
  });

  it('repeated saves and migration retries update the canonical profile under the same user_id', async () => {
    const authUserId = 'user-single-candidate-owner';
    const profileV1: CandidateProfile = {
      id: 'cand-v1',
      name: 'Tanaka Ian Chikosi',
      headline: 'Director of Ops',
      location: 'San Francisco, CA',
      summary: 'Initial import',
      targetRoles: ['Director'],
      targetIndustries: ['AI'],
      preferredLocations: ['SF'],
      coreCompetencies: [],
      careerHistory: [],
      education: [],
      certifications: [],
      evidenceItems: [],
      sources: [],
      updatedAt: '2026-08-25T00:00:00Z',
      dataMode: 'user',
    };

    // Save v1
    await mockAdapter.candidates.saveProfile(profileV1, authUserId);
    expect((await mockAdapter.candidates.getProfile(authUserId)).headline).toBe('Director of Ops');

    // Save v2 (e.g. migration retry or edit)
    const profileV2: CandidateProfile = {
      ...profileV1,
      id: 'cand-v2-retry',
      headline: 'VP Strategy & Operations',
      updatedAt: '2026-08-25T01:00:00Z',
    };
    await mockAdapter.candidates.saveProfile(profileV2, authUserId);

    // Verify adapter only holds 1 candidate profile for this user
    expect(mockAdapter.candidateProfiles.size).toBe(1);
    const updated = await mockAdapter.candidates.getProfile(authUserId);
    expect(updated.headline).toBe('VP Strategy & Operations');
  });
});
