import { describe, it, expect } from 'vitest';
import { MockInterviewEngine } from '@/lib/server/mockInterviewEngine';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import { MockInterviewExchange } from '@/types/interview';

const mockCandidate: CandidateProfile = {
  id: 'cand-1',
  name: 'Tanaka Chikosi',
  headline: 'Engineering Executive',
  location: 'San Francisco, CA',
  summary: 'Engineering leader with 15+ years experience.',
  targetRoles: ['VP of Engineering'],
  targetIndustries: ['Enterprise Software'],
  preferredLocations: ['San Francisco'],
  coreCompetencies: ['Leadership', 'Architecture'],
  careerHistory: [],
  education: [],
  certifications: [],
  evidenceItems: [
    {
      id: 'EVID-IMP-01',
      type: 'achievement',
      title: 'Delivered 99.999% SLA',
      description: 'Scaled platform across multi-region infrastructure with 99.999% uptime.',
      metric: '99.999% SLA',
      organization: 'PlatformScale Inc',
      skills: ['Reliability'],
      tags: [],
      verificationStatus: 'verified',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  sources: [],
  dataMode: 'user',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const mockOpportunity: JobOpportunity = {
  id: 'opp-1',
  title: 'VP of Engineering',
  company: 'CloudWorks',
  rawJobDescription: 'Lead technical organization and distributed platforms.',
  stage: 'Interviewing',
  priority: 'High',
  notes: '',
  actions: [],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  analysis: {
    overallFitScore: 90,
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
};

describe('V3.3 Mock Interview Engine Unit Tests', () => {
  it('generates role-specific questions for standard and executive difficulty', async () => {
    const engine = new MockInterviewEngine();
    const result = await engine.generateQuestions({
      opportunity: mockOpportunity,
      candidate: mockCandidate,
      difficulty: 'executive',
      mode: 'practice',
    });

    expect(result.questions.length).toBeGreaterThanOrEqual(4);
    expect(result.questions[0].question).toBeDefined();
    expect(result.questions[0].category).toBeDefined();
  });

  it('evaluates candidate answer with 6-dimension scoring and actionable coaching', async () => {
    const engine = new MockInterviewEngine();
    const answer =
      'At PlatformScale Inc, I led the architecture team to deliver 99.999% SLA across 50k QPS while reducing cloud infrastructure costs by $2.4M.';

    const evaluation = await engine.evaluateAnswer({
      question: 'Tell me about a time you led an infrastructure transformation.',
      questionCategory: 'behavioral',
      candidateAnswer: answer,
      opportunity: mockOpportunity,
      candidate: mockCandidate,
      difficulty: 'standard',
    });

    expect(evaluation.score).toBeDefined();
    expect(evaluation.score.relevance).toBeGreaterThanOrEqual(1);
    expect(evaluation.score.relevance).toBeLessThanOrEqual(5);
    expect(evaluation.score.evidenceSpecificity).toBeGreaterThanOrEqual(1);
    expect(evaluation.score.strategicDepth).toBeGreaterThanOrEqual(1);
    expect(evaluation.score.executiveCommunication).toBeGreaterThanOrEqual(1);
    expect(evaluation.score.structure).toBeGreaterThanOrEqual(1);
    expect(evaluation.score.concision).toBeGreaterThanOrEqual(1);

    expect(evaluation.coaching.strengths.length).toBeGreaterThan(0);
    expect(evaluation.coaching.improvements.length).toBeGreaterThan(0);
  });

  it('aggregates session summary and score correctly', () => {
    const engine = new MockInterviewEngine();
    const exchanges: MockInterviewExchange[] = [
      {
        questionId: 'q1',
        question: 'Q1',
        questionCategory: 'behavioral',
        candidateAnswer: 'Answer 1',
        score: {
          relevance: 4,
          evidenceSpecificity: 4,
          strategicDepth: 4,
          executiveCommunication: 4,
          structure: 4,
          concision: 4,
        },
        coaching: { strengths: ['Good'], improvements: ['More detail'] },
        evidenceCitations: [],
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: 'q2',
        question: 'Q2',
        questionCategory: 'technical',
        candidateAnswer: 'Answer 2',
        score: {
          relevance: 5,
          evidenceSpecificity: 5,
          strategicDepth: 5,
          executiveCommunication: 5,
          structure: 5,
          concision: 5,
        },
        coaching: { strengths: ['Excellent'], improvements: [] },
        evidenceCitations: [],
        answeredAt: new Date().toISOString(),
      },
    ];

    const summary = engine.generateSessionSummary(exchanges);

    // Average of 4 and 5 is 4.5 out of 5 -> 90%
    expect(summary.overallScore).toBe(90);
    expect(summary.summary).toContain('overall score of 90/100');
    expect(summary.strengths.length).toBeGreaterThan(0);
  });
});
