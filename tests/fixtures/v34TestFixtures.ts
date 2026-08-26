import {
  VoiceDeliveryMetrics,
  MockDeliveryScore,
  MockVoiceCoaching,
  MockInterviewExchange,
  InterviewSession,
  LiveConversationTurn,
} from '@/types/interview';

export function createTestVoiceDeliveryMetrics(
  overrides: Partial<VoiceDeliveryMetrics> = {}
): VoiceDeliveryMetrics {
  return {
    durationSeconds: 45,
    wordCount: 110,
    wordsPerMinute: 147,
    fillerWordsCount: 2,
    fillerRatePerMinute: 2.7,
    topFillerWords: [
      { word: 'like', count: 1 },
      { word: 'actually', count: 1 },
    ],
    pauseAnalysis: {
      available: true,
      pauseCount: 3,
      averagePauseSeconds: 1.2,
      longestPauseSeconds: 2.1,
    },
    verbosity: 'appropriate',
    ...overrides,
  };
}

export function createTestMockDeliveryScore(
  overrides: Partial<MockDeliveryScore> = {}
): MockDeliveryScore {
  return {
    pace: 5,
    verbalConcision: 4,
    fillerControl: 4,
    pausing: 4,
    clarity: 5,
    executiveDelivery: 4,
    ...overrides,
  };
}

export function createTestMockVoiceCoaching(
  overrides: Partial<MockVoiceCoaching> = {}
): MockVoiceCoaching {
  return {
    speakingPaceCoaching: 'Pace was steady at 147 WPM, matching executive delivery standards.',
    fillerWordCoaching: 'Controlled filler usage (2.7/min). Maintain steady pauses after key recommendations.',
    deliveryRefinements: [
      'Pause slightly longer after stating the bottom-line metric',
      'Maintain steady volume when transitioning to secondary proof points',
    ],
    overallDeliverySummary: 'Strong executive presence with clear articulation and concise structure.',
    ...overrides,
  };
}

export function createTestVoiceInterviewExchange(
  overrides: Partial<MockInterviewExchange> = {}
): MockInterviewExchange {
  return {
    questionId: 'mq-voice-1',
    question: 'How do you prioritize platform replatforming against short-term revenue goals?',
    questionCategory: 'strategic',
    candidateAnswer:
      'At Nexus Global, I led a multi-region replatforming while maintaining 99.99% SLA and supporting $40M in expansion revenue.',
    score: {
      relevance: 5,
      evidenceSpecificity: 4,
      strategicDepth: 5,
      executiveCommunication: 4,
      structure: 4,
      concision: 4,
    },
    coaching: {
      strengths: ['Clear strategic framing', 'Quantified expansion revenue metric'],
      improvements: ['Articulate trade-offs considered during the rollout'],
      improvedAnswer:
        'Suggested Grounded Framework: Lead with the dual-track prioritization cadence established at Nexus Global.',
    },
    evidenceCitations: ['EVID-IMP-01'],
    answeredAt: '2026-08-25T20:00:00.000Z',
    durationSeconds: 45,
    answerMode: 'voice',
    transcriptSource: 'browser_stt',
    deliveryMetrics: createTestVoiceDeliveryMetrics(),
    deliveryScore: createTestMockDeliveryScore(),
    voiceCoaching: createTestMockVoiceCoaching(),
    overallResponseScore: 88,
    contentWeight: 0.7,
    deliveryWeight: 0.3,
    persona: 'executive',
    ...overrides,
  };
}

export function createTestVoiceSession(
  overrides: Partial<InterviewSession> = {}
): InterviewSession {
  const exchange = createTestVoiceInterviewExchange();
  return {
    id: 'sess-voice-test-1',
    opportunityId: 'opp-qa-test-google-ai-strategy',
    mode: 'practice',
    difficulty: 'standard',
    answerMode: 'voice',
    interviewerPersona: 'executive',
    exchanges: [exchange],
    overallScore: 88,
    summary: 'Executive voice interview rehearsal with high strategic depth and steady 147 WPM delivery.',
    strengths: ['Clear strategic priorities', 'Strong metrics grounding', 'Controlled speaking pace'],
    improvementAreas: ['Add explicit risk mitigation trade-offs'],
    averageDurationSeconds: 45,
    averageWordsPerMinute: 147,
    averageFillerRate: 2.7,
    averageContentScore: 87,
    averageDeliveryScore: 90,
    requestedModel: 'gemini-3.7-flash',
    actualModel: 'gemini-3.7-flash',
    executionMode: 'gemini',
    startedAt: '2026-08-25T19:55:00.000Z',
    completedAt: '2026-08-25T20:00:00.000Z',
    createdAt: '2026-08-25T20:00:00.000Z',
    ...overrides,
  };
}

export function createTestLiveConversationTurn(
  overrides: Partial<LiveConversationTurn> = {}
): LiveConversationTurn {
  return {
    id: 'turn-1',
    speaker: 'interviewer',
    text: 'What was the single largest architectural failure in that migration and how did you mitigate it?',
    timestamp: '2026-08-25T20:00:10.000Z',
    persona: 'hiring_manager',
    turnType: 'probe',
    ...overrides,
  };
}
