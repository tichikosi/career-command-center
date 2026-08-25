import { describe, it, expect } from 'vitest';
import { GeminiFitAnalysisEngine } from '@/lib/server/geminiEngine';
import { AnalyzeRequestSchema } from '@/lib/server/schemas';
import { TEST_CANDIDATE_PROFILE } from '../fixtures/test-data';

describe('GeminiFitAnalysisEngine & Server Schemas', () => {
  const engine = new GeminiFitAnalysisEngine();

  it('validates incoming analysis request schema correctly', () => {
    const validBody = {
      jobTitle: 'VP of AI Operations',
      company: 'FutureTech Systems',
      jobDescription: 'Leading enterprise AI transformations and cross-functional operational workflows across cloud systems.',
      candidateSnapshot: {
        id: TEST_CANDIDATE_PROFILE.id,
        name: TEST_CANDIDATE_PROFILE.name,
        headline: TEST_CANDIDATE_PROFILE.headline,
        summary: TEST_CANDIDATE_PROFILE.summary,
        targetRoles: TEST_CANDIDATE_PROFILE.targetRoles,
        targetIndustries: TEST_CANDIDATE_PROFILE.targetIndustries,
        preferredLocations: TEST_CANDIDATE_PROFILE.preferredLocations,
        coreCompetencies: TEST_CANDIDATE_PROFILE.coreCompetencies,
        careerHistory: TEST_CANDIDATE_PROFILE.careerHistory,
        evidenceItems: TEST_CANDIDATE_PROFILE.evidenceItems,
        dataMode: 'synthetic' as const,
      },
    };

    const parseResult = AnalyzeRequestSchema.safeParse(validBody);
    expect(parseResult.success).toBe(true);
  });

  it('rejects invalid analysis request bodies with missing fields', () => {
    const invalidBody = {
      jobTitle: '',
      company: '',
      jobDescription: 'short',
    };

    const parseResult = AnalyzeRequestSchema.safeParse(invalidBody);
    expect(parseResult.success).toBe(false);
  });

  it('executes graceful deterministic fallback when Gemini API is unconfigured', async () => {
    // In unit test environment, GEMINI_API_KEY is not configured by default
    const result = await engine.analyze({
      jobTitle: 'Director of AI Strategy',
      company: 'Enterprise AI Corp',
      jobDescription: 'Strategic AI operations and RevOps pipeline transformation for 500+ leaders.',
      sampleRoleId: 'opp-role-1-ai-strategy',
      candidateSnapshot: {
        id: TEST_CANDIDATE_PROFILE.id,
        name: TEST_CANDIDATE_PROFILE.name,
        headline: TEST_CANDIDATE_PROFILE.headline,
        summary: TEST_CANDIDATE_PROFILE.summary,
        targetRoles: TEST_CANDIDATE_PROFILE.targetRoles,
        targetIndustries: TEST_CANDIDATE_PROFILE.targetIndustries,
        preferredLocations: TEST_CANDIDATE_PROFILE.preferredLocations,
        coreCompetencies: TEST_CANDIDATE_PROFILE.coreCompetencies,
        careerHistory: TEST_CANDIDATE_PROFILE.careerHistory,
        evidenceItems: TEST_CANDIDATE_PROFILE.evidenceItems,
        dataMode: 'synthetic',
      },
    });

    expect(result).toBeDefined();
    expect(result.overallFitScore).toBe(91);
    expect(result.recommendation).toBe('Apply');
    expect(result.isFallbackAnalysis).toBe(true);
    expect(result.analysisEngine).toBe('deterministic');
    expect(result.candidateProvenance).toBeDefined();
    expect(result.evidenceSnapshot).toBeDefined();
  });

  it('enforces rigorous evidence grounding by stripping fabricated citation IDs', () => {
    const mockReport = {
      executiveSummary: 'Executive overview for Director role.',
      likelyMandate: 'Scale AI revenue ops.',
      keyRequirements: ['Leadership', 'Operations'],
      overallFitScore: 88,
      scoreExplanation: 'Strong background.',
      recommendation: 'Apply' as const,
      positioningNarrative: 'Positioning pitch.',
      qualifications: [
        {
          id: 'q1',
          category: 'Required' as const,
          qualification: 'AI Strategy Leadership',
          matchType: 'Strong Match' as const,
          explanation: 'Extensive AI transformation.',
          supportingEvidenceCitationIds: ['EVID-2024-01', 'FABRICATED-FAKE-ID-999'],
        },
        {
          id: 'q2',
          category: 'Required' as const,
          qualification: 'Python Cloud Architecture',
          matchType: 'Strong Match' as const,
          explanation: 'Claimed experience.',
          supportingEvidenceCitationIds: ['COMPLETELY-INVENTED-CITATION'],
        },
      ],
      objections: [],
      recruiterQuestions: ['Question 1'],
      hiringManagerQuestions: ['Question 1'],
      recommendedStarStories: [
        {
          id: 's1',
          title: 'AI Transformation',
          situation: 'Sit',
          task: 'Task',
          action: 'Act',
          result: 'Res',
          citationIds: ['EVID-2024-01', 'FAKE-STORY-CITATION'],
        },
      ],
      nextActions: ['Action 1'],
    };

    // Valid evidence list from test fixture
    const validEvidence = [{ id: 'EVID-2024-01', tags: ['EVID-2024-01', 'strategy'] }];

    // Invoke grounding filter
    const engineWithGrounding = engine as unknown as {
      enforceEvidenceGrounding: (r: typeof mockReport, e: typeof validEvidence) => typeof mockReport;
    };
    const grounded = engineWithGrounding.enforceEvidenceGrounding(mockReport, validEvidence);

    // Q1 should retain valid EVID-2024-01 and strip FABRICATED-FAKE-ID-999
    expect(grounded.qualifications[0].supportingEvidenceCitationIds).toEqual(['EVID-2024-01']);
    expect(grounded.qualifications[0].matchType).toBe('Strong Match');

    // Q2 had ONLY fabricated citations; matchType should be downgraded to Partial Match
    expect(grounded.qualifications[1].supportingEvidenceCitationIds).toEqual([]);
    expect(grounded.qualifications[1].matchType).toBe('Partial Match');

    // Star story should strip FAKE-STORY-CITATION
    expect(grounded.recommendedStarStories[0].citationIds).toEqual(['EVID-2024-01']);
  });
});
