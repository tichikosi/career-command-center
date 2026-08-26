import { describe, it, expect } from 'vitest';
import { CuratedDiscoveryProvider } from '@/lib/server/curatedDiscovery';
import {
  deduplicateDiscoveredJobs,
  scoreDiscoveryRelevance,
  promoteDiscoveredJobToOpportunity,
  saveDiscoveredJobs,
  getDiscoveredJobs,
  recordDiscoveryRun,
  getDiscoveryHistory,
} from '@/lib/discoveryStorage';
import { CandidateProfile } from '@/types/candidate';
import { DiscoveredJob } from '@/types/discovery';
import { JobOpportunity } from '@/types/opportunity';
import { getOpportunityById } from '@/lib/storage';

describe('V3 Opportunity Discovery Workspace & Automation', () => {
  const mockCandidate: CandidateProfile = {
    id: 'cand-tanaka',
    name: 'Tanaka Ian Chikosi',
    headline: 'AI GTM, Strategy & Operations Leader',
    location: 'San Francisco, CA',
    summary: 'Executive leader in AI strategy.',
    targetRoles: ['Director, AI Strategy & Operations', 'Head of Business Operations'],
    targetIndustries: ['Enterprise AI', 'SaaS'],
    preferredLocations: ['San Francisco, CA', 'Remote'],
    coreCompetencies: ['AI Strategy', 'Operations', 'GTM'],
    careerHistory: [],
    education: [],
    certifications: [],
    evidenceItems: [],
    sources: [],
    updatedAt: '2026-08-14T00:00:00.000Z',
    dataMode: 'user',
  };

  it('curated discovery provider returns valid structured job listings', async () => {
    const provider = new CuratedDiscoveryProvider();
    expect(await provider.isAvailable()).toBe(true);

    const jobs = await provider.discoverJobs({
      targetRoles: ['AI Strategy', 'Operations'],
      targetIndustries: ['Enterprise AI'],
      preferredLocations: ['San Francisco, CA'],
    });

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBeGreaterThanOrEqual(4);

    const firstJob = jobs[0];
    expect(firstJob.id).toBeDefined();
    expect(firstJob.company).toBeDefined();
    expect(firstJob.title).toBeDefined();
    expect(firstJob.location).toBeDefined();
    expect(firstJob.jobUrl).toBeDefined();
    expect(firstJob.status).toBe('new');
  });

  it('deduplicates incoming discovery jobs against existing queue and active pipeline opportunities', () => {
    const existingJobs: DiscoveredJob[] = [
      {
        id: 'disc-1',
        title: 'Director, AI Strategy',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/101',
        source: 'Feed',
        discoveredAt: '2026-03-01T00:00:00.000Z',
        status: 'new',
        relevanceScore: 90,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'feed',
        groundingUsed: false,
        verificationStatus: 'grounded-unverified',
      },
    ];

    const activeOpportunities: JobOpportunity[] = [
      {
        id: 'opp-1',
        title: 'VP of Scaled Operations',
        company: 'Databricks',
        location: 'San Francisco, CA',
        applicationUrl: 'https://databricks.com/jobs/202',
        rawJobDescription: '',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        stage: 'Identified',
        priority: 'High',
        notes: '',
        actions: [],
        analysis: {
          overallFitScore: 85,
          recommendation: 'Apply',
          executiveSummary: '',
          likelyMandate: '',
          keyRequirements: [],
          scoreExplanation: '',
          positioningNarrative: '',
          qualifications: [],
          objections: [],
          recruiterQuestions: [],
          hiringManagerQuestions: [],
          recommendedStarStories: [],
          nextActions: [],
        },
      },
    ];

    const incomingJobs: DiscoveredJob[] = [
      // Exact duplicate by URL
      {
        id: 'disc-new-1',
        title: 'Director, AI Strategy',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/101',
        source: 'Feed',
        discoveredAt: '2026-03-02T00:00:00.000Z',
        status: 'new',
        relevanceScore: 90,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'feed',
        groundingUsed: false,
        verificationStatus: 'grounded-unverified',
      },
      // Exact duplicate by Company + Title fingerprint
      {
        id: 'disc-new-2',
        title: 'VP of Scaled Operations',
        company: 'Databricks',
        location: 'San Francisco, CA',
        jobUrl: 'https://other-url.com/jobs/999',
        source: 'Feed',
        discoveredAt: '2026-03-02T00:00:00.000Z',
        status: 'new',
        relevanceScore: 85,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'feed',
        groundingUsed: false,
        verificationStatus: 'grounded-unverified',
      },
      // Genuine Net-New Job
      {
        id: 'disc-new-3',
        title: 'Head of RevOps',
        company: 'Stripe',
        location: 'San Francisco, CA',
        jobUrl: 'https://stripe.com/jobs/revops-lead',
        source: 'Feed',
        discoveredAt: '2026-03-02T00:00:00.000Z',
        status: 'new',
        relevanceScore: 88,
        relevanceLevel: 'High Potential',
        relevanceReasons: [],
        matchedPreferences: [],
        provider: 'feed',
        groundingUsed: false,
        verificationStatus: 'grounded-unverified',
      },
    ];

    const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(
      incomingJobs,
      existingJobs,
      activeOpportunities
    );

    expect(duplicatesCount).toBe(2);
    expect(uniqueJobs).toHaveLength(1);
    expect(uniqueJobs[0].id).toBe('disc-new-3');
    expect(uniqueJobs[0].company).toBe('Stripe');
  });

  it('calculates relevance score accurately against candidate target profiles', () => {
    const highMatchJob: Partial<DiscoveredJob> = {
      title: 'Director, AI Strategy & Enablement',
      company: 'ScaleAI',
      location: 'San Francisco, CA',
      snippet: 'Lead enterprise AI enablement, GTM strategy, and operational models.',
    };

    const scoredHigh = scoreDiscoveryRelevance(highMatchJob, mockCandidate);
    expect(scoredHigh.relevanceScore).toBeGreaterThanOrEqual(80);
    expect(scoredHigh.relevanceLevel).toBe('High Potential');
    expect(scoredHigh.relevanceReasons.length).toBeGreaterThan(0);

    const lowMatchJob: Partial<DiscoveredJob> = {
      title: 'Junior Web Designer',
      company: 'Local Bakery',
      location: 'Austin, TX',
      snippet: 'Design CSS layouts for local bakery website.',
    };

    const scoredLow = scoreDiscoveryRelevance(lowMatchJob, mockCandidate);
    expect(scoredLow.relevanceScore).toBeLessThan(60);
    expect(scoredLow.relevanceLevel).toBe('Low Relevance');
  });

  it('promotes discovered job to active pipeline opportunity', () => {
    const job: DiscoveredJob = {
      id: 'disc-promote-test',
      title: 'Principal, AI Solutions',
      company: 'OpenAI',
      location: 'San Francisco, CA',
      compensation: '$260,000 - $330,000 + Equity',
      jobUrl: 'https://openai.com/careers/ai-solutions',
      source: 'OpenAI Careers',
      discoveredAt: '2026-03-15T00:00:00.000Z',
      status: 'new',
      relevanceScore: 92,
      relevanceLevel: 'High Potential',
      relevanceReasons: ['Role match'],
      matchedPreferences: ['AI Strategy'],
      description: 'Lead strategic enterprise client AI architectures and transformations.',
      provider: 'OpenAI Careers',
      groundingUsed: false,
      verificationStatus: 'verified-live',
    };

    saveDiscoveredJobs([job]);

    const createdOpp = promoteDiscoveredJobToOpportunity(job);
    expect(createdOpp).toBeDefined();
    expect(createdOpp.company).toBe('OpenAI');
    expect(createdOpp.title).toBe('Principal, AI Solutions');
    expect(createdOpp.stage).toBe('Identified');
    expect(createdOpp.applicationUrl).toBe('https://openai.com/careers/ai-solutions');
    expect(createdOpp.notes).toContain('OpenAI Careers');

    // Verify stored opportunity
    const fromStorage = getOpportunityById(createdOpp.id);
    expect(fromStorage).toBeDefined();
    expect(fromStorage?.company).toBe('OpenAI');

    // Verify job status updated to promoted
    const discoveredList = getDiscoveredJobs();
    const targetJob = discoveredList.find((j) => j.id === job.id);
    expect(targetJob?.status).toBe('promoted');
  });

  it('records discovery execution run in history', () => {
    const historyItem = recordDiscoveryRun({
      runAt: '2026-03-15T12:00:00.000Z',
      source: 'Gemini Intelligent Market Discovery',
      rolesDiscovered: 8,
      newRolesCount: 6,
      deduplicatedCount: 2,
      durationMs: 1450,
      status: 'success',
      provider: 'gemini',
      groundingEnabled: true,
    });

    expect(historyItem.id).toBeDefined();
    const history = getDiscoveryHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].rolesDiscovered).toBe(8);
    expect(history[0].source).toBe('Gemini Intelligent Market Discovery');
  });
});
