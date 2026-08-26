/**
 * Server-side Mock Interview Engine.
 * Conducts AI-evaluated mock interviews with dual Content & Voice Delivery scoring.
 * Supports Interviewer Personas and dynamic conversational follow-ups.
 * Falls back to "Simplified Interview Coaching" when Gemini is unavailable.
 */

import { getGeminiClient, getGeminiModel, getGeminiFallbackModel, isGeminiConfigured } from './geminiConfig';
import { executeWithResilience, RetryOptions, sanitizeErrorMessage } from './geminiRetry';
import { CandidateProfile, EvidenceItem } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import {
  MockInterviewExchange,
  MockAnswerScore,
  MockDeliveryScore,
  MockVoiceCoaching,
  VoiceDeliveryMetrics,
  MockAnswerCoaching,
  MockDifficulty,
  InterviewPreparation,
  InterviewerPersona,
  AnswerMode,
  TranscriptSource,
} from '@/types/interview';
import {
  evaluateDeliveryScore,
  calculateOverallResponseScore,
  generateSpeakingCoaching,
} from '@/lib/voiceDeliveryEngine';

export interface MockInterviewInput {
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  prep?: InterviewPreparation;
  difficulty: MockDifficulty;
  mode: 'practice' | 'timed' | 'full' | 'live';
  persona?: InterviewerPersona;
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
  answerMode?: AnswerMode;
  transcriptSource?: TranscriptSource;
  deliveryMetrics?: VoiceDeliveryMetrics;
  persona?: InterviewerPersona;
}

export interface AnswerEvaluationResult {
  score: MockAnswerScore;
  deliveryScore?: MockDeliveryScore;
  overallResponseScore: number;
  contentWeight: number;
  deliveryWeight: number;
  coaching: MockAnswerCoaching;
  voiceCoaching?: MockVoiceCoaching;
  evidenceCitations: string[];
  requestedModel: string;
  actualModel: string;
  executionMode: 'gemini' | 'deterministic';
}

export interface ConversationalTurnInput {
  question: string;
  candidateAnswer: string;
  conversationHistory: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  persona: InterviewerPersona;
  difficulty: MockDifficulty;
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
}

export interface ConversationalTurnResult {
  followUpQuestion: string;
  probeIntent: string;
  suggestedApproach: string;
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

