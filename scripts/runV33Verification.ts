import { evaluateOpportunityFollowUp, calculateNextBestActions } from '../src/lib/followUpEngine';
import { generateMockQuestions, evaluateMockAnswer } from '../src/lib/server/mockInterviewEngine';
import { MockQuestionsRequestSchema, MockEvaluationRequestSchema } from '../src/lib/server/schemas';
import { JobOpportunity } from '../src/types/opportunity';
import { OpportunityActivity } from '../src/types/interview';
import { CandidateProfile } from '../src/types/candidate';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

const mockCandidate: CandidateProfile = {
  id: 'cand-1',
  name: 'Tanaka Vance',
  targetRole: 'VP of AI Transformation',
  targetLevel: 'VP',
  targetCompensation: '$280k–$350k',
  locationPreferences: 'Remote',
  coreStrengths: ['AI Strategy', 'Enterprise GTM', 'RevOps Rigor'],
  evidenceItems: [
    {
      id: 'ev-1',
      title: 'Enterprise AI Governance Framework',
      description: 'Engineered AI evaluation pipeline reducing risk by 40%.',
      quantifiedImpact: '40% risk reduction across 12 product lines',
      skills: ['AI Governance', 'Risk Modeling'],
      confidenceLevel: 'Strong Match',
      sourceSnippet: 'Led AI steering committee at Fortune 500.',
    },
  ],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

function mockOpp(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return {
    id: 'opp-v33-test',
    title: 'Chief of Staff, AI Transformation',
    company: 'Anthropic Nexus',
    stage: 'Identified',
    priority: 'High',
    notes: '',
    rawJobDescription: 'Lead AI strategy and enterprise execution.',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    actions: [],
    analysis: {
      overallFitScore: 92,
      recommendation: 'Strong Match',
      executiveSummary: 'Proven executive alignment in enterprise AI strategy.',
      likelyMandate: 'Drive cross-functional AI adoption and organizational redesign.',
      keyRequirements: ['Executive Presence', 'GTM Strategy', 'Cross-Functional Alignment'],
      scoreExplanation: 'Strong matches across core leadership and technical strategy requirements.',
      positioningNarrative: 'Transformation leader connecting strategy to execution.',
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

async function verifyAll() {
  console.log('🔍 Executing V3.3 Master Quality Gate Verification...\n');

  console.log('1. Smart Follow-Up Engine (Scenarios A–J):');
  // Scenario A
  const oppA = mockOpp({ stage: 'Identified' });
  const recsA = evaluateOpportunityFollowUp(oppA, []);
  assert(recsA.filter((r) => r.priority === 'urgent').length === 0, 'Scenario A: Identified stage has 0 urgent follow-ups');

  // Scenario B
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const oppB = mockOpp({ stage: 'Applied', appliedDate: tenDaysAgo.split('T')[0], updatedAt: tenDaysAgo });
  const recsB = evaluateOpportunityFollowUp(oppB, []);
  assert(recsB.some((r) => r.actionType === 'application_follow_up'), 'Scenario B: Stale Applied role (10d) triggers application check-in');

  // Scenario C
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oppC = mockOpp({ stage: 'Interviewing' });
  const actC: OpportunityActivity[] = [{
    id: 'act-c',
    opportunityId: oppC.id,
    activityType: 'recruiter_contact',
    title: 'Recruiter Chat',
    contactName: 'Sarah Jenkins',
    occurredAt: sevenDaysAgo,
    source: 'user',
    createdAt: sevenDaysAgo,
    updatedAt: sevenDaysAgo,
  }];
  const recsC = evaluateOpportunityFollowUp(oppC, actC);
  assert(recsC.some((r) => r.actionType === 'recruiter_follow_up' && r.contactName === 'Sarah Jenkins'), 'Scenario C: Recruiter silence (7d) triggers recruiter check-in');

  // Scenario D
  const oppD = mockOpp({ stage: 'Interviewing' });
  const actD: OpportunityActivity[] = [{
    id: 'act-d',
    opportunityId: oppD.id,
    activityType: 'interview_completed',
    title: 'Loop Interview w/ VP',
    contactName: 'Jane Smith',
    occurredAt: new Date().toISOString(),
    source: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];
  const recsD = evaluateOpportunityFollowUp(oppD, actD);
  assert(recsD.some((r) => r.actionType === 'thank_you' && r.contactName === 'Jane Smith' && r.priority === 'high'), 'Scenario D: Completed interview triggers high-priority thank-you');

  // Scenario E
  const now = Date.now();
  const actE: OpportunityActivity[] = [
    { id: 'act-e1', opportunityId: oppD.id, activityType: 'thank_you_sent', title: 'Thank You Sent', occurredAt: new Date(now).toISOString(), source: 'user', createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
    { id: 'act-e2', opportunityId: oppD.id, activityType: 'interview_completed', title: 'Interview', occurredAt: new Date(now - 3600000).toISOString(), source: 'user', createdAt: new Date(now - 3600000).toISOString(), updatedAt: new Date(now - 3600000).toISOString() },
  ];
  const recsE = evaluateOpportunityFollowUp(oppD, actE);
  assert(!recsE.some((r) => r.actionType === 'thank_you'), 'Scenario E: Sent thank-you suppresses duplicate thank-you recommendations');

  // Scenario F
  const actF: OpportunityActivity[] = [{
    id: 'act-f',
    opportunityId: oppA.id,
    activityType: 'referral_activity',
    title: 'Referral by Marcus Vance',
    contactName: 'Marcus Vance',
    occurredAt: tenDaysAgo,
    source: 'user',
    createdAt: tenDaysAgo,
    updatedAt: tenDaysAgo,
  }];
  const recsF = evaluateOpportunityFollowUp(oppA, actF);
  assert(recsF.some((r) => r.actionType === 'referral_nudge' && r.contactName === 'Marcus Vance'), 'Scenario F: Referral stale (10d) triggers referral nudge');

  // Scenario G
  const actG: OpportunityActivity[] = [{
    id: 'act-g',
    opportunityId: oppD.id,
    activityType: 'rejection_received',
    title: 'Rejection notice',
    occurredAt: new Date().toISOString(),
    source: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];
  const recsG = evaluateOpportunityFollowUp(oppD, actG);
  assert(recsG.length === 0, 'Scenario G: Rejection received activity suppresses all active follow-ups');

  // Scenario H
  const oppHArchived = mockOpp({ stage: 'Archived' });
  assert(evaluateOpportunityFollowUp(oppHArchived, []).length === 0, 'Scenario H1: Archived stage suppresses all follow-ups');
  const actHWithdrawn: OpportunityActivity[] = [{
    id: 'act-h',
    opportunityId: oppB.id,
    activityType: 'withdrawal',
    title: 'Withdrew Candidacy',
    occurredAt: new Date().toISOString(),
    source: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];
  assert(evaluateOpportunityFollowUp(oppB, actHWithdrawn).length === 0, 'Scenario H2: Withdrawal activity suppresses all follow-ups');

  // Scenario I
  const oppI = mockOpp({ stage: 'Offer' });
  const recsI = evaluateOpportunityFollowUp(oppI, []);
  assert(!recsI.some((r) => r.actionType === 'application_follow_up'), 'Scenario I1: Offer stage suppresses generic application check-in');
  assert(recsI.some((r) => r.actionType === 'offer_decision' && r.priority === 'urgent'), 'Scenario I2: Offer stage prompts urgent offer decision review');

  // Scenario J
  const oppJ = mockOpp({ stage: 'Interviewing', followUpDate: '2026-08-15' });
  const recsJ = evaluateOpportunityFollowUp(oppJ, []);
  assert(recsJ.some((r) => r.priority === 'urgent' && r.dueDate === '2026-08-15' && r.title.includes('Overdue Follow-Up')), 'Scenario J: Explicit overdue follow-up date triggers urgent overdue action');

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
  const practiceQs = generateMockQuestions({ id: 'opp-1', title: 'Chief of Staff', company: 'Acme' }, mockCandidate, 'standard', 'practice');
  assert(practiceQs.length >= 3, 'Practice mode generates standard question bank');

  const timedQs = generateMockQuestions({ id: 'opp-1', title: 'Chief of Staff', company: 'Acme' }, mockCandidate, 'rigorous', 'timed');
  assert(timedQs.length === 4, 'Timed Screen mode generates exactly 4 high-velocity screening questions');

  const fullQs = generateMockQuestions({ id: 'opp-1', title: 'Chief of Staff', company: 'Acme' }, mockCandidate, 'stress_test', 'full');
  assert(fullQs.length === 8, 'Full Loop mode generates exactly 8 round-structured questions');

  // Strict scoring on trivial answers
  const trivialEvaluation = evaluateMockAnswer({
    question: 'How do you prioritize competing executive demands?',
    questionCategory: 'behavioral',
    candidateAnswer: 'I just prioritize what is most important and talk to people.',
    opportunity: { id: 'opp-1', title: 'Chief of Staff', company: 'OpenAI' },
    candidateSnapshot: mockCandidate,
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
