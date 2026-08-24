import { FitAnalysisReport } from '@/types/opportunity';
import { CandidateAnalysisContext } from './role-1-ai-strategy';

export function buildRole4Analysis(ctx: CandidateAnalysisContext): FitAnalysisReport {
  const { candidateName, candidatePossessive } = ctx;

  return {
    executiveSummary:
      `Strong adjacent alignment (86% Fit Score — Apply). ${candidatePossessive} background leading C-suite operational rhythms, board reporting frameworks, post-merger integration, and change management directly positions ${candidateName} as an executive force-multiplier for the CEO.`,
    likelyMandate:
      'Serve as strategic thought partner and operational engine for the CEO, driving top-priority executive initiatives, board governance, and cross-functional alignment.',
    keyRequirements: [
      'Strategic execution and executive review rhythm management',
      'Board presentation drafting and investor relations support',
      'Cross-functional change management and organizational alignment',
      'Post-merger operational integration oversight',
    ],
    overallFitScore: 86,
    scoreExplanation:
      'Overall Fit Score of 86% (Apply threshold: >= 85%). Score reflects full credit across core strategic execution, board prep, and operational rhythm requirements, with 0 material gaps and 2 unverified investor relations items.',
    recommendation: 'Apply',
    positioningNarrative:
      'I act as an operational force multiplier for executive leadership. At Nexus Global Operations and Apex Enterprise Software, I designed unified board presentation frameworks for the C-suite, compressed executive review cycles from 14 days to 3 days, and managed post-merger integrations on 90-day schedules.',
    qualifications: [
      {
        id: 'q4-1',
        category: 'Required',
        qualification: 'Strategic execution and executive review rhythm management',
        matchType: 'Strong Match',
        explanation:
          'Redesigned executive operational review rhythms at Apex Enterprise, compressing cycle times from 14 to 3 business days.',
        supportingEvidenceCitationIds: ['EVID-2024-03', 'EVID-2023-05'],
      },
      {
        id: 'q4-2',
        category: 'Required',
        qualification: 'Board of Directors governance and C-suite reporting frameworks',
        matchType: 'Strong Match',
        explanation:
          'Created unified board presentation and executive dashboard framework adopted across C-suite at Nexus Global Operations.',
        supportingEvidenceCitationIds: ['EVID-2023-02'],
      },
      {
        id: 'q4-3',
        category: 'Required',
        qualification: 'Cross-functional program management & organizational alignment',
        matchType: 'Strong Match',
        explanation:
          'Orchestrated alignment matrix across 4 business units, delivering 35% operational efficiency improvements.',
        supportingEvidenceCitationIds: ['EVID-2024-02'],
      },
      {
        id: 'q4-4',
        category: 'Required',
        qualification: 'Post-merger integration and change management leadership',
        matchType: 'Strong Match',
        explanation:
          'Executed 90-day operational integration of acquired 150-person SaaS company and maintained 94% key talent retention during restructuring.',
        supportingEvidenceCitationIds: ['EVID-2021-01', 'EVID-2023-05'],
      },
      {
        id: 'q4-5',
        category: 'Preferred',
        qualification: 'Hands-on investor relations management and earnings call prep',
        matchType: 'Unverified',
        explanation:
          'Profile confirms board deck creation and quarterly C-suite reporting frameworks but does not explicitly detail public investor relations or earnings call prep.',
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'q4-6',
        category: 'Preferred',
        qualification: 'M&A financial due diligence modeling',
        matchType: 'Unverified',
        explanation:
          'Profile details post-merger operational integration (90-day execution) but lacks explicit M&A financial valuation modeling evidence.',
        supportingEvidenceCitationIds: [],
      },
    ],
    objections: [
      {
        id: 'obj-4-1',
        objection: 'Has the candidate previously held the explicit title of Chief of Staff?',
        counterPositioning:
          `Highlight that ${candidatePossessive} core duties as Head of Business Operations and Director of Strategy (board prep, executive rhythms, C-suite alignment) are functionally identical to a Chief of Staff mandate.`,
        supportingCitationId: 'EVID-2023-02',
      },
    ],
    recruiterQuestions: [
      'What are the CEO’s top 3 strategic priorities for the next 2 quarters where they need the Chief of Staff to take immediate operational ownership?',
      'Is the Chief of Staff role viewed as a 2-year rotational leadership launchpad or a long-term strategic role?',
    ],
    hiringManagerQuestions: [
      'How does the CEO currently prefer to handle cross-functional decision bottlenecks when executive leads disagree?',
      'What does ideal board preparation look like for the upcoming fiscal planning cycle?',
    ],
    recommendedStarStories: [
      {
        id: 'star-4-1',
        title: 'Unified C-Suite & Board Governance Framework',
        situation: 'Nexus Global Operations lacked standardized metrics for quarterly Board of Directors reporting.',
        task: 'Establish an executive dashboarding and governance framework for C-suite alignment.',
        action: 'Collaborated with CEO and CRO to build a structured quarterly reporting model.',
        result: 'Adopted as the permanent quarterly investor deck framework across all business lines.',
        citationIds: ['EVID-2023-02'],
      },
    ],
    nextActions: [
      'Draft customized 1-page executive memo outlining Chief of Staff operational roadmap',
      'Submit application with reference letter from former Nexus CRO',
    ],
    isFallbackAnalysis: false,
  };
}

export const fixtureRole4ChiefOfStaff: FitAnalysisReport = {
  ...buildRole4Analysis({
    candidateName: 'Alex Vance',
    candidatePossessive: 'Alex Vance’s',
  }),
  candidateProvenance: {
    candidateId: 'cand-synthetic-alex-vance',
    candidateName: 'Alex Vance',
    dataMode: 'synthetic',
    profileUpdatedAt: '2026-01-01T00:00:00.000Z',
    analyzedAt: '2026-07-22T11:00:00.000Z',
    provenanceStatus: 'known',
  },
};
