import { describe, it, expect, beforeEach } from 'vitest';
import { MockCloudStorageAdapter } from '@/lib/storage/mockCloudRepository';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { DiscoveredJob } from '@/types/discovery';
import { createTestOpportunity } from '../fixtures/v33TestFixtures';

describe('V3.2 Cloud Repositories & Multi-User Isolation', () => {
  let adapter: MockCloudStorageAdapter;

  beforeEach(() => {
    adapter = new MockCloudStorageAdapter();
  });

  describe('Candidate Repository Isolation', () => {
    it('isolates candidate profile data between distinct user IDs', async () => {
      const profileUserA: CandidateProfile = {
        id: 'cand-user-a',
        name: 'Alice User',
        headline: 'VP Strategy',
        location: 'San Francisco, CA',
        summary: 'Executive leader',
        targetRoles: ['VP Strategy'],
        targetIndustries: ['Technology'],
        preferredLocations: ['San Francisco, CA'],
        coreCompetencies: [],
        careerHistory: [],
        education: [],
        certifications: [],
        evidenceItems: [],
        sources: [],
        updatedAt: new Date().toISOString(),
        dataMode: 'user',
      };

      const profileUserB: CandidateProfile = {
        id: 'cand-user-b',
        name: 'Bob User',
        headline: 'Chief of Staff',
        location: 'New York, NY',
        summary: 'Operations executive',
        targetRoles: ['Chief of Staff'],
        targetIndustries: ['Fintech'],
        preferredLocations: ['New York, NY'],
        coreCompetencies: [],
        careerHistory: [],
        education: [],
        certifications: [],
        evidenceItems: [],
        sources: [],
        updatedAt: new Date().toISOString(),
        dataMode: 'user',
      };

      await adapter.candidates.saveProfile(profileUserA, 'user-a');
      await adapter.candidates.saveProfile(profileUserB, 'user-b');

      const loadedA = await adapter.candidates.getProfile('user-a');
      const loadedB = await adapter.candidates.getProfile('user-b');

      expect(loadedA?.name).toBe('Alice User');
      expect(loadedA?.targetRoles).toContain('VP Strategy');

      expect(loadedB?.name).toBe('Bob User');
      expect(loadedB?.targetRoles).toContain('Chief of Staff');
    });
  });

  describe('Opportunity Repository Multi-User Storage', () => {
    it('stores and retrieves opportunities scoped strictly by user_id', async () => {
      const oppA: JobOpportunity = createTestOpportunity({
        id: 'opp-1',
        company: 'Alpha Corp',
        title: 'VP Strategy',
        location: 'Remote',
        stage: 'Identified',
        priority: 'High',
        notes: 'User A note',
      });

      const oppB: JobOpportunity = createTestOpportunity({
        id: 'opp-2',
        company: 'Beta Corp',
        title: 'COO',
        location: 'New York',
        stage: 'Applied',
        priority: 'Medium',
        notes: 'User B note',
      });

      await adapter.opportunities.save(oppA, 'user-a');
      await adapter.opportunities.save(oppB, 'user-b');

      const oppsA = await adapter.opportunities.getAll('user-a');
      const oppsB = await adapter.opportunities.getAll('user-b');

      expect(oppsA).toHaveLength(1);
      expect(oppsA[0].company).toBe('Alpha Corp');

      expect(oppsB).toHaveLength(1);
      expect(oppsB[0].company).toBe('Beta Corp');
    });

    it('updates pipeline stage seamlessly within user scope', async () => {
      const opp: JobOpportunity = createTestOpportunity({
        id: 'opp-stage-test',
        company: 'Stripe',
        title: 'Head of Operations',
        location: 'San Francisco',
        stage: 'Identified',
        priority: 'High',
        notes: '',
      });

      await adapter.opportunities.save(opp, 'user-123');
      const updated = await adapter.opportunities.updateStage('opp-stage-test', 'Screening', 'user-123');

      expect(updated.stage).toBe('Screening');

      const reloaded = await adapter.opportunities.getById('opp-stage-test', 'user-123');
      expect(reloaded?.stage).toBe('Screening');
    });
  });

  describe('Network Repository at 3,400+ Contact Scale', () => {
    it('handles large volume contact insertion with batch deduplication', async () => {
      const largeBatch: NetworkContact[] = [];
      for (let i = 0; i < 3500; i++) {
        largeBatch.push({
          id: `contact-${i}`,
          fullName: `Executive Contact ${i}`,
          company: i % 2 === 0 ? 'Google' : 'Anthropic',
          position: 'Senior Director',
          email: `contact${i}@example.com`,
          notes: 'Alumni network',
          source: 'manual',
          importedAt: new Date().toISOString(),
        });
      }

      await adapter.network.addContacts(largeBatch, 'user-scale');
      const retrieved = await adapter.network.getContacts('user-scale');

      expect(retrieved).toHaveLength(3500);

      // Verify contact update
      const updated = await adapter.network.updateContact(
        'contact-100',
        { position: 'VP Engineering' },
        'user-scale'
      );
      expect(updated?.position).toBe('VP Engineering');
    });
  });

  describe('Discovery Repository', () => {
    it('saves discovered jobs and preserves trust provenance metadata', async () => {
      const jobs: DiscoveredJob[] = [
        {
          id: 'disc-1',
          title: 'VP Operations',
          company: 'Scale AI',
          location: 'San Francisco, CA',
          jobUrl: 'https://scale.com/careers/vp-ops',
          source: 'Gemini Google Search Grounding',
          discoveredAt: new Date().toISOString(),
          status: 'new',
          relevanceScore: 92,
          relevanceLevel: 'High Potential',
          relevanceReasons: ['Matches VP Operations target role'],
          matchedPreferences: ['VP Operations'],
          provider: 'gemini',
          groundingUsed: true,
          verificationStatus: 'verified-live',
          sourceConfidence: 95,
          sourceDomain: 'scale.com',
        },
      ];

      await adapter.discovery.saveJobs(jobs, 'user-disc');
      const loaded = await adapter.discovery.getJobs('user-disc');

      expect(loaded).toHaveLength(1);
      expect(loaded[0].verificationStatus).toBe('verified-live');
      expect(loaded[0].groundingUsed).toBe(true);
      expect(loaded[0].sourceDomain).toBe('scale.com');
    });
  });
});
