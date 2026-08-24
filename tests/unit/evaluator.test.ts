import { describe, it, expect } from 'vitest';
import { evaluateReport } from '@/lib/evaluator';
import { TEST_CANDIDATE_PROFILE } from '../fixtures/test-data';
import { FitAnalysisReport } from '@/types/opportunity';

describe('AI Evaluation & Governance Library', () => {
  const validReport: FitAnalysisReport = {
    executiveSummary: 'Strong strategic alignment with director level requirements.',
    likelyMandate: 'Transform GTM operations and automate enterprise AI enablement.',
    keyRequirements: ['Strategic Leadership', 'RevOps Alignment', 'AI Enablement'],
    overallFitScore: 91,
    scoreExplanation: 'Score calculated using weighted qualification signals.',
    recommendation: 'Apply',
    positioningNarrative: '12+ years of enterprise operational execution.',
    qualifications: [
      {
        id: 'q1',
        category: 'Required',
        qualification: 'Executive AI Strategy',
        matchType: 'Strong Match',
        explanation: 'Led enterprise AI taskforce.',
        supportingEvidenceCitationIds: ['EVID-2024-01'],
      },
    ],
    objections: [
      {
        id: 'obj1',
        objection: 'Candidate has broader strategy experience than deep engineering.',
        counterPositioning: 'Emphasize architectural oversight and vendor leadership.',
      },
    ],
    recruiterQuestions: ['What are the 90-day targets?'],
    hiringManagerQuestions: ['How is the strategy team structured?'],
    recommendedStarStories: [
      {
        id: 's1',
        title: 'Enterprise AI Enablement',
        situation: 'Large enterprise lacked unified AI framework.',
        task: 'Drive cross-functional AI adoption.',
        action: 'Formed taskforce and delivered executive enablement.',
        result: 'Trained 450+ leaders with high adoption rate.',
        citationIds: ['EVID-2024-01'],
      },
    ],
    nextActions: ['Prepare recruiter screening notes', 'Review compensation metrics'],
  };

  it('computes 100% schema adherence and grounding on a valid, grounded report', () => {
    const result = evaluateReport(
      validReport,
      TEST_CANDIDATE_PROFILE,
      'opp-test-1',
      'Director AI Strategy',
      'ServiceNow'
    );

    expect(result.schemaAdherence.passed).toBe(true);
    expect(result.schemaAdherence.score).toBe(100);
    expect(result.evidenceGrounding.passed).toBe(true);
    expect(result.evidenceGrounding.score).toBe(100);
    expect(result.hallucinationSafety.passed).toBe(true);
    expect(result.recommendationConsistency.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
  });

  it('penalizes evidence grounding and flags hallucination for fabricated citation IDs', () => {
    const ungroundedReport: FitAnalysisReport = {
      ...validReport,
      recommendedStarStories: [],
      qualifications: [
        {
          id: 'q1',
          category: 'Required',
          qualification: 'Executive AI Strategy',
          matchType: 'Strong Match',
          explanation: 'Claimed experience.',
          supportingEvidenceCitationIds: ['FABRICATED-CITATION-999'],
        },
      ],
    };

    const result = evaluateReport(
      ungroundedReport,
      TEST_CANDIDATE_PROFILE,
      'opp-test-2',
      'Role',
      'Company'
    );

    expect(result.evidenceGrounding.passed).toBe(false);
    expect(result.evidenceGrounding.score).toBe(0);
    expect(result.evidenceGrounding.notes.length).toBeGreaterThan(0);
    expect(result.hallucinationSafety.notes.length).toBeGreaterThan(0);
  });

  it('flags recommendation inconsistency when fit score does not align with recommendation type', () => {
    const inconsistentReport: FitAnalysisReport = {
      ...validReport,
      overallFitScore: 40, // Score < 50 expects "Deprioritize"
      recommendation: 'Apply', // Inconsistent!
    };

    const result = evaluateReport(
      inconsistentReport,
      TEST_CANDIDATE_PROFILE,
      'opp-test-3',
      'Role',
      'Company'
    );

    expect(result.recommendationConsistency.passed).toBe(false);
    expect(result.recommendationConsistency.notes[0]).toContain('does not match recommendation');
  });
});
