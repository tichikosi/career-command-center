import { CandidateProfile, EvidenceItem } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import { OpportunityActivity, InterviewPreparation } from '@/types/interview';
import { DiscoveredJob } from '@/types/discovery';
import { NetworkContact } from '@/types/network';

export function createTestEvidenceItem(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: 'EVID-IMP-01',
    type: 'achievement',
    title: 'Enterprise AI Governance Framework',
    description: 'Engineered AI evaluation pipeline reducing enterprise risk by 40%.',
    metric: '40% risk reduction across 12 product lines',
    organization: 'Nexus Global',
    skills: ['AI Governance', 'Risk Modeling'],
    tags: ['ai', 'governance'],
    verificationStatus: 'verified',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createTestCandidate(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: 'cand-1',
    name: 'Tanaka Vance',
    headline: 'VP of AI Transformation & Strategic Operations',
    location: 'San Francisco, CA (Remote)',
    summary: 'Executive engineering leader with 15+ years experience.',
    targetRoles: ['VP of AI Transformation', 'Director of AI Strategy', 'Chief of Staff'],
    targetIndustries: ['Enterprise AI', 'Cloud Infrastructure', 'Fintech'],
    preferredLocations: ['Remote', 'San Francisco, CA'],
    coreCompetencies: ['AI Strategy', 'Enterprise GTM', 'RevOps Rigor'],
    careerHistory: [
      {
        id: 'role-1',
        company: 'Nexus Global',
        title: 'VP of Engineering',
        location: 'San Francisco, CA',
        startDate: '2022-01',
        endDate: 'Present',
        summary: 'Led enterprise AI platform architecture.',
        skills: ['AI Strategy', 'Distributed Systems'],
        evidenceItemIds: ['EVID-IMP-01'],
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'Stanford University',
        degree: 'B.S. in Computer Science',
      },
    ],
    certifications: [],
    evidenceItems: [createTestEvidenceItem()],
    sources: [
      {
        id: 'src-1',
        type: 'synthetic-fixture',
        name: 'Initial Profile Setup',
        importedAt: '2026-08-01T00:00:00.000Z',
        retainRawText: false,
        dataClassification: 'user-provided',
      },
    ],
    dataMode: 'user',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createTestOpportunity(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return {
    id: 'opp-v33-test',
    title: 'Chief of Staff, AI Transformation',
    company: 'Anthropic Nexus',
    location: 'San Francisco, CA (Hybrid)',
    stage: 'Identified',
    priority: 'High',
    notes: '',
    rawJobDescription: 'Lead AI strategy and enterprise execution.',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    actions: [],
    analysis: {
      overallFitScore: 92,
      recommendation: 'Apply',
      executiveSummary: 'Proven executive alignment in enterprise AI strategy.',
      likelyMandate: 'Drive cross-functional AI adoption and organizational redesign.',
      keyRequirements: ['Executive Presence', 'AI Platform Scaling'],
      scoreExplanation: 'Exceptional grounding against candidate evidence repository.',
      positioningNarrative: 'Enterprise leader capable of bridging AI architecture and C-suite strategy.',
      qualifications: [],
      objections: [],
      recruiterQuestions: [],
      hiringManagerQuestions: [],
      recommendedStarStories: [],
      nextActions: [],
    },
    ...overrides,
  };
}

export function createTestActivity(overrides: Partial<OpportunityActivity> = {}): OpportunityActivity {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    opportunityId: 'opp-v33-test',
    activityType: 'note',
    title: 'Candidate Note',
    source: 'user',
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestInterviewPrep(overrides: Partial<InterviewPreparation> = {}): InterviewPreparation {
  return {
    id: 'prep-test-1',
    opportunityId: 'opp-v33-test',
    candidateProfileId: 'cand-1',
    executiveRoleBrief: 'Executive brief for AI Transformation leadership.',
    candidatePositioning: 'Lead with platform reliability and enterprise governance.',
    strongestFitThemes: ['Platform Reliability', 'AI Governance'],
    materialGaps: [],
    whyThisCompany: 'Strong AI research and mission alignment.',
    whyThisRole: 'Matches executive scope and technical leadership mandate.',
    whyYou: 'Proven track record of high-stakes platform execution.',
    questionsToAsk: ['What is the top mandate for the first 90 days?'],
    first90DaysPoints: ['Audit architecture', 'Align executive stakeholders'],
    riskFlags: [],
    questions: [
      {
        id: 'q-1',
        question: 'How do you lead complex AI initiatives across distributed teams?',
        category: 'behavioral',
        expectedFocus: 'Executive alignment and technical governance',
        suggestedApproach: 'Use STAR framework citing EVID-IMP-01.',
        relevantEvidenceIds: ['EVID-IMP-01'],
      },
    ],
    storyBank: [
      {
        id: 'sb-1',
        title: 'Platform Transformation',
        situation: 'Legacy infrastructure bottleneck',
        task: 'Redesign pipeline for 99.999% SLA',
        action: 'Architected distributed event system',
        result: 'Achieved 99.999% SLA and reduced risk by 40%',
        evidenceIds: ['EVID-IMP-01'],
        applicableQuestionIds: ['q-1'],
      },
    ],
    companyIntelligence: { available: true },
    compensationResearch: { available: true },
    readinessScore: {
      overall: 95,
      dimensions: {
        roleUnderstanding: 95,
        candidatePositioning: 95,
        storyPreparation: 95,
        gapMitigation: 95,
        companyKnowledge: 95,
        questionReadiness: 95,
      },
    },
    generatedAt: '2026-08-01T00:00:00.000Z',
    requestedModel: 'gemini-2.5-pro',
    actualModel: 'gemini-2.5-pro',
    executionMode: 'gemini',
    candidateUpdatedAt: '2026-08-01T00:00:00.000Z',
    opportunityUpdatedAt: '2026-08-01T00:00:00.000Z',
    isActive: true,
    ...overrides,
  };
}

export function createTestDiscoveredJob(overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  return {
    id: 'disc-test-1',
    title: 'Director of AI Strategy',
    company: 'Anthropic Nexus',
    location: 'San Francisco, CA',
    source: 'google_talent',
    discoveredAt: '2026-08-01T00:00:00.000Z',
    status: 'new',
    relevanceScore: 92,
    relevanceLevel: 'High Potential',
    relevanceReasons: ['Direct domain match in AI strategy'],
    matchedPreferences: ['San Francisco, CA', 'Director'],
    provider: 'google_talent',
    groundingUsed: true,
    verificationStatus: 'verified-live',
    ...overrides,
  };
}

export function createTestNetworkContact(overrides: Partial<NetworkContact> = {}): NetworkContact {
  return {
    id: 'contact-test-1',
    fullName: 'Jane Doe',
    company: 'Anthropic Nexus',
    position: 'VP of Talent',
    email: 'jane@anthropicnexus.example',
    source: 'manual',
    importedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}
