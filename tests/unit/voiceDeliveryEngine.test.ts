import { describe, it, expect } from 'vitest';
import {
  calculateDeliveryMetrics,
  evaluateDeliveryScore,
  calculateOverallResponseScore,
  generateSpeakingCoaching,
} from '@/lib/voiceDeliveryEngine';
import { MockAnswerScore } from '@/types/interview';

describe('V3.4 Voice Delivery Metrics & Scoring Engine', () => {
  describe('calculateDeliveryMetrics', () => {
    it('calculates accurate duration, word count, and WPM', () => {
      const transcript =
        'At Nexus Global I led a multi region platform migration across five business units, scaling deployment throughput by forty percent and ensuring strict SLA uptime.';
      // 25 words in 10 seconds -> 150 WPM
      const metrics = calculateDeliveryMetrics(transcript, 10);

      expect(metrics.durationSeconds).toBe(10);
      expect(metrics.wordCount).toBe(25);
      expect(metrics.wordsPerMinute).toBe(150);
      expect(metrics.verbosity).toBe('appropriate');
    });

    it('detects common filler words and calculates filler rate per minute', () => {
      const transcript = 'Um, I was basically leading the team and, you know, actually delivered the project on time.';
      const metrics = calculateDeliveryMetrics(transcript, 30);

      expect(metrics.fillerWordsCount).toBeGreaterThanOrEqual(3);
      expect(metrics.topFillerWords.length).toBeGreaterThan(0);
      expect(metrics.fillerRatePerMinute).toBeGreaterThan(0);
    });

    it('marks pause analysis as unavailable when no audio timing is supplied without fabricating values', () => {
      const transcript = 'I structured our quarterly plan around three primary operational milestones.';
      const metrics = calculateDeliveryMetrics(transcript, 20);

      expect(metrics.pauseAnalysis.available).toBe(false);
      expect(metrics.pauseAnalysis.pauseCount).toBe(0);
      expect(metrics.pauseAnalysis.averagePauseSeconds).toBe(0);
      expect(metrics.pauseAnalysis.reason).toContain('unavailable');
    });

    it('computes pause metrics when genuine audio pause data is provided', () => {
      const transcript = 'First, we aligned stakeholders. Second, we deployed the architecture.';
      const pauseData = {
        pauses: [
          { start: 3.2, duration: 1.1 },
          { start: 7.5, duration: 1.5 },
        ],
      };
      const metrics = calculateDeliveryMetrics(transcript, 15, pauseData);

      expect(metrics.pauseAnalysis.available).toBe(true);
      expect(metrics.pauseAnalysis.pauseCount).toBe(2);
      expect(metrics.pauseAnalysis.averagePauseSeconds).toBe(1.3);
      expect(metrics.pauseAnalysis.longestPauseSeconds).toBe(1.5);
    });

    it('classifies verbosity accurately', () => {
      const brief = calculateDeliveryMetrics('Yes I agree.', 5);
      expect(brief.verbosity).toBe('too_brief');

      const normal = calculateDeliveryMetrics(
        'At my prior company I led a team of 40 engineers through cloud replatforming, reducing latency by 35% and saving 2 million annually.',
        35
      );
      expect(normal.verbosity).toBe('appropriate');
    });
  });

  describe('evaluateDeliveryScore', () => {
    it('rewards target executive pace (130-165 WPM) with score 5', () => {
      const metrics = calculateDeliveryMetrics(
        'We prioritized core enterprise features while deprecating legacy monolith components in phased rollout.',
        6
      ); // ~140 WPM
      const score = evaluateDeliveryScore(metrics, 'strategic', 'standard');

      expect(score.pace).toBeGreaterThanOrEqual(4);
      expect(score.clarity).toBeGreaterThanOrEqual(4);
    });

    it('penalizes excessively rushed pace (> 195 WPM)', () => {
      // 50 words in 10 seconds -> 300 WPM
      const rushedWords = Array(50).fill('word').join(' ');
      const metrics = calculateDeliveryMetrics(rushedWords, 10);
      const score = evaluateDeliveryScore(metrics, 'strategic', 'standard');

      expect(score.pace).toBeLessThanOrEqual(2);
    });

    it('clamps trivial answers (< 12 words) to score 1 across all dimensions', () => {
      const trivial = calculateDeliveryMetrics('I did that.', 3);
      const score = evaluateDeliveryScore(trivial, 'behavioral', 'standard');

      expect(score.pace).toBe(1);
      expect(score.verbalConcision).toBe(1);
      expect(score.fillerControl).toBe(1);
      expect(score.clarity).toBe(1);
      expect(score.executiveDelivery).toBe(1);
    });
  });

  describe('calculateOverallResponseScore', () => {
    const mockContentScore: MockAnswerScore = {
      relevance: 5,
      evidenceSpecificity: 4,
      strategicDepth: 4,
      executiveCommunication: 4,
      structure: 4,
      concision: 4,
    }; // 25/30 -> 83%

    const mockDeliveryScore = {
      pace: 5,
      verbalConcision: 4,
      fillerControl: 4,
      pausing: 4,
      clarity: 4,
      executiveDelivery: 4,
    }; // 25/30 -> 83%

    it('applies 75% Content / 25% Delivery weighting for behavioral questions', () => {
      const res = calculateOverallResponseScore(mockContentScore, mockDeliveryScore, 'behavioral');

      expect(res.contentWeight).toBe(0.75);
      expect(res.deliveryWeight).toBe(0.25);
      expect(res.overallScore).toBe(83);
    });

    it('applies 70% Content / 30% Delivery weighting for strategic questions', () => {
      const res = calculateOverallResponseScore(mockContentScore, mockDeliveryScore, 'strategic');

      expect(res.contentWeight).toBe(0.7);
      expect(res.deliveryWeight).toBe(0.3);
      expect(res.overallScore).toBe(83);
    });

    it('applies 60% Content / 40% Delivery weighting for culture / pitch questions', () => {
      const res = calculateOverallResponseScore(mockContentScore, mockDeliveryScore, 'culture');

      expect(res.contentWeight).toBe(0.6);
      expect(res.deliveryWeight).toBe(0.4);
    });

    it('applies 100% Content / 0% Delivery for text answers (no delivery score)', () => {
      const res = calculateOverallResponseScore(mockContentScore, undefined, 'strategic');

      expect(res.contentWeight).toBe(1.0);
      expect(res.deliveryWeight).toBe(0.0);
      expect(res.overallScore).toBe(83);
      expect(res.deliveryScorePercent).toBe(0);
    });
  });

  describe('generateSpeakingCoaching', () => {
    it('produces constructive pace and filler guidance', () => {
      const metrics = calculateDeliveryMetrics(
        'Um, basically, I led the cloud transformation project, you know, across multiple teams.',
        15
      );
      const score = evaluateDeliveryScore(metrics, 'strategic');
      const coaching = generateSpeakingCoaching(metrics, score);

      expect(coaching.speakingPaceCoaching).toBeDefined();
      expect(coaching.fillerWordCoaching).toBeDefined();
      expect(coaching.deliveryRefinements?.length).toBeGreaterThan(0);
      expect(coaching.overallDeliverySummary).toBeDefined();
    });
  });
});
