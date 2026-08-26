import { describe, it, expect } from 'vitest';
import { evaluateOpportunityFollowUp } from '@/lib/followUpEngine';
import { MockInterviewEngine } from '@/lib/server/mockInterviewEngine';
import { MockQuestionsRequestSchema } from '@/lib/server/schemas';
import { JobOpportunity } from '@/types/opportunity';
import { OpportunityActivity } from '@/types/interview';

import { createTestCandidate, createTestOpportunity } from '../fixtures/v33TestFixtures';

function mockOpp(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return createTestOpportunity(overrides);
}

const mockCandidate: CandidateProfile = createTestCandidate();

describe('V3.3 Smart Follow-Up Engine — Scenarios A through J', () => {
  // Scenario A: Identified/no activity -> no inappropriate urgent follow-up
  it('Scenario A: Identified stage without activity produces no urgent follow-up', () => {
    const opp = mockOpp({ stage: 'Identified' });
    const recs = evaluateOpportunityFollowUp(opp, []);
    const urgentRecs = recs.filter((r) => r.priority === 'urgent');
    expect(urgentRecs.length).toBe(0);
  });

  // Scenario B: Applied + stale (10+ days) -> follow-up recommended
  it('Scenario B: Applied stage stale for 10 days triggers follow-up check-in', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const opp = mockOpp({
      stage: 'Applied',
      updatedAt: tenDaysAgo,
    });

    const recs = evaluateOpportunityFollowUp(opp, []);
    const checkIn = recs.find((r) => r.actionType === 'application_check_in');
    expect(checkIn).toBeDefined();
    expect(checkIn?.title).toContain('Application Status Check-In');
  });

  // Scenario C: Recruiter contact + silence (7+ days) -> recruiter check-in
  it('Scenario C: Recruiter contact with 7 days silence triggers recruiter check-in', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const opp = mockOpp({ stage: 'Interviewing' });
    const activities: OpportunityActivity[] = [
      {
        id: 'act-rec',
        opportunityId: opp.id,
        activityType: 'recruiter_contact',
        title: 'Initial Recruiter Screen',
        contactName: 'Sarah Recruiter',
        occurredAt: sevenDaysAgo,
        source: 'user',
        createdAt: sevenDaysAgo,
        updatedAt: sevenDaysAgo,
      },
    ];

    const recs = evaluateOpportunityFollowUp(opp, activities);
    const recFollowUp = recs.find((r) => r.actionType === 'recruiter_follow_up');
    expect(recFollowUp).toBeDefined();
    expect(recFollowUp?.contactName).toBe('Sarah Recruiter');
  });

  // Scenario D: Interview complete + no thank-you -> high-priority thank-you
  it('Scenario D: Completed interview without thank-you triggers immediate thank-you note', () => {
    const opp = mockOpp({ stage: 'Interviewing' });
    const activities: OpportunityActivity[] = [
      {
        id: 'act-int',
        opportunityId: opp.id,
        activityType: 'interview_completed',
        title: 'Executive Loop w/ VP Product',
        contactName: 'David VP',
        occurredAt: new Date().toISOString(),
        source: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const recs = evaluateOpportunityFollowUp(opp, activities);
    const thankYou = recs.find((r) => r.actionType === 'thank_you');
    expect(thankYou).toBeDefined();
    expect(thankYou?.contactName).toBe('David VP');
    expect(thankYou?.priority === 'urgent' || thankYou?.priority === 'high').toBe(true);
  });

  // Scenario E: Thank-you recorded -> suppress duplicate thank-you
  it('Scenario E: Recorded thank-you suppresses duplicate thank-you recommendations', () => {
    const now = Date.now();
    const opp = mockOpp({ stage: 'Interviewing' });
    const activities: OpportunityActivity[] = [
      {
        id: 'act-ty',
        opportunityId: opp.id,
        activityType: 'thank_you_sent',
        title: 'Sent Thank You Note',
        occurredAt: new Date(now).toISOString(),
        source: 'user',
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
      {
        id: 'act-int',
        opportunityId: opp.id,
        activityType: 'interview_completed',
        title: 'Completed Interview',
        occurredAt: new Date(now - 3600000).toISOString(),
        source: 'user',
        createdAt: new Date(now - 3600000).toISOString(),
        updatedAt: new Date(now - 3600000).toISOString(),
      },
    ];

    const recs = evaluateOpportunityFollowUp(opp, activities);
    const thankYou = recs.find((r) => r.actionType === 'thank_you');
    expect(thankYou).toBeUndefined();
  });

  // Scenario F: Referral stale (10+ days) -> referral nudge
  it('Scenario F: Referral activity stale for 10 days triggers referral nudge', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const opp = mockOpp({ stage: 'Identified' });
    const activities: OpportunityActivity[] = [
      {
        id: 'act-ref',
        opportunityId: opp.id,
        activityType: 'referral_activity',
        title: 'Referred by Michael Chen',
        contactName: 'Michael Chen',
        occurredAt: tenDaysAgo,
        source: 'user',
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      },
    ];

    const recs = evaluateOpportunityFollowUp(opp, activities);
    const refNudge = recs.find((r) => r.actionType === 'referral_nudge');
    expect(refNudge).toBeDefined();
    expect(refNudge?.contactName).toBe('Michael Chen');
  });

  // Scenario G: Rejected -> suppress all active follow-ups
  it('Scenario G: Rejection received activity suppresses all active follow-ups', () => {
    const opp = mockOpp({ stage: 'Interviewing' });
    const activities: OpportunityActivity[] = [
      {
        id: 'act-rej',
        opportunityId: opp.id,
        activityType: 'rejection_received',
        title: 'Role Filled Externally',
        occurredAt: new Date().toISOString(),
        source: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const recs = evaluateOpportunityFollowUp(opp, activities);
    expect(recs.length).toBe(0);
  });

  // Scenario H: Withdrawn -> suppress all active follow-ups
  it('Scenario H: Withdrawal activity or Archived stage suppresses follow-ups', () => {
    const oppArchived = mockOpp({ stage: 'Archived' });
    expect(evaluateOpportunityFollowUp(oppArchived, []).length).toBe(0);

    const oppActive = mockOpp({ stage: 'Applied' });
    const activities: OpportunityActivity[] = [
      {
        id: 'act-with',
        opportunityId: oppActive.id,
        activityType: 'withdrawal',
        title: 'Withdrew Candidacy',
        occurredAt: new Date().toISOString(),
        source: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    expect(evaluateOpportunityFollowUp(oppActive, activities).length).toBe(0);
  });

  // Scenario I: Offer -> suppress generic application check-in
  it('Scenario I: Offer received suppresses generic application check-in and prompts offer review', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const opp = mockOpp({ stage: 'Offer', updatedAt: tenDaysAgo });
    const recs = evaluateOpportunityFollowUp(opp, []);
    const appCheckIn = recs.find((r) => r.actionType === 'application_check_in');
    expect(appCheckIn).toBeUndefined();

    const offerAction = recs.find((r) => r.actionType === 'negotiation_response');
    expect(offerAction).toBeDefined();
    expect(offerAction?.priority).toBe('high');
  });

  // Scenario J: Explicit overdue follow-up date -> urgent overdue recommendation
  it('Scenario J: Explicit overdue follow-up date triggers urgent overdue action', () => {
    const opp = mockOpp({
      stage: 'Interviewing',
      followUpDate: '2026-08-15', // Past date
    });

    const recs = evaluateOpportunityFollowUp(opp, []);
    const overdueRec = recs.find((r) => r.priority === 'urgent' && r.dueDate === '2026-08-15');
    expect(overdueRec).toBeDefined();
    expect(overdueRec?.title).toContain('Overdue Follow-Up');
  });
});

describe('V3.3 Mock Interview Two-Axis Hardening & Schema Validation', () => {
  it('validates all difficulty enums in MockQuestionsRequestSchema (Fix Bug 17)', () => {
    const testCases = [
      { difficulty: 'standard', mode: 'timed' },
      { difficulty: 'rigorous', mode: 'timed' },
      { difficulty: 'stress_test', mode: 'practice' },
      { difficulty: 'challenging', mode: 'full' },
      { difficulty: 'executive', mode: 'full' },
    ];

    for (const tc of testCases) {
      const parsed = MockQuestionsRequestSchema.safeParse({
        opportunity: { id: 'opp-1', title: 'VP Role', company: 'Acme' },
        candidateSnapshot: mockCandidate,
        difficulty: tc.difficulty,
        mode: tc.mode,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('generates 4 rapid questions for Timed Screen mode', async () => {
    const engine = new MockInterviewEngine();
    const result = await engine.generateQuestions({
      opportunity: { id: 'opp-1', title: 'VP of Product', company: 'Stripe' } as JobOpportunity,
      candidate: mockCandidate,
      difficulty: 'rigorous',
      mode: 'timed',
    });

    expect(result.questions.length).toBe(4);
    expect(result.questions[0].question.length).toBeGreaterThan(10);
  });

  it('generates 8 round-structured questions for Full Loop mode', async () => {
    const engine = new MockInterviewEngine();
    const result = await engine.generateQuestions({
      opportunity: { id: 'opp-1', title: 'Director of AI Strategy', company: 'Microsoft' } as JobOpportunity,
      candidate: mockCandidate,
      difficulty: 'standard',
      mode: 'full',
    });

    expect(result.questions.length).toBe(8);
  });

  it('strictly scores trivial answers with 1s and provides grounded coaching', async () => {
    const engine = new MockInterviewEngine();
    const trivialEvaluation = await engine.evaluateAnswer({
      question: 'How do you prioritize competing executive demands across business and engineering?',
      questionCategory: 'behavioral',
      candidateAnswer: 'I just prioritize what is most important and talk to people.',
      opportunity: { id: 'opp-1', title: 'Chief of Staff', company: 'OpenAI' } as JobOpportunity,
      candidate: mockCandidate,
      difficulty: 'rigorous',
    });

    expect(trivialEvaluation.score.evidenceSpecificity).toBe(1);
    expect(trivialEvaluation.score.strategicDepth).toBe(1);
    expect(trivialEvaluation.score.structure).toBe(1);
    expect(trivialEvaluation.coaching.improvements.length).toBeGreaterThan(0);
    expect(trivialEvaluation.coaching.improvedAnswer).toBeDefined();
  });
});
