import { describe, it, expect, beforeEach } from 'vitest';
import { MockCloudStorageAdapter } from '@/lib/storage/mockCloudRepository';
import { InterviewSession, InterviewPreparation } from '@/types/interview';

describe('V3.3 Interview Prep & Session Persistence Unit Tests', () => {
  let adapter: MockCloudStorageAdapter;

  beforeEach(() => {
    adapter = new MockCloudStorageAdapter();
  });

  it('saves and retrieves active interview preparation packages', async () => {
    const userId = 'user-tanaka-1';
    const oppId = 'opp-100';

    const prep: InterviewPreparation = {
      id: 'prep-100',
      opportunityId: oppId,
      candidateProfileId: 'cand-tanaka-1',
      executiveRoleBrief: 'Briefing for Executive Role',
      candidatePositioning: 'Lead Enterprise Engineering',
      strongestFitThemes: ['Scale', 'Governance'],
      materialGaps: [],
      whyThisCompany: 'Mission alignment',
      whyThisRole: 'Next step',
      whyYou: 'Deep expertise',
      questionsToAsk: ['What is the first 90 day goal?'],
      first90DaysPoints: ['Evaluate team'],
      riskFlags: [],
      questions: [],
      storyBank: [],
      companyIntelligence: { available: false },
      compensationResearch: { available: false },
      readinessScore: {
        overall: 80,
        dimensions: {
          roleUnderstanding: 80,
          candidatePositioning: 80,
          storyPreparation: 80,
          gapMitigation: 80,
          companyKnowledge: 80,
          questionReadiness: 80,
        },
      },
      generatedAt: '2026-08-20T00:00:00.000Z',
      requestedModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.7-flash',
      executionMode: 'gemini',
      candidateUpdatedAt: '2026-08-20T00:00:00.000Z',
      opportunityUpdatedAt: '2026-08-20T00:00:00.000Z',
      isActive: true,
    };

    await adapter.interviewPrep.savePrep(prep, userId);

    const active = await adapter.interviewPrep.getActivePrep(oppId, userId);
    expect(active).not.toBeNull();
    expect(active?.id).toBe('prep-100');
    expect(active?.executiveRoleBrief).toBe('Briefing for Executive Role');
  });

  it('persists mock interview sessions and allows review and deletion', async () => {
    const userId = 'user-tanaka-1';
    const oppId = 'opp-100';

    const session: InterviewSession = {
      id: 'sess-100',
      opportunityId: oppId,
      mode: 'practice',
      difficulty: 'standard',
      exchanges: [
        {
          questionId: 'q1',
          question: 'How do you lead during transformation?',
          questionCategory: 'behavioral',
          candidateAnswer: 'I align stakeholder incentives and establish clear KPIs.',
          score: {
            relevance: 4,
            evidenceSpecificity: 3,
            strategicDepth: 4,
            executiveCommunication: 4,
            structure: 4,
            concision: 4,
          },
          coaching: { strengths: ['Strategic mindset'], improvements: ['Add metric'] },
          evidenceCitations: [],
          answeredAt: '2026-08-21T10:00:00.000Z',
        },
      ],
      overallScore: 78,
      summary: 'Solid performance with strong strategic emphasis.',
      strengths: ['Strategic alignment'],
      improvementAreas: ['Quantifiable metrics'],
      requestedModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.7-flash',
      executionMode: 'gemini',
      startedAt: '2026-08-21T09:50:00.000Z',
      completedAt: '2026-08-21T10:05:00.000Z',
      createdAt: '2026-08-21T10:05:00.000Z',
    };

    await adapter.interviewSessions.saveSession(session, userId);

    let list = await adapter.interviewSessions.getSessions(oppId, userId);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('sess-100');
    expect(list[0].overallScore).toBe(78);

    // Delete session
    await adapter.interviewSessions.deleteSession('sess-100', userId);
    list = await adapter.interviewSessions.getSessions(oppId, userId);
    expect(list.length).toBe(0);
  });
});
