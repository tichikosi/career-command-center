import { FitAnalysisReport } from '@/types/opportunity';

export const fixtureRole2SalesOps: FitAnalysisReport = {
  executiveSummary:
    'Moderate alignment (75% Fit Score — Network First). Alex Vance has extensive strategic RevOps experience, pipeline conversion architecture success, and budget optimization skills, but lacks direct operational line-management of quota-carrying field sales representatives.',
  likelyMandate:
    'Overhaul sales operations infrastructure, improve field sales productivity, and optimize lead-to-opportunity funnel conversion for a global B2B sales force.',
  keyRequirements: [
    'Deep expertise in RevOps architecture and funnel conversion strategy',
    'Direct management of large field sales representative teams (50+ reps)',
    'Advanced sales enablement and quota attainment planning',
    'Salesforce CPQ infrastructure administration and governance',
  ],
  overallFitScore: 75,
  scoreExplanation:
    'Overall Fit Score of 75% (Network First threshold: 70–84%). Score reflects strong credit for RevOps architecture (+18% conversion) and enablement (52%→74% quota attainment), offset by a Material Gap for direct field rep management and an unverified CPQ admin certification.',
  recommendation: 'Network First',
  positioningNarrative:
    'I bring strategic RevOps and sales enablement leadership that elevated rep quota attainment from 52% to 74% and doubled lead conversion rates. While my background is in operational architecture rather than direct rep headcount management, I partner directly with Sales VP leadership to remove rep friction and optimize sales velocity.',
  qualifications: [
    {
      id: 'q2-1',
      category: 'Required',
      qualification: 'Proven track record in RevOps pipeline optimization and conversion tracking',
      matchType: 'Strong Match',
      explanation:
        'Overhauled lead-to-opportunity conversion architecture at Nexus Global Operations, boosting conversion rates from 14% to 32%.',
      supportingEvidenceCitationIds: ['EVID-2023-03'],
    },
    {
      id: 'q2-2',
      category: 'Required',
      qualification: 'Sales enablement curriculum design and quota attainment strategy',
      matchType: 'Strong Match',
      explanation:
        'Designed GTM sales enablement curriculum at Horizon Tech, increasing account executive quota attainment from 52% to 74%.',
      supportingEvidenceCitationIds: ['EVID-2022-02'],
    },
    {
      id: 'q2-3',
      category: 'Required',
      qualification: 'Direct operational management of 50+ quota-carrying field sales representatives',
      matchType: 'Material Gap',
      explanation:
        'Alex’s background is in strategy, RevOps, and program management teams. He has not held direct line-management responsibility for field sales quota reps.',
      supportingEvidenceCitationIds: [],
    },
    {
      id: 'q2-4',
      category: 'Preferred',
      qualification: 'Global GTM budget planning and territory allocation',
      matchType: 'Partial Match',
      explanation:
        'Optimized $25M GTM budget (+22% ROI) and formulated 3 international territory entry playbooks, though primary scope was strategic allocation rather than territory routing.',
      supportingEvidenceCitationIds: ['EVID-2024-04', 'EVID-2022-03'],
    },
    {
      id: 'q2-5',
      category: 'Preferred',
      qualification: 'Certified Salesforce CPQ Administrator credentials',
      matchType: 'Unverified',
      explanation:
        'Profile verifies high-level RevOps pipeline architecture but does not specify technical Salesforce CPQ admin certification.',
      supportingEvidenceCitationIds: [],
    },
  ],
  objections: [
    {
      id: 'obj-2-1',
      objection: 'Candidate has not directly managed field sales reps or held a quota.',
      counterPositioning:
        'Frame experience around enabling sales reps through curriculum design and funnel optimization (improving quota attainment from 52% to 74%) in close partnership with Sales VPs.',
      supportingCitationId: 'EVID-2022-02',
    },
  ],
  recruiterQuestions: [
    'How closely does this role work alongside field sales managers versus strategic RevOps systems teams?',
    'Is CPQ administration expected to be hands-on or managed via technical Salesforce administrators?',
  ],
  hiringManagerQuestions: [
    'What is the current bottleneck in rep quota attainment — lead quality, sales enablement, or tooling friction?',
    'How are territory boundaries and quota targets currently calculated across regions?',
  ],
  recommendedStarStories: [
    {
      id: 'star-2-1',
      title: 'Sales Enablement & Quota Attainment Lift',
      situation: 'Horizon Tech Solutions suffered from low rep quota attainment (52%) across enterprise sales teams.',
      task: 'Design a comprehensive sales enablement program to improve deal execution.',
      action: 'Developed structured GTM curriculum, pitch frameworks, and deal review cadences.',
      result: 'Elevated rep quota attainment from 52% to 74% across target account teams.',
      citationIds: ['EVID-2022-02'],
    },
  ],
  nextActions: [
    'Reach out to VP of Sales contact to discuss RevOps enablement scope before formal application',
    'Prepare summary sheet on 14% -> 32% pipeline conversion case study',
  ],
  isFallbackAnalysis: false,
};