      return {
        questions,
        requestedModel: primaryModel,
        actualModel: result.actualModel,
        executionMode: 'gemini',
      };
    } catch (err) {
      console.error('[MockInterviewEngine] Question generation failed:', sanitizeErrorMessage(err));
      return this.deterministicQuestions(input, primaryModel);
    }
  }

  async evaluateAnswer(input: AnswerEvaluationInput, retryOptions?: RetryOptions): Promise<AnswerEvaluationResult> {
    const primaryModel = getGeminiModel();
    const failoverModel = getGeminiFallbackModel();

    const validEvidenceIds = new Set((input.candidate.evidenceItems || []).map((e: EvidenceItem) => e.id));

    // Handle trivial answers (< 12 words) strictly
    const trimmed = input.candidateAnswer.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    if (wordCount < 12) {
      return this.trivialAnswerEvaluation(input, primaryModel);
    }

    // Evaluate voice delivery metrics if answer was spoken
    let deliveryScore: MockDeliveryScore | undefined;
    let voiceCoaching: MockVoiceCoaching | undefined;

    if (input.answerMode === 'voice' && input.deliveryMetrics) {
      deliveryScore = evaluateDeliveryScore(input.deliveryMetrics, input.questionCategory, input.difficulty);
      voiceCoaching = generateSpeakingCoaching(input.deliveryMetrics, deliveryScore);
    }

    if (!isGeminiConfigured()) {
      return this.deterministicEvaluation(input, validEvidenceIds, primaryModel, deliveryScore, voiceCoaching);
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

      const scoreWeighting = calculateOverallResponseScore(score, deliveryScore, input.questionCategory);

      return {
        score,
        deliveryScore,
        overallResponseScore: scoreWeighting.overallScore,
        contentWeight: scoreWeighting.contentWeight,
        deliveryWeight: scoreWeighting.deliveryWeight,
        coaching,
        voiceCoaching,
        evidenceCitations,
        requestedModel: primaryModel,
        actualModel: result.actualModel,
        executionMode: 'gemini',
      };
    } catch (err) {
      console.error('[MockInterviewEngine] Answer evaluation failed:', sanitizeErrorMessage(err));
      return this.deterministicEvaluation(input, validEvidenceIds, primaryModel, deliveryScore, voiceCoaching);
    }
  }

  async generateDynamicFollowUp(
    input: ConversationalTurnInput,
    retryOptions?: RetryOptions
  ): Promise<ConversationalTurnResult> {
    const primaryModel = getGeminiModel();
    const failoverModel = getGeminiFallbackModel();

    if (!isGeminiConfigured()) {
      return this.deterministicDynamicFollowUp(input, primaryModel);
    }

    try {
      const client = getGeminiClient();
      const prompt = this.buildConversationalTurnPrompt(input);

      const result = await executeWithResilience(
        primaryModel,
        failoverModel,
        async (targetModel: string) => {
          const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: { responseMimeType: 'application/json', temperature: 0.3 },
          });
          const text = response.text;
          if (!text) throw new Error('Empty response from Gemini');
          return JSON.parse(text);
        },
        retryOptions,
      );

      const raw = result.result;
      const followUpQuestion =
        typeof raw.followUpQuestion === 'string' && raw.followUpQuestion.trim().length > 0
          ? raw.followUpQuestion.trim()
          : this.deterministicDynamicFollowUp(input, primaryModel).followUpQuestion;

      const probeIntent = typeof raw.probeIntent === 'string' ? raw.probeIntent : 'Probing candidate ownership and trade-offs';
      const suggestedApproach = typeof raw.suggestedApproach === 'string' ? raw.suggestedApproach : 'State the bottom-line trade-off first';

      return {
        followUpQuestion,
        probeIntent,
        suggestedApproach,
        requestedModel: primaryModel,
        actualModel: result.actualModel,
        executionMode: 'gemini',
      };
    } catch (err) {
      console.error('[MockInterviewEngine] Conversational turn failed:', sanitizeErrorMessage(err));
      return this.deterministicDynamicFollowUp(input, primaryModel);
    }
  }

  generateSessionSummary(exchanges: MockInterviewExchange[]): {
    overallScore: number;
    summary: string;
    strengths: string[];
    improvementAreas: string[];
    averageWordsPerMinute?: number;
    averageFillerRate?: number;
    averageContentScore?: number;
    averageDeliveryScore?: number;
  } {
    if (exchanges.length === 0) {
      return { overallScore: 0, summary: 'No answers evaluated.', strengths: [], improvementAreas: [] };
    }

    // Calculate content dimensions average
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

    // Calculate overall score (using exchange overallResponseScore if available, else content average)
    const totalExchangeOverall = exchanges.reduce((acc, e) => {
      if (typeof e.overallResponseScore === 'number') {
        return acc + e.overallResponseScore;
      }
      const rawContentPct = Math.round(
        ((e.score.relevance +
          e.score.evidenceSpecificity +
          e.score.strategicDepth +
          e.score.executiveCommunication +
          e.score.structure +
          e.score.concision) /
          30) *
          100
      );
      return acc + rawContentPct;
    }, 0);

    const overallScore = Math.round(totalExchangeOverall / n);

    // Calculate voice delivery aggregates if voice answers present
    const voiceExchanges = exchanges.filter((e) => e.deliveryMetrics);
    let averageWordsPerMinute: number | undefined;
    let averageFillerRate: number | undefined;
    let averageContentScore: number | undefined;
    let averageDeliveryScore: number | undefined;

    if (voiceExchanges.length > 0) {
      const totalWpm = voiceExchanges.reduce((acc, e) => acc + (e.deliveryMetrics?.wordsPerMinute || 0), 0);
      const totalFillers = voiceExchanges.reduce((acc, e) => acc + (e.deliveryMetrics?.fillerRatePerMinute || 0), 0);
      averageWordsPerMinute = Math.round(totalWpm / voiceExchanges.length);
      averageFillerRate = Math.round((totalFillers / voiceExchanges.length) * 10) / 10;

      const totalContentPcts = exchanges.reduce((acc, e) => {
        const sum = e.score.relevance + e.score.evidenceSpecificity + e.score.strategicDepth + e.score.executiveCommunication + e.score.structure + e.score.concision;
        return acc + Math.round((sum / 30) * 100);
      }, 0);
      averageContentScore = Math.round(totalContentPcts / n);

      const totalDeliveryPcts = voiceExchanges.reduce((acc, e) => {
        if (!e.deliveryScore) return acc;
        const sum = e.deliveryScore.pace + e.deliveryScore.verbalConcision + e.deliveryScore.fillerControl + e.deliveryScore.pausing + e.deliveryScore.clarity + e.deliveryScore.executiveDelivery;
        return acc + Math.round((sum / 30) * 100);
      }, 0);
      averageDeliveryScore = Math.round(totalDeliveryPcts / voiceExchanges.length);
    }

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

    let summary = `Completed ${n} question${n > 1 ? 's' : ''} with an overall score of ${overallScore}/100 (${overallScore}%). ${
      strengths.length > 0 ? `Strongest areas: ${strengths.join(', ')}.` : ''
    } ${improvementAreas.length > 0 ? `Areas for growth: ${improvementAreas.join(', ')}.` : ''}`;

    if (averageWordsPerMinute) {
      summary += ` Average speaking pace: ${averageWordsPerMinute} WPM with ${averageFillerRate ?? 0} fillers/min.`;
    }

    return {
      overallScore,
      summary,
      strengths,
      improvementAreas,
      averageWordsPerMinute,
      averageFillerRate,
      averageContentScore,
      averageDeliveryScore,
    };
  }

  private buildConversationalTurnPrompt(input: ConversationalTurnInput): string {
    const normDiff = normalizeDifficulty(input.difficulty);
    const personaGuide = {
      recruiter: 'Recruiter persona: Focus on career transitions, motivations, compensation alignment, and high-level cultural fit.',
      hiring_manager: 'Hiring Manager persona: Focus on operating models, architectural execution, functional leadership, and delivery under constraints.',
      executive: 'Executive VP persona: Focus on capital allocation, organizational trade-offs, cross-functional conflict, and long-term business impact.',
      behavioral: 'Behavioral Interviewer persona: Focus on specific ownership, team dynamics, dealing with failure, and verifiable STAR outcomes.',
      peer: 'Peer / Principal Architect persona: Focus on technical depth, edge cases, scalability trade-offs, and collaborative rigor.',
    };

    const historyStr = input.conversationHistory.length > 0
      ? input.conversationHistory.map((h) => `${h.speaker.toUpperCase()}: ${h.text}`).join('\n')
      : 'Initial turn';

    return `You are a live interviewer conducting a conversational executive interview.

ROLE: ${input.opportunity.title} at ${input.opportunity.company}
INTERVIEWER PERSONA: ${input.persona} — ${personaGuide[input.persona] || personaGuide.hiring_manager}
DIFFICULTY: ${normDiff} (${normDiff === 'stress_test' ? 'Stress Test: probe hidden assumptions, downside risks, and forced cuts' : 'Standard rigorous bar'})

CONVERSATION HISTORY:
${historyStr}

PREVIOUS QUESTION:
${input.question}

CANDIDATE ANSWER:
${input.candidateAnswer}

Generate a dynamic follow-up response and probing question as JSON:
{
  "followUpQuestion": "...", // The next question/probe spoken naturally
  "probeIntent": "...", // Why this probe was chosen (e.g., verifying personal ownership vs team tailwinds)
  "suggestedApproach": "..." // Advice on how candidate should frame the response
}

CRITICAL RULES:
1. The follow-up MUST respond directly to what the candidate just claimed in their answer (e.g. probing a cited metric, challenging an assumption, or asking what trade-off was made).
2. For stress_test, challenge the downside risk or simulate executive pushback without being rude.
3. Keep the interviewer spoken turn natural and concise (1-3 sentences).`;
  }

  private deterministicDynamicFollowUp(
    input: ConversationalTurnInput,
    requestedModel: string
  ): ConversationalTurnResult {
    const answer = input.candidateAnswer.trim();
    const role = input.opportunity.title;
    const company = input.opportunity.company;
    const normDiff = normalizeDifficulty(input.difficulty);

    const metricMatch = answer.match(/\b(\d+%\+?|\$[\d,]+[kmb]?|\d+x|\d+ million|\d+ team members)\b/i);
    const metricStr = metricMatch ? metricMatch[0] : null;

    let followUpQuestion = '';
    let probeIntent = 'Probing candidate ownership and trade-offs';
    let suggestedApproach = 'State the bottom-line trade-off first';

    if (normDiff === 'stress_test') {
      if (metricStr) {
        followUpQuestion = `You referenced achieving ${metricStr}. In retrospect, what was the hidden downside risk or operational vulnerability of that approach, and how did you verify it wasn't just market tailwinds?`;
        probeIntent = 'Scrutinizing claim of personal ownership vs macro market momentum';
        suggestedApproach = 'Acknowledge operational trade-offs and cite specific governance mechanisms you implemented';
      } else {
        followUpQuestion = `If the executive committee cut your capital budget by 35% four weeks into this ${role} mandate at ${company}, which critical workstream do you sacrifice first, and how do you defend that to stakeholders?`;
        probeIntent = 'Testing executive prioritization under acute resource constraints';
        suggestedApproach = 'Lead with the specific cut decision immediately, followed by the strategic risk triage framework';
      }
    } else if (input.persona === 'recruiter') {
      followUpQuestion = `Given that background, what is the single biggest factor driving you to transition into this ${role} mandate at ${company} at this exact point in your career?`;
      probeIntent = 'Evaluating career trajectory and motivation alignment';
      suggestedApproach = 'Connect past leadership milestones directly to this company’s strategic growth mandate';
    } else if (input.persona === 'executive') {
      followUpQuestion = `When executing that strategy, what was the most contentious executive disagreement you had with a peer VP or CFO, and what did you concede to maintain velocity?`;
      probeIntent = 'Evaluating executive presence, political navigation, and trade-off maturity';
      suggestedApproach = 'Describe the business disagreement objectively and articulate the strategic compromise';
    } else if (metricStr) {
      followUpQuestion = `You mentioned delivering ${metricStr}. What was the biggest cross-functional friction point you had to resolve to achieve that result?`;
      probeIntent = 'Probing execution depth and cross-functional leadership';
      suggestedApproach = 'Detail the operational roadblock and your specific intervention in STAR format';
    } else {
      followUpQuestion = `How would you adapt that approach specifically for ${company}'s current scale and operating model?`;
      probeIntent = 'Assessing role-specific adaptability and strategic translation';
      suggestedApproach = 'Highlight similarities in operating scale while tailoring to target company constraints';
    }

    return {
      followUpQuestion,
      probeIntent,
      suggestedApproach,
      requestedModel,
      actualModel: 'deterministic',
      executionMode: 'deterministic',
    };
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
      live: 'Generate 4-5 conversational questions suitable for dynamic spoken interview turn-taking.',
    };

    const personaContext = input.persona
      ? `INTERVIEWER PERSONA: ${input.persona} (Tailor question angles to this persona's evaluation focus).`
      : '';

    return `You are an executive interviewer conducting a mock interview for this role:

ROLE: ${input.opportunity.title}
COMPANY: ${input.opportunity.company}
JOB DESCRIPTION:
${input.opportunity.rawJobDescription || 'No description available'}

CANDIDATE: ${input.candidate.name}
SESSION FORMAT: ${input.mode} — ${modeGuide[input.mode] || modeGuide.practice}
${personaContext}
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
3. Match the difficulty level specified:
   - For 'stress_test', craft high-stakes dilemma questions (competing executive priorities, forced trade-offs, resource cuts, downside risks) rather than adding repetitive suffixes.`;
  }

  private buildEvaluationPrompt(input: AnswerEvaluationInput): string {
    const normDiff = normalizeDifficulty(input.difficulty);
    const isBehavioral = input.questionCategory === 'behavioral' || /tell me about|describe a time|give an example/i.test(input.question);
    const evidenceList = (input.candidate.evidenceItems || [])
      .map((e: EvidenceItem) => `[${e.id}] ${e.title}: ${e.description}${e.metric ? ` (${e.metric})` : ''}`)
      .join('\n');

    return `You are an executive interview coach evaluating a candidate's answer.

ROLE: ${input.opportunity.title} at ${input.opportunity.company}
QUESTION: ${input.question}
CATEGORY: ${input.questionCategory} (${isBehavioral ? 'Behavioral / Past Evidence' : 'Strategic / Situational / Executive Positioning'})
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

CRITICAL SCORING & COACHING RULES:
1. If the candidate answer is trivial (< 12 words), evasive, or lacks substance, score 1 across all dimensions.
2. For behavioral questions, evaluate STAR structure (Situation, Task, Action, Result).
3. For strategic, elevator pitch, motivation, or technical architecture questions, DO NOT penalize for lack of STAR format; instead evaluate clarity of recommendation, executive presence, logical reasoning, and strategic trade-offs.
4. If the candidate already included specific metrics, acknowledge and praise those metrics rather than asking them to add metrics.
5. The improved answer MUST be clearly framed as a suggested grounded model using candidate evidence, and MUST NOT invent facts not in the evidence library.
6. In 'rigorous' or 'stress_test' difficulty, enforce higher standards for quantified business outcomes and explicit trade-offs.`;
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
    const isBehavioral = input.questionCategory === 'behavioral' || /tell me about|describe a time/i.test(input.question);

    const score: MockAnswerScore = {
      relevance: 1,
      evidenceSpecificity: 1,
      strategicDepth: 1,
      executiveCommunication: 1,
      structure: 1,
      concision: 1,
    };

    let deliveryScore: MockDeliveryScore | undefined;
    let voiceCoaching: MockVoiceCoaching | undefined;
    if (input.answerMode === 'voice' && input.deliveryMetrics) {
      deliveryScore = {
        pace: 1,
        verbalConcision: 1,
        fillerControl: 1,
        pausing: 1,
        clarity: 1,
        executiveDelivery: 1,
      };
      voiceCoaching = {
        speakingPaceCoaching: 'Answer was too brief for pace evaluation.',
        fillerWordCoaching: 'Provide a complete structured response to evaluate filler control.',
        deliveryRefinements: ['Deliver a complete substantive answer (at least 2–3 structured sentences)'],
        overallDeliverySummary: 'Response lacked sufficient substance for delivery scoring.',
      };
    }

    return {
      score,
      deliveryScore,
      overallResponseScore: 20,
      contentWeight: input.answerMode === 'voice' ? 0.7 : 1.0,
      deliveryWeight: input.answerMode === 'voice' ? 0.3 : 0.0,
      coaching: {
        strengths: ['Submitted initial response'],
        improvements: [
          'Response contains insufficient substance for executive evaluation',
          isBehavioral
            ? 'Use the STAR structure (Situation, Task, Action, Result) with specific examples'
            : 'Lead with your bottom-line recommendation, followed by 2–3 structured supporting points',
          'Quantify outcomes with concrete business metrics (revenue, efficiency, scale)',
        ],
        improvedAnswer: `Suggested Grounded Framework (using candidate profile): When serving as ${roleTitle} at ${company}, I addressed this mandate by establishing clear strategic priorities, aligning cross-functional teams, and delivering measurable impact.`,
      },
      voiceCoaching,
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

    if (normDiff === 'stress_test') {
      if (input.mode === 'timed') {
        questions = [
          { id: 'mq-1', question: `Give me your 60-second executive elevator pitch: why should ${company} trust you with this ${role} mandate given current market headwinds?`, category: 'behavioral' },
          { id: 'mq-2', question: `What was the single largest architectural or operational failure under your leadership, and what was the quantifiable downside?`, category: 'technical' },
          { id: 'mq-3', question: `If leadership reduces your initial headcount budget by 30%, which two initiatives do you cut first, and how do you defend that to stakeholders?`, category: 'strategic' },
          { id: 'mq-4', question: `What is the most contentious executive disagreement you've had with a CFO or CEO, and what did you concede?`, category: 'culture' },
        ];
      } else if (input.mode === 'full') {
        questions = [
          { id: 'mq-1', question: `[Round 1: Recruiter Screen] Walk me through your career transitions. Why are you stepping away from your current scope to take this ${role} role?`, category: 'behavioral' },
          { id: 'mq-2', question: `[Round 1: Recruiter Screen] If our base compensation offer is 15% below your target but tied to aggressive milestone equity, how do you evaluate the offer?`, category: 'culture' },
          { id: 'mq-3', question: `[Round 2: Hiring Manager] Describe how you would restructure our operating model within 60 days when team morale is low and attrition is elevated.`, category: 'technical' },
          { id: 'mq-4', question: `[Round 2: Hiring Manager] Tell me about a transformation where your initial hypothesis was wrong. How quickly did you pivot and what was the net cost?`, category: 'strategic' },
          { id: 'mq-5', question: `[Round 3: Leadership] A peer VP refuses to allocate engineering resources to your top priority. How do you resolve this without executive escalation?`, category: 'situational' },
          { id: 'mq-6', question: `[Round 3: Leadership] What is your framework for exiting an underperforming senior director who is personally well-liked by executive leadership?`, category: 'behavioral' },
          { id: 'mq-7', question: `[Round 4: Executive Strategy] If a sudden market disruption cuts customer renewal by 20%, what is your immediate 30-day operational triage plan?`, category: 'strategic' },
          { id: 'mq-8', question: `[Round 4: Executive Strategy] What is the most dangerous assumption ${company} is currently making in its growth model, and how would you stress-test it?`, category: 'strategic' },
        ];
      } else {
        // Practice Stress Test
        questions = [
          { id: 'mq-1', question: `What makes your executive profile uniquely qualified for ${company}, and where is your biggest operational blind spot for this ${role}?`, category: 'behavioral' },
          { id: 'mq-2', question: 'Describe a time you executed a critical organizational change that faced widespread resistance. How did you measure net business impact?', category: 'behavioral' },
          { id: 'mq-3', question: `If you are forced to choose between hitting quarterly revenue milestones vs completing a multi-quarter platform replatforming, how do you decide?`, category: 'strategic' },
          { id: 'mq-4', question: 'How do you handle a direct directive from the CEO that your operational data proves will degrade customer retention?', category: 'situational' },
          { id: 'mq-5', question: 'What metrics do you hold yourself accountable to when evaluating whether your strategic vision succeeded or failed?', category: 'technical' },
          { id: 'mq-6', question: `Why ${company} now, and what evidence convinces you that our operating environment matches your leadership style?`, category: 'culture' },
        ];
      }
    } else if (input.mode === 'timed') {
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

    return { questions, requestedModel, actualModel: 'deterministic', executionMode: 'deterministic' };
  }

  private deterministicEvaluation(
    input: AnswerEvaluationInput,
    validIds: Set<string>,
    requestedModel: string,
    deliveryScore?: MockDeliveryScore,
    voiceCoaching?: MockVoiceCoaching,
  ): AnswerEvaluationResult {
    const answer = input.candidateAnswer.trim();
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    const normDiff = normalizeDifficulty(input.difficulty);
    const isBehavioral = input.questionCategory === 'behavioral' || /tell me about|describe a time|give an example/i.test(input.question);

    // Structural analysis
    const hasSpecificExample = /\b(when|while|during|at|in my role|as [a-z]+|i led|i managed|i spearheaded|we launched)\b/i.test(answer);
    const metricMatches = answer.match(/\b(\d+%\+?|\$[\d,]+[kmb]?|\d+x|\d+ (million|billion|thousand|teams?|people|direct reports|engineers|customers|users))\b/gi);
    const hasMetric = Boolean(metricMatches && metricMatches.length > 0);
    const hasResult = /\b(result|outcome|impact|achieved|delivered|increased|reduced|improved|scaled|generated|saved)\b/i.test(answer);
    const hasTradeoff = /\b(trade-off|tradeoff|prioritized|instead of|sacrifice|balanced|risk|conceded|mitigated)\b/i.test(answer);
    const hasStructuredFramework = /\b(first|second|third|pillar|framework|step 1|phase|operating model|30-60-90)\b/i.test(answer);

    // Check for evidence citations in the answer
    const evidenceCitations: string[] = [];
    for (const id of validIds) {
      if (answer.includes(id)) evidenceCitations.push(id);
    }

    // Baseline scores
    const relevance = hasSpecificExample || hasStructuredFramework ? 4 : 3;
    let evidenceSpecificity = hasMetric ? 4 : (hasSpecificExample ? 3 : 2);
    let strategicDepth = (wordCount > 60 && (hasResult || hasTradeoff)) ? 4 : (wordCount > 30 ? 3 : 2);
    const executiveCommunication = (wordCount >= 25 && wordCount <= 250) ? 4 : 3;
    const structure = isBehavioral ? (hasResult && hasSpecificExample ? 4 : 3) : (hasStructuredFramework || hasResult ? 4 : 3);
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

    const strengths: string[] = [];
    if (hasMetric) {
      strengths.push(`Referenced concrete quantified metrics (${metricMatches ? metricMatches.slice(0, 2).join(', ') : 'verifiable outcomes'})`);
    }
    if (hasSpecificExample) strengths.push('Grounded response in real-world executive experience');
    if (hasStructuredFramework) strengths.push('Used structured framing to organize strategic priorities');
    if (hasResult) strengths.push('Clearly articulated business impact and outcomes');
    if (hasTradeoff) strengths.push('Demonstrated executive maturity by acknowledging trade-offs');

    const improvements: string[] = [];
    if (!hasMetric) {
      improvements.push('Quantify business results with measurable metrics ($, %, headcount, scale)');
    } else {
      improvements.push('Further articulate your direct personal ownership versus overall team contribution');
    }

    if (isBehavioral && !hasSpecificExample) {
      improvements.push('Ground your answer with a specific scenario from your career (Situation, Task, Action, Result)');
    } else if (!isBehavioral && !hasTradeoff && normDiff !== 'standard') {
      improvements.push('Explicitly articulate the executive trade-offs and alternative strategies considered');
    }

    if (!hasResult) {
      improvements.push('State the bottom-line business outcome and long-term organizational value');
    }

    if (strengths.length === 0) strengths.push('Directly addressed the question prompt');
    if (improvements.length === 0) improvements.push('Continue to refine pacing and strategic bottom-line delivery');

    const coaching: MockAnswerCoaching = {
      strengths: strengths.slice(0, 4),
      improvements: improvements.slice(0, 4),
      improvedAnswer: isBehavioral
        ? `Suggested Grounded Framework: At ${company}, I addressed this by first evaluating core constraints, aligning stakeholders across functions, and executing with measurable results (${hasMetric ? 'scaling performance significantly' : 'delivering quantified business impact'}).`
        : `Suggested Strategic Framework: For ${input.opportunity.company}, I recommend leading with a 3-pillar operating cadence, prioritizing highest-leverage workstreams, and setting clear quarterly accountability metrics.`,
    };

    const scoreWeighting = calculateOverallResponseScore(score, deliveryScore, input.questionCategory);

    return {
      score,
      deliveryScore,
      overallResponseScore: scoreWeighting.overallScore,
      contentWeight: scoreWeighting.contentWeight,
      deliveryWeight: scoreWeighting.deliveryWeight,
      coaching,
      voiceCoaching,
      evidenceCitations,
      requestedModel,
      actualModel: 'deterministic',
      executionMode: 'deterministic',
    };
  }
}
