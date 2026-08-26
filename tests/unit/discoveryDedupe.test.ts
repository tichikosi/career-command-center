import { describe, it, expect } from 'vitest';
import {
  deduplicateDiscoveredJobs,
  normalizeJobUrl,
  generateJobFingerprint,
} from '@/lib/discoveryStorage';
import { DiscoveredJob } from '@/types/discovery';
import { JobOpportunity } from '@/types/opportunity';

import { createTestOpportunity } from '../fixtures/v33TestFixtures';

describe('Discovery Deduplication V2 Unit Tests', () => {
  it('1. normalizes URLs by stripping tracking parameters', () => {
    const rawUrl1 = 'https://boards.greenhouse.io/anthropic/jobs/12345?utm_source=linkedin&utm_medium=job_post&gh_src=custom#apply';
    const rawUrl2 = 'https://boards.greenhouse.io/anthropic/jobs/12345/';

    expect(normalizeJobUrl(rawUrl1)).toBe('https://boards.greenhouse.io/anthropic/jobs/12345#apply');
    expect(normalizeJobUrl(rawUrl2)).toBe('https://boards.greenhouse.io/anthropic/jobs/12345');
  });

  it('2. generates identical semantic fingerprints for legal name and case variations', () => {
    const fp1 = generateJobFingerprint('Anthropic, Inc.', 'Director, AI Strategy & GTM Operations', 'San Francisco, CA');
    const fp2 = generateJobFingerprint('anthropic', 'director ai strategy gtm operations', 'San Francisco, CA (Hybrid)');

    expect(fp1).toBe(fp2);
  });

  it('3. filters duplicates by canonical URL', () => {
    const existing: DiscoveredJob[] = [
      {
        id: 'job-1',
        title: 'Director of AI Strategy',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/12345',
        source: 'Google Search',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        relevanceScore: 90,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'Gemini',
        groundingUsed: true,
        verificationStatus: 'verified-live',
      },
    ];

    const incoming: DiscoveredJob[] = [
      {
        id: 'job-2',
        title: 'Director of AI Strategy',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/12345?utm_source=google_jobs',
        source: 'Google Search',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        relevanceScore: 90,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'Gemini',
        groundingUsed: true,
        verificationStatus: 'verified-live',
      },
      {
        id: 'job-3',
        title: 'VP of Product Operations',
        company: 'Scale AI',
        location: 'San Francisco, CA',
        jobUrl: 'https://scale.com/careers/vp-product-ops',
        source: 'Google Search',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        relevanceScore: 85,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'Gemini',
        groundingUsed: true,
        verificationStatus: 'verified-live',
      },
    ];

    const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(incoming, existing, []);
    expect(uniqueJobs.length).toBe(1);
    expect(uniqueJobs[0].id).toBe('job-3');
    expect(duplicatesCount).toBe(1);
  });

  it('4. deduplicates against active opportunities already in pipeline', () => {
    const activeOpps: JobOpportunity[] = [
      createTestOpportunity({
        id: 'opp-1',
        title: 'Director AI Strategy',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        sourceUrl: 'https://boards.greenhouse.io/anthropic/jobs/12345',
        stage: 'Identified',
        priority: 'High',
      }),
    ];

    const incoming: DiscoveredJob[] = [
      {
        id: 'job-new-1',
        title: 'Director AI Strategy',
        company: 'Anthropic, Inc.',
        location: 'San Francisco, CA',
        jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/12345',
        source: 'Google Search',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        relevanceScore: 90,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'Gemini',
        groundingUsed: true,
        verificationStatus: 'verified-live',
      },
    ];

    const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(incoming, [], activeOpps);
    expect(uniqueJobs.length).toBe(0);
    expect(duplicatesCount).toBe(1);
  });
});
