import { FitAnalysisReport } from '@/types/opportunity';
import { CandidateAnalysisContext } from './role-1-ai-strategy';

export function buildRole5Analysis(ctx: CandidateAnalysisContext): FitAnalysisReport {
  const { candidateName } = ctx;

  return {
    executiveSummary:
      'Ambiguous / Low Detail Role (55% Fit Score — Monitor). The provided job description contains generic boilerplate text lacking specific team scope, operational requirements, or deliverables. General strategic skills align, but 4 qualifications remain Unverified due to vague specifications.',
    likelyMandate:
      'Unspecified strategy leadership role. Likely focused on general cross-functional planning or business development.',
    keyRequirements: [
      'General business strategy and leadership experience',
      'Unspecified cross-functional collaboration requirements',
      'Unspecified team size and budget ownership metrics',
      'Unspecified technical toolset or methodology preferences',
    ],
    overallFitScore: 55,
    scoreExplanation:
      'Overall Fit Score of 55% (Monitor threshold: 50–69%). Score reflects general strategic planning credit (+55%) offset by 4 Unverified qualifications caused by insufficient specificity in the job description.',
    recommendation: 'Monitor',
    positioningNarrative:
      `${candidateName} brings 12+ years of enterprise strategy execution. However, further conversation with the recruiter is required to clarify the precise scope, team size, and core deliverables of this role.`,
    qualifications: [
      {
        id: 'q5-1',
        category: 'Required',
        qualification: 'General enterprise business strategy and execution experience',
        matchType: 'Strong Match',
        explanation:
          'Broad strategic planning alignment supported by multi-year corporate expansion roadmaps.',
        supportingEvidenceCitationIds: ['EVID-2023-01'],
      },
      {
        id: 'q5-2',
        category: 'Required',
        qualification: 'Specific functional domain focus (GTM Ops vs. Corporate Strategy vs. Product Strategy)',
        matchType: 'Unverified',
        explanation:
          'The job description does not specify which functional domain this role belongs to.',
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'q5-3',
        category: 'Required',
        qualification: 'Team management scope and direct reporting structure',
        matchType: 'Unverified',
        explanation:
          'No team size, direct report count, or management level is detailed in the job posting.',
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'q5-4',
        category: 'Preferred',
        qualification: 'Target industry focus and business model requirements',
        matchType: 'Unverified',
        explanation:
          'Job posting omits target industry vertical, SaaS business model, or revenue stage.',
        supportingEvidenceCitationIds: [],
      },
      {
        id: 'q5-5',
        category: 'Preferred',
        qualification: 'Geographic location and travel expectations',
        matchType: 'Unverified',
        explanation:
          'Posting lists location as "Flexible" without defining remote vs. hybrid office requirements.',
        supportingEvidenceCitationIds: [],
      },
    ],
    objections: [
      {
        id: 'obj-5-1',
        objection: 'The role description is too vague to determine exact candidate alignment.',
        counterPositioning:
          'Reach out to the hiring manager or recruiter to request a detailed team mandate overview before investing deep positioning effort.',
        supportingCitationId: undefined,
      },
    ],
    recruiterQuestions: [
      'Can you clarify which specific business unit or executive lead this Strategy Lead position reports to?',
      'What are the core 90-day deliverables for this role?',
    ],
    hiringManagerQuestions: [],
    recommendedStarStories: [],
    nextActions: [
      'Monitor position for updated job description details',
      'Send brief clarifying inquiry to recruiter regarding role domain focus',
    ],
    isFallbackAnalysis: false,
  };
}

export const fixtureRole5StrategyLead: FitAnalysisReport = {
  ...buildRole5Analysis({
    candidateName: 'Alex Vance',
    candidatePossessive: 'Alex Vance’s',
  }),
  candidateProvenance: {
    candidateId: 'cand-synthetic-alex-vance',
    candidateName: 'Alex Vance',
    dataMode: 'synthetic',
    profileUpdatedAt: '2026-01-01T00:00:00.000Z',
    analyzedAt: '2026-07-10T15:00:00.000Z',
    provenanceStatus: 'known',
  },
};
