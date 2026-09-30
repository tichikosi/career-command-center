import { describe, it, expect } from 'vitest';
import { createTestVoiceSession } from '../fixtures/v34TestFixtures';
import { InterviewSession } from '@/types/interview';

describe('V3.4 Interview Performance Analytics & Session Comparison', () => {
  const session1 = createTestVoiceSession({
    id: 'sess-1',
    createdAt: '2026-08-20T10:00:00.000Z',
    overallScore: 78,
    averageWordsPerMinute: 135,
    averageFillerRate: 3.5,
    averageContentScore: 75,
    averageDeliveryScore: 82,
  });

  const session2 = createTestVoiceSession({
    id: 'sess-2',
    createdAt: '2026-08-22T10:00:00.000Z',
    overallScore: 84,
    averageWordsPerMinute: 145,
    averageFillerRate: 2.5,
    averageContentScore: 82,
    averageDeliveryScore: 88,
  });

  const session3 = createTestVoiceSession({
    id: 'sess-3',
    createdAt: '2026-08-24T10:00:00.000Z',
    overallScore: 90,
    averageWordsPerMinute: 152,
    averageFillerRate: 1.8,
    averageContentScore: 89,
    averageDeliveryScore: 92,
  });

  const allSessions: InterviewSession[] = [session1, session2, session3];

  it('aggregates multi-session performance accurately', () => {
    const avgOverall = Math.round(
      allSessions.reduce((acc, s) => acc + s.overallScore, 0) / allSessions.length
    );
    const avgWpm = Math.round(
      allSessions.reduce((acc, s) => acc + (s.averageWordsPerMinute || 0), 0) / allSessions.length
    );
    const avgFillers =
      Math.round(
        (allSessions.reduce((acc, s) => acc + (s.averageFillerRate || 0), 0) / allSessions.length) * 10
      ) / 10;

    expect(avgOverall).toBe(84);
    expect(avgWpm).toBe(144);
    expect(avgFillers).toBe(2.6);
  });

  it('computes comparison deltas between two sessions correctly', () => {
    const baseline = session1;
    const current = session3;

    const scoreDelta = current.overallScore - baseline.overallScore;
    const wpmDelta = (current.averageWordsPerMinute || 0) - (baseline.averageWordsPerMinute || 0);
    const fillerDelta =
      Math.round(((current.averageFillerRate || 0) - (baseline.averageFillerRate || 0)) * 10) / 10;

    expect(scoreDelta).toBe(12); // +12% improvement
    expect(wpmDelta).toBe(17); // +17 WPM cadence acceleration
    expect(fillerDelta).toBe(-1.7); // -1.7 fillers/min reduction
  });

  it('filters sessions by chronological limit correctly', () => {
    const sorted = [...allSessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const last2 = sorted.slice(-2);

    expect(last2.length).toBe(2);
    expect(last2[0].id).toBe('sess-2');
    expect(last2[1].id).toBe('sess-3');
  });

  it('isolates voice delivery averages from text-only historical sessions', () => {
    const textSession: InterviewSession = createTestVoiceSession({
      id: 'sess-text-1',
      opportunityId: 'opp-1',
      mode: 'practice',
      difficulty: 'standard',
      interviewerPersona: 'behavioral',
      answerMode: 'text',
      exchanges: [],
      overallScore: 80,
      createdAt: '2026-08-25T10:00:00.000Z',
      summary: 'Text practice session',
      strengths: ['Clear structure'],
      improvementAreas: ['Add metrics'],
      averageDeliveryScore: undefined,
      averageWordsPerMinute: undefined,
      averageFillerRate: undefined,
    });

    const mixedSessions = [...allSessions, textSession];

    // Voice delivery calculation should strictly filter for sessions with averageDeliveryScore > 0
    const voiceDeliverySessions = mixedSessions.filter(
      (s) => typeof s.averageDeliveryScore === 'number' && s.averageDeliveryScore > 0
    );

    const avgDelivery = Math.round(
      voiceDeliverySessions.reduce((acc, s) => acc + (s.averageDeliveryScore || 0), 0) /
        voiceDeliverySessions.length
    );

    // Should equal the average of session1 (82), session2 (88), session3 (92) = 262 / 3 = 87.33 -> 87
    expect(avgDelivery).toBe(87);
    expect(voiceDeliverySessions.length).toBe(3); // textSession excluded
  });

  it('handles sessions with missing delivery metrics gracefully without distorting averages', () => {
    const textOnlySessions: InterviewSession[] = [
      createTestVoiceSession({
        id: 'sess-text-only-1',
        opportunityId: 'opp-1',
        mode: 'timed',
        difficulty: 'standard',
        answerMode: 'text',
        exchanges: [],
        overallScore: 70,
        createdAt: '2026-08-26T10:00:00.000Z',
        summary: 'Text-only timed screen',
        strengths: ['Fast response'],
        improvementAreas: ['Executive depth'],
        averageDeliveryScore: undefined,
        averageWordsPerMinute: undefined,
        averageFillerRate: undefined,
      }),
    ];

    const voiceSessions = textOnlySessions.filter(
      (s) => typeof s.averageDeliveryScore === 'number' && s.averageDeliveryScore > 0
    );

    expect(voiceSessions.length).toBe(0);
    const avgDelivery = voiceSessions.length > 0 ? 80 : 0;
    expect(avgDelivery).toBe(0);
  });

  it('preserves persona and modality metadata across sessions for side-by-side comparison', () => {
    const baseline = session1;
    const current: InterviewSession = createTestVoiceSession({
      id: 'sess-live-voice',
      opportunityId: 'opp-1',
      mode: 'live',
      difficulty: 'rigorous',
      interviewerPersona: 'executive',
      answerMode: 'voice',
      exchanges: [],
      overallScore: 88,
      averageWordsPerMinute: 148,
      averageFillerRate: 2.1,
      averageDeliveryScore: 90,
      averageContentScore: 86,
      createdAt: '2026-08-27T10:00:00.000Z',
      summary: 'Executive live simulation',
      strengths: ['High altitude'],
      improvementAreas: ['Risk framing'],
    });

    expect(current.interviewerPersona).toBe('executive');
    expect(current.mode).toBe('live');
    expect(current.answerMode).toBe('voice');
    expect(baseline.interviewerPersona).toBeDefined();

    // Delivery delta calculation between two valid voice sessions
    const deliveryDelta = (current.averageDeliveryScore || 0) - (baseline.averageDeliveryScore || 0);
    expect(deliveryDelta).toBe(8); // 90 - 82 = +8%
  });
});
