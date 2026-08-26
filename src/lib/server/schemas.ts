import { z } from 'zod';

export const MatchTypeSchema = z.enum([
  'Strong Match',
  'Partial Match',
  'Material Gap',
  'Unverified',
]);

export const RecommendationTypeSchema = z.enum([
  'Apply',
  'Network First',
  'Monitor',
  'Deprioritize',
]);

export const QualificationMatchSchema = z.object({
  id: z.string(),
  category: z.enum(['Required', 'Preferred']),
  qualification: z.string(),
  matchType: MatchTypeSchema,
  explanation: z.string(),
  supportingEvidenceCitationIds: z.array(z.string()).default([]),
});

export const HiringObjectionSchema = z.object({
  id: z.string(),
  objection: z.string(),
  counterPositioning: z.string(),
  supportingCitationId: z.string().optional(),
});

export const StarStorySchema = z.object({
  id: z.string(),
  title: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
  citationIds: z.array(z.string()).default([]),
});

export const EvidenceItemSchema = z.object({
  id: z.string(),
  type: z.string().default('achievement'),
  title: z.string(),
  description: z.string(),
  metric: z.string().optional(),
  organization: z.string().optional().default(''),
  roleId: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  sourceId: z.string().optional(),
  verificationStatus: z.string().optional().default('unverified'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const CareerRoleSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  isCurrent: z.boolean().optional().default(false),
  summary: z.string().optional().default(''),
  evidenceItemIds: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  sourceIds: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  displayOrder: z.number().optional(),
});

export const CandidateProfileSnapshotSchema = z.object({
  id: z.string().optional().default('candidate-snapshot'),
  name: z.string().default(''),
  headline: z.string().default(''),
  location: z.string().optional().default(''),
  summary: z.string().default(''),
  targetRoles: z.array(z.string()).default([]),
  targetIndustries: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  coreCompetencies: z.array(z.string()).default([]),
  careerHistory: z.array(CareerRoleSchema).default([]),
  evidenceItems: z.array(EvidenceItemSchema).default([]),
  dataMode: z.enum(['synthetic', 'user']).optional().default('user'),
  updatedAt: z.string().optional(),
});

export const FitAnalysisReportSchema = z.object({
  executiveSummary: z.string(),
  likelyMandate: z.string(),
  keyRequirements: z.array(z.string()),
  overallFitScore: z.number().min(0).max(100),
  scoreExplanation: z.string(),
  recommendation: RecommendationTypeSchema,
  positioningNarrative: z.string(),
  qualifications: z.array(QualificationMatchSchema),
  objections: z.array(HiringObjectionSchema).default([]),
  recruiterQuestions: z.array(z.string()).default([]),
  hiringManagerQuestions: z.array(z.string()).default([]),
  recommendedStarStories: z.array(StarStorySchema).default([]),
  nextActions: z.array(z.string()).default([]),
  isFallbackAnalysis: z.boolean().optional(),
  analysisNotice: z.string().optional(),
  analysisEngine: z.enum(['gemini', 'deterministic']).optional(),
  modelUsed: z.string().optional(),
  latencyMs: z.number().optional(),

  // Resilience & Execution Metadata
  requestedModel: z.string().optional(),
  actualModel: z.string().optional(),
  engineType: z.enum(['gemini', 'deterministic']).optional(),
  attemptCount: z.number().optional(),
  failoverOccurred: z.boolean().optional(),
  fallbackOccurred: z.boolean().optional(),
  sanitizedFailureReason: z.string().optional(),
});

export const AnalyzeRequestSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  jobDescription: z.string().min(10, 'Job description must be provided'),
  location: z.string().optional(),
  compensation: z.string().optional(),
  sourceUrl: z.string().optional(),
  sampleRoleId: z.string().optional(),
  candidateSnapshot: CandidateProfileSnapshotSchema,
});

export type AnalyzeRequestBody = z.input<typeof AnalyzeRequestSchema>;

// Résumé Structured Extraction Schema
export const ResumeExtractionSchema = z.object({
  name: z.string().optional().default(''),
  headline: z.string().optional().default(''),
  location: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  targetRoles: z.array(z.string()).optional().default([]),
  targetIndustries: z.array(z.string()).optional().default([]),
  preferredLocations: z.array(z.string()).optional().default([]),
  coreCompetencies: z.array(z.string()).optional().default([]),
  careerHistory: z.array(
    z.object({
      id: z.string().optional(),
      company: z.string(),
      title: z.string(),
      location: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
      isCurrent: z.boolean().optional().default(false),
      summary: z.string().optional().default(''),
      skills: z.array(z.string()).optional().default([]),
      accomplishments: z.array(
        z.object({
          id: z.string().optional(),
          title: z.string(),
          description: z.string(),
          metric: z.string().optional(),
          skills: z.array(z.string()).optional().default([]),
        })
      ).optional().default([]),
    })
  ).default([]),
  education: z.array(
    z.object({
      id: z.string().optional(),
      institution: z.string(),
      degree: z.string(),
      fieldOfStudy: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      location: z.string().optional(),
    })
  ).default([]),
  certifications: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      issuingOrganization: z.string(),
      issueDate: z.string().optional(),
      expirationDate: z.string().optional(),
    })
  ).default([]),
});

export type ResumeExtractionResult = z.infer<typeof ResumeExtractionSchema>;

// ---------------------------------------------------------------------------
// V3.3 Interview War Room & Application Intelligence Schemas
// ---------------------------------------------------------------------------

export const InterviewPrepRequestSchema = z.object({
  opportunity: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    compensation: z.string().optional(),
    rawJobDescription: z.string().default(''),
    stage: z.string().default('Identified'),
    updatedAt: z.string().optional(),
  }),
  candidateSnapshot: CandidateProfileSnapshotSchema,
  analysisReport: FitAnalysisReportSchema.optional(),
});

export type InterviewPrepRequestBody = z.input<typeof InterviewPrepRequestSchema>;

export const MockQuestionsRequestSchema = z.object({
  opportunity: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    rawJobDescription: z.string().default(''),
  }),
  candidateSnapshot: CandidateProfileSnapshotSchema,
  difficulty: z.enum(['standard', 'rigorous', 'stress_test', 'challenging', 'executive', 'adversarial']).default('standard'),
  mode: z.enum(['practice', 'timed', 'full']).default('practice'),
});

export const MockEvaluationRequestSchema = z.object({
  question: z.string().min(1),
  questionCategory: z.string().default('behavioral'),
  candidateAnswer: z.string().min(1, 'Candidate answer is required'),
  opportunity: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    rawJobDescription: z.string().default(''),
  }),
  candidateSnapshot: CandidateProfileSnapshotSchema,
  difficulty: z.enum(['standard', 'rigorous', 'stress_test', 'challenging', 'executive', 'adversarial']).default('standard'),
});

export const FollowUpComposeRequestSchema = z.object({
  opportunity: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    stage: z.string().default('Identified'),
  }),
  candidateSnapshot: CandidateProfileSnapshotSchema,
  actionType: z.enum([
    'thank_you',
    'recruiter_follow_up',
    'post_interview_follow_up',
    'referral_nudge',
    'application_check_in',
    'networking_outreach',
    'negotiation_response',
    'general_follow_up',
  ]),
  tone: z.enum(['professional', 'warm', 'assertive']).default('professional'),
  recipientRole: z.string().optional(),
  recipientName: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  customContext: z.string().optional(),
});
