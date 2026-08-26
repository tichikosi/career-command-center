import { describe, it, expect } from 'vitest';
import { InterviewPrepEngine } from '@/lib/server/interviewPrepEngine';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';

const mockCandidate: CandidateProfile = {
  id: 'cand-tanaka-1',
  name: 'Tanaka Chikosi',
  headline: 'VP of Engineering & AI Platforms',
  location: 'San Francisco, CA',
  summary: '15+ years leading high-scale distributed systems and enterprise AI platforms.',
  targetRoles: ['VP of Engineering', 'Head of AI'],
  targetIndustries: ['Enterprise SaaS', 'Fintech'],
  preferredLocations: ['San Francisco', 'Remote'],
  coreCompetencies: ['Distributed Systems', 'Platform Engineering', 'AI Governance'],
  careerHistory: [
    {
      id: 'role-1',
      company: 'PlatformScale Inc',
      title: 'VP of Platform Engineering',
      location: 'San Francisco, CA',
      startDate: '2021-01',
      endDate: 'Present',
      isCurrent: true,
      summary: 'Led 65-person engineering organization.',
      skills: ['Distributed Systems', 'Kubernetes'],
      evidenceItemIds: ['EVID-IMP-01', 'EVID-IMP-02'],
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  education: [],
  certifications: [],
  evidenceItems: [
    {
      id: 'EVID-IMP-01',
      type: 'achievement',
      title: 'Scaled Core Platform to 99.999% SLA',
      description: 'Architected multi-region platform infrastructure handling 50k QPS with 99.999% availability.',
      metric: '99.999% SLA across 50k QPS',
      organization: 'PlatformScale Inc',
      roleId: 'role-1',
      skills: ['High Availability', 'Architecture'],
      tags: ['Infrastructure'],
      verificationStatus: 'verified',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'EVID-IMP-02',
      type: 'achievement',
      title: 'Reduced Cloud Spend by $2.4M',
      description: 'Executed infrastructure optimization reducing annual compute costs by 32%.',
      metric: '$2.4M annual cost reduction',
      organization: 'PlatformScale Inc',
      roleId: 'role-1',
      skills: ['FinOps', 'Cost Optimization'],
      tags: ['Leadership'],
      verificationStatus: 'verified',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  sources: [],
  dataMode: 'user',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

const mockOpportunity: JobOpportunity = {
  id: 'opp-enterprise-lead',
  title: 'Head of Infrastructure',
  company: 'Apex Cloud',
  location: 'San Francisco, CA',
  compensation: '$280k - $340k + Equity',
  rawJobDescription: 'Lead enterprise infrastructure, Kubernetes platforms, and reliability engineering teams.',
  stage: 'Interviewing',
  priority: 'High',
  notes: '',
  actions: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  analysis: {
    overallFitScore: 89,
    recommendation: 'Apply',
    executiveSummary: 'Strong match for infrastructure leadership.',
    likelyMandate: 'Scale infrastructure org',
    keyRequirements: ['Kubernetes', 'Reliability'],
    scoreExplanation: 'Deep domain expertise matching mandate.',
    positioningNarrative: 'Enterprise cloud architect with proven cost and reliability track record.',
    qualifications: [
      {
        id: 'qual-1',
        category: 'Required',
        qualification: 'Platform Scalability',
        matchType: 'Strong Match',
        explanation: 'Built 99.999% SLA systems',
        supportingEvidenceCitationIds: ['EVID-IMP-01'],
      },
      {
        id: 'qual-2',
        category: 'Preferred',
        qualification: 'Experience with GCP Spanner',
        matchType: 'Material Gap',
        explanation: 'Primarily AWS/hybrid experience',
        supportingEvidenceCitationIds: [],
      },
    ],
    objections: [],
    recruiterQuestions: [],
    hiringManagerQuestions: [],
    recommendedStarStories: [],
    nextActions: [],
  },
};

describe('V3.3 Interview Prep Engine Unit Tests', () => {
  it('generates a complete evidence-grounded briefing in fallback/deterministic mode', async () => {
    const engine = new InterviewPrepEngine();
    const prep = await engine.generatePrep({
      opportunity: mockOpportunity,
      candidate: mockCandidate,
      analysisReport: mockOpportunity.analysis,
    });

    expect(prep).toBeDefined();
    expect(prep.executiveRoleBrief).toBeDefined();
    expect(prep.candidatePositioning).toBeDefined();
    expect(prep.questions.length).toBeGreaterThanOrEqual(5);
    expect(prep.storyBank.length).toBeGreaterThanOrEqual(1);

    // Verify evidence grounding
    const validEvidenceIds = new Set(mockCandidate.evidenceItems.map((e) => e.id));
    for (const story of prep.storyBank) {
      for (const eid of story.evidenceIds) {
        expect(validEvidenceIds.has(eid)).toBe(true);
      }
    }

    // Verify compensation parsing
    expect(prep.compensationResearch.available).toBe(true);
    expect(prep.compensationResearch.fromJobDescription).toBe('$280k - $340k + Equity');

    // Verify readiness score bounds
    expect(prep.readinessScore.overall).toBeGreaterThanOrEqual(0);
    expect(prep.readinessScore.overall).toBeLessThanOrEqual(100);
  });

  it('includes gap bridge strategy for identified material gaps', async () => {
    const engine = new InterviewPrepEngine();
    const prep = await engine.generatePrep({
      opportunity: mockOpportunity,
      candidate: mockCandidate,
      analysisReport: mockOpportunity.analysis,
    });

    expect(prep.materialGaps.length).toBeGreaterThan(0);
    expect(prep.materialGaps[0].gap).toBe('Experience with GCP Spanner');
    expect(prep.materialGaps[0].bridgeStrategy).toBeDefined();
  });
});
