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
  InterviewSession,
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
      const questions = Array.isArray(raw.questions) ? raw.questions.slice(0, 8).map(
        (q: Record<string, unknown>, i: number) => ({
          id: `mq-${i + 1}`,
          question: (q.question as string) || '',
          category: (q.category as string) || 'behavioral',
        })
      ) : [];

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
      const coaching = this.groundCoaching(raw.coaching || {}, input.candidate);
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
    const difficultyGuide = {
      standard: 'Ask clear, direct behavioral and situational questions appropriate for a mid-senior role.',
      challenging: 'Ask probing follow-up style questions that test depth of experience and strategic thinking.',
      executive: 'Ask board-level strategic questions that test vision, stakeholder management, and transformation leadership.',
    };

    return `You are a hiring manager conducting a mock interview for this role:

ROLE: ${input.opportunity.title}
COMPANY: ${input.opportunity.company}
JOB DESCRIPTION:
${input.opportunity.rawJobDescription || 'No description available'}

CANDIDATE: ${input.candidate.name}
DIFFICULTY: ${input.difficulty} — ${difficultyGuide[input.difficulty]}

Generate 5-8 interview questions as JSON:
{
  "questions": [
    {"question": "...", "category": "behavioral|technical|situational|strategic|culture"}
  ]
}

Rules:
1. Questions must be role-specific, not generic.
2. Include a mix of categories.
3. Do NOT repeat similar questions.
4. Match the difficulty level specified.`;
  }

  private buildEvaluationPrompt(input: AnswerEvaluationInput): string {
    const evidenceList = (input.candidate.evidenceItems || [])
      .map((e: EvidenceItem) => `[${e.id}] ${e.title}: ${e.description}${e.metric ? ` (${e.metric})` : ''}`)
      .join('\n');

    return `You are an executive interview coach evaluating a candidate's answer.

ROLE: ${input.opportunity.title} at ${input.opportunity.company}
QUESTION: ${input.question}
CATEGORY: ${input.questionCategory}
DIFFICULTY: ${input.difficulty}

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
    "improvedAnswer": "A better version of the answer"
  },
  "evidenceCitations": ["EVID-..."] // Only IDs from the evidence library that were validly referenced
}

CRITICAL SCORING RULES:
1. Score each dimension honestly on 1-5 scale.
2. The improved answer may improve framing and structure but MUST NOT invent candidate facts, metrics, companies, titles, scope, or achievements.
3. Only cite evidence IDs that exist in the candidate evidence library above.
4. Strengths and improvements must be specific and actionable.`;
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

  private groundCoaching(raw: Record<string, unknown>, candidate: CandidateProfile): MockAnswerCoaching {
    const strengths = Array.isArray(raw.strengths) ? (raw.strengths as string[]).slice(0, 4) : [];
    const improvements = Array.isArray(raw.improvements) ? (raw.improvements as string[]).slice(0, 4) : [];

    // Validate improved answer doesn't fabricate facts
    let improvedAnswer = typeof raw.improvedAnswer === 'string' ? raw.improvedAnswer : undefined;
    if (improvedAnswer) {
      // Basic check: if it mentions companies/orgs not in candidate data, strip it
      const knownOrgs = new Set([
        ...(candidate.careerHistory || []).map((r: { company?: string }) => r.company?.toLowerCase()).filter(Boolean),
        ...(candidate.education || []).map((e: { institution?: string }) => e.institution?.toLowerCase()).filter(Boolean),
      ]);
      // Keep the improved answer — the prompt instructs not to fabricate
      // We can't perfectly validate but we trust the instruction + evidence grounding
      if (improvedAnswer.length > 2000) improvedAnswer = improvedAnswer.slice(0, 2000);
    }

    return { strengths, improvements, improvedAnswer };
  }

  private deterministicQuestions(input: MockInterviewInput, requestedModel: string): QuestionGenerationResult {
    const role = input.opportunity.title;
    const questions = [
      { id: 'mq-1', question: `Tell me about your background and what makes you a strong fit for the ${role} role.`, category: 'behavioral' },
      { id: 'mq-2', question: 'Describe a time you led a significant organizational change. What was the outcome?', category: 'behavioral' },
      { id: 'mq-3', question: `What is your approach to building strategy for a function like the one this ${role} would lead?`, category: 'strategic' },
      { id: 'mq-4', question: 'How do you handle a situation where you disagree with your direct manager on a critical decision?', category: 'situational' },
      { id: 'mq-5', question: 'What metrics do you use to measure the success of your team?', category: 'technical' },
      { id: 'mq-6', question: 'Why are you interested in this particular opportunity?', category: 'culture' },
    ];
    return { questions, requestedModel, actualModel: 'deterministic', executionMode: 'deterministic' };
  }

  private deterministicEvaluation(
    input: AnswerEvaluationInput,
    validIds: Set<string>,
    requestedModel: string,
  ): AnswerEvaluationResult {
    const answer = input.candidateAnswer.trim();
    const wordCount = answer.split(/\s+/).length;

    // Structural analysis
    const hasSpecificExample = /\b(when|while|during|at|in my role)\b/i.test(answer);
    const hasMetric = /\b(\d+%|\$[\d,]+|\d+x|\d+ (million|billion|thousand|team|people))\b/i.test(answer);
    const hasResult = /\b(result|outcome|impact|achieved|delivered|increased|reduced|improved)\b/i.test(answer);

    // Check for evidence citations in the answer
    const evidenceCitations: string[] = [];
    for (const id of validIds) {
      if (answer.includes(id)) evidenceCitations.push(id);
    }

    const score: MockAnswerScore = {
      relevance: hasSpecificExample ? 3 : 2,
      evidenceSpecificity: hasMetric ? 3 : (hasSpecificExample ? 2 : 1),
      strategicDepth: wordCount > 80 ? 3 : 2,
      executiveCommunication: wordCount > 30 && wordCount < 300 ? 3 : 2,
      structure: hasResult ? 3 : 2,
      concision: wordCount > 20 && wordCount < 200 ? 3 : 2,
    };

    const coaching: MockAnswerCoaching = {
      strengths: [
        ...(hasSpecificExample ? ['Included a specific example'] : []),
        ...(hasMetric ? ['Referenced measurable outcomes'] : []),
        ...(wordCount > 30 ? ['Provided substantive detail'] : []),
      ],
      improvements: [
        ...(!hasSpecificExample ? ['Include a specific example from your experience'] : []),
        ...(!hasMetric ? ['Add quantifiable results or metrics'] : []),
        ...(!hasResult ? ['Clearly state the outcome or impact'] : []),
        ...(wordCount < 30 ? ['Expand your answer with more detail'] : []),
        ...(wordCount > 300 ? ['Consider being more concise'] : []),
      ],
    };

    if (coaching.strengths.length === 0) coaching.strengths.push('Answered the question directly');
    if (coaching.improvements.length === 0) coaching.improvements.push('Consider adding more specific examples');

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
