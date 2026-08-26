import { describe, it, expect } from 'vitest';
import { evaluateOpportunityFollowUp, calculateNextBestActions } from '@/lib/followUpEngine';
import { JobOpportunity } from '@/types/opportunity';
import { OpportunityActivity } from '@/types/interview';

function mockOpp(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return {
    id: 'opp-1',
    title: 'VP of Engineering',
    company: 'Acme Corp',
    stage: 'Applied',
    priority: 'High',
    notes: '',
    rawJobDescription: 'Build enterprise platforms',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    actions: [],
    analysis: {
      overallFitScore: 88,
      recommendation: 'Apply',
      executiveSummary: 'Strong match',
      likelyMandate: 'Scale teams',
      keyRequirements: ['Leadership'],
      scoreExplanation: 'Excellent alignment',
      positioningNarrative: 'Lead engineering',
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

describe('V3.3 Smart Follow-Up & Next Best Action Engine', () => {
  it('generates an urgent follow-up for explicit overdue follow-up dates', () => {
    const opp = mockOpp({
      followUpDate: '2026-08-10', // in past relative to today
    });

    const recommendations = evaluateOpportunityFollowUp(opp, []);
    const overdueRec = recommendations.find((r) => r.dueDate === '2026-08-10');

    expect(overdueRec).toBeDefined();
    expect(overdueRec?.priority).toBe('urgent');
    expect(overdueRec?.title).toContain('Overdue Follow-Up');
  });

  it('recommends thank-you note when an interview is completed and no thank-you was recorded', () => {
    const opp = mockOpp({ stage: 'Interviewing' });
    const activities: OpportunityActivity[] = [
      {
        id: 'act-1',
        opportunityId: opp.id,
        activityType: 'interview_completed',
        title: 'Panel Interview Round',
        occurredAt: new Date().toISOString(),
        contactName: 'Jane VP',
        source: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const recommendations = evaluateOpportunityFollowUp(opp, activities);
    const thankYouRec = recommendations.find((r) => r.actionType === 'thank_you');

    expect(thankYouRec).toBeDefined();
    expect(thankYouRec?.contactName).toBe('Jane VP');
    expect(thankYouRec?.title).toContain('Send Thank-You Note');
  });

  it('suppresses thank-you recommendation if thank-you was already sent after interview', () => {
    const opp = mockOpp({ stage: 'Interviewing' });
    const now = Date.now();
    const activities: OpportunityActivity[] = [
      {
        id: 'act-ty',
        opportunityId: opp.id,
        activityType: 'thank_you_sent',
        title: 'Thank-You Sent',
        occurredAt: new Date(now).toISOString(),
        source: 'user',
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
      {
        id: 'act-int',
        opportunityId: opp.id,
        activityType: 'interview_completed',
        title: 'Panel Interview Round',
        occurredAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(), // 2 hours prior
        source: 'user',
        createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      },
    ];

    const recommendations = evaluateOpportunityFollowUp(opp, activities);
    const thankYouRec = recommendations.find((r) => r.actionType === 'thank_you');
    expect(thankYouRec).toBeUndefined();
  });

  it('suppresses routine follow-ups for Archived opportunities', () => {
    const opp = mockOpp({
      stage: 'Archived',
      followUpDate: '2026-08-10',
    });

    const recommendations = evaluateOpportunityFollowUp(opp, []);
    expect(recommendations.length).toBe(0);
  });

  it('calculates and deterministically ranks Next Best Career Actions by urgency', () => {
    const opp1 = mockOpp({
      id: 'opp-1',
      company: 'Overdue Co',
      followUpDate: '2026-08-10',
    });

    const opp2 = mockOpp({
      id: 'opp-2',
      company: 'High Fit Co',
      stage: 'Identified',
      analysis: {
        overallFitScore: 92,
        recommendation: 'Apply',
        executiveSummary: '',
        likelyMandate: '',
        keyRequirements: [],
        scoreExplanation: '',
        positioningNarrative: '',
        qualifications: [],
        objections: [],
        recruiterQuestions: [],
        hiringManagerQuestions: [],
        recommendedStarStories: [],
        nextActions: [],
      },
    });

    const actions = calculateNextBestActions([opp1, opp2]);

    expect(actions.length).toBeGreaterThan(0);
    // Overdue follow-up (urgency ~95) should precede unapplied high-fit (urgency ~70)
    expect(actions[0].category).toBe('overdue_follow_up');
    expect(actions[0].company).toBe('Overdue Co');
  });
});
