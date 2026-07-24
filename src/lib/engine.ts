import { AnalysisInput, IFitAnalysisEngine } from '@/types/engine';
import { CandidateProfile } from '@/types/candidate';
import {
  FitAnalysisReport,
  QualificationMatch,
  RecommendationType,
} from '@/types/opportunity';
import { sanitizeInput } from './sanitize';

// Import pre-authored sample fixtures
import { fixtureRole1AIStrategy } from '@/data/fixtures/role-1-ai-strategy';
import { fixtureRole2SalesOps } from '@/data/fixtures/role-2-sales-ops';
import { fixtureRole3DataEngineer } from '@/data/fixtures/role-3-data-engineer';
import { fixtureRole4ChiefOfStaff } from '@/data/fixtures/role-4-chief-of-staff';
import { fixtureRole5StrategyLead } from '@/data/fixtures/role-5-strategy-lead';

export class DeterministicSyntheticEngine implements IFitAnalysisEngine {
  async analyzeRole(
    input: AnalysisInput,
    _candidateProfile: CandidateProfile
  ): Promise<FitAnalysisReport> {
    void _candidateProfile;
    // 1. Sanitize text
    const sanitized = sanitizeInput(input.jobDescription);
    const textToAnalyze = sanitized.sanitizedText.toLowerCase();

    // 2. Check Tier 1: Pre-Authored Sample Fixtures
    if (input.sampleRoleId) {
      switch (input.sampleRoleId) {
        case 'opp-role-1-ai-strategy':
        case 'role-1':
          return fixtureRole1AIStrategy;
        case 'opp-role-2-sales-ops':
        case 'role-2':
          return fixtureRole2SalesOps;
        case 'opp-role-3-data-engineer':
        case 'role-3':
          return fixtureRole3DataEngineer;
        case 'opp-role-4-chief-of-staff':
        case 'role-4':
          return fixtureRole4ChiefOfStaff;
        case 'opp-role-5-strategy-lead':
        case 'role-5':
          return fixtureRole5StrategyLead;
      }
    }

    // Secondary title-based fixture lookup check
    const titleLower = (input.jobTitle || '').toLowerCase();
    if (titleLower.includes('ai strategy')) return fixtureRole1AIStrategy;
    if (titleLower.includes('sales ops') || titleLower.includes('sales operations')) return fixtureRole2SalesOps;
    if (titleLower.includes('data engineer') || titleLower.includes('pyspark')) return fixtureRole3DataEngineer;
    if (titleLower.includes('chief of staff')) return fixtureRole4ChiefOfStaff;

    // 3. Tier 2: Keyword-Extraction Fallback for Custom Job Descriptions
    return this.generateCustomFallbackReport(input, textToAnalyze);
  }

