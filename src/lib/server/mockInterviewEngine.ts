/**
 * Server-side Mock Interview Engine.
 * Conducts AI-evaluated mock interviews with 6-dimension scoring.
 * Falls back to "Simplified Interview Coaching" when Gemini is unavailable.
 */

import { getGeminiClient, getGeminiModel, getGeminiFallbackModel, isGeminiConfigured } from './geminiConfig';
import { executeWithResilience, RetryOptions, sanitizeErrorMessage } from './geminiRetry';
import { CandidateProfile, EvidenceItem } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import {
  MockInterviewExchange,
  MockAnswerScore,
  MockAnswerCoaching,
  MockDifficulty,
  InterviewPreparation,
} from '@/types/interview';

export interface MockInterviewInput {
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  prep?: InterviewPreparation;
  difficulty: MockDifficulty;
  mode: 'practice' | 'timed' | 'full';
}

export interface QuestionGenerationResult {
  questions: Array<{ id: string; question: string; category: string }>;
  requestedModel: string;
  actualModel: string;
  executionMode: 'gemini' | 'deterministic';
}

export interface AnswerEvaluationInput {
  question: string;
  questionCategory: string;
  candidateAnswer: string;
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  difficulty: MockDifficulty;
}

export interface AnswerEvaluationResult {
  score: MockAnswerScore;
  coaching: MockAnswerCoaching;
  evidenceCitations: string[];
  requestedModel: string;
  actualModel: string;
  executionMode: 'gemini' | 'deterministic';
}

function normalizeDifficulty(diff: MockDifficulty): 'standard' | 'rigorous' | 'stress_test' {
  if (diff === 'rigorous' || diff === 'executive') return 'rigorous';
  if (diff === 'stress_test' || diff === 'challenging' || diff === 'adversarial') return 'stress_test';
  return 'standard';
}

export class MockInterviewEngine {
  async generateQuestions(input: MockInterviewInput, retryOptions?: RetryOptions): Promise<QuestionGenerationResult> {
    const primaryModel = getGeminiModel();
    const failoverModel = getGeminiFallbackModel();

    if (!isGeminiConfigured()) {
      return this.deterministicQuestions(input, primaryModel);
    }

    try {
      const client = getGeminiClient();
      const prompt = this.buildQuestionPrompt(input);

      const result = await executeWithResilience(
        primaryModel,
        failoverModel,
        async (targetModel: string) => {
          const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: { responseMimeType: 'application/json', temperature: 0.4 },
          });
          const text = response.text;
          if (!text) throw new Error('Empty response from Gemini');
          return JSON.parse(text);
        },
        retryOptions,
      );

      const raw = result.result;
      const questions = Array.isArray(raw.questions)
        ? raw.questions.slice(0, input.mode === 'full' ? 8 : input.mode === 'timed' ? 4 : 6).map(
            (q: Record<string, unknown>, i: number) => ({
              id: `mq-${i + 1}`,
              question: (q.question as string) || '',
              category: (q.category as string) || 'behavioral',
            })
          )
        : [];

      if (questions.length === 0) {
        return this.deterministicQuestions(input, primaryModel);
      }

