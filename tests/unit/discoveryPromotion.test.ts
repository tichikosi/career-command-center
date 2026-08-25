import { describe, it, expect } from 'vitest';
import { promoteDiscoveredJobToOpportunity } from '@/lib/discoveryStorage';
import { DiscoveredJob } from '@/types/discovery';

describe('Discovery Opportunity Promotion Unit Tests', () => {
  it('1. preserves full source provenance and URL when promoting discovered job', () => {
    const discovered: DiscoveredJob = {
      id: 'job-promote-1',
      title: 'Director of AI Strategy & Operations',
      company: 'ScaleMetric Technologies',
      location: 'San Francisco, CA',
      compensation: '$250,000 - $320,000 + Equity',
      jobUrl: 'https://boards.greenhouse.io/scalemetric/jobs/director-ai-ops',
      finalCanonicalUrl: 'https://boards.greenhouse.io/scalemetric/jobs/director-ai-ops',
      source: 'Google Search Grounding',
      discoveredAt: '2026-03-20T12:00:00.000Z',
      status: 'new',
      relevanceScore: 92,
      relevanceLevel: 'High Potential',
      relevanceReasons: ['Direct Target Role Match'],
      matchedPreferences: ['AI Strategy'],
      provider: 'Gemini Intelligent Market Discovery',
      groundingUsed: true,
      verificationStatus: 'verified-live',
      verifiedAt: '2026-03-20T12:00:00.000Z',
      sourceConfidence: 95,
      sourceDomain: 'greenhouse.io',
      snippet: 'Lead enterprise AI operational deployment and executive rhythms.',
    };

    const opp = promoteDiscoveredJobToOpportunity(discovered);

    expect(opp).toBeDefined();
    expect(opp.company).toBe('ScaleMetric Technologies');
    expect(opp.title).toBe('Director of AI Strategy & Operations');
    expect(opp.stage).toBe('Identified');
    expect(opp.priority).toBe('High');
    expect(opp.sourceUrl).toBe('https://boards.greenhouse.io/scalemetric/jobs/director-ai-ops');
    expect(opp.applicationUrl).toBe('https://boards.greenhouse.io/scalemetric/jobs/director-ai-ops');
    expect(opp.notes).toContain('Gemini Intelligent Market Discovery');
    expect(opp.notes).toContain('verified-live');
    expect(opp.notes).toContain('92%');

    // Discovery relevance is distinct from full fit analysis report
    expect(opp.analysisReport).toBeUndefined();
  });
});
