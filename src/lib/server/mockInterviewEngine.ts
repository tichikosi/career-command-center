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
      recruiter: 'Recruiter persona: Focus on career trajectory, motivations, compensation alignment, availability timeline, and communication clarity.',
      hiring_manager: 'Hiring Manager persona: Focus on operating model design, architectural execution, functional leadership, team capacity, priorities, and delivery under constraints.',
      executive: 'Executive VP persona: Focus on enterprise strategy, capital allocation, board alignment, cross-functional conflict, strategic trade-offs, and downside risk mitigation.',
      behavioral: 'Behavioral Interviewer persona: Focus on personal ownership vs team delegation, handling conflict and resistance, dealing with failure, learning, and verifiable STAR outcomes.',
      peer: 'Peer / Principal Architect persona: Focus on technical collaboration, systems thinking, engineering constraints, architecture trade-offs, scalability bottlenecks, and translating business needs into technical requirements.',
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
1. The follow-up MUST respond directly to what the candidate just claimed in their answer (e.g. probing a cited metric, challenging an assumption, clarifying personal ownership, or asking what trade-off was made).
2. Reflect the interviewer persona's distinct evaluation lens (Recruiter: trajectory/alignment; Hiring Manager: operating execution; Executive: strategic trade-offs; Behavioral: personal ownership/friction; Peer: technical/architectural constraints).
3. For stress_test, challenge the downside risk or simulate executive pushback without being rude.
4. Keep the interviewer spoken turn natural and concise (1-3 sentences).`;
  }

  private deterministicDynamicFollowUp(
    input: ConversationalTurnInput,
    requestedModel: string
  ): ConversationalTurnResult {
    const answer = input.candidateAnswer.trim();
    const role = input.opportunity.title;
    const company = input.opportunity.company;
    const normDiff = normalizeDifficulty(input.difficulty);
    const persona = input.persona || 'hiring_manager';
    const wordCount = answer ? answer.split(/\s+/).filter(Boolean).length : 0;

    // Signal extraction
    const metricMatch = answer.match(/(?:^|\s)(\d+%\+?|\$[\d,]+[kmb]?|\d+x|\d+\s*(?:million|billion|thousand|teams?|engineers|people|direct reports|users))(?:\s|[.,;!?]|$)/i);
    const metricStr = metricMatch ? metricMatch[1].trim() : null;

    const isShort = wordCount < 25;
    const hasVagueOwnership = /\b(we built|we launched|we delivered|we decided|our team|the team|we achieved)\b/i.test(answer) &&
      !/\b(i personally|i owned|my responsibility|my decision|i decided|i led)\b/i.test(answer);
    const hasDisagreement = /\b(disagree|disagreement|pushback|friction|resistance|conflict|misaligned|refused)\b/i.test(answer);
    const hasTradeoff = /\b(trade-off|tradeoff|prioritized|instead of|sacrifice|balanced|conceded|mitigated)\b/i.test(answer);

    let followUpQuestion = '';
    let probeIntent = 'Probing candidate ownership and trade-offs';
    let suggestedApproach = 'State the bottom-line trade-off first';

    // Stress test takes precedence
    if (normDiff === 'stress_test') {
      if (metricStr) {
        followUpQuestion = `You referenced achieving ${metricStr}. In retrospect, what was the hidden downside risk or operational vulnerability of that approach, and how did you verify it wasn't simply market tailwinds?`;
        probeIntent = 'Scrutinizing claim of personal ownership vs macro market momentum';
        suggestedApproach = 'Acknowledge operational trade-offs and cite specific governance mechanisms you implemented';
      } else {
        followUpQuestion = `If executive leadership cut your capital budget by 35% four weeks into this ${role} mandate at ${company}, which critical workstream do you sacrifice first, and how do you defend that to stakeholders?`;
        probeIntent = 'Testing executive prioritization under acute resource constraints';
        suggestedApproach = 'Lead with the specific cut decision immediately, followed by the strategic risk triage framework';
      }
    } else if (metricStr) {
      // Probing candidate metric claim by persona
      switch (persona) {
        case 'recruiter':
          followUpQuestion = `You referenced delivering ${metricStr}. How does achieving that scale of outcome prepare you for the strategic scope of this ${role} role at ${company}?`;
          probeIntent = 'Connecting past quantified achievement to the target company mandate';
          suggestedApproach = 'Tie the quantified outcome directly to the strategic opportunities at the target company';
          break;
        case 'executive':
          followUpQuestion = `You referenced delivering ${metricStr}. What strategic trade-off or budget allocation justified that focus, and how did you defend it to executive leadership?`;
          probeIntent = 'Evaluating capital allocation rigor and executive stakeholder defense';
          suggestedApproach = 'Explain the business case, opportunity costs, and strategic defense presented to executive peers';
          break;
        case 'behavioral':
          followUpQuestion = `You mentioned delivering ${metricStr}. How did you manage team fatigue or stakeholder resistance during that push, and what was your personal leadership intervention?`;
          probeIntent = 'Evaluating team leadership, empathy, and resilience under pressure';
          suggestedApproach = 'Describe how you maintained team morale while holding a high bar for performance';
          break;
        case 'peer':
          followUpQuestion = `You cited delivering ${metricStr}. What architectural bottlenecks or system constraints did you have to engineer around to achieve that metric?`;
          probeIntent = 'Probing engineering constraints, scalability, and technical rigor';
          suggestedApproach = 'Detail the system architecture, edge cases, and performance optimizations involved';
          break;
        case 'hiring_manager':
        default:
          followUpQuestion = `You cited delivering ${metricStr}. What specific execution responsibilities did you personally own versus delegating to direct reports to drive that number?`;
          probeIntent = 'Verifying personal accountability versus team execution in delivering results';
          suggestedApproach = 'Distinguish your strategic direction from the team’s tactical implementation';
          break;
      }
    } else if (hasDisagreement) {
      // Probing disagreement/conflict by persona
      switch (persona) {
        case 'executive':
          followUpQuestion = `When that disagreement surfaced, what concession did you make to preserve executive alignment, and how did it affect the final outcome?`;
          probeIntent = 'Evaluating political savvy, compromise maturity, and alignment maintenance';
          suggestedApproach = 'Focus on the business trade-off made to achieve cross-functional consensus';
          break;
        case 'behavioral':
          followUpQuestion = `How did you manage the interpersonal dynamics and maintain productive relationships with the dissenting parties after that decision was made?`;
          probeIntent = 'Evaluating emotional intelligence and post-conflict alignment';
          suggestedApproach = 'Share how you followed up with stakeholders to rebuild trust and ensure ongoing collaboration';
          break;
        case 'peer':
          followUpQuestion = `How did you use data, technical benchmarks, or architecture spikes to depersonalize that disagreement and reach consensus?`;
          probeIntent = 'Assessing technical diplomacy and evidence-based collaboration';
          suggestedApproach = 'Explain how empirical evidence and technical validation resolved the impasse';
          break;
        case 'recruiter':
        case 'hiring_manager':
        default:
          followUpQuestion = `How did that friction impact your delivery schedule, and what operational adjustments did you implement to hit your deadlines?`;
          probeIntent = 'Assessing operational resilience and timeline management amid friction';
          suggestedApproach = 'Explain how you mitigated delays while keeping key stakeholders aligned';
          break;
      }
    } else if (hasTradeoff) {
      // Probing strategic trade-off
      switch (persona) {
        case 'executive':
          followUpQuestion = `Looking back at that trade-off, what was the unintended second-order consequence, and how did you mitigate it at the executive level?`;
          probeIntent = 'Testing strategic foresight and second-order thinking';
          suggestedApproach = 'Discuss the secondary impacts of the trade-off and subsequent strategic adjustments';
          break;
        case 'peer':
          followUpQuestion = `What technical debt did that trade-off introduce, and how did you prioritize its remediation on the technical roadmap?`;
          probeIntent = 'Evaluating technical debt governance and long-term sustainability';
          suggestedApproach = 'Explain how the debt was documented, tracked, and scheduled for refactoring';
          break;
        case 'recruiter':
        case 'behavioral':
        case 'hiring_manager':
        default:
          followUpQuestion = `How did you communicate that trade-off to your cross-functional partners to ensure organizational buy-in?`;
          probeIntent = 'Evaluating stakeholder communication and change management';
          suggestedApproach = 'Outline the communication strategy that brought stakeholders along with the decision';
          break;
      }
    } else if (hasVagueOwnership) {
      // Probing vague ownership ('we' vs 'I') by persona
      switch (persona) {
        case 'behavioral':
        case 'hiring_manager':
          followUpQuestion = `You mentioned that 'we' delivered that initiative. What was your personal direct ownership, key decision-making boundary, and specific deliverable?`;
          probeIntent = 'Clarifying individual accountability vs general team contribution';
          suggestedApproach = 'Clarify your personal decisions, specific actions taken, and individual deliverables';
          break;
        case 'executive':
          followUpQuestion = `As the executive sponsor for that effort, what single high-stakes call did you have to make when your leadership team was split?`;
          probeIntent = 'Assessing executive decisiveness and leadership judgment';
          suggestedApproach = 'Describe the dilemma, how you weighed opposing viewpoints, and the final decision you owned';
          break;
        case 'peer':
          followUpQuestion = `In that collaborative effort, which specific technical decisions or architectural choices were strictly your responsibility?`;
          probeIntent = 'Verifying technical authority and architecture ownership';
          suggestedApproach = 'Highlight your specific technical contributions and architecture decisions';
          break;
        case 'recruiter':
        default:
          followUpQuestion = `In driving that initiative forward, how did your personal role evolve, and how did it influence your next career step?`;
          probeIntent = 'Evaluating leadership trajectory and scope expansion';
          suggestedApproach = 'Highlight how expanding responsibility set you up for this target role';
          break;
      }
    } else if (isShort) {
      // Short response probe by persona (when no specific signal detected)
      switch (persona) {
        case 'recruiter':
          followUpQuestion = `That gives a concise summary. Can you expand on the pivotal decision point that led you to take that step in your career progression?`;
          probeIntent = 'Evaluating career decision rationale and motivation clarity';
          suggestedApproach = 'Connect the career transition directly to your long-term leadership trajectory';
          break;
        case 'executive':
          followUpQuestion = `That was relatively high-level. What was the overarching business risk and strategic rationale that justified that path to leadership?`;
          probeIntent = 'Probing executive altitude and risk calibration';
          suggestedApproach = 'Articulate the enterprise risk and ROI calculation behind the initiative';
          break;
        case 'behavioral':
          followUpQuestion = `Can you elaborate on your specific personal ownership in that scenario—what was your exact intervention versus what the broader team handled?`;
          probeIntent = 'Differentiating individual contribution from collective team execution';
          suggestedApproach = 'Use the STAR framework focusing strictly on your direct actions and decisions';
          break;
        case 'peer':
          followUpQuestion = `Can you dive deeper into the technical mechanics and architectural constraints you were operating under during that rollout?`;
          probeIntent = 'Assessing technical depth and systems-level problem solving';
          suggestedApproach = 'Explain the technical constraints and engineering trade-offs you navigated';
          break;
        case 'hiring_manager':
        default:
          followUpQuestion = `Could you walk me through the specific execution mechanics—what was your day-to-day operating cadence and primary deliverable?`;
          probeIntent = 'Verifying operational execution depth and delivery discipline';
          suggestedApproach = 'Detail the operational framework, milestones, and governance mechanisms you established';
          break;
      }
    } else {
      // Substantive general response tailored by persona
      switch (persona) {
        case 'recruiter':
          followUpQuestion = `Given that foundation, what is the single biggest factor driving you to transition into this ${role} mandate at ${company} right now?`;
          probeIntent = 'Evaluating career trajectory and motivation alignment';
          suggestedApproach = 'Connect past leadership milestones directly to this company’s strategic growth mandate';
          break;
        case 'executive':
          followUpQuestion = `When executing that vision, what was the most contentious executive disagreement you navigated, and what did you concede to maintain velocity?`;
          probeIntent = 'Evaluating executive presence, political navigation, and trade-off maturity';
          suggestedApproach = 'Describe the business disagreement objectively and articulate the strategic compromise';
          break;
        case 'behavioral':
          followUpQuestion = `What was the most challenging interpersonal obstacle you faced while executing that work, and what did it teach you about your leadership style?`;
          probeIntent = 'Assessing self-awareness, leadership development, and interpersonal resilience';
          suggestedApproach = 'Reflect on a genuine lesson learned and how it shaped your subsequent leadership approach';
          break;
        case 'peer':
          followUpQuestion = `What technical constraints or system dependencies shaped those choices, and how would you adapt them for ${company}'s architecture?`;
          probeIntent = 'Evaluating technical adaptability and domain expertise';
          suggestedApproach = 'Bridge the technical realities of your past work to the target company’s architecture';
          break;
        case 'hiring_manager':
        default:
          followUpQuestion = `How would you adapt that operating framework specifically for ${company}'s current scale and business model?`;
          probeIntent = 'Assessing role-specific adaptability and operational translation';
          suggestedApproach = 'Highlight similarities in operating scale while tailoring to target company constraints';
          break;
      }
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
      practice: 'Generate 6 questions: 2 shared anchor questions (~33%) and 4 persona-specific questions (~67%).',
      timed: 'Generate 4 concise, high-velocity screening questions suitable for 90-second rapid responses.',
      full: 'Generate 8 comprehensive questions progressing across 4 recruiting rounds: Recruiter Screen, Hiring Manager Functional, Leadership/Behavioral, and Executive Strategy.',
      live: 'Generate 4-5 conversational questions suitable for dynamic spoken interview turn-taking with room for adaptive probing.',
    };

    const personaGuide = {
      recruiter: 'Recruiter Persona Focus: career trajectory, transitions, motivations, compensation alignment, availability timeline, and communication clarity.',
      hiring_manager: 'Hiring Manager Persona Focus: operating model design, team execution, priorities, resource allocation, and operational trade-offs.',
      executive: 'Executive / VP Persona Focus: enterprise strategy, capital allocation, board alignment, cross-functional conflict, strategic trade-offs, and business risk.',
      behavioral: 'Behavioral Persona Focus: personal ownership vs delegation, handling conflict and resistance, dealing with failure, learning, and leadership behavior.',
      peer: 'Peer / Tech Lead Persona Focus: technical collaboration, engineering constraints, architecture trade-offs, and translating business needs into technical requirements.',
    };

    const personaContext = input.persona
      ? `INTERVIEWER PERSONA: ${input.persona} — ${personaGuide[input.persona] || personaGuide.hiring_manager}`
      : 'INTERVIEWER PERSONA: hiring_manager';

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
1. Target Question Distribution:
   - For practice mode: Include 2 shared anchor questions (~33% shared: candidate background/trajectory, motivation for this company) and 4 persona-specific questions (~67% specific reflecting the persona's evaluation lens).
   - For timed mode: Generate exactly 4 concise screen questions.
   - For full loop mode: Generate exactly 8 questions ordered across the 4 rounds.
   - For live simulation mode: Generate 4 conversational questions with adaptive probing potential.
2. Questions must be role-specific and tailored to the job mandate.
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
    const persona = input.persona || 'hiring_manager';

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
        // Stress test tailored with 2 anchor + 4 persona-specific stress questions
        const stressAnchor = [
          { id: 'mq-1', question: `What makes your executive profile uniquely qualified for ${company}, and where is your biggest operational blind spot for this ${role}?`, category: 'behavioral' },
          { id: 'mq-2', question: `Why ${company} now, and what evidence convinces you that our operating environment matches your leadership style?`, category: 'culture' },
        ];

        let stressPersonaQuestions: Array<{ id: string; question: string; category: string }>;
        switch (persona) {
          case 'recruiter':
            stressPersonaQuestions = [
              { id: 'mq-3', question: `If this role turns out to require 40% more crisis management and stakeholder conflict than described, what keeps you from exiting within 6 months?`, category: 'culture' },
              { id: 'mq-4', question: `Walk me through your most difficult career transition where you were set up to fail. How did you navigate the optics and your own motivation?`, category: 'behavioral' },
              { id: 'mq-5', question: `If executive leadership offers you equity compensation in lieu of 20% of your target base, what quantitative framework governs your response?`, category: 'culture' },
              { id: 'mq-6', question: `What is the harshest critique a former direct supervisor or board member gave you, and what evidence proves it is no longer a liability?`, category: 'behavioral' },
            ];
            break;
          case 'executive':
            stressPersonaQuestions = [
              { id: 'mq-3', question: `If forced to choose between hitting quarterly revenue guidance vs completing a multi-quarter replatforming, how do you decide, and who takes the heat?`, category: 'strategic' },
              { id: 'mq-4', question: `How do you handle an explicit directive from the CEO that your operational data proves will degrade customer retention by 15%?`, category: 'situational' },
              { id: 'mq-5', question: `If the executive committee cuts your capital budget by 35% four weeks in, which two initiatives do you sacrifice first, and how do you defend that?`, category: 'strategic' },
              { id: 'mq-6', question: `What is the single most contentious executive disagreement you've had with a CFO, and what did you concede to preserve alignment?`, category: 'situational' },
            ];
            break;
          case 'behavioral':
            stressPersonaQuestions = [
              { id: 'mq-3', question: `Describe a time you executed a critical organizational change that faced widespread resistance. How did you measure net business impact?`, category: 'behavioral' },
              { id: 'mq-4', question: `Tell me about a time a high-performing senior leader under your watch toxicly undermined team morale. How and when did you remove them?`, category: 'situational' },
              { id: 'mq-5', question: `Describe an instance where a cross-functional peer openly took credit for your team's initiative before executive leadership. How did you handle it?`, category: 'behavioral' },
              { id: 'mq-6', question: `What was the most painful leadership failure of your career where your own judgment was directly at fault, and what was the aftermath?`, category: 'behavioral' },
            ];
            break;
          case 'peer':
            stressPersonaQuestions = [
              { id: 'mq-3', question: `A critical system outage causes a 4-hour SLA breach during peak traffic. How do you conduct the post-mortem without assigning individual blame?`, category: 'technical' },
              { id: 'mq-4', question: `Product leadership insists on shipping an unvetted architecture to beat a competitor to market. How do you respond and enforce architectural integrity?`, category: 'technical' },
              { id: 'mq-5', question: `Tell me about a technical bet you made that aged poorly. How quickly did you acknowledge the sunk cost, and what was the net engineering expense?`, category: 'strategic' },
              { id: 'mq-6', question: `How do you maintain engineering rigor and technical standards when legacy codebases and resource shortages force severe compromises?`, category: 'technical' },
            ];
            break;
          case 'hiring_manager':
          default:
            stressPersonaQuestions = [
              { id: 'mq-3', question: `How do you handle a scenario where 30% of your key team members threaten to resign due to burnout during a high-stakes migration?`, category: 'situational' },
              { id: 'mq-4', question: `Describe a time you discovered that your functional roadmap was misaligned with the company's core commercial objectives. How did you pivot?`, category: 'strategic' },
              { id: 'mq-5', question: `What metrics do you hold yourself accountable to when evaluating whether your operational leadership succeeded or failed?`, category: 'technical' },
              { id: 'mq-6', question: `If you discover that your top performer has been cutting critical quality corners to hit delivery deadlines, what is your immediate action?`, category: 'situational' },
            ];
            break;
        }

        questions = [...stressAnchor, ...stressPersonaQuestions];
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
      // Standard Practice and Live Simulation Modes:
      // ~33% shared anchor questions (2 of 6) + ~67% persona-specific questions (4 of 6)
      const sharedAnchors = [
        { id: 'mq-1', question: `Tell me about your background and what makes your leadership profile uniquely qualified for the ${role} role at ${company}.`, category: 'behavioral' },
        { id: 'mq-2', question: `Why ${company} at this stage of your search, and how does this opportunity align with your broader career vision?`, category: 'culture' },
      ];

      let personaSpecific: Array<{ id: string; question: string; category: string }>;
      switch (persona) {
        case 'recruiter':
          personaSpecific = [
            { id: 'mq-3', question: `Walk me through the pivotal inflection points in your career trajectory and what is driving you to leave your current scope.`, category: 'behavioral' },
            { id: 'mq-4', question: `How do you structure your compensation expectations (base, incentive, equity) and search timeline for this transition?`, category: 'culture' },
            { id: 'mq-5', question: `What are your essential non-negotiables regarding organizational culture, team autonomy, and executive reporting lines?`, category: 'situational' },
            { id: 'mq-6', question: `How would your former executive leaders or direct reports describe your operating tempo and communication style?`, category: 'behavioral' },
          ];
          break;
        case 'executive':
          personaSpecific = [
            { id: 'mq-3', question: `If the executive committee or board asked you to reduce your annual operating budget by 25%, which strategic workstreams do you protect and why?`, category: 'strategic' },
            { id: 'mq-4', question: `Describe the most contentious cross-functional disagreement you navigated with a CFO or peer VP, and what concession you made.`, category: 'situational' },
            { id: 'mq-5', question: `How do you assess business risk and downside exposure when making high-conviction strategic bets with incomplete data?`, category: 'strategic' },
            { id: 'mq-6', question: `What is the single biggest growth or operational vulnerability facing ${company} in our market, and how would you position us against it?`, category: 'strategic' },
          ];
          break;
        case 'behavioral':
          personaSpecific = [
            { id: 'mq-3', question: `Describe a time you spearheaded a critical organizational transformation that met widespread internal friction or cultural resistance.`, category: 'behavioral' },
            { id: 'mq-4', question: `Tell me about a direct report or team leader whose performance was slipping. What was your personal intervention, and what was the outcome?`, category: 'situational' },
            { id: 'mq-5', question: `Share an example of a high-visibility failure under your direct watch. What did you personally own, and what structural changes resulted?`, category: 'behavioral' },
            { id: 'mq-6', question: `How do you cultivate psychological safety while sustaining uncompromising performance standards across cross-functional teams?`, category: 'culture' },
          ];
          break;
        case 'peer':
          personaSpecific = [
            { id: 'mq-3', question: `What system architecture or operational governance trade-offs have you made when balancing rapid delivery against long-term maintainability?`, category: 'technical' },
            { id: 'mq-4', question: `How do you collaborate cross-functionally with Engineering, Product, and GTM peers when there is fundamental misalignment on technical requirements?`, category: 'situational' },
            { id: 'mq-5', question: `Tell me about an edge case or scalability bottleneck that degraded platform reliability. How did you diagnose and resolve it?`, category: 'technical' },
            { id: 'mq-6', question: `How do you translate complex technical architecture and engineering constraints into business impact for non-technical executive stakeholders?`, category: 'behavioral' },
          ];
          break;
        case 'hiring_manager':
        default:
          personaSpecific = [
            { id: 'mq-3', question: `How would you design and implement the operating model for this function at ${company} within your initial 90 days?`, category: 'technical' },
            { id: 'mq-4', question: `Describe a time you had to triage competing operational priorities and reallocate team capacity under tight delivery SLAs.`, category: 'strategic' },
            { id: 'mq-5', question: `What core operational KPIs and quality metrics do you establish to hold your teams accountable for execution rigor?`, category: 'technical' },
            { id: 'mq-6', question: `Tell me about an operational transformation where your initial hypothesis was wrong. What trade-offs did you make to recover?`, category: 'situational' },
          ];
          break;
      }

      questions = [...sharedAnchors, ...personaSpecific];
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
