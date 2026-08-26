/**
 * Career Command Center V3.3 — Interview War Room + Application Intelligence Types
 */

// ---------------------------------------------------------------------------
// Activity Timeline
// ---------------------------------------------------------------------------

export type ActivityType =
  | 'stage_change'
  | 'application_submitted'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'recruiter_contact'
  | 'referral_activity'
  | 'networking_outreach'
  | 'follow_up_sent'
  | 'thank_you_sent'
  | 'offer_received'
  | 'rejection_received'
  | 'withdrawal'
  | 'note'
  | 'analysis_run'
  | 'prep_generated'
  | 'mock_session_completed'
  | 'system_baseline'
  | 'other';

export interface OpportunityActivity {
  id: string;
  opportunityId: string;
  activityType: ActivityType;
  title: string;
  notes?: string;
  occurredAt: string;       // ISO date string — when it actually happened
  scheduledFor?: string;     // ISO date string — for future-scheduled activities
  contactId?: string;        // Optional linked Professional Network contact
  contactName?: string;      // Denormalized for display without join
  source: 'user' | 'system' | 'demo';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Scheduled Interview
// ---------------------------------------------------------------------------

export type InterviewType =
  | 'phone_screen'
  | 'video'
  | 'onsite'
  | 'panel'
  | 'technical'
  | 'case_study'
  | 'behavioral'
  | 'hiring_manager'
  | 'executive'
  | 'other';

export interface ScheduledInterview {
  date: string;              // YYYY-MM-DD
  time?: string;             // HH:mm
  interviewerName?: string;
  interviewerTitle?: string;
  contactId?: string;        // Linked network contact
  interviewType: InterviewType;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Interview Preparation (Gemini-generated)
// ---------------------------------------------------------------------------

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational' | 'strategic' | 'culture';
  expectedFocus: string;     // What the interviewer is probing for
  suggestedApproach: string; // How to frame the answer
  relevantEvidenceIds: string[];  // EVID-* citation IDs from candidate profile
}

export interface StoryBankEntry {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  evidenceIds: string[];     // Must reference real EVID-* IDs
  applicableQuestionIds: string[];
}

export interface GapBridge {
  gap: string;
  bridgeStrategy: string;
  supportingEvidenceIds: string[];
}

export interface CompanyIntelligence {
  available: boolean;
  groundedAt?: string;         // ISO timestamp of grounding search
  sources?: string[];          // Source URLs
  keyFacts?: string[];
  cultureSignals?: string[];
  recentDevelopments?: string[];
  unavailableReason?: string;  // 'Live company intelligence unavailable'
}

export interface CompensationResearch {
  available: boolean;
  fromJobDescription?: string;   // Compensation stated in JD
  fromCandidatePreferences?: string;  // Candidate's stated preferences
  negotiationCoaching?: string[];  // Based on user-supplied data only
  unavailableReason?: string;
}

export interface InterviewReadinessScore {
  overall: number;           // 0-100
  dimensions: {
    roleUnderstanding: number;
    candidatePositioning: number;
    storyPreparation: number;
    gapMitigation: number;
    companyKnowledge: number;
    questionReadiness: number;
  };
}

export interface InterviewPreparation {
  id: string;
  opportunityId: string;
  candidateProfileId: string;

  // Core prep content
  executiveRoleBrief: string;
  candidatePositioning: string;
  strongestFitThemes: string[];
  materialGaps: GapBridge[];
  whyThisCompany: string;
  whyThisRole: string;
  whyYou: string;
  questionsToAsk: string[];
  first90DaysPoints: string[];
  riskFlags: string[];
  questions: InterviewQuestion[];
  storyBank: StoryBankEntry[];
  companyIntelligence: CompanyIntelligence;
  compensationResearch: CompensationResearch;
  readinessScore: InterviewReadinessScore;

  // Provenance
  generatedAt: string;
  requestedModel: string;
  actualModel: string;
  executionMode: 'gemini' | 'deterministic';
  candidateUpdatedAt: string;
  opportunityUpdatedAt: string;
  isActive: boolean;

