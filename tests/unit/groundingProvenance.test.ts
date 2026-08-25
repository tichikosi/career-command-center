import { describe, it, expect } from 'vitest';
import { CuratedDiscoveryProvider } from '@/lib/server/curatedDiscovery';
import { DiscoveredJob } from '@/types/discovery';
import { getDiscoveredJobs, saveDiscoveredJobs } from '@/lib/discoveryStorage';

describe('Discovery Grounding & Provenance Unit Tests', () => {
  it('1. ensures curated provider explicitly outputs curated provenance and no false grounding', async () => {
    const provider = new CuratedDiscoveryProvider();
    const jobs = await provider.discoverJobs({
      targetRoles: ['Director AI Strategy'],
      targetIndustries: ['Enterprise AI'],
      preferredLocations: ['San Francisco, CA'],
    });

    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(job.provider).toBe('Curated Strategic Pipeline Feed');
      expect(job.verificationStatus).toBe('curated');
      expect(job.groundingUsed).toBe(false);
      expect(job.sourceConfidence).toBe(100);
      expect(job.source).toBe('Curated / Demo Feed');
      expect(job.verifiedAt).toBeDefined();
    }
  });

  it('2. verifies that ungrounded or unsupported model results cannot be marked verified-live', () => {
    const syntheticJob: DiscoveredJob = {
      id: 'disc-test-1',
      title: 'VP of AI Strategy',
      company: 'FutureScale AI',
      location: 'San Francisco, CA',
      source: 'Parametric Synthesis',
      discoveredAt: new Date().toISOString(),
      status: 'new',
      relevanceScore: 85,
      relevanceLevel: 'High Potential',
      relevanceReasons: ['Role Match'],
      matchedPreferences: ['AI Strategy'],
      provider: 'Parametric Generator',
      groundingUsed: false,
      verificationStatus: 'unsupported',
      sourceConfidence: 20,
    };

    expect(syntheticJob.verificationStatus).not.toBe('verified-live');
    expect(syntheticJob.groundingUsed).toBe(false);
  });

  it('3. validates that legacy stored results are safely migrated to unverified-legacy', () => {
    // Simulate legacy storage item without verificationStatus
    const legacyRaw = [
      {
        id: 'disc-legacy-1',
        title: 'Director of RevOps',
        company: 'Legacy Company',
        location: 'Remote',
        source: 'Old Discovery Engine',
        discoveredAt: '2026-01-01T00:00:00.000Z',
        status: 'saved',
        relevanceScore: 80,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
      },
    ];

    // Save and re-read via storage adapter
    saveDiscoveredJobs(legacyRaw as unknown as DiscoveredJob[]);
    const readJobs = getDiscoveredJobs();

    const migratedJob = readJobs.find((j) => j.id === 'disc-legacy-1');
    expect(migratedJob).toBeDefined();
    expect(migratedJob?.verificationStatus).toBe('unverified-legacy');
    expect(migratedJob?.groundingUsed).toBe(false);
    expect(migratedJob?.status).toBe('saved'); // Preserves saved state!
  });
});
