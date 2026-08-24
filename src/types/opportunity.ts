import { EvidenceItem } from '@/types/candidate';

export type PipelineStage =
  | 'Identified'
  | 'Applied'
  | 'Screening'
  | 'Interviewing'
  | 'Offer'
  | 'Archived';

export type RecommendationType =
  | 'Apply'
  | 'Network First'
  | 'Monitor'
  | 'Deprioritize';

export type MatchType =
  | 'Strong Match'
  | 'Partial Match'
  | 'Material Gap'
  | 'Unverified';

export type OpportunityPriority = 'High' | 'Medium' | 'Low';

export type FollowUpStatus = 'Overdue' | 'Due Today' | 'Upcoming' | 'No Date';

export type SortField =
  | 'company'
  | 'title'
  | 'fitScore'
  | 'recommendation'
  | 'priority'
  | 'stage'
  | 'followUpDate'
  | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Structured action item: stage-suggested, role-derived, or user-authored custom */
export interface OpportunityAction {
  id: string;
  text: string;
  /** 'stage' = system template for current stage; 'role' = from analysis fixture; 'custom' = user-authored */
  source: 'stage' | 'role' | 'custom';
  /** Canonical stage this action was generated for (stage-sourced actions only) */
  stage?: PipelineStage;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
}

export interface QualificationMatch {
  id: string;
  category: 'Required' | 'Preferred';
  qualification: string;
  matchType: MatchType;
  explanation: string;
  supportingEvidenceCitationIds: string[];
}

export interface HiringObjection {
  id: string;
  objection: string;
  counterPositioning: string;
  supportingCitationId?: string;
}

export interface StarStory {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  citationIds: string[];
}

export type ProvenanceStatus = 'known' | 'inferred' | 'unknown';

export interface CandidateProvenance {
  candidateId: string | null;
  candidateName: string | null;
  dataMode: 'synthetic' | 'user' | null;
  profileUpdatedAt: string | null;
  analyzedAt: string;
  provenanceStatus: ProvenanceStatus;
}

export interface FitAnalysisReport {
  executiveSummary: string;
  likelyMandate: string;
  keyRequirements: string[];
  overallFitScore: number;
  scoreExplanation: string;
  recommendation: RecommendationType;
  positioningNarrative: string;
  qualifications: QualificationMatch[];
  objections: HiringObjection[];
  recruiterQuestions: string[];
  hiringManagerQuestions: string[];
  recommendedStarStories: StarStory[];
  nextActions: string[];
  isFallbackAnalysis?: boolean;
  analysisNotice?: string;
  candidateProvenance?: CandidateProvenance;
  evidenceSnapshot?: EvidenceItem[];
  analysisEngine?: 'gemini' | 'deterministic';
  modelUsed?: string;
  latencyMs?: number;

  // V2.0 Resilience and Execution Metadata
  requestedModel?: string;
  actualModel?: string;
  engineType?: 'gemini' | 'deterministic';
  attemptCount?: number;
  failoverOccurred?: boolean;
  fallbackOccurred?: boolean;
  sanitizedFailureReason?: string;
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location?: string;
  compensation?: string;
  sourceUrl?: string;
  rawJobDescription: string;
  createdAt: string;
  updatedAt: string;
  stage: PipelineStage;
  analysis: FitAnalysisReport;

  // V1.1A Workflow Intelligence fields
  priority: OpportunityPriority;
  notes: string;
  followUpDate?: string;         // YYYY-MM-DD
  companyWebsiteUrl?: string;
  applicationUrl?: string;
  actions: OpportunityAction[];  // Unified structured action list
  archivedReason?: string;
}

export interface OpportunityUISettings {
  sortField: SortField;
  sortDirection: SortDirection;
  stageFilter: string;
  recommendationFilter: string;
  priorityFilter: string;
  followUpFilter: FollowUpStatus | 'All';
  searchTerm: string;
  themeMode: ThemeMode; // V1.1B
  viewMode?: 'table' | 'board'; // V2.0 Kanban CRM
}
