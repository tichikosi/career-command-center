import { describe, it, expect } from 'vitest';
import {
  validateInterviewPrepGovernance,
  validateMockSessionGovernance,
} from '@/lib/server/governance';
import { CandidateProfile } from '@/types/candidate';
import { InterviewPreparation, InterviewSession } from '@/types/interview';

const mockCandidate: CandidateProfile = {
  id: 'cand-1',
  name: 'Tanaka Chikosi',
  headline: 'Engineering Executive',
  location: 'San Francisco, CA',
  summary: '15+ years experience',
  targetRoles: ['VP of Engineering'],
  targetIndustries: [],
  preferredLocations: [],
  coreCompetencies: ['Distributed Systems'],
  careerHistory: [],
  education: [],
  certifications: [],
  evidenceItems: [
    {
      id: 'EVID-REAL-01',
      type: 'achievement',
      title: 'Architected Core Engine',
      description: 'Platform scaled to 50k QPS',
      metric: '50k QPS',
      organization: 'TechCorp',
      skills: [],
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

describe('V3.3 AI Governance & Evidence Grounding Validators', () => {
  it('passes validation when all evidence citations and score bounds are valid', () => {
    const validPrep: InterviewPreparation = {
      id: 'prep-1',
      opportunityId: 'opp-1',
      candidateProfileId: 'cand-1',
      executiveRoleBrief: 'Executive Role Brief',
      candidatePositioning: 'Senior leader',
      strongestFitThemes: ['Scale'],
      materialGaps: [],
      whyThisCompany: 'Strong growth',
      whyThisRole: 'Matches skills',
      whyYou: 'Proven scale',
      questionsToAsk: ['What is team size?'],
      first90DaysPoints: ['Meet team'],
      riskFlags: [],
      questions: [
        {
          id: 'q1',
          question: 'How do you handle scale?',
          category: 'technical',
          expectedFocus: 'Scale',
          suggestedApproach: 'Use STAR',
          relevantEvidenceIds: ['EVID-REAL-01'],
        },
        { id: 'q2', question: 'Q2', category: 'behavioral', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
        { id: 'q3', question: 'Q3', category: 'strategic', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
        { id: 'q4', question: 'Q4', category: 'situational', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
        { id: 'q5', question: 'Q5', category: 'culture', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
      ],
      storyBank: [
        {
          id: 's1',
          title: 'Core Engine Scale',
          situation: 'High traffic',
          task: 'Scale',
          action: 'Redesigned engine',
          result: '50k QPS',
          evidenceIds: ['EVID-REAL-01'],
          applicableQuestionIds: ['q1'],
        },
      ],
      companyIntelligence: { available: false },
      compensationResearch: { available: false },
      readinessScore: {
        overall: 85,
        dimensions: {
          roleUnderstanding: 85,
          candidatePositioning: 85,
          storyPreparation: 85,
          gapMitigation: 85,
          companyKnowledge: 85,
          questionReadiness: 85,
        },
      },
      generatedAt: '2026-08-20T00:00:00.000Z',
      requestedModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.7-flash',
      executionMode: 'gemini',
      candidateUpdatedAt: '2026-08-01T00:00:00.000Z',
      opportunityUpdatedAt: '2026-08-01T00:00:00.000Z',
      isActive: true,
    };

    const result = validateInterviewPrepGovernance(validPrep, mockCandidate);
    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.metrics.groundingRatio).toBe(1.0);
  });

  it('fails validation when non-existent evidence citation IDs are present', () => {
    const invalidPrep: InterviewPreparation = {
      id: 'prep-1',
      opportunityId: 'opp-1',
      candidateProfileId: 'cand-1',
      executiveRoleBrief: 'Executive Role Brief',
      candidatePositioning: 'Senior leader',
      strongestFitThemes: ['Scale'],
      materialGaps: [],
      whyThisCompany: 'Strong growth',
      whyThisRole: 'Matches skills',
      whyYou: 'Proven scale',
      questionsToAsk: ['What is team size?'],
      first90DaysPoints: ['Meet team'],
      riskFlags: [],
      questions: [
        {
          id: 'q1',
          question: 'How do you handle scale?',
          category: 'technical',
          expectedFocus: 'Scale',
          suggestedApproach: 'Use STAR',
          relevantEvidenceIds: ['EVID-FAKE-999'], // INVALID!
        },
        { id: 'q2', question: 'Q2', category: 'behavioral', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
        { id: 'q3', question: 'Q3', category: 'strategic', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
        { id: 'q4', question: 'Q4', category: 'situational', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
        { id: 'q5', question: 'Q5', category: 'culture', expectedFocus: 'F', suggestedApproach: 'A', relevantEvidenceIds: [] },
      ],
      storyBank: [],
      companyIntelligence: { available: false },
      compensationResearch: { available: false },
      readinessScore: {
        overall: 80,
        dimensions: {
          roleUnderstanding: 80,
          candidatePositioning: 80,
          storyPreparation: 80,
          gapMitigation: 80,
          companyKnowledge: 80,
          questionReadiness: 80,
        },
      },
      generatedAt: '2026-08-20T00:00:00.000Z',
      requestedModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.7-flash',
      executionMode: 'gemini',
      candidateUpdatedAt: '2026-08-01T00:00:00.000Z',
      opportunityUpdatedAt: '2026-08-01T00:00:00.000Z',
      isActive: true,
    };

    const result = validateInterviewPrepGovernance(invalidPrep, mockCandidate);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('EVID-FAKE-999'))).toBe(true);
  });

  it('fails mock interview validation when dimension scores exceed rubric limits', () => {
    const invalidSession: InterviewSession = {
      id: 'sess-1',
      opportunityId: 'opp-1',
      mode: 'practice',
      difficulty: 'standard',
      exchanges: [
        {
          questionId: 'q1',
          question: 'Q1',
          questionCategory: 'behavioral',
          candidateAnswer: 'Answer 1',
          score: {
            relevance: 10, // OUT OF BOUNDS (1-5 limit)
            evidenceSpecificity: 3,
            strategicDepth: 3,
            executiveCommunication: 3,
            structure: 3,
            concision: 3,
          },
          coaching: { strengths: [], improvements: [] },
          evidenceCitations: [],
          answeredAt: new Date().toISOString(),
        },
      ],
      overallScore: 75,
      summary: 'Summary',
      strengths: [],
      improvementAreas: [],
      requestedModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.7-flash',
      executionMode: 'gemini',
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const result = validateMockSessionGovernance(invalidSession, mockCandidate);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('relevance'))).toBe(true);
  });
});
