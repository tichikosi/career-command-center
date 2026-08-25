import { describe, it, expect } from 'vitest';
import {
  LocalCandidateRepository,
  LocalOpportunityRepository,
  LocalNetworkRepository,
  LocalDiscoveryRepository,
  defaultLocalStorageAdapter,
} from '@/lib/storage/localStorageAdapter';

describe('Storage Abstraction Repositories', () => {
  it('instantiates default local storage adapter with all 4 domain repositories', () => {
    expect(defaultLocalStorageAdapter.candidates).toBeDefined();
    expect(defaultLocalStorageAdapter.opportunities).toBeDefined();
    expect(defaultLocalStorageAdapter.network).toBeDefined();
    expect(defaultLocalStorageAdapter.discovery).toBeDefined();
  });

  describe('LocalCandidateRepository', () => {
    const repo = new LocalCandidateRepository();

    it('retrieves candidate profile and supports saving', () => {
      const profile = repo.getProfile();
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();

      const saved = repo.saveProfile({
        ...profile,
        headline: 'Executive Leader in AI Strategy',
      });
      expect(saved.headline).toBe('Executive Leader in AI Strategy');
    });
  });

  describe('LocalOpportunityRepository', () => {
    const repo = new LocalOpportunityRepository();

    it('retrieves opportunities array and fetches by id', () => {
      const opps = repo.getAll();
      expect(Array.isArray(opps)).toBe(true);

      if (opps.length > 0) {
        const first = opps[0];
        const byId = repo.getById(first.id);
        expect(byId).toBeDefined();
        expect(byId?.id).toBe(first.id);
      }
    });

    it('creates and saves new opportunity', () => {
      const created = repo.create({
        company: 'Repository Test Inc',
        title: 'VP of Platform Architecture',
      });

      expect(created.id).toBeDefined();
      expect(created.company).toBe('Repository Test Inc');

      const retrieved = repo.getById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('VP of Platform Architecture');

      repo.delete(created.id);
      expect(repo.getById(created.id)).toBeUndefined();
    });
  });

  describe('LocalNetworkRepository', () => {
    const repo = new LocalNetworkRepository();

    it('retrieves contacts, adds contact, and updates contact', () => {
      const initialCount = repo.getContacts().length;

      const added = repo.addContacts([
        {
          id: 'c-repo-1',
          fullName: 'Repository Contact',
          company: 'Adapter LLC',
          source: 'manual',
          importedAt: '2026-08-14T00:00:00.000Z',
        },
      ]);
      expect(added.length).toBe(initialCount + 1);

      expect(repo.getContacts().length).toBe(initialCount + 1);

      const updated = repo.updateContact('c-repo-1', { position: 'Chief Operating Officer' });
      expect(updated?.position).toBe('Chief Operating Officer');

      repo.deleteContact('c-repo-1');
      expect(repo.getContacts().some((c) => c.id === 'c-repo-1')).toBe(false);
    });
  });

  describe('LocalDiscoveryRepository', () => {
    const repo = new LocalDiscoveryRepository();

    it('manages discovery jobs, status, and history', () => {
      const initialJobs = repo.getJobs();
      expect(Array.isArray(initialJobs)).toBe(true);

      repo.saveJobs([
        {
          id: 'disc-repo-1',
          title: 'Director AI Ops',
          company: 'Adapter AI',
          location: 'Remote',
          source: 'Test Provider',
          discoveredAt: '2026-03-15T00:00:00.000Z',
          status: 'new',
          relevanceScore: 90,
          relevanceLevel: 'High Potential',
          relevanceReasons: [],
          matchedPreferences: [],
        },
      ]);

      expect(repo.getJobs().length).toBe(1);

      repo.updateStatus('disc-repo-1', 'saved');
      expect(repo.getJobs()[0].status).toBe('saved');

      const historyItem = repo.recordRun({
        runAt: '2026-03-15T00:00:00.000Z',
        source: 'Adapter Test',
        rolesDiscovered: 1,
        newRolesCount: 1,
        deduplicatedCount: 0,
        durationMs: 100,
        status: 'success',
      });

      expect(historyItem.id).toBeDefined();
      expect(repo.getHistory().length).toBeGreaterThan(0);
    });
  });
});
