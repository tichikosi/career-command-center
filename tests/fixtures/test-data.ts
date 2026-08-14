/**
 * Career Command Center — Deterministic Test Fixtures
 *
 * Provides realistic opportunity, candidate, and analysis test data
 * that can be seeded into localStorage for testing.
 *
 * IMPORTANT: These fixtures must NOT depend on Tanaka's actual localStorage.
 * They provide a self-contained test world.
 */

import { JobOpportunity, PipelineStage, OpportunityAction } from '@/types/opportunity';
import { CandidateProfile, EvidenceItem, CareerRole } from '@/types/candidate';

// ---------------------------------------------------------------------------
// Minimal test evidence items
// ---------------------------------------------------------------------------
export const TEST_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'evid-test-001',
    type: 'achievement',
    title: '$14M ARR Growth',
    description: 'Led GTM strategy that drove $14M in annual recurring revenue growth.',
    metric: '$14M ARR Growth',
    organization: 'TestCorp Alpha',
    roleId: 'role-test-001',
    skills: ['GTM Strategy', 'Revenue Growth'],
    tags: ['EVID-2024-01'],
    verificationStatus: 'synthetic',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'evid-test-002',
    type: 'metric',
    title: '35% Efficiency Gain',
    description: 'Implemented operational improvements yielding 35% efficiency gain across teams.',
    metric: '35% Efficiency Gain',
    organization: 'TestCorp Alpha',
    roleId: 'role-test-001',
    skills: ['Operations', 'Process Improvement'],
    tags: ['EVID-2024-02'],
    verificationStatus: 'synthetic',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'evid-test-003',
    type: 'achievement',
    title: 'AI Enablement Program',
    description: 'Designed and launched enterprise AI enablement program across 4 business units.',
    metric: '4 Business Units',
    organization: 'TestCorp Beta',
    roleId: 'role-test-002',
    skills: ['AI Strategy', 'Program Management'],
    tags: ['EVID-2023-01'],
    verificationStatus: 'synthetic',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'evid-test-unassigned',
    type: 'skill',
    title: 'Advanced Data Analytics',
    description: 'Deep experience with Looker, Tableau, and custom BI dashboards.',
    organization: 'General Experience',
    roleId: undefined,
    skills: ['Data Analytics', 'Looker', 'Tableau'],
    tags: ['EVID-GENERAL-01'],
    verificationStatus: 'synthetic',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Minimal test career roles
// ---------------------------------------------------------------------------
export const TEST_CAREER_ROLES: CareerRole[] = [
  {
    id: 'role-test-001',
    company: 'TestCorp Alpha',
    title: 'Director of Strategy & Operations',
    location: 'San Francisco, CA',
    startDate: '2022-01',
    endDate: 'Present',
    isCurrent: true,
    summary: 'Leading strategic operations across revenue, product, and engineering teams.',
    evidenceItemIds: ['evid-test-001', 'evid-test-002'],
    skills: ['GTM Strategy', 'Revenue Growth', 'Operations'],
    sourceIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    displayOrder: 100,
  },
  {
    id: 'role-test-002',
    company: 'TestCorp Beta',
    title: 'Senior AI Strategy Lead',
    location: 'New York, NY',
    startDate: '2019-06',
    endDate: '2022-01',
    isCurrent: false,
    summary: 'Built AI enablement program and cross-functional operations.',
    evidenceItemIds: ['evid-test-003'],
    skills: ['AI Strategy', 'Program Management'],
    sourceIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    displayOrder: 200,
  },
];

// ---------------------------------------------------------------------------
// Test candidate profile
// ---------------------------------------------------------------------------
export const TEST_CANDIDATE_PROFILE: CandidateProfile = {
  id: 'cand-test-v1',
  name: 'Test Candidate',
  headline: 'Director of Strategy & AI Operations',
  location: 'San Francisco, CA',
  summary: 'Senior strategic leader with deep experience in GTM, AI enablement, and operational excellence.',
  targetRoles: ['AI Strategy Lead', 'Director of Operations'],
  targetIndustries: ['Enterprise SaaS', 'AI/ML'],
  preferredLocations: ['San Francisco', 'New York', 'Remote'],
  coreCompetencies: ['GTM Strategy', 'AI Enablement', 'Revenue Operations', 'Strategic Planning'],
  careerHistory: TEST_CAREER_ROLES,
  education: [
    {
      id: 'edu-test-001',
      institution: 'Stanford University',
      degree: 'MBA',
      fieldOfStudy: 'Strategy & Operations',
    },
  ],
  certifications: [],
  evidenceItems: TEST_EVIDENCE_ITEMS,
  sources: [
    {
      id: 'src-test-synthetic',
      type: 'manual',
      name: 'Test Synthetic Fixture',
      importedAt: '2026-01-01T00:00:00.000Z',
      retainRawText: false,
      dataClassification: 'synthetic',
    },
  ],
  updatedAt: '2026-01-01T00:00:00.000Z',
  dataMode: 'synthetic',
};

