import { FitAnalysisReport } from '@/types/opportunity';

export const fixtureRole1AIStrategy: FitAnalysisReport = {
  executiveSummary:
    'Exceptionally strong alignment for Director of AI Strategy & Operations. Alex Vance’s direct track record scaling AI enablement taskforces, driving $14M ARR through GTM automation, and compressing executive review rhythms directly mirrors all core mandate requirements.',
  likelyMandate:
    'Scale enterprise AI strategy and cross-functional operations across GTM and Product teams to accelerate revenue growth and operational efficiency.',
  keyRequirements: [
    'Lead enterprise AI enablement and operational toolset adoption across matrixed teams',
    'Drive GTM RevOps alignment and strategic execution across executive stakeholders',
    'Establish executive operational rhythms, QBR frameworks, and board reporting',
    'Manage multi-million dollar program budgets and cross-functional taskforces',
  ],
  overallFitScore: 91,
  scoreExplanation:
    'Overall Fit Score of 91% (Apply threshold: >= 85%). Calculated using 2× weight for required qualifications and 1× for preferred qualifications. Alex demonstrates strong evidence across 5 required areas and 1 preferred area, with 1 unverified compliance item and 0 material gaps.',
  recommendation: 'Apply',
  positioningNarrative:
    'I bring a 12-year track record of translating executive AI strategy into measurable operational execution. At Apex Enterprise Software, I built our 450-person AI Enablement taskforce and automated GTM workflows that delivered $14M in ARR pipeline expansion while driving a 35% operational efficiency gain across matrixed business units.',
  qualifications: [
    {
      id: 'q1-1',
      category: 'Required',
      qualification: '10+ years experience in GTM strategy, RevOps, and executive operations',
      matchType: 'Strong Match',
      explanation:
        'Alex Vance possesses 12+ years of senior strategy and operations leadership across software enterprises and management consulting.',
      supportingEvidenceCitationIds: ['EVID-2024-01', 'EVID-2023-01'],
    },
    {
      id: 'q1-2',
      category: 'Required',
      qualification: 'Proven track record of enterprise AI enablement and toolset rollout',
      matchType: 'Strong Match',
      explanation:
        'Established Apex Enterprise AI Enablement Taskforce, training 450+ cross-functional leaders on generative toolsets.',
      supportingEvidenceCitationIds: ['EVID-2024-05'],
    },
    {
      id: 'q1-3',
      category: 'Required',
      qualification: 'Demonstrated GTM automation impact tied to top-line ARR growth',
      matchType: 'Strong Match',
      explanation:
        'Engineered AI-assisted GTM workflow automation delivering $14M in net-new ARR pipeline expansion.',
      supportingEvidenceCitationIds: ['EVID-2024-01'],
    },
    {
      id: 'q1-4',
      category: 'Required',
      qualification: 'Cross-functional leadership across matrixed executive stakeholders',
      matchType: 'Strong Match',
      explanation:
        'Orchestrated alignment matrix across 4 business units, delivering a 35% efficiency improvement.',
      supportingEvidenceCitationIds: ['EVID-2024-02'],
    },
    {
      id: 'q1-5',
      category: 'Preferred',
      qualification: 'Experience managing large operational budgets ($20M+)',
      matchType: 'Strong Match',
      explanation:
        'Optimized $25M global GTM budget, improving campaign ROI by 22%.',
      supportingEvidenceCitationIds: ['EVID-2024-04'],
    },
    {
      id: 'q1-6',
      category: 'Preferred',
      qualification: 'Specific expertise in EU AI Act regulatory compliance frameworks',
      matchType: 'Unverified',
      explanation:
        'The candidate profile details enterprise AI enablement governance but lacks explicit mention of EU AI Act compliance protocols.',
      supportingEvidenceCitationIds: [],
    },
  ],
  objections: [
    {
      id: 'obj-1-1',
      objection: 'Does the candidate have a formal software engineering background to evaluate technical AI architectures?',
      counterPositioning:
        'Emphasize that Alex focuses on operational AI enablement, workflow integration, governance, and business ROI rather than raw model training. Highlight $14M ARR impact and 450+ leaders trained.',
      supportingCitationId: 'EVID-2024-05',
    },
    {
      id: 'obj-1-2',
      objection: 'Will the candidate require onboarding on regulatory frameworks like the EU AI Act?',
      counterPositioning:
        'Acknowledge that specific legal framework compliance is unverified, but point to established governance policies created for 450+ enterprise leaders as proof of rapid compliance adaptability.',
      supportingCitationId: 'EVID-2024-05',
    },
  ],
  recruiterQuestions: [
    'How does your team define the boundary between technical AI product engineering and operational AI strategy/enablement?',
    'What are the primary GTM pipeline conversion bottlenecks the executive team wants this role to address in Q3/Q4?',
    'How is success measured for AI enablement initiatives across your business units?',
  ],
  hiringManagerQuestions: [
    'What is the strategic ratio between revenue-generating GTM AI use cases versus internal efficiency automation in your current 12-month roadmap?',
    'How do you currently navigate cross-functional friction between Product, RevOps, and Sales leadership during major workflow transitions?',
    'What governance framework does the team currently use to audit output accuracy and privacy compliance for customer-facing GTM workflows?',
  ],
  recommendedStarStories: [
    {
      id: 'star-1-1',
      title: 'Enterprise AI Enablement & GTM Pipeline Acceleration',
      situation:
        'Apex Enterprise Software needed to modernize sales workflows and accelerate pipeline velocity amidst slowing market growth.',
      task: 'Lead cross-functional AI strategy to identify high-leverage GTM automation opportunities and train leadership.',
      action:
        'Formed an enterprise AI Enablement Taskforce, trained 450+ leaders, and engineered AI-assisted GTM workflow automations across sales ops.',
      result:
        'Generated $14M in net-new ARR pipeline expansion within 12 months and improved overall operational efficiency by 35%.',
      citationIds: ['EVID-2024-01', 'EVID-2024-05'],
    },
    {
      id: 'star-1-2',
      title: 'Executive Operational Rhythms & Review Compression',
      situation:
        'Quarterly executive operational reviews took 14 business days, causing strategy lag across business units.',
      task: 'Redesign executive review rhythms to streamline decision-making for C-suite leaders.',
      action:
        'Established standardized reporting metrics and real-time dashboarding routines across 4 matrixed business units.',
      result:
        'Compressed quarterly review cycle times from 14 days down to 3 days, accelerating strategic execution.',
      citationIds: ['EVID-2024-02', 'EVID-2024-03'],
    },
  ],
  nextActions: [
    'Draft 30-second introductory elevator pitch tailored to VP of Strategy',
    'Prepare case study presentation on Apex AI Enablement Taskforce ($14M ARR expansion)',
    'Submit application via strategic referral contact in RevOps network',
  ],
  isFallbackAnalysis: false,
};
