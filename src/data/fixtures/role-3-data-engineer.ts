import { FitAnalysisReport } from '@/types/opportunity';
import { CandidateAnalysisContext } from './role-1-ai-strategy';

export function buildRole3Analysis(ctx: CandidateAnalysisContext): FitAnalysisReport {
  const { candidateName, candidatePossessive } = ctx;

  return {
    executiveSummary:
      `Poor alignment (40% Fit Score — Deprioritize). This position is a technical hands-on engineering role requiring 8+ years of PySpark, Scala, and low-level data pipeline development. ${candidatePossessive} background is in strategy and operations, with no software engineering experience.`,
    likelyMandate:
      'Build low-latency distributed data pipelines and database infrastructure using PySpark, Scala, and cloud data warehouses.',
    keyRequirements: [
      '8+ years hands-on development experience in PySpark, Scala, and distributed data systems',
      'Deep expertise in SQL query engine tuning and custom C++/Scala ETL kernels',
      'Infrastructure-as-code and Kubernetes data cluster deployment',
      'Cross-functional strategic planning and executive presentation',
    ],
    overallFitScore: 40,
    scoreExplanation:
      'Overall Fit Score of 40% (Deprioritize threshold: 0–49%). Score reflects severe negative impact from core technical Material Gaps (PySpark/Scala development and C++ ETL kernels), partially offset by general executive presentation skills.',
    recommendation: 'Deprioritize',
    positioningNarrative:
      'While I have broad strategic experience directing operational technology enablement, this role requires specialized hands-on software engineering in PySpark and Scala that falls outside my core competencies in business strategy and RevOps.',
    qualifications: [
      {
        id: 'q3-1',
        category: 'Required',
        qualification: '8+ years hands-on Distributed PySpark / Scala software development',
        matchType: 'Material Gap',
        explanation:
          `${candidateName} is a strategy and operations executive with no background in hands-on software development or PySpark/Scala programming.`,
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'q3-2',
        category: 'Required',
        qualification: 'Deep expertise in database engine tuning and custom C++ ETL kernels',
        matchType: 'Material Gap',
        explanation:
          `${candidateName} does not possess database kernel engineering or C++ software development capabilities.`,
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'q3-3',
        category: 'Preferred',
        qualification: 'Cross-functional strategic planning and executive presentation',
        matchType: 'Strong Match',
        explanation:
          'Extensive experience presenting strategic roadmaps to C-suite and Board members.',
        supportingEvidenceCitationIds: ['EVID-2023-01', 'EVID-2023-02'],
      },
    ],
    objections: [
      {
        id: 'obj-3-1',
        objection: 'Candidate lacks all required technical software engineering credentials.',
        counterPositioning:
          'Acknowledge lack of fit. Recommend focusing candidate efforts on AI Strategy or Ops roles instead.',
        supportingCitationId: undefined,
      },
    ],
    recruiterQuestions: [
      'Is there a parallel strategic AI Strategy or Business Operations role open at the company that matches a non-engineering profile?',
    ],
    hiringManagerQuestions: [],
    recommendedStarStories: [],
    nextActions: [
      'Deprioritize application for this engineering role',
      'Search target company career site for open Director of Strategy or RevOps positions',
    ],
    isFallbackAnalysis: false,
  };
}

export const fixtureRole3DataEngineer: FitAnalysisReport = {
  ...buildRole3Analysis({
    candidateName: 'Alex Vance',
    candidatePossessive: 'Alex Vance’s',
  }),
  candidateProvenance: {
    candidateId: 'cand-synthetic-alex-vance',
    candidateName: 'Alex Vance',
    dataMode: 'synthetic',
    profileUpdatedAt: '2026-01-01T00:00:00.000Z',
    analyzedAt: '2026-07-15T09:00:00.000Z',
    provenanceStatus: 'known',
  },
};