// ---------------------------------------------------------------------------
// Test opportunities with analyses
// ---------------------------------------------------------------------------

function makeTestActions(stage: PipelineStage, oppId: string): OpportunityAction[] {
  const stageTemplates: Record<PipelineStage, string[]> = {
    Identified: ['Review fit analysis', 'Decide on application'],
    Applied: ['Confirm submission', 'Prepare screening'],
    Screening: ['Prepare narrative', 'Review recruiter questions'],
    Interviewing: ['Rehearse STAR stories', 'Prepare questions'],
    Offer: ['Review compensation', 'Compare alternatives'],
    Archived: ['Remove reminders', 'Preserve notes'],
  };

  const stageActions: OpportunityAction[] = (stageTemplates[stage] || []).map((text, idx) => ({
    id: `stage:${stage}:${idx}`,
    text,
    source: 'stage' as const,
    stage,
    completed: false,
  }));

  const roleActions: OpportunityAction[] = [
    {
      id: `role:${oppId}:0`,
      text: 'Draft outreach to hiring manager',
      source: 'role' as const,
      completed: false,
    },
    {
      id: `role:${oppId}:1`,
      text: 'Prepare company-specific talking points',
      source: 'role' as const,
      completed: false,
    },
  ];

  return [...stageActions, ...roleActions];
}

