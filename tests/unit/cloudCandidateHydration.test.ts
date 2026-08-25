import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hydrateCandidateProfileFromCloud,
  hydrateOpportunitiesFromCloud,
  getCandidateProfile,
  getOpportunities,
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

  it('hydrateOpportunitiesFromCloud updates active opportunities cache and storage', () => {
    const opps = [
      {
        id: 'cloud-opp-1',
        company: 'Scale AI',
        title: 'VP Operations',
        location: 'San Francisco, CA',
        stage: 'Applied' as const,
        priority: 'High' as const,
        createdAt: '2026-08-25T00:00:00Z',
        updatedAt: '2026-08-25T00:00:00Z',
      },
    ];

    hydrateOpportunitiesFromCloud(opps);

    const loaded = getOpportunities();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].company).toBe('Scale AI');
  });
});