  // Staleness
  isPotentiallyStale?: boolean;
  stalenessReason?: string;
}

// ---------------------------------------------------------------------------
// Mock Interview Session & Voice Interview Intelligence (V3.4)
// ---------------------------------------------------------------------------

export type AnswerMode = 'text' | 'voice';

export type TranscriptSource =
  | 'browser_stt'
  | 'gemini_audio'
  | 'server_transcription'
  | 'manual_edit'
  | 'text_typed';

export type InterviewerPersona =
  | 'recruiter'
  | 'hiring_manager'
  | 'executive'
  | 'behavioral'
  | 'peer';

export type MockDifficulty =
  | 'standard'
  | 'rigorous'
  | 'stress_test'
  | 'challenging'
  | 'executive'
  | 'adversarial';

export interface MockAnswerScore {
  relevance: number;           // 1-5
  evidenceSpecificity: number; // 1-5
  strategicDepth: number;      // 1-5
  executiveCommunication: number; // 1-5
  structure: number;           // 1-5
  concision: number;           // 1-5
}

export interface MockDeliveryScore {
  pace: number;                // 1-5 (Observable pace proxy: 130-165 WPM target)
  verbalConcision: number;     // 1-5 (Verbal efficiency vs depth)
  fillerControl: number;       // 1-5 (Filler word density)
  pausing: number;             // 1-5 (Composure and cadence proxy)
  clarity: number;             // 1-5 (Observable articulation and flow)
  executiveDelivery: number;   // 1-5 (Holistic presence and bottom-line delivery)
}

export interface TopFillerWord {
  word: string;
  count: number;
}

export interface PauseAnalysisResult {
  available: boolean;
  pauseCount: number;
  averagePauseSeconds: number;
  longestPauseSeconds: number;
  reason?: string;
}

export type DeliveryMetricsStatus = 'valid' | 'invalid_transcript_or_timing' | 'duplicate_transcript_detected';

export interface VoiceDeliveryMetrics {
  durationSeconds: number;
  wordCount: number;
  wordsPerMinute: number;
  fillerWordsCount: number;
  fillerRatePerMinute: number;
  topFillerWords: TopFillerWord[];
  pauseAnalysis: PauseAnalysisResult;
  verbosity: 'too_brief' | 'appropriate' | 'potentially_overlong';
  deliveryMetricsStatus?: DeliveryMetricsStatus;
  metricsNotice?: string;
}

export interface MockVoiceCoaching {
  speakingPaceCoaching?: string;
  fillerWordCoaching?: string;
  deliveryRefinements?: string[];
  overallDeliverySummary?: string;
}

export interface LiveConversationTurn {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  persona?: InterviewerPersona;
  turnType: 'question' | 'response' | 'probe' | 'conclusion';
  deliveryMetrics?: VoiceDeliveryMetrics;
  scores?: {
    content?: MockAnswerScore;
    delivery?: MockDeliveryScore;
  };
}

export interface MockAnswerCoaching {
  strengths: string[];
  improvements: string[];
  improvedAnswer?: string;     // May NOT invent candidate facts
}

export interface MockInterviewExchange {
  questionId: string;
  question: string;
  questionCategory: string;
  candidateAnswer: string;
  score: MockAnswerScore;
  coaching: MockAnswerCoaching;
  evidenceCitations: string[];  // EVID-* IDs that were validly referenced
  answeredAt: string;
  durationSeconds?: number;     // Time spent answering (seconds)
  isOvertime?: boolean;        // Whether user exceeded timed limit
  roundName?: string;          // E.g. 'Recruiter Screen', 'Hiring Manager'
  roundNumber?: number;        // Round index (1-based)
  totalRounds?: number;

  // V3.4 Voice Additions
  answerMode?: AnswerMode;
  transcriptSource?: TranscriptSource;
  deliveryMetrics?: VoiceDeliveryMetrics;
  deliveryScore?: MockDeliveryScore;
  voiceCoaching?: MockVoiceCoaching;
  overallResponseScore?: number; // 0-100 combining content and delivery
  contentWeight?: number;        // E.g. 0.75
  deliveryWeight?: number;       // E.g. 0.25
  persona?: InterviewerPersona;
  liveTurns?: LiveConversationTurn[];
}

export interface InterviewSession {
  id: string;
  opportunityId: string;
  prepId?: string;             // Optional link to the prep used

  // Session config
  mode: 'practice' | 'timed' | 'full' | 'live';
  difficulty: MockDifficulty;
  interviewerPersona?: InterviewerPersona;
  answerMode?: 'text' | 'voice' | 'hybrid';

  // Content
  exchanges: MockInterviewExchange[];
  overallScore: number;        // Combined or content score (0-100 scale)
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  averageDurationSeconds?: number;
  roundsCompleted?: number;
  totalRounds?: number;

  // V3.4 Delivery Aggregates
  averageWordsPerMinute?: number;
  averageFillerRate?: number;
  averageContentScore?: number;   // 0-100 scale
  averageDeliveryScore?: number;  // 0-100 scale
  liveTranscript?: LiveConversationTurn[];

  // Provenance
  requestedModel: string;
  actualModel: string;
  executionMode: 'gemini' | 'deterministic';
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Follow-Up Engine
// ---------------------------------------------------------------------------

export type FollowUpActionType =
  | 'thank_you'
  | 'recruiter_follow_up'
  | 'post_interview_follow_up'
  | 'referral_nudge'
  | 'application_check_in'
  | 'networking_outreach'
  | 'negotiation_response'
  | 'general_follow_up';

export type FollowUpPriority = 'urgent' | 'high' | 'medium' | 'low';

export type FollowUpTone = 'professional' | 'warm' | 'assertive';

export interface SmartFollowUpRecommendation {
  actionType: FollowUpActionType;
  title: string;
  rationale: string;
  dueDate?: string;            // YYYY-MM-DD
  priority: FollowUpPriority;
  opportunityId: string;
  opportunityTitle: string;
  company: string;
  contactId?: string;
  contactName?: string;
  suppressed?: boolean;
  suppressionReason?: string;
}

export interface FollowUpDraft {
  id: string;
  recommendationTitle: string;
  actionType: FollowUpActionType;
  tone: FollowUpTone;
  recipientRole: string;
  keyPoints: string[];
  draftText: string;
  opportunityId: string;
  generatedAt: string;
  sentAt?: string;             // User explicitly marks as sent
  executionMode: 'gemini' | 'deterministic';
}

// ---------------------------------------------------------------------------
// Next Best Career Action
// ---------------------------------------------------------------------------

export type NextActionCategory =
  | 'overdue_follow_up'
  | 'interview_prep_needed'
  | 'post_interview_thank_you'
  | 'active_interview_follow_up'
  | 'high_fit_unapplied'
  | 'networking_first'
  | 'stale_application'
  | 'routine_action';

export interface NextBestAction {
  category: NextActionCategory;
  title: string;
  description: string;
  opportunityId: string;
  opportunityTitle: string;
  company: string;
  urgency: number;             // 0-100 for sorting
  actionLabel: string;         // CTA button text
}
