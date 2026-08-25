/**
 * Server-side Interview Preparation Engine.
 * Generates comprehensive interview prep packages using Gemini with evidence grounding.
 * Falls back to deterministic "Simplified Interview Coaching" when Gemini is unavailable.
 */

import { getGeminiClient, getGeminiModel, getGeminiFallbackModel, isGeminiConfigured } from './geminiConfig';
import { executeWithResilience, RetryOptions, sanitizeErrorMessage } from './geminiRetry';
import { CandidateProfile, EvidenceItem } from '@/types/candidate';
import { JobOpportunity, FitAnalysisReport } from '@/types/opportunity';
import {
  InterviewPreparation,
  InterviewQuestion,
  StoryBankEntry,
  GapBridge,
  CompensationResearch,
  InterviewReadinessScore,
} from '@/types/interview';

export interface InterviewPrepInput {
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  analysisReport?: FitAnalysisReport;
}

export class InterviewPrepEngine {
  async generatePrep(input: InterviewPrepInput, retryOptions?: RetryOptions): Promise<InterviewPreparation> {
    const primaryModel = getGeminiModel();
    const failoverModel = getGeminiFallbackModel();
    const prepId = `prep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const basePrepMeta = {
      id: prepId,
      opportunityId: input.opportunity.id,
      candidateProfileId: input.candidate.id,
      generatedAt: now,
      requestedModel: primaryModel,
      candidateUpdatedAt: input.candidate.updatedAt || now,
      opportunityUpdatedAt: input.opportunity.updatedAt || now,
      isActive: true,
    };

    if (!isGeminiConfigured()) {
      return this.buildDeterministicPrep(input, {
        ...basePrepMeta,
        actualModel: 'deterministic',
        executionMode: 'deterministic' as const,
      });
    }

    try {
      const client = getGeminiClient();
      const prompt = this.buildPrepPrompt(input);

      const resilienceResult = await executeWithResilience(
        primaryModel,
        failoverModel,
        async (targetModel: string) => {
          const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });

          const rawText = response.text;
          if (!rawText) throw new Error(`Gemini (${targetModel}) returned empty response for interview prep.`);
          return JSON.parse(rawText);
        },
        retryOptions,
      );

      const raw = resilienceResult.result;
      const validEvidenceIds = new Set((input.candidate.evidenceItems || []).map((e: EvidenceItem) => e.id));

      // Build grounded prep from Gemini output
      const prep: InterviewPreparation = {
        ...basePrepMeta,
        actualModel: resilienceResult.actualModel,
        executionMode: 'gemini',
        executiveRoleBrief: raw.executiveRoleBrief || `${input.opportunity.title} at ${input.opportunity.company}`,
        candidatePositioning: raw.candidatePositioning || '',
        strongestFitThemes: Array.isArray(raw.strongestFitThemes) ? raw.strongestFitThemes.slice(0, 5) : [],
        materialGaps: this.groundGapBridges(raw.materialGaps, validEvidenceIds),
        whyThisCompany: raw.whyThisCompany || '',
        whyThisRole: raw.whyThisRole || '',
        whyYou: raw.whyYou || '',
        questionsToAsk: Array.isArray(raw.questionsToAsk) ? raw.questionsToAsk.slice(0, 8) : [],
        first90DaysPoints: Array.isArray(raw.first90DaysPoints) ? raw.first90DaysPoints.slice(0, 5) : [],
        riskFlags: Array.isArray(raw.riskFlags) ? raw.riskFlags.slice(0, 5) : [],
        questions: this.groundQuestions(raw.questions, validEvidenceIds),
        storyBank: this.groundStoryBank(raw.storyBank, validEvidenceIds),
        companyIntelligence: { available: false, unavailableReason: 'Live company intelligence unavailable' },
        compensationResearch: this.buildCompensationResearch(input),
        readinessScore: this.calculateReadinessScore(raw, input),
      };

      return prep;
    } catch (err) {
      console.error('[InterviewPrepEngine] Gemini failed, using deterministic fallback:', sanitizeErrorMessage(err));
      return this.buildDeterministicPrep(input, {
        ...basePrepMeta,
        actualModel: 'deterministic',
        executionMode: 'deterministic' as const,
      });
    }
  }

  private buildPrepPrompt(input: InterviewPrepInput): string {
    const { opportunity, candidate, analysisReport } = input;
    const evidenceList = (candidate.evidenceItems || [])
      .map((e: EvidenceItem) => `[${e.id}] ${e.title}: ${e.description}${e.metric ? ` (${e.metric})` : ''}`)
      .join('\n');

    const analysisContext = analysisReport ? `
Fit Score: ${analysisReport.overallFitScore}%
Recommendation: ${analysisReport.recommendation}
Executive Summary: ${analysisReport.executiveSummary}
Key Gaps: ${analysisReport.qualifications?.filter(q => q.matchType === 'Material Gap').map(q => q.qualification).join(', ') || 'None identified'}
` : '';

    return `You are an elite executive career coach preparing a senior candidate for a specific interview.

ROLE: ${opportunity.title}
COMPANY: ${opportunity.company}
${opportunity.location ? `LOCATION: ${opportunity.location}` : ''}
${opportunity.compensation ? `COMPENSATION: ${opportunity.compensation}` : ''}

JOB DESCRIPTION:
${opportunity.rawJobDescription || 'No description available'}

CANDIDATE: ${candidate.name}
HEADLINE: ${candidate.headline || ''}
SUMMARY: ${candidate.summary || ''}
TARGET ROLES: ${(candidate.targetRoles || []).join(', ')}
CORE COMPETENCIES: ${(candidate.coreCompetencies || []).join(', ')}
${analysisContext}

CANDIDATE EVIDENCE LIBRARY (use ONLY these IDs for citations):
${evidenceList || 'No evidence items available'}

Generate a comprehensive interview preparation package as JSON with these exact fields:
{
  "executiveRoleBrief": "2-3 sentence strategic summary of the role and what the company likely needs",
  "candidatePositioning": "3-4 sentences on how this candidate should position themselves",
  "strongestFitThemes": ["theme1", "theme2", ...] (3-5 themes),
  "materialGaps": [{"gap": "description", "bridgeStrategy": "how to address", "supportingEvidenceIds": ["EVID-..."]}],
  "whyThisCompany": "compelling answer to 'Why this company?'",
  "whyThisRole": "compelling answer to 'Why this role?'",
  "whyYou": "compelling answer to 'Why should we hire you?'",
  "questionsToAsk": ["question1", ...] (5-8 strategic questions),
  "first90DaysPoints": ["point1", ...] (3-5 discussion points),
  "riskFlags": ["flag1", ...] (likely interviewer concerns),
  "questions": [{"id": "q-1", "question": "...", "category": "behavioral|technical|situational|strategic|culture", "expectedFocus": "what interviewer probes", "suggestedApproach": "how to frame answer", "relevantEvidenceIds": ["EVID-..."]}] (8-15 questions),
  "storyBank": [{"id": "story-1", "title": "...", "situation": "...", "task": "...", "action": "...", "result": "...", "evidenceIds": ["EVID-..."], "applicableQuestionIds": ["q-1"]}]
}

CRITICAL RULES:
1. ALL evidence citation IDs MUST come from the candidate evidence library above. Do NOT invent IDs.
2. Do NOT fabricate candidate achievements, metrics, companies, or titles.
3. Story bank entries MUST be grounded in real candidate evidence.
4. Questions should be role-specific, not generic.
5. Gap bridge strategies should be honest and constructive, not fictional.`;
  }

  private groundQuestions(raw: unknown, validIds: Set<string>): InterviewQuestion[] {
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[]).slice(0, 15).map((q, i: number) => ({
      id: typeof q?.id === 'string' ? q.id : `q-${i + 1}`,
      question: typeof q?.question === 'string' ? q.question : '',
      category: (['behavioral', 'technical', 'situational', 'strategic', 'culture'].includes(q?.category as string)
        ? (q.category as string) : 'behavioral') as InterviewQuestion['category'],
      expectedFocus: typeof q?.expectedFocus === 'string' ? q.expectedFocus : '',
      suggestedApproach: typeof q?.suggestedApproach === 'string' ? q.suggestedApproach : '',
      relevantEvidenceIds: Array.isArray(q?.relevantEvidenceIds)
        ? (q.relevantEvidenceIds as string[]).filter((id: string) => validIds.has(id))
        : [],
    }));
  }

  private groundStoryBank(raw: unknown, validIds: Set<string>): StoryBankEntry[] {
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[]).slice(0, 8).map((s, i: number) => ({
      id: typeof s?.id === 'string' ? s.id : `story-${i + 1}`,
      title: typeof s?.title === 'string' ? s.title : '',
      situation: typeof s?.situation === 'string' ? s.situation : '',
      task: typeof s?.task === 'string' ? s.task : '',
      action: typeof s?.action === 'string' ? s.action : '',
      result: typeof s?.result === 'string' ? s.result : '',
      evidenceIds: Array.isArray(s?.evidenceIds)
        ? (s.evidenceIds as string[]).filter((id: string) => validIds.has(id))
        : [],
      applicableQuestionIds: Array.isArray(s?.applicableQuestionIds)
        ? (s.applicableQuestionIds as string[])
        : [],
    }));
  }

  private groundGapBridges(raw: unknown, validIds: Set<string>): GapBridge[] {
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[]).slice(0, 5).map((g) => ({
      gap: typeof g?.gap === 'string' ? g.gap : '',
      bridgeStrategy: typeof g?.bridgeStrategy === 'string' ? g.bridgeStrategy : '',
      supportingEvidenceIds: Array.isArray(g?.supportingEvidenceIds)
        ? (g.supportingEvidenceIds as string[]).filter((id: string) => validIds.has(id))
        : [],
    }));
  }

  private buildCompensationResearch(input: InterviewPrepInput): CompensationResearch {
    const fromJD = input.opportunity.compensation || undefined;
    const candidatePrefs = input.candidate.targetRoles?.length
      ? `Target roles: ${input.candidate.targetRoles.join(', ')}`
      : undefined;

    if (!fromJD && !candidatePrefs) {
      return { available: false, unavailableReason: 'No compensation data available from job description or candidate preferences.' };
    }

    const coaching: string[] = [];
    if (fromJD) coaching.push(`The posted compensation is ${fromJD}. Research whether this aligns with your expectations before the interview.`);
    if (candidatePrefs) coaching.push('Prepare to discuss your compensation expectations clearly and confidently.');
    coaching.push('Frame compensation discussions around total value, not just base salary.');

    return {
      available: true,
      fromJobDescription: fromJD,
      fromCandidatePreferences: candidatePrefs,
      negotiationCoaching: coaching,
    };
  }

  private calculateReadinessScore(
    raw: Record<string, unknown>,
    input: InterviewPrepInput,
  ): InterviewReadinessScore {
    const hasQuestions = Array.isArray(raw.questions) && raw.questions.length >= 5;
    const hasStories = Array.isArray(raw.storyBank) && raw.storyBank.length >= 2;
    const hasGaps = Array.isArray(raw.materialGaps);
    const hasAnalysis = !!input.analysisReport;
    const hasEvidence = (input.candidate.evidenceItems || []).length > 0;

    const dims = {
      roleUnderstanding: raw.executiveRoleBrief ? 80 : 40,
      candidatePositioning: raw.candidatePositioning ? 75 : 35,
      storyPreparation: hasStories ? (hasEvidence ? 85 : 60) : 30,
      gapMitigation: hasGaps && hasAnalysis ? 75 : 40,
      companyKnowledge: 30, // Always low without grounded intelligence
      questionReadiness: hasQuestions ? 80 : 35,
    };

    const overall = Math.round(
      Object.values(dims).reduce((sum, v) => sum + v, 0) / Object.keys(dims).length
    );

    return { overall, dimensions: dims };
  }

  private buildDeterministicPrep(
    input: InterviewPrepInput,
    meta: {
      id: string;
      opportunityId: string;
      candidateProfileId: string;
      generatedAt: string;
      requestedModel: string;
      actualModel: string;
      executionMode: 'deterministic';
      candidateUpdatedAt: string;
      opportunityUpdatedAt: string;
      isActive: boolean;
    },
  ): InterviewPreparation {
    const { opportunity, candidate, analysisReport } = input;
    const evidenceItems = candidate.evidenceItems || [];

    // Build deterministic questions from JD keywords
    const questions: InterviewQuestion[] = [
      { id: 'q-1', question: `Tell me about your experience relevant to the ${opportunity.title} role.`, category: 'behavioral', expectedFocus: 'Role fit', suggestedApproach: 'Use your strongest STAR story', relevantEvidenceIds: evidenceItems.slice(0, 2).map((e: EvidenceItem) => e.id) },
      { id: 'q-2', question: 'What attracted you to this opportunity?', category: 'culture', expectedFocus: 'Motivation', suggestedApproach: 'Connect company mission to personal values', relevantEvidenceIds: [] },
      { id: 'q-3', question: 'Describe a significant challenge you overcame in a leadership role.', category: 'behavioral', expectedFocus: 'Leadership under pressure', suggestedApproach: 'Emphasize outcome and learning', relevantEvidenceIds: evidenceItems.slice(0, 1).map((e: EvidenceItem) => e.id) },
      { id: 'q-4', question: 'How do you approach building and developing high-performing teams?', category: 'strategic', expectedFocus: 'People leadership', suggestedApproach: 'Provide concrete examples with metrics', relevantEvidenceIds: [] },
      { id: 'q-5', question: `What would your first 90 days look like as ${opportunity.title}?`, category: 'strategic', expectedFocus: 'Strategic thinking', suggestedApproach: 'Show structured onboarding approach', relevantEvidenceIds: [] },
      { id: 'q-6', question: 'Where do you see areas for growth or development?', category: 'behavioral', expectedFocus: 'Self-awareness', suggestedApproach: 'Be honest but position growth areas constructively', relevantEvidenceIds: [] },
      { id: 'q-7', question: 'How do you handle disagreements with senior stakeholders?', category: 'situational', expectedFocus: 'Conflict resolution', suggestedApproach: 'Use a real example showing diplomacy and results', relevantEvidenceIds: [] },
      { id: 'q-8', question: 'What questions do you have for us?', category: 'culture', expectedFocus: 'Engagement and research', suggestedApproach: 'Ask strategic questions that show preparation', relevantEvidenceIds: [] },
    ];

    // Build deterministic stories from evidence
    const storyBank: StoryBankEntry[] = evidenceItems.slice(0, 4).map((e: EvidenceItem, i: number) => ({
      id: `story-${i + 1}`,
      title: e.title,
      situation: `In my role${e.organization ? ` at ${e.organization}` : ''}, ${e.description.split('.')[0]}.`,
      task: 'I was responsible for driving this initiative forward.',
      action: e.description,
      result: e.metric || 'Delivered measurable impact.',
      evidenceIds: [e.id],
      applicableQuestionIds: [`q-${i + 1}`],
    }));

    const gaps: GapBridge[] = analysisReport?.qualifications
      ?.filter(q => q.matchType === 'Material Gap')
      .slice(0, 3)
      .map(q => ({
        gap: q.qualification,
        bridgeStrategy: q.explanation || 'Highlight transferable experience and willingness to learn.',
        supportingEvidenceIds: (q.supportingEvidenceCitationIds || []).filter(id => evidenceItems.some((e: EvidenceItem) => e.id === id)),
      })) || [];

    return {
      ...meta,
      executiveRoleBrief: `${opportunity.title} at ${opportunity.company}${opportunity.location ? ` (${opportunity.location})` : ''}. This role requires strong leadership and domain expertise. [Simplified Interview Coaching — live AI preparation unavailable]`,
      candidatePositioning: candidate.summary || `${candidate.name} brings relevant experience to this opportunity.`,
      strongestFitThemes: (candidate.coreCompetencies || []).slice(0, 4),
      materialGaps: gaps,
      whyThisCompany: `${opportunity.company} presents an opportunity aligned with your career trajectory.`,
      whyThisRole: `The ${opportunity.title} role matches your target career direction.`,
      whyYou: `Your background in ${(candidate.coreCompetencies || []).slice(0, 3).join(', ') || 'your field'} positions you well.`,
      questionsToAsk: [
        'What does success look like in the first 12 months?',
        'How is the team currently structured?',
        'What are the biggest challenges facing this function?',
        'How does this role contribute to the company\'s strategic priorities?',
      ],
      first90DaysPoints: [
        'Build relationships with key stakeholders',
        'Understand current processes and pain points',
        'Identify quick wins to demonstrate value',
      ],
      riskFlags: analysisReport?.qualifications
        ?.filter(q => q.matchType === 'Material Gap')
        .slice(0, 3)
        .map(q => q.qualification) || ['Review JD requirements for potential gaps'],
      questions,
      storyBank,
      companyIntelligence: { available: false, unavailableReason: 'Live company intelligence unavailable' },
      compensationResearch: this.buildCompensationResearch(input),
      readinessScore: {
        overall: storyBank.length > 0 ? 50 : 25,
        dimensions: {
          roleUnderstanding: 40,
          candidatePositioning: candidate.summary ? 55 : 25,
          storyPreparation: storyBank.length > 0 ? 50 : 15,
          gapMitigation: gaps.length > 0 ? 45 : 20,
          companyKnowledge: 25,
          questionReadiness: 45,
        },
      },
    };
  }
}