  private generateCustomFallbackReport(
    input: AnalysisInput,
    text: string
  ): FitAnalysisReport {
    const qualifications: QualificationMatch[] = [];

    // Helper: Check signal presence in input text
    const hasWord = (word: string) => text.includes(word);

    // Extraction 1: Strategy & Operations Leadership
    if (hasWord('strategy') || hasWord('strategic') || hasWord('operations') || hasWord('bizops')) {
      qualifications.push({
        id: 'cust-q1',
        category: 'Required',
        qualification: 'Strategic execution and business operations experience',
        matchType: 'Strong Match',
        explanation: 'Extensive strategy and operations background across software enterprises.',
        supportingEvidenceCitationIds: ['EVID-2024-01', 'EVID-2023-01'],
      });
    }

    // Extraction 2: RevOps / GTM
    if (hasWord('revops') || hasWord('gtm') || hasWord('sales') || hasWord('funnel') || hasWord('pipeline')) {
      qualifications.push({
        id: 'cust-q2',
        category: 'Required',
        qualification: 'GTM operations and RevOps pipeline alignment',
        matchType: 'Strong Match',
        explanation: 'Demonstrated GTM automation and pipeline conversion expansion.',
        supportingEvidenceCitationIds: ['EVID-2024-01', 'EVID-2023-03'],
      });
    }

    // Extraction 3: AI & Technology Enablement
    if (hasWord('ai') || hasWord('automation') || hasWord('enablement') || hasWord('transformation')) {
      qualifications.push({
        id: 'cust-q3',
        category: 'Required',
        qualification: 'AI enablement and enterprise technology adoption',
        matchType: 'Strong Match',
        explanation: 'Led enterprise AI Enablement taskforce training 450+ leaders.',
        supportingEvidenceCitationIds: ['EVID-2024-05'],
      });
    }

    // Extraction 4: Software Engineering / Coding (Material Gap for Alex)
    if (hasWord('pyspark') || hasWord('scala') || hasWord('c++') || hasWord('software engineer') || hasWord('coding') || hasWord('developer')) {
      qualifications.push({
        id: 'cust-q4',
        category: 'Required',
        qualification: 'Hands-on software development and engineering programming',
        matchType: 'Material Gap',
        explanation: 'The candidate profile reflects strategy and operations leadership without hands-on software development experience.',
        supportingEvidenceCitationIds: [],
      });
    }

    // Extraction 5: Unverified / Domain specific signals
    if (hasWord('compliance') || hasWord('legal') || hasWord('regulatory')) {
      qualifications.push({
        id: 'cust-q5',
        category: 'Preferred',
        qualification: 'Domain-specific regulatory and compliance framework management',
        matchType: 'Unverified',
        explanation: 'Candidate evidence details operational governance but omits explicit regulatory compliance credentials.',
        supportingEvidenceCitationIds: [],
      });
    }

    // Additional default unverified item to represent conservative fallback analysis
    qualifications.push({
      id: 'cust-q6',
      category: 'Preferred',
      qualification: 'Custom proprietary tooling & industry-specific software credentials',
      matchType: 'Unverified',
      explanation: 'Evidence cannot be conclusively verified from synthetic candidate profile for custom-pasted requirements.',
      supportingEvidenceCitationIds: [],
    });

    // Calculate Fit Score
    const { fitScore, recommendation, explanation } = this.calculateFitScore(qualifications);

    return {
      executiveSummary: `Simplified heuristic analysis for ${input.jobTitle || 'Custom Role'} at ${input.company || 'Target Enterprise'}. This analysis uses lightweight deterministic keyword matching against Alex Vance’s synthetic candidate profile.`,
      likelyMandate: `Execute ${input.jobTitle || 'strategic'} priorities and lead cross-functional initiatives for ${input.company || 'the target organization'}.`,
      keyRequirements: qualifications.map((q) => q.qualification),
      overallFitScore: fitScore,
      scoreExplanation: explanation,
      recommendation,
      positioningNarrative: `I offer 12+ years of strategic execution and RevOps leadership. Based on keyword signal analysis, my background aligns with your operational priorities. Note: Detailed semantic evaluation will be available in Version 2.`,
      qualifications,
      objections: [
        {
          id: 'cust-obj-1',
          objection: 'Custom JD analysis relies on keyword signal matching without dynamic semantic reasoning.',
          counterPositioning: 'Advise candidate to review unverified qualifications and confirm specific team expectations during initial recruiter screen.',
        },
      ],
      recruiterQuestions: [
        `What are the core 90-day deliverables expected for the ${input.jobTitle || 'role'}?`,
        'What specific tools or software systems does the team rely on daily?',
      ],
      hiringManagerQuestions: [
        'How does this position interface between strategy leadership and execution teams?',
      ],
      recommendedStarStories: [
        {
          id: 'cust-star-1',
          title: 'Cross-Functional Strategy Execution',
          situation: 'High-growth enterprise required strategic operational alignment across divisions.',
          task: 'Lead cross-functional initiative to drive operational efficiency.',
          action: 'Implemented executive review rhythms and alignment frameworks.',
          result: 'Achieved 35% operational efficiency gain and accelerated strategic execution.',
          citationIds: ['EVID-2024-02'],
        },
      ],
      nextActions: [
        'Review Unverified qualifications and prepare clarifying questions for recruiter call',
        'Verify specific role mandate during initial screening',
      ],
      isFallbackAnalysis: true,
      analysisNotice:
        'Simplified heuristic analysis — Version 1 uses keyword signal extraction. Live semantic AI evaluation is planned for Version 2.',
    };
  }

  private calculateFitScore(qualifications: QualificationMatch[]): {
    fitScore: number;
    recommendation: RecommendationType;
    explanation: string;
  } {
    if (qualifications.length === 0) {
      return {
        fitScore: 0,
        recommendation: 'Monitor',
        explanation:
          'Zero extractable qualifications detected in custom job description. To avoid division by zero, the engine returns a score of 0% with a Monitor recommendation as an explicit exception to standard score mapping.',
      };
    }

    let weightedSum = 0;
    let maxPossibleWeight = 0;

    for (const q of qualifications) {
      const baseWeight = q.category === 'Required' ? 2 : 1;
      maxPossibleWeight += baseWeight;

      switch (q.matchType) {
        case 'Strong Match':
          weightedSum += baseWeight * 1.0;
          break;
        case 'Partial Match':
          weightedSum += baseWeight * 0.5;
          break;
        case 'Material Gap':
          weightedSum -= baseWeight * 1.0;
          break;
        case 'Unverified':
          weightedSum += 0;
          break;
      }
    }

    if (maxPossibleWeight === 0) {
      return {
        fitScore: 0,
        recommendation: 'Monitor',
        explanation:
          'No weighted qualifications available. Returned 0% score with Monitor recommendation.',
      };
    }

    // Calculate percentage, floor at 0, clamp at 100
    let score = Math.round((weightedSum / maxPossibleWeight) * 100);
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    let recommendation: RecommendationType = 'Deprioritize';
    if (score >= 85) {
      recommendation = 'Apply';
    } else if (score >= 70) {
      recommendation = 'Network First';
    } else if (score >= 50) {
      recommendation = 'Monitor';
    } else {
      recommendation = 'Deprioritize';
    }

    const explanation = `Overall Fit Score of ${score}% (${recommendation}). Calculated using 2× weight for required qualifications and 1× for preferred qualifications. Weighted sum: ${weightedSum} / Max possible: ${maxPossibleWeight}.`;

    return { fitScore: score, recommendation, explanation };
  }
}
