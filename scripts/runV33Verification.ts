import { evaluateOpportunityFollowUp } from '../src/lib/followUpEngine';
import { MockInterviewEngine } from '../src/lib/server/mockInterviewEngine';
import { MockQuestionsRequestSchema, MockEvaluationRequestSchema } from '../src/lib/server/schemas';
import { JobOpportunity } from '../src/types/opportunity';
import { OpportunityActivity } from '../src/types/interview';
import { createTestCandidate, createTestOpportunity, createTestActivity } from '../tests/fixtures/v33TestFixtures';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

const mockCandidate = createTestCandidate();

function mockOpp(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return createTestOpportunity(overrides);
}

async function verifyAll() {
  console.log('🔍 Executing V3.3 Master Quality Gate Verification...\n');

  console.log('1. Smart Follow-Up Engine (Scenarios A–J):');
  // Scenario A
  const oppA = mockOpp({ stage: 'Identified' });
  const recsA = evaluateOpportunityFollowUp(oppA, []);
  assert(recsA.filter((r) => r.priority === 'urgent').length === 0, 'Scenario A: Identified stage has 0 urgent follow-ups');

  // Scenario B
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const oppB = mockOpp({ stage: 'Applied', updatedAt: tenDaysAgo });
  const recsB = evaluateOpportunityFollowUp(oppB, []);
  assert(recsB.some((r) => r.actionType === 'application_check_in'), 'Scenario B: Stale Applied role (10d) triggers application check-in');

  // Scenario C
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oppC = mockOpp({ stage: 'Interviewing' });
  const actC: OpportunityActivity[] = [
    createTestActivity({
      id: 'act-c',
      opportunityId: oppC.id,
      activityType: 'recruiter_contact',
      title: 'Recruiter Chat',
      contactName: 'Sarah Jenkins',
      occurredAt: sevenDaysAgo,
      createdAt: sevenDaysAgo,
      updatedAt: sevenDaysAgo,
    }),
  ];
  const recsC = evaluateOpportunityFollowUp(oppC, actC);
  assert(recsC.some((r) => r.actionType === 'recruiter_follow_up' && r.contactName === 'Sarah Jenkins'), 'Scenario C: Recruiter silence (7d) triggers recruiter check-in');

  // Scenario D
  const oppD = mockOpp({ stage: 'Interviewing' });
  const actD: OpportunityActivity[] = [
    createTestActivity({
      id: 'act-d',
      opportunityId: oppD.id,
      activityType: 'interview_completed',
      title: 'Loop Interview w/ VP',
      contactName: 'Jane Smith',
      occurredAt: new Date().toISOString(),
    }),
  ];
  const recsD = evaluateOpportunityFollowUp(oppD, actD);
  assert(recsD.some((r) => r.actionType === 'thank_you' && r.contactName === 'Jane Smith' && (r.priority === 'high' || r.priority === 'urgent')), 'Scenario D: Completed interview triggers high-priority thank-you');

  // Scenario E
  const now = Date.now();
  const actE: OpportunityActivity[] = [
    createTestActivity({ id: 'act-e1', opportunityId: oppD.id, activityType: 'thank_you_sent', title: 'Thank You Sent', occurredAt: new Date(now).toISOString() }),
    createTestActivity({ id: 'act-e2', opportunityId: oppD.id, activityType: 'interview_completed', title: 'Interview', occurredAt: new Date(now - 3600000).toISOString() }),
  ];
  const recsE = evaluateOpportunityFollowUp(oppD, actE);
  assert(!recsE.some((r) => r.actionType === 'thank_you'), 'Scenario E: Sent thank-you suppresses duplicate thank-you recommendations');

  // Scenario F
  const actF: OpportunityActivity[] = [
    createTestActivity({
      id: 'act-f',
      opportunityId: oppA.id,
      activityType: 'referral_activity',
      title: 'Referral by Marcus Vance',
      contactName: 'Marcus Vance',
      occurredAt: tenDaysAgo,
      createdAt: tenDaysAgo,
      updatedAt: tenDaysAgo,
    }),
  ];
  const recsF = evaluateOpportunityFollowUp(oppA, actF);
  assert(recsF.some((r) => r.actionType === 'referral_nudge' && r.contactName === 'Marcus Vance'), 'Scenario F: Referral stale (10d) triggers referral nudge');

  // Scenario G
  const actG: OpportunityActivity[] = [
    createTestActivity({
      id: 'act-g',
      opportunityId: oppD.id,
      activityType: 'rejection_received',
      title: 'Rejection notice',
      occurredAt: new Date().toISOString(),
    }),
  ];
  const recsG = evaluateOpportunityFollowUp(oppD, actG);
  assert(recsG.length === 0, 'Scenario G: Rejection received activity suppresses all active follow-ups');

  // Scenario H
  const oppHArchived = mockOpp({ stage: 'Archived' });
  assert(evaluateOpportunityFollowUp(oppHArchived, []).length === 0, 'Scenario H1: Archived stage suppresses all follow-ups');
  const actHWithdrawn: OpportunityActivity[] = [
    createTestActivity({
      id: 'act-h',
      opportunityId: oppB.id,
      activityType: 'withdrawal',
      title: 'Withdrew Candidacy',
      occurredAt: new Date().toISOString(),
    }),
  ];
  assert(evaluateOpportunityFollowUp(oppB, actHWithdrawn).length === 0, 'Scenario H2: Withdrawal activity suppresses all follow-ups');

  // Scenario I
  const oppI = mockOpp({ stage: 'Offer', updatedAt: tenDaysAgo });
  const recsI = evaluateOpportunityFollowUp(oppI, []);
  assert(!recsI.some((r) => r.actionType === 'application_check_in'), 'Scenario I1: Offer stage suppresses generic application check-in');
  assert(recsI.some((r) => r.actionType === 'negotiation_response'), 'Scenario I2: Offer stage prompts offer negotiation/decision review');

  // Scenario J
  const oppJ = mockOpp({ stage: 'Interviewing', followUpDate: '2026-08-15' });
  const recsJ = evaluateOpportunityFollowUp(oppJ, []);
  assert(recsJ.some((r) => r.dueDate === '2026-08-15'), 'Scenario J: Explicit follow-up date triggers scheduled action');

  console.log('\n2. Mock Interview Two-Axis Hardening & Schema Validation:');
  const testDifficulties = ['standard', 'rigorous', 'stress_test', 'challenging', 'executive'];
  for (const diff of testDifficulties) {
    const qParse = MockQuestionsRequestSchema.safeParse({
      opportunity: { id: 'opp-1', title: 'VP Role', company: 'Acme' },
      candidateSnapshot: mockCandidate,
      difficulty: diff,
      mode: 'timed',
    });
    assert(qParse.success, `Difficulty "${diff}" passes MockQuestionsRequestSchema validation (Fix Bug 17)`);

    const evalParse = MockEvaluationRequestSchema.safeParse({
      question: 'Tell me about a time you led a strategic transformation.',
      questionCategory: 'behavioral',
      candidateAnswer: 'I aligned the cross-functional engineering and product organizations.',
      opportunity: { id: 'opp-1', title: 'VP Role', company: 'Acme' },
      candidateSnapshot: mockCandidate,
      difficulty: diff,
    });
    assert(evalParse.success, `Difficulty "${diff}" passes MockEvaluationRequestSchema validation`);
  }

  // Question generator formats
  const engine = new MockInterviewEngine();
  const practiceRes = await engine.generateQuestions({
    opportunity: { id: 'opp-1', title: 'Chief of Staff', company: 'Acme' } as JobOpportunity,
    candidate: mockCandidate,
    difficulty: 'standard',
    mode: 'practice',
  });
  assert(practiceRes.questions.length >= 3, 'Practice mode generates standard question bank');

  const timedRes = await engine.generateQuestions({
    opportunity: { id: 'opp-1', title: 'Chief of Staff', company: 'Acme' } as JobOpportunity,
    candidate: mockCandidate,
    difficulty: 'rigorous',
    mode: 'timed',
  });
  assert(timedRes.questions.length === 4, 'Timed Screen mode generates exactly 4 high-velocity screening questions');

  const fullRes = await engine.generateQuestions({
    opportunity: { id: 'opp-1', title: 'Chief of Staff', company: 'Acme' } as JobOpportunity,
    candidate: mockCandidate,
    difficulty: 'stress_test',
    mode: 'full',
  });
  assert(fullRes.questions.length === 8, 'Full Loop mode generates exactly 8 round-structured questions');

  // Strict scoring on trivial answers
  const trivialEvaluation = await engine.evaluateAnswer({
    question: 'How do you prioritize competing executive demands?',
    questionCategory: 'behavioral',
    candidateAnswer: 'I just prioritize what is most important and talk to people.',
    opportunity: { id: 'opp-1', title: 'Chief of Staff', company: 'OpenAI' } as JobOpportunity,
    candidate: mockCandidate,
    difficulty: 'rigorous',
  });
  assert(trivialEvaluation.score.evidenceSpecificity === 1, 'Trivial answer receives score 1 on evidenceSpecificity');
  assert(trivialEvaluation.score.strategicDepth === 1, 'Trivial answer receives score 1 on strategicDepth');
  assert(trivialEvaluation.score.structure === 1, 'Trivial answer receives score 1 on structure');
  assert(Boolean(trivialEvaluation.coaching.improvedAnswer), 'Grounded improved answer framework is provided');

  console.log('\n=============================================');
  console.log('🎉 ALL V3.3 QUALITY GATE CHECKS PASSED (100%)');
  console.log('=============================================\n');
}

verifyAll().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
