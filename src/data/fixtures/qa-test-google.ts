import { FitAnalysisReport } from '@/types/opportunity';

export interface CandidateAnalysisContext {
  candidateName: string;
  candidatePossessive: string;
}

export function buildQaTestGoogleAnalysis(ctx: CandidateAnalysisContext): FitAnalysisReport {
  const { candidateName, candidatePossessive } = ctx;

  return {
    executiveSummary:
      `[QA TEST OPPORTUNITY] Strong operational and strategic alignment for Director, AI Strategy & Operations at Google. ${candidatePossessive} experience in enterprise AI enablement, cross-functional leadership, and operational scale maps directly to Google's AI business mandate.`,
    likelyMandate:
      'Lead cross-functional AI strategy and operational execution across Google teams to scale enterprise AI enablement and cross-organizational alignment.',
    keyRequirements: [
      '10+ years technology strategy, operations, or enterprise GTM leadership',
      'Demonstrated success scaling AI initiatives and operational frameworks',
      'Strong executive communication and matrixed stakeholder management',
      'Strategic program budget oversight and cross-functional alignment',
    ],
    overallFitScore: 92,
    scoreExplanation:
      `Overall Fit Score of 92% (Apply threshold: >= 85%). ${candidateName} demonstrates strong evidence across core AI strategy and operational domains.`,
    recommendation: 'Network First',
    positioningNarrative:
      'Proven strategy and operations leader with deep experience scaling enterprise AI enablement programs, aligning matrixed executive teams, and establishing operational review rhythms.',
    qualifications: [
      {
        id: 'qa-q1',
        category: 'Required',
        qualification: '10+ years in technology strategy, operations, or enterprise GTM leadership',
        matchType: 'Strong Match',
        explanation: `${candidateName} possesses extensive leadership experience across technology enterprises.`,
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'qa-q2',
        category: 'Required',
        qualification: 'Demonstrated success scaling AI initiatives and operational frameworks',
        matchType: 'Strong Match',
        explanation: 'Demonstrated track record scaling AI strategy and operational initiatives.',
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'qa-q3',
        category: 'Required',
        qualification: 'Strong executive communication and matrixed stakeholder management',
        matchType: 'Strong Match',
        explanation: 'Proven executive stakeholder management and organizational rhythm alignment.',
        supportingEvidenceCitationIds: [],
      },
    ],
    objections: [
      {
        id: 'qa-obj-1',
        objection: 'How does candidate navigate internal cross-functional consensus at Google scale?',
        counterPositioning:
          `Highlight ${candidateName}'s experience managing matrixed executive review rhythms and driving multi-team alignment.`,
        supportingCitationId: '',
      },
    ],
    recruiterQuestions: [
      'What specific AI enablement challenges are top of mind for this group at Google?',
      'How does the team balance long-term strategic initiatives with near-term operational delivery?',
    ],
    hiringManagerQuestions: [
      'What are the key milestones expected in the first 90 days for this AI Strategy & Operations role?',
      'How does this role interface with engineering, product, and regional GTM teams?',
    ],
    recommendedStarStories: [],
    nextActions: [
      'Reach out to Google internal connections for warm intro / referral context',
      'Review Google AI principles and enterprise strategy whitepapers',
      'Tailor executive presentation on AI operational frameworks',
    ],
    isFallbackAnalysis: false,
  };
}

export const fixtureQaTestGoogle: FitAnalysisReport = {
  ...buildQaTestGoogleAnalysis({
    candidateName: 'Tanaka Ian Chikosi',
    candidatePossessive: 'Tanaka Ian Chikosi’s',
  }),
  candidateProvenance: {
    candidateId: 'cand-user-tanaka-chikosi',
    candidateName: 'Tanaka Ian Chikosi',
    dataMode: 'user',
    profileUpdatedAt: '2026-08-14T00:00:00.000Z',
    analyzedAt: '2026-08-14T20:00:00.000Z',
    provenanceStatus: 'known',
  },
};
