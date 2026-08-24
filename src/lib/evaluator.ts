import { FitAnalysisReport } from '@/types/opportunity';
import { CandidateProfile } from '@/types/candidate';

export interface EvalMetricScore {
  score: number; // 0 - 100
  passed: boolean;
  notes: string[];
}

export interface ReportEvaluationResult {
  roleId: string;
  roleTitle: string;
  company: string;
  overallScore: number;
  latencyMs?: number;
  modelUsed?: string;
  schemaAdherence: EvalMetricScore;
  evidenceGrounding: EvalMetricScore;
  hallucinationSafety: EvalMetricScore;
  gapIdentification: EvalMetricScore;
  recommendationConsistency: EvalMetricScore;
  completeness: EvalMetricScore;
}

export interface BenchmarkEvaluationSummary {
  timestamp: string;
  model: string;
  totalRoles: number;
  successfulEvaluations: number;
  averageScore: number;
  averageLatencyMs: number;
  results: ReportEvaluationResult[];
}

/**
 * Pure evaluator that computes objective governance and quality metrics for a FitAnalysisReport.
 */
export function evaluateReport(
  report: FitAnalysisReport,
  candidateProfile: CandidateProfile,
  roleId: string,
  roleTitle: string,
  company: string
): ReportEvaluationResult {
  const notes: Record<string, string[]> = {
    schema: [],
    grounding: [],
    hallucination: [],
    gaps: [],
    consistency: [],
    completeness: [],
  };

  // 1. Schema Adherence
  let schemaScore = 100;
  if (!report.executiveSummary) { schemaScore -= 20; notes.schema.push('Missing executiveSummary'); }
  if (!report.likelyMandate) { schemaScore -= 20; notes.schema.push('Missing likelyMandate'); }
  if (!Array.isArray(report.keyRequirements) || report.keyRequirements.length === 0) {
    schemaScore -= 20; notes.schema.push('Missing keyRequirements');
  }
  if (!Array.isArray(report.qualifications) || report.qualifications.length === 0) {
    schemaScore -= 20; notes.schema.push('Missing qualifications');
  }
  if (typeof report.overallFitScore !== 'number' || isNaN(report.overallFitScore)) {
    schemaScore -= 20; notes.schema.push('Invalid overallFitScore');
  }

  // 2. Evidence Grounding & Integrity
  let groundingScore = 100;
  const validEvidenceSet = new Set<string>();
  (candidateProfile.evidenceItems || []).forEach((ev) => {
    validEvidenceSet.add(ev.id);
    (ev.tags || []).forEach((t) => validEvidenceSet.add(t));
  });

  let totalCitations = 0;
  let invalidCitations = 0;

  (report.qualifications || []).forEach((q) => {
    (q.supportingEvidenceCitationIds || []).forEach((cid) => {
      totalCitations++;
      if (!validEvidenceSet.has(cid)) {
        invalidCitations++;
        notes.grounding.push(`Fabricated or unverified citation ID: "${cid}" in qualification "${q.qualification}"`);
      }
    });
  });

  (report.recommendedStarStories || []).forEach((story) => {
    (story.citationIds || []).forEach((cid) => {
      totalCitations++;
      if (!validEvidenceSet.has(cid)) {
        invalidCitations++;
        notes.grounding.push(`Fabricated citation ID "${cid}" in STAR story "${story.title}"`);
      }
    });
  });

  if (totalCitations > 0) {
    groundingScore = Math.max(0, Math.round(((totalCitations - invalidCitations) / totalCitations) * 100));
  }

  // 3. Hallucination Safety
  let hallucinationScore = 100;
  if (invalidCitations > 0) {
    hallucinationScore = Math.max(0, 100 - invalidCitations * 15);
    notes.hallucination.push(`${invalidCitations} unverifiable citation(s) detected`);
  }

  // 4. Gap Identification & Strategic Objectivity
  let gapScore = 100;
  const hasGapsOrUnverified = (report.qualifications || []).some(
    (q) => q.matchType === 'Material Gap' || q.matchType === 'Unverified' || q.matchType === 'Partial Match'
  );
  if (!hasGapsOrUnverified && report.overallFitScore < 100) {
    gapScore -= 25;
    notes.gaps.push('No material gaps or partial matches identified despite sub-100 score');
  }
  if (!Array.isArray(report.objections) || report.objections.length === 0) {
    gapScore -= 20;
    notes.gaps.push('No hiring objections identified');
  }

  // 5. Recommendation Consistency
  let consistencyScore = 100;
  const score = report.overallFitScore;
  const rec = report.recommendation;

  if (score >= 85 && rec !== 'Apply') {
    consistencyScore -= 40;
    notes.consistency.push(`Score of ${score}% does not match recommendation "${rec}" (expected "Apply")`);
  } else if (score >= 70 && score < 85 && rec !== 'Network First') {
    consistencyScore -= 40;
    notes.consistency.push(`Score of ${score}% does not match recommendation "${rec}" (expected "Network First")`);
  } else if (score >= 50 && score < 70 && rec !== 'Monitor') {
    consistencyScore -= 40;
    notes.consistency.push(`Score of ${score}% does not match recommendation "${rec}" (expected "Monitor")`);
  } else if (score < 50 && rec !== 'Deprioritize') {
    consistencyScore -= 40;
    notes.consistency.push(`Score of ${score}% does not match recommendation "${rec}" (expected "Deprioritize")`);
  }

  // 6. Completeness
  let completenessScore = 100;
  if (!Array.isArray(report.recruiterQuestions) || report.recruiterQuestions.length === 0) completenessScore -= 15;
  if (!Array.isArray(report.hiringManagerQuestions) || report.hiringManagerQuestions.length === 0) completenessScore -= 15;
  if (!Array.isArray(report.recommendedStarStories) || report.recommendedStarStories.length === 0) completenessScore -= 20;
  if (!Array.isArray(report.nextActions) || report.nextActions.length === 0) completenessScore -= 15;

  const totalAverage = Math.round(
    (schemaScore * 0.25 +
      groundingScore * 0.25 +
      hallucinationScore * 0.15 +
      gapScore * 0.15 +
      consistencyScore * 0.10 +
      completenessScore * 0.10)
  );

  return {
    roleId,
    roleTitle,
    company,
    overallScore: totalAverage,
    latencyMs: report.latencyMs,
    modelUsed: report.actualModel || report.modelUsed || report.analysisEngine,
    schemaAdherence: { score: schemaScore, passed: schemaScore >= 90, notes: notes.schema },
    evidenceGrounding: { score: groundingScore, passed: groundingScore >= 90, notes: notes.grounding },
    hallucinationSafety: { score: hallucinationScore, passed: hallucinationScore >= 80, notes: notes.hallucination },
    gapIdentification: { score: gapScore, passed: gapScore >= 70, notes: notes.gaps },
    recommendationConsistency: { score: consistencyScore, passed: consistencyScore >= 90, notes: notes.consistency },
    completeness: { score: completenessScore, passed: completenessScore >= 80, notes: notes.completeness },
  };
}