export const TEST_OPPORTUNITIES: JobOpportunity[] = [
  {
    id: 'opp-test-high-fit',
    title: 'Director of AI Strategy',
    company: 'NovaTech AI',
    location: 'San Francisco, CA',
    compensation: '$200K–$260K + Equity',
    rawJobDescription: 'Director of AI Strategy responsible for enterprise AI enablement...',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    stage: 'Identified',
    priority: 'High',
    notes: 'Strong match, referral from Jane Doe',
    followUpDate: '2026-08-15',
    actions: makeTestActions('Identified', 'opp-test-high-fit'),
    analysis: {
      executiveSummary: 'Exceptional alignment between candidate profile and role requirements.',
      likelyMandate: 'Scale enterprise AI adoption across business units.',
      keyRequirements: ['AI Strategy', 'Cross-functional leadership', 'Enterprise scale'],
      overallFitScore: 91,
      scoreExplanation: 'Strong matches across all key qualifications with verified evidence.',
      recommendation: 'Apply',
      positioningNarrative: 'A proven AI strategy leader with quantified results in enterprise environments.',
      qualifications: [
        {
          id: 'qual-1',
          category: 'Required',
          qualification: 'AI Strategy Experience',
          matchType: 'Strong Match',
          explanation: 'Demonstrated through enterprise AI enablement program.',
          supportingEvidenceCitationIds: ['EVID-2023-01'],
        },
        {
          id: 'qual-2',
          category: 'Required',
          qualification: 'Cross-Functional Leadership',
          matchType: 'Strong Match',
          explanation: 'Led cross-functional teams across 4 business units.',
          supportingEvidenceCitationIds: ['EVID-2024-01'],
        },
        {
          id: 'qual-3',
          category: 'Preferred',
          qualification: 'PhD in Computer Science',
          matchType: 'Unverified',
          explanation: 'No evidence of PhD in candidate profile.',
          supportingEvidenceCitationIds: [],
        },
      ],
      objections: [
        {
          id: 'obj-1',
          objection: 'Limited deep technical ML engineering background',
          counterPositioning: 'Role is strategic; candidate has proven ability to bridge technical and business teams.',
        },
      ],
      recruiterQuestions: [
        'What is the current AI adoption maturity across your org?',
        'How does this role report — to CTO or CEO?',
      ],
      hiringManagerQuestions: [
        'What does success look like in the first 90 days?',
        'How do you measure AI enablement ROI?',
      ],
      recommendedStarStories: [
        {
          id: 'star-1',
          title: 'Enterprise AI Enablement Launch',
          situation: 'Company had no unified AI strategy across 4 business units.',
          task: 'Design and implement enterprise-wide AI enablement program.',
          action: 'Built cross-functional AI council, created enablement framework, and secured executive sponsorship.',
          result: 'Program adopted across all 4 units within 6 months.',
          citationIds: ['EVID-2023-01'],
        },
      ],
      nextActions: ['Draft outreach to hiring manager', 'Prepare company-specific talking points'],
      candidateProvenance: {
        candidateId: 'cand-test-v1',
        candidateName: 'Test Candidate',
        dataMode: 'synthetic',
        profileUpdatedAt: '2026-01-01T00:00:00.000Z',
        analyzedAt: '2026-07-01T00:00:00.000Z',
        provenanceStatus: 'known',
      },
      evidenceSnapshot: TEST_EVIDENCE_ITEMS.filter(e => e.roleId),
    },
  },
  {
    id: 'opp-test-medium-fit',
    title: 'VP of Sales Operations',
    company: 'CloudScale Inc',
    location: 'New York, NY',
    rawJobDescription: 'VP Sales Ops to optimize pipeline and forecasting...',
    createdAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z',
    stage: 'Applied',
    priority: 'Medium',
    notes: '',
    followUpDate: '2026-08-10',
    actions: makeTestActions('Applied', 'opp-test-medium-fit'),
    analysis: {
      executiveSummary: 'Moderate alignment with strong operational background but limited direct sales management.',
      likelyMandate: 'Optimize sales pipeline efficiency and forecasting accuracy.',
      keyRequirements: ['Sales Operations', 'Pipeline Management', 'Forecasting'],
      overallFitScore: 74,
      scoreExplanation: 'Strong operational skills partially offset by limited direct sales team management.',
      recommendation: 'Network First',
      positioningNarrative: 'An operational strategist bringing structured process improvement to sales.',
      qualifications: [
        {
          id: 'qual-m1',
          category: 'Required',
          qualification: 'Sales Process Optimization',
          matchType: 'Partial Match',
          explanation: 'Process optimization experience in GTM, not purely sales-specific.',
          supportingEvidenceCitationIds: ['EVID-2024-02'],
        },
        {
          id: 'qual-m2',
          category: 'Required',
          qualification: 'Direct Sales Team Management',
          matchType: 'Material Gap',
          explanation: 'No evidence of directly managing field sales representatives.',
          supportingEvidenceCitationIds: [],
        },
      ],
      objections: [],
      recruiterQuestions: ['How large is the current sales team?'],
      hiringManagerQuestions: ['What CRM does the team use?'],
      recommendedStarStories: [],
      nextActions: ['Identify contacts at CloudScale'],
      candidateProvenance: {
        candidateId: 'cand-test-v1',
        candidateName: 'Test Candidate',
        dataMode: 'synthetic',
        profileUpdatedAt: '2026-01-01T00:00:00.000Z',
        analyzedAt: '2026-06-15T00:00:00.000Z',
        provenanceStatus: 'known',
      },
      evidenceSnapshot: TEST_EVIDENCE_ITEMS.filter(e => e.roleId),
    },
  },
  {
    id: 'opp-test-low-fit',
    title: 'Principal Data Engineer',
    company: 'DataForge Labs',
    location: 'Remote',
    rawJobDescription: 'Principal Data Engineer for distributed Spark pipelines...',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    stage: 'Archived',
    priority: 'Low',
    notes: 'Deprioritized — too technical for current profile.',
    archivedReason: 'Material skill gaps',
    actions: makeTestActions('Archived', 'opp-test-low-fit'),
    analysis: {
      executiveSummary: 'Low alignment due to missing deep hands-on engineering experience.',
      likelyMandate: 'Build and scale distributed data pipelines.',
      keyRequirements: ['PySpark', 'Scala', 'Distributed Systems'],
      overallFitScore: 38,
      scoreExplanation: 'Critical gaps in hands-on engineering skills.',
      recommendation: 'Deprioritize',
      positioningNarrative: 'Strategic leader, not a fit for a deeply technical IC engineering role.',
      qualifications: [
        {
          id: 'qual-l1',
          category: 'Required',
          qualification: '8+ years PySpark/Scala',
          matchType: 'Material Gap',
          explanation: 'No evidence of hands-on distributed data engineering.',
          supportingEvidenceCitationIds: [],
        },
      ],
      objections: [],
      recruiterQuestions: [],
      hiringManagerQuestions: [],
      recommendedStarStories: [],
      nextActions: [],
      candidateProvenance: {
        candidateId: 'cand-test-v1',
        candidateName: 'Test Candidate',
        dataMode: 'synthetic',
        profileUpdatedAt: '2026-01-01T00:00:00.000Z',
        analyzedAt: '2026-05-01T00:00:00.000Z',
        provenanceStatus: 'known',
      },
      evidenceSnapshot: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Test localStorage seed helpers
// ---------------------------------------------------------------------------
export const TEST_STORAGE_KEYS = {
  opportunities: 'ccc_opportunities_v1',
  candidate: 'ccc_candidate_v1',
  settings: 'ccc_settings_v1',
};

/**
 * Creates a complete localStorage seed object for testing.
 * Returns key/value pairs ready for localStorage.setItem().
 */
export function createTestStorageSeed(): Record<string, string> {
  return {
    [TEST_STORAGE_KEYS.opportunities]: JSON.stringify(TEST_OPPORTUNITIES),
    [TEST_STORAGE_KEYS.candidate]: JSON.stringify(TEST_CANDIDATE_PROFILE),
    [TEST_STORAGE_KEYS.settings]: JSON.stringify({
      sortField: 'createdAt',
      sortDirection: 'desc',
      stageFilter: 'All',
      recommendationFilter: 'All',
      priorityFilter: 'All',
      followUpFilter: 'All',
      searchTerm: '',
      themeMode: 'system',
    }),
  };
}
