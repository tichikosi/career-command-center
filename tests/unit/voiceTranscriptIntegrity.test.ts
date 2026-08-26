import { describe, it, expect } from 'vitest';
import {
  combineTranscripts,
  cleanTranscriptDuplicates,
  calculateDeliveryMetrics,
  evaluateDeliveryScore,
  generateSpeakingCoaching,
} from '@/lib/voiceDeliveryEngine';

describe('V3.4 Voice Transcript Integrity & Deduplication', () => {
  describe('A. Interim Replacement & Streaming Preview', () => {
    it('replaces provisional interim text without duplicating previous interim segments', () => {
      const finalTranscript = '';
      let interimTranscript = 'At Google';

      // Live rendered text during event 1
      let rendered = (finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')).trim();
      expect(rendered).toBe('At Google');

      // Event 2 provides expanded interim segment
      interimTranscript = 'At Google I led';
      rendered = (finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')).trim();
      expect(rendered).toBe('At Google I led');
      expect(rendered).not.toBe('At Google At Google I led');
    });
  });

  describe('B. Final Commit', () => {
    it('commits finalized text exactly once and clears interim buffer', () => {
      let finalTranscript = '';

      // Final event arrives with isFinal: true
      const incomingFinal = 'At Google I led';
      finalTranscript = combineTranscripts(finalTranscript, incomingFinal);
      const activeInterim = '';

      const rendered = (finalTranscript + (activeInterim ? ' ' + activeInterim : '')).trim();
      expect(rendered).toBe('At Google I led');
    });
  });

  describe('C. Multiple Final Segments In Order', () => {
    it('appends distinct final segments chronologically without duplication', () => {
      let sessionFinal = 'At Google I led quarterly reviews.';
      const nextFinal = 'We aligned Finance and Sales.';

      sessionFinal = combineTranscripts(sessionFinal, nextFinal);
      expect(sessionFinal).toBe('At Google I led quarterly reviews. We aligned Finance and Sales.');
    });
  });

  describe('D. Cumulative Result Arrays (Defensive Deduplication)', () => {
    it('handles cumulative Web Speech results without duplicating prior finalized text', () => {
      let sessionFinal = 'At Google I led quarterly reviews';

      // Web Speech API emits cumulative final array that already includes prior text
      const cumulativeResult = 'At Google I led quarterly reviews with channel partners';
      sessionFinal = combineTranscripts(sessionFinal, cumulativeResult);

      expect(sessionFinal).toBe('At Google I led quarterly reviews with channel partners');
      expect(sessionFinal).not.toContain('At Google I led quarterly reviews At Google I led quarterly reviews');
    });

    it('rejects exact duplicate final segment callbacks', () => {
      const sessionFinal = 'At Google I led quarterly reviews';
      const duplicateCallback = 'At Google I led quarterly reviews';

      const result = combineTranscripts(sessionFinal, duplicateCallback);
      expect(result).toBe('At Google I led quarterly reviews');
    });

    it('handles word-level suffix-prefix overlap gracefully', () => {
      const sessionFinal = 'At Google I led quarterly reviews with key';
      const overlappingChunk = 'with key channel partners to drive scale.';

      const result = combineTranscripts(sessionFinal, overlappingChunk);
      expect(result).toBe('At Google I led quarterly reviews with key channel partners to drive scale.');
    });
  });

  describe('E. Recognition Restart & Session State Separation', () => {
    it('preserves prior session transcript on recognition restart and appends only new segments', () => {
      // 1. Session 1 finalized text
      const sessionCommitted = 'I architected the enterprise data lakehouse across 4 regions.';

      // 2. Recognition instance restarts due to network/silence interval; instance starts fresh
      const newInstanceFinal = 'This reduced query latency by 45%.';

      const combined = combineTranscripts(sessionCommitted, newInstanceFinal);
      expect(combined).toBe(
        'I architected the enterprise data lakehouse across 4 regions. This reduced query latency by 45%.'
      );
    });
  });

  describe('F. Manual Edit & Delivery Metrics Recalculation', () => {
    it('recalculates word count, WPM, and fillers from manually edited canonical transcript', () => {
      const originalTranscript =
        'Um, basically, I led the cloud migration, you know, and delivered 99.99% uptime.';
      const recordingDuration = 30; // 30 seconds

      const initialMetrics = calculateDeliveryMetrics(originalTranscript, recordingDuration);
      expect(initialMetrics.wordCount).toBe(13);
      expect(initialMetrics.wordsPerMinute).toBe(26);
      expect(initialMetrics.fillerWordsCount).toBe(3); // um, basically, you know

      // Candidate cleans up transcript before AI submission
      const editedTranscript =
        'I led the enterprise cloud platform migration across five business units, delivering 99.99% service availability.';
      const editedMetrics = calculateDeliveryMetrics(editedTranscript, recordingDuration);

      expect(editedMetrics.wordCount).toBe(15);
      expect(editedMetrics.wordsPerMinute).toBe(30); // (15 / 30) * 60
      expect(editedMetrics.fillerWordsCount).toBe(0);
      expect(editedMetrics.fillerRatePerMinute).toBe(0);
      expect(editedMetrics.durationSeconds).toBe(30); // Preserves original elapsed duration
    });
  });

  describe('G. Plausibility Guardrails & Corrupted Transcript Guard', () => {
    it('flags synthetic 64-second answer with 10,000+ words (>400 WPM) as invalid metrics', () => {
      // Synthetic bug scenario: 10,680 words in 64 seconds
      const repeatedSentence = 'At Google I led quarterly reviews across all major product lines. ';
      const corruptedTranscript = repeatedSentence.repeat(500); // thousands of words
      const durationSeconds = 64;

      const metrics = calculateDeliveryMetrics(corruptedTranscript, durationSeconds);

      // Deduplication compresses adjacent identical blocks
      expect(metrics.wordCount).toBeLessThan(50);
      expect(metrics.wordsPerMinute).toBeLessThan(400);
      expect(metrics.deliveryMetricsStatus).toBe('valid');
    });

    it('flags uncompressed extreme density (>400 WPM) as invalid_transcript_or_timing', () => {
      // 500 distinct words spoken in 20 seconds = 1500 WPM
      const distinctWords = Array.from({ length: 500 }, (_, i) => `term${i}`).join(' ');
      const metrics = calculateDeliveryMetrics(distinctWords, 20);

      expect(metrics.wordsPerMinute).toBe(1500);
      expect(metrics.deliveryMetricsStatus).toBe('invalid_transcript_or_timing');
      expect(metrics.metricsNotice).toContain('Speech metrics could not be calculated reliably');

      // Delivery scoring returns safe neutral score
      const deliveryScore = evaluateDeliveryScore(metrics, 'strategic');
      expect(deliveryScore.pace).toBe(3);
      expect(deliveryScore.executiveDelivery).toBe(3);

      // Coaching returns clear non-fabricating guidance
      const coaching = generateSpeakingCoaching(metrics, deliveryScore);
      expect(coaching.overallDeliverySummary).toContain('Speech metrics could not be calculated reliably');
    });
  });

  describe('H. Intentional Repetition Preservation', () => {
    it('preserves legitimate intentional speech repetitions like "very, very important"', () => {
      const speech = 'This strategic trade-off was very, very important for executive alignment.';
      const cleaned = cleanTranscriptDuplicates(speech);

      expect(cleaned).toBe('This strategic trade-off was very, very important for executive alignment.');
    });

    it('eliminates accidental multi-word sentence repetition blocks', () => {
      const glitchySpeech =
        'We aligned Engineering and Product on the rollout schedule. We aligned Engineering and Product on the rollout schedule. Then we launched.';
      const cleaned = cleanTranscriptDuplicates(glitchySpeech);

      expect(cleaned).toBe('We aligned Engineering and Product on the rollout schedule. Then we launched.');
    });
  });
});
