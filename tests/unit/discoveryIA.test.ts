import { describe, it, expect } from 'vitest';
import { DiscoveredJob } from '@/types/discovery';
import { deduplicateDiscoveredJobs } from '@/lib/discoveryStorage';
import { JobOpportunity } from '@/types/opportunity';
import { createTestOpportunity } from '../fixtures/v33TestFixtures';

describe('V3.2 Simplified Discovery IA & Trust Filtration', () => {
  const sampleJobs: DiscoveredJob[] = [
    {
      id: 'job-1',
      title: 'VP Operations',
      company: 'Scale AI',
      location: 'San Francisco, CA',
      jobUrl: 'https://scale.com/careers/vp',
      source: 'Gemini Grounding',
      discoveredAt: new Date().toISOString(),
      status: 'new',
      relevanceScore: 92,
      relevanceLevel: 'High Potential',
      relevanceReasons: [],
      matchedPreferences: [],
      provider: 'gemini',
      groundingUsed: true,
      verificationStatus: 'verified-live',
    },
    {
      id: 'job-2',
      title: 'Chief of Staff',
      company: 'OpenAI',
      location: 'San Francisco, CA',
      jobUrl: 'https://openai.com/careers/cos',
      source: 'Gemini Grounding',
      discoveredAt: new Date().toISOString(),
      status: 'saved',
      relevanceScore: 88,
      relevanceLevel: 'High Potential',
      relevanceReasons: [],
      matchedPreferences: [],
      provider: 'gemini',
      groundingUsed: true,
      verificationStatus: 'grounded-unverified',
    },
    {
      id: 'job-3',
      title: 'Director Strategy',
      company: 'Google',
      location: 'Mountain View, CA',
      jobUrl: 'https://google.com/jobs/dir',
      source: 'Curated Strategic Feed',
      discoveredAt: new Date().toISOString(),
      status: 'promoted',
      relevanceScore: 85,
      relevanceLevel: 'High Potential',
      relevanceReasons: [],
      matchedPreferences: [],
      provider: 'curated',
      groundingUsed: false,
      verificationStatus: 'curated',
    },
    {
      id: 'job-4',
      title: 'Head of Business Ops',
      company: 'Databricks',
      location: 'San Francisco, CA',
      jobUrl: 'https://databricks.com/jobs/bizops',
      source: 'Gemini Grounding',
      discoveredAt: new Date().toISOString(),
      status: 'dismissed',
      relevanceScore: 78,
      relevanceLevel: 'Possible Fit',
      relevanceReasons: [],
      matchedPreferences: [],
      provider: 'gemini',
      groundingUsed: true,
      verificationStatus: 'verified-live',
    },
  ];

  it('filters primary Live tab exclusively to active live/curated roles that are not dismissed or promoted', () => {
    const liveJobs = sampleJobs.filter(
      (j) => (j.verificationStatus === 'verified-live' || j.verificationStatus === 'curated' || j.groundingUsed) &&
        j.status !== 'dismissed' &&
        j.status !== 'promoted'
    );

    expect(liveJobs).toHaveLength(2);
    expect(liveJobs.map((j) => j.id)).toEqual(['job-1', 'job-2']);
  });

  it('filters saved tab accurately', () => {
    const savedJobs = sampleJobs.filter((j) => j.status === 'saved');
    expect(savedJobs).toHaveLength(1);
    expect(savedJobs[0].id).toBe('job-2');
  });

  it('filters promoted tab accurately', () => {
    const promotedJobs = sampleJobs.filter((j) => j.status === 'promoted');
    expect(promotedJobs).toHaveLength(1);
    expect(promotedJobs[0].id).toBe('job-3');
  });

  it('filters dismissed tab accurately', () => {
    const dismissedJobs = sampleJobs.filter((j) => j.status === 'dismissed');
    expect(dismissedJobs).toHaveLength(1);
    expect(dismissedJobs[0].id).toBe('job-4');
  });

  it('deduplicates incoming discovery runs against both discovery cache and active opportunities', () => {
    const incoming: DiscoveredJob[] = [
      {
        id: 'new-job-a',
        title: 'VP Operations',
        company: 'Scale AI', // duplicate of job-1
        location: 'San Francisco, CA',
        jobUrl: 'https://scale.com/careers/vp',
        source: 'Gemini Grounding',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        relevanceScore: 90,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'gemini',
        groundingUsed: true,
        verificationStatus: 'verified-live',
      },
      {
        id: 'new-job-b',
        title: 'VP Product',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        jobUrl: 'https://anthropic.com/careers/vp-product',
        source: 'Gemini Grounding',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        relevanceScore: 95,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'gemini',
        groundingUsed: true,
        verificationStatus: 'verified-live',
      },
    ];

    const activeOpps: JobOpportunity[] = [
      createTestOpportunity({
        id: 'opp-scale',
        company: 'Scale AI',
        title: 'VP Operations',
        stage: 'Identified',
        priority: 'High',
        notes: '',
      }),
    ];

    const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(
      incoming,
      sampleJobs,
      activeOpps
    );

    expect(uniqueJobs).toHaveLength(1);
    expect(uniqueJobs[0].company).toBe('Anthropic');
    expect(duplicatesCount).toBe(1);
  });
});