      return { questions, requestedModel: primaryModel, actualModel: result.actualModel, executionMode: 'gemini' };
    } catch (err) {
      console.error('[MockInterviewEngine] Question generation failed:', sanitizeErrorMessage(err));
      return this.deterministicQuestions(input, primaryModel);
    }
  }

  async evaluateAnswer(input: AnswerEvaluationInput, retryOptions?: RetryOptions): Promise<AnswerEvaluationResult> {
    const primaryModel = getGeminiModel();
    const failoverModel = getGeminiFallbackModel();
    const validEvidenceIds = new Set((input.candidate.evidenceItems || []).map((e: EvidenceItem) => e.id));

    // Handle trivial answers (< 12 words or evasive) deterministically with strict scoring
    const trimmedAnswer = (input.candidateAnswer || '').trim();
    const wordCount = trimmedAnswer.split(/\s+/).filter(Boolean).length;
    if (wordCount < 6 || /^(test|idk|skip|yes|no|none|n\/a|pass)\.?$/i.test(trimmedAnswer)) {
      return this.trivialAnswerEvaluation(input, primaryModel);
    }

    if (!isGeminiConfigured()) {
      return this.deterministicEvaluation(input, validEvidenceIds, primaryModel);
    }

    try {
      const client = getGeminiClient();
      const prompt = this.buildEvaluationPrompt(input);

      const result = await executeWithResilience(
        primaryModel,
        failoverModel,
        async (targetModel: string) => {
          const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: { responseMimeType: 'application/json', temperature: 0.2 },
          });
          const text = response.text;
          if (!text) throw new Error('Empty response from Gemini');
          return JSON.parse(text);
        },
        retryOptions,
      );

      const raw = result.result;
      const score = this.clampScore(raw.score || {});
      const coaching = this.groundCoaching(raw.coaching || {});
      const evidenceCitations = Array.isArray(raw.evidenceCitations)
        ? (raw.evidenceCitations as string[]).filter((id: string) => validEvidenceIds.has(id))
        : [];

      return {
        score,
        coaching,
        evidenceCitations,
        requestedModel: primaryModel,
        actualModel: result.actualModel,
        executionMode: 'gemini',
      };
    } catch (err) {
      console.error('[MockInterviewEngine] Answer evaluation failed:', sanitizeErrorMessage(err));
      return this.deterministicEvaluation(input, validEvidenceIds, primaryModel);
    }
  }

  generateSessionSummary(exchanges: MockInterviewExchange[]): {
    overallScore: number;
    summary: string;
    strengths: string[];
    improvementAreas: string[];
  } {
    if (exchanges.length === 0) {
      return { overallScore: 0, summary: 'No answers evaluated.', strengths: [], improvementAreas: [] };
    }

    // Calculate overall score as average across all dimensions
    const totalScores = exchanges.reduce((acc, e) => {
      const s = e.score;
      return {
        relevance: acc.relevance + s.relevance,
        evidenceSpecificity: acc.evidenceSpecificity + s.evidenceSpecificity,
        strategicDepth: acc.strategicDepth + s.strategicDepth,
        executiveCommunication: acc.executiveCommunication + s.executiveCommunication,
        structure: acc.structure + s.structure,
        concision: acc.concision + s.concision,
      };
    }, { relevance: 0, evidenceSpecificity: 0, strategicDepth: 0, executiveCommunication: 0, structure: 0, concision: 0 });

    const n = exchanges.length;
    const avgDims = {
      relevance: totalScores.relevance / n,
      evidenceSpecificity: totalScores.evidenceSpecificity / n,
      strategicDepth: totalScores.strategicDepth / n,
      executiveCommunication: totalScores.executiveCommunication / n,
      structure: totalScores.structure / n,
      concision: totalScores.concision / n,
    };

    // Convert 1-5 scale to 0-100
    const overallScore = Math.round(
      (Object.values(avgDims).reduce((sum, v) => sum + v, 0) / 6) * 20
    );

    // Identify strengths and weaknesses
    const dimLabels: Record<string, string> = {
      relevance: 'Relevance',
      evidenceSpecificity: 'Evidence Specificity',
      strategicDepth: 'Strategic Depth',
      executiveCommunication: 'Executive Communication',
      structure: 'Structure',
      concision: 'Concision',
    };

    const sorted = Object.entries(avgDims).sort(([, a], [, b]) => b - a);
    const strengths = sorted.slice(0, 2).filter(([, v]) => v >= 3).map(([k]) => dimLabels[k]);
    const improvementAreas = sorted.slice(-2).filter(([, v]) => v < 4).map(([k]) => dimLabels[k]);

    const summary = `Completed ${n} question${n > 1 ? 's' : ''} with an overall score of ${overallScore}/100. ${
      strengths.length > 0 ? `Strongest areas: ${strengths.join(', ')}.` : ''
    } ${improvementAreas.length > 0 ? `Areas for growth: ${improvementAreas.join(', ')}.` : ''}`;

    return { overallScore, summary, strengths, improvementAreas };
  }

  private buildQuestionPrompt(input: MockInterviewInput): string {
    const normDiff = normalizeDifficulty(input.difficulty);
    const difficultyGuide = {
      standard: 'Standard professional bar. Focus on direct behavioral and functional competencies.',
      rigorous: 'VP / Executive level bar. Expect high strategic altitude, cross-functional ownership, trade-off articulation, and quantified business outcomes.',
      stress_test: 'High-rigor stress test. Probing questions challenging assumptions, failure modes, trade-offs, and organizational friction without hostility.',
    };

    const modeGuide = {
      practice: 'Generate 5-6 questions focused on developing structured, evidence-grounded STAR answers.',
      timed: 'Generate 4 concise, high-velocity recruiter-screen style questions suitable for 90-second rapid responses.',
      full: 'Generate 8 comprehensive questions progressing across 4 recruiting rounds: Recruiter Screen, Hiring Manager Functional, Leadership/Behavioral, and Executive Strategy.',
    };

    return `You are an executive interviewer conducting a mock interview for this role:

ROLE: ${input.opportunity.title}
COMPANY: ${input.opportunity.company}
JOB DESCRIPTION:
${input.opportunity.rawJobDescription || 'No description available'}

CANDIDATE: ${input.candidate.name}
SESSION FORMAT: ${input.mode} — ${modeGuide[input.mode] || modeGuide.practice}
INTERVIEWER BAR / DIFFICULTY: ${normDiff} — ${difficultyGuide[normDiff]}

Generate interview questions as JSON:
{
  "questions": [
    {"question": "...", "category": "behavioral|technical|situational|strategic|culture"}
  ]
}

Rules:
1. Questions must be role-specific and tailored to the job mandate.
2. ${input.mode === 'timed' ? 'Generate exactly 4 concise screen questions.' : input.mode === 'full' ? 'Generate 8 questions ordered by hiring rounds.' : 'Generate 5-6 questions.'}
3. Match the difficulty level specified.`;
  }

  private buildEvaluationPrompt(input: AnswerEvaluationInput): string {
    const normDiff = normalizeDifficulty(input.difficulty);
    const evidenceList = (input.candidate.evidenceItems || [])
      .map((e: EvidenceItem) => `[${e.id}] ${e.title}: ${e.description}${e.metric ? ` (${e.metric})` : ''}`)
      .join('\n');

    return `You are an executive interview coach evaluating a candidate's answer.

ROLE: ${input.opportunity.title} at ${input.opportunity.company}
QUESTION: ${input.question}
CATEGORY: ${input.questionCategory}
DIFFICULTY BAR: ${normDiff} (${normDiff === 'rigorous' ? 'VP Level — strict on metrics & strategy' : normDiff === 'stress_test' ? 'Stress Test — rigorous challenge on vagueness & trade-offs' : 'Standard professional bar'})

CANDIDATE ANSWER:
${input.candidateAnswer}

CANDIDATE EVIDENCE LIBRARY (valid citation IDs):
${evidenceList || 'None available'}

Evaluate the answer and return JSON:
{
  "score": {
    "relevance": 1-5,
    "evidenceSpecificity": 1-5,
    "strategicDepth": 1-5,
    "executiveCommunication": 1-5,
    "structure": 1-5,
    "concision": 1-5
  },
  "coaching": {
    "strengths": ["strength1", ...],
    "improvements": ["improvement1", ...],
    "improvedAnswer": "Suggested Grounded Answer Framework: A stronger structured response..."
  },
  "evidenceCitations": ["EVID-..."] // Only IDs from the evidence library that were validly referenced
}

CRITICAL SCORING RULES:
1. If the candidate answer is trivial, evasive, or lacks substance, score 1 across all dimensions.
2. The improved answer MUST be clearly framed as a suggested grounded model using candidate evidence, and MUST NOT invent facts not in the evidence library.
3. In 'rigorous' or 'stress_test' difficulty, enforce higher standards for quantified business outcomes and trade-offs.`;
  }

  private clampScore(raw: Record<string, unknown>): MockAnswerScore {
    const clamp = (v: unknown): number => {
      const n = typeof v === 'number' ? v : 3;
      return Math.max(1, Math.min(5, Math.round(n)));
    };
    return {
      relevance: clamp(raw.relevance),
      evidenceSpecificity: clamp(raw.evidenceSpecificity),
      strategicDepth: clamp(raw.strategicDepth),
      executiveCommunication: clamp(raw.executiveCommunication),
      structure: clamp(raw.structure),
      concision: clamp(raw.concision),
    };
  }

  private groundCoaching(raw: Record<string, unknown>): MockAnswerCoaching {
    const strengths = Array.isArray(raw.strengths) ? (raw.strengths as string[]).slice(0, 4) : [];
    const improvements = Array.isArray(raw.improvements) ? (raw.improvements as string[]).slice(0, 4) : [];

    let improvedAnswer = typeof raw.improvedAnswer === 'string' ? raw.improvedAnswer : undefined;
    if (improvedAnswer && improvedAnswer.length > 2000) {
      improvedAnswer = improvedAnswer.slice(0, 2000);
    }

    return { strengths, improvements, improvedAnswer };
  }

  private trivialAnswerEvaluation(
    input: AnswerEvaluationInput,
    requestedModel: string,
  ): AnswerEvaluationResult {
    const firstRole = input.candidate.careerHistory?.[0];
    const company = firstRole?.company || 'previous experience';
    const roleTitle = firstRole?.title || 'my executive role';

    return {
      score: {
        relevance: 1,
        evidenceSpecificity: 1,
        strategicDepth: 1,
        executiveCommunication: 1,
        structure: 1,
        concision: 1,
      },
      coaching: {
        strengths: ['Submitted initial response'],
        improvements: [
          'Response contains insufficient content for executive evaluation',
          'Use the STAR structure (Situation, Task, Action, Result) with specific examples',
          'Quantify outcomes with concrete business metrics (revenue, efficiency, scale)',
        ],
        improvedAnswer: `Suggested Grounded Framework (using candidate profile): When serving as ${roleTitle} at ${company}, I addressed this challenge by establishing clear strategic priorities, aligning cross-functional teams, and delivering measurable impact.`,
      },
      evidenceCitations: [],
      requestedModel,
      actualModel: 'deterministic',
      executionMode: 'deterministic',
    };
  }

  private deterministicQuestions(input: MockInterviewInput, requestedModel: string): QuestionGenerationResult {
    const role = input.opportunity.title;
    const company = input.opportunity.company;
    const normDiff = normalizeDifficulty(input.difficulty);

    let questions: Array<{ id: string; question: string; category: string }>;

    if (input.mode === 'timed') {
      questions = [
        { id: 'mq-1', question: `Give me your 60-second executive elevator pitch and why you are targeting the ${role} role at ${company}.`, category: 'behavioral' },
        { id: 'mq-2', question: `What is the most significant operational or strategic achievement in your career so far?`, category: 'technical' },
        { id: 'mq-3', question: `How do your specific strengths address the core challenges facing ${company} today?`, category: 'strategic' },
        { id: 'mq-4', question: `Why are you looking to make a transition at this stage of your search?`, category: 'culture' },
      ];
    } else if (input.mode === 'full') {
      questions = [
        { id: 'mq-1', question: `[Round 1: Recruiter Screen] Walk me through your career progression and why the ${role} role aligns with your career trajectory.`, category: 'behavioral' },
        { id: 'mq-2', question: `[Round 1: Recruiter Screen] What are your compensation expectations and target timeline for this transition?`, category: 'culture' },
        { id: 'mq-3', question: `[Round 2: Hiring Manager] Describe how you would design and execute the operating model for this function at ${company}.`, category: 'technical' },
        { id: 'mq-4', question: `[Round 2: Hiring Manager] Tell me about a time you led a high-stakes business transformation under tight resource constraints.`, category: 'strategic' },
        { id: 'mq-5', question: `[Round 3: Leadership] How do you handle cross-functional misalignment between Engineering, Product, and GTM leaders?`, category: 'situational' },
        { id: 'mq-6', question: `[Round 3: Leadership] Describe your approach to mentoring high-performing teams and managing underperformance.`, category: 'behavioral' },
        { id: 'mq-7', question: `[Round 4: Executive Strategy] If you started on day one, what would your 30-60-90 day strategic evaluation look like?`, category: 'strategic' },
        { id: 'mq-8', question: `[Round 4: Executive Strategy] What is the most critical trade-off you expect to manage in this role at ${company}?`, category: 'strategic' },
      ];
    } else {
      // Practice mode
      questions = [
        { id: 'mq-1', question: `Tell me about your background and what makes you a strong fit for the ${role} role at ${company}.`, category: 'behavioral' },
        { id: 'mq-2', question: 'Describe a time you led a significant organizational change. What was the quantifiable outcome?', category: 'behavioral' },
        { id: 'mq-3', question: `What is your approach to building strategy for a function like the one this ${role} would lead?`, category: 'strategic' },
        { id: 'mq-4', question: 'How do you handle a situation where you disagree with an executive stakeholder on a critical decision?', category: 'situational' },
        { id: 'mq-5', question: 'What metrics do you use to measure the business success and operational rigor of your team?', category: 'technical' },
        { id: 'mq-6', question: `Why are you specifically interested in ${company} at this stage of its growth?`, category: 'culture' },
      ];
    }

    if (normDiff === 'stress_test') {
      questions = questions.map((q, idx) => ({
        ...q,
        question: `[High Rigor] ${q.question} Be specific about trade-offs, metrics, and what you would do differently.`,
      }));
    }

    return { questions, requestedModel, actualModel: 'deterministic', executionMode: 'deterministic' };
  }

  private deterministicEvaluation(
    input: AnswerEvaluationInput,
    validIds: Set<string>,
    requestedModel: string,
  ): AnswerEvaluationResult {
    const answer = input.candidateAnswer.trim();
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    const normDiff = normalizeDifficulty(input.difficulty);

    // Structural analysis
    const hasSpecificExample = /\b(when|while|during|at|in my role|as [a-z]+|i led|i managed|i spearheaded)\b/i.test(answer);
    const hasMetric = /\b(\d+%|\$[\d,]+|\d+x|\d+ (million|billion|thousand|team|people|direct reports))\b/i.test(answer);
    const hasResult = /\b(result|outcome|impact|achieved|delivered|increased|reduced|improved|scaled|generated)\b/i.test(answer);
    const hasTradeoff = /\b(trade-off|tradeoff|prioritized|instead of|sacrifice|balanced|risk)\b/i.test(answer);

    // Check for evidence citations in the answer
    const evidenceCitations: string[] = [];
    for (const id of validIds) {
      if (answer.includes(id)) evidenceCitations.push(id);
    }

    // Baseline scores
    let relevance = hasSpecificExample ? 3 : 2;
    let evidenceSpecificity = hasMetric ? 4 : (hasSpecificExample ? 3 : 2);
    let strategicDepth = (wordCount > 60 && (hasResult || hasTradeoff)) ? 4 : (wordCount > 30 ? 3 : 2);
    let executiveCommunication = (wordCount >= 25 && wordCount <= 250) ? 4 : 3;
    let structure = hasResult ? 4 : (hasSpecificExample ? 3 : 2);
    let concision = (wordCount >= 20 && wordCount <= 180) ? 4 : (wordCount > 250 ? 2 : 3);

    // Adjust for difficulty
    if (normDiff === 'rigorous') {
      if (!hasMetric) evidenceSpecificity = Math.max(1, evidenceSpecificity - 1);
      if (!hasTradeoff && !hasResult) strategicDepth = Math.max(1, strategicDepth - 1);
    } else if (normDiff === 'stress_test') {
      if (!hasMetric || !hasSpecificExample) evidenceSpecificity = Math.max(1, evidenceSpecificity - 1);
      if (wordCount < 40) concision = Math.max(1, concision - 1);
      if (!hasTradeoff) strategicDepth = Math.max(1, strategicDepth - 1);
    }

    const score: MockAnswerScore = {
      relevance: Math.max(1, Math.min(5, relevance)),
      evidenceSpecificity: Math.max(1, Math.min(5, evidenceSpecificity)),
      strategicDepth: Math.max(1, Math.min(5, strategicDepth)),
      executiveCommunication: Math.max(1, Math.min(5, executiveCommunication)),
      structure: Math.max(1, Math.min(5, structure)),
      concision: Math.max(1, Math.min(5, concision)),
    };

    const firstRole = input.candidate.careerHistory?.[0];
    const company = firstRole?.company || 'prior organization';

    const coaching: MockAnswerCoaching = {
      strengths: [
        ...(hasSpecificExample ? ['Anchored in a concrete experience'] : []),
        ...(hasMetric ? ['Referenced quantifiable outcomes'] : []),
        ...(hasResult ? ['Articulated business impact'] : []),
        ...(wordCount >= 30 ? ['Provided substantive context'] : []),
      ],
      improvements: [
        ...(!hasSpecificExample ? ['Ground your answer with a specific scenario from your career'] : []),
        ...(!hasMetric ? ['Quantify business results with measurable metrics ($, %, headcount, scale)'] : []),
        ...(!hasResult ? ['Explicitly state the business outcome and strategic value created'] : []),
        ...(!hasTradeoff && normDiff !== 'standard' ? ['Articulate trade-offs and risks evaluated during execution'] : []),
      ],
      improvedAnswer: `Suggested Grounded Framework: At ${company}, I addressed similar challenges by first evaluating core constraints, aligning stakeholders across functions, and executing with measurable results (${hasMetric ? 'scaling performance significantly' : 'delivering quantified business impact'}).`,
    };

    if (coaching.strengths.length === 0) coaching.strengths.push('Directly addressed the prompt');
    if (coaching.improvements.length === 0) coaching.improvements.push('Continue to refine concision and strategic altitude');

    return {
      score,
      coaching,
      evidenceCitations,
      requestedModel,
      actualModel: 'deterministic',
      executionMode: 'deterministic',
    };
  }
}
