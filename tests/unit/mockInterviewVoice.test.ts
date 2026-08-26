import { describe, it, expect } from 'vitest';
import { MockInterviewEngine } from '@/lib/server/mockInterviewEngine';
import {
  MockQuestionsRequestSchema,
  MockEvaluationRequestSchema,
  ConversationalTurnRequestSchema,
} from '@/lib/server/schemas';
import { createTestCandidate, createTestOpportunity } from '../fixtures/v33TestFixtures';
import {
  createTestVoiceDeliveryMetrics,
  createTestVoiceInterviewExchange,
} from '../fixtures/v34TestFixtures';

describe('V3.4 Mock Interview Voice & Persona Engine', () => {
  const testCandidate = createTestCandidate();
  const testOpportunity = createTestOpportunity({
    id: 'opp-voice-test-1',
    title: 'VP of AI Transformation',
    company: 'Nexus Global',
    stage: 'Interviewing',
    rawJobDescription: 'Lead enterprise AI platform transformation, cross-functional GTM, and strategic operating model.',
  });

  const engine = new MockInterviewEngine();

  describe('Question Generation with Personas', () => {
    it('generates questions tailored to the executive persona in deterministic fallback', async () => {
      const res = await engine.generateQuestions({
        opportunity: testOpportunity,
        candidate: testCandidate,
        difficulty: 'standard',
        mode: 'practice',
        persona: 'executive',
      });

      expect(res.questions.length).toBeGreaterThan(0);
      expect(res.executionMode).toBeDefined();
    });

    it('generates stress test dilemma questions', async () => {
      const res = await engine.generateQuestions({
        opportunity: testOpportunity,
        candidate: testCandidate,
        difficulty: 'stress_test',
        mode: 'practice',
        persona: 'hiring_manager',
      });

      expect(res.questions.length).toBeGreaterThan(0);
      expect(res.questions.some((q) => q.question.toLowerCase().includes('trade-off') || q.question.toLowerCase().includes('blind spot') || q.question.toLowerCase().includes('resistance'))).toBe(true);
    });
  });

  describe('Answer Evaluation with Voice Delivery Scoring', () => {
    it('evaluates spoken answer with combined content and delivery score', async () => {
      const metrics = createTestVoiceDeliveryMetrics({
        durationSeconds: 40,
        wordCount: 100,
        wordsPerMinute: 150,
        fillerWordsCount: 2,
        fillerRatePerMinute: 3.0,
      });

      const res = await engine.evaluateAnswer({
        question: 'How do you prioritize platform replatforming against short-term revenue goals?',
        questionCategory: 'strategic',
        candidateAnswer:
          'At Nexus Global, I led a multi-region replatforming while maintaining 99.99% SLA and scaling $40M in expansion revenue.',
        opportunity: testOpportunity,
        candidate: testCandidate,
        difficulty: 'standard',
        answerMode: 'voice',
        deliveryMetrics: metrics,
      });

      expect(res.score).toBeDefined();
      expect(res.deliveryScore).toBeDefined();
      expect(res.overallResponseScore).toBeGreaterThan(0);
      expect(res.contentWeight).toBe(0.7);
      expect(res.deliveryWeight).toBe(0.3);
      expect(res.voiceCoaching).toBeDefined();
      expect(res.voiceCoaching?.speakingPaceCoaching).toBeDefined();
    });

    it('evaluates text answer with 100% content weighting and no delivery score', async () => {
      const res = await engine.evaluateAnswer({
        question: 'Describe a time you resolved a major stakeholder disagreement.',
        questionCategory: 'behavioral',
        candidateAnswer:
          'When leading the platform migration at Nexus Global, engineering and sales were misaligned on timing. I established a phased rollout with clear milestones.',
        opportunity: testOpportunity,
        candidate: testCandidate,
        difficulty: 'standard',
        answerMode: 'text',
      });

      expect(res.score).toBeDefined();
      expect(res.deliveryScore).toBeUndefined();
      expect(res.contentWeight).toBe(1.0);
      expect(res.deliveryWeight).toBe(0.0);
    });

    it('clamps trivial answers strictly with score 1', async () => {
      const metrics = createTestVoiceDeliveryMetrics({ durationSeconds: 3, wordCount: 3, wordsPerMinute: 60 });
      const res = await engine.evaluateAnswer({
        question: 'Tell me about yourself.',
        questionCategory: 'behavioral',
        candidateAnswer: 'I am good.',
        opportunity: testOpportunity,
        candidate: testCandidate,
        difficulty: 'standard',
        answerMode: 'voice',
        deliveryMetrics: metrics,
      });

      expect(res.score.relevance).toBe(1);
      expect(res.score.evidenceSpecificity).toBe(1);
      expect(res.overallResponseScore).toBe(20);
      expect(res.deliveryScore?.pace).toBe(1);
    });
  });

  describe('Dynamic Conversational Follow-Up Engine', () => {
    it('generates a dynamic follow-up probe referencing cited metrics in candidate answer', async () => {
      const res = await engine.generateDynamicFollowUp({
        question: 'What is your greatest operational achievement?',
        candidateAnswer: 'I led an enterprise migration that achieved 40% latency reduction across 12 teams.',
        conversationHistory: [],
        persona: 'hiring_manager',
        difficulty: 'standard',
        opportunity: testOpportunity,
        candidate: testCandidate,
      });

      expect(res.followUpQuestion).toBeDefined();
      expect(res.followUpQuestion.length).toBeGreaterThan(10);
      expect(res.probeIntent).toBeDefined();
      expect(res.suggestedApproach).toBeDefined();
    });

    it('generates high-stakes trade-off probes in stress test mode', async () => {
      const res = await engine.generateDynamicFollowUp({
        question: 'How do you manage budget cuts?',
        candidateAnswer: 'I evaluate core priorities and align the leadership team.',
        conversationHistory: [],
        persona: 'executive',
        difficulty: 'stress_test',
        opportunity: testOpportunity,
        candidate: testCandidate,
      });

      expect(res.followUpQuestion.toLowerCase()).toContain('sacrifice');
    });
  });

  describe('Session Summary Delivery Aggregates', () => {
    it('calculates average WPM, filler rate, content score, and delivery score', () => {
      const exchange1 = createTestVoiceInterviewExchange({
        deliveryMetrics: createTestVoiceDeliveryMetrics({ wordsPerMinute: 140, fillerRatePerMinute: 2.0 }),
      });
      const exchange2 = createTestVoiceInterviewExchange({
        deliveryMetrics: createTestVoiceDeliveryMetrics({ wordsPerMinute: 160, fillerRatePerMinute: 4.0 }),
      });

      const summary = engine.generateSessionSummary([exchange1, exchange2]);

      expect(summary.averageWordsPerMinute).toBe(150);
      expect(summary.averageFillerRate).toBe(3.0);
      expect(summary.averageContentScore).toBeGreaterThan(0);
      expect(summary.averageDeliveryScore).toBeGreaterThan(0);
      expect(summary.summary).toContain('150 WPM');
    });
  });

  describe('Zod Schema Validations', () => {
    it('validates MockQuestionsRequestSchema with persona and live mode', () => {
      const body = {
        opportunity: { id: 'opp-1', title: 'Director', company: 'Acme', rawJobDescription: 'Desc' },
        candidateSnapshot: testCandidate,
        difficulty: 'rigorous',
        mode: 'live',
        persona: 'executive',
      };
      const parse = MockQuestionsRequestSchema.safeParse(body);
      expect(parse.success).toBe(true);
    });

    it('validates MockEvaluationRequestSchema with voice delivery metrics', () => {
      const body = {
        question: 'Tell me about a time...',
        questionCategory: 'behavioral',
        candidateAnswer: 'At my last company...',
        opportunity: { id: 'opp-1', title: 'Director', company: 'Acme', rawJobDescription: 'Desc' },
        candidateSnapshot: testCandidate,
        difficulty: 'standard',
        answerMode: 'voice',
        transcriptSource: 'browser_stt',
        deliveryMetrics: createTestVoiceDeliveryMetrics(),
        persona: 'hiring_manager',
      };
      const parse = MockEvaluationRequestSchema.safeParse(body);
      expect(parse.success).toBe(true);
    });

    it('validates ConversationalTurnRequestSchema', () => {
      const body = {
        question: 'What is your strategy?',
        candidateAnswer: 'My strategy involves 3 pillars...',
        conversationHistory: [{ speaker: 'interviewer', text: 'Welcome' }],
        persona: 'executive',
        difficulty: 'stress_test',
        opportunity: { id: 'opp-1', title: 'Director', company: 'Acme', rawJobDescription: 'Desc' },
        candidateSnapshot: testCandidate,
      };
      const parse = ConversationalTurnRequestSchema.safeParse(body);
      expect(parse.success).toBe(true);
    });
  });
});
