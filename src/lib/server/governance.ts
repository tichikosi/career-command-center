import { CandidateProfile } from '@/types/candidate';
import {
  InterviewPreparation,
  InterviewSession,
} from '@/types/interview';

export interface GovernanceValidationResult {
  valid: boolean;
  violations: string[];
  metrics: {
    evidenceCitationsCount: number;
    validCitationsCount: number;
    unsupportedCitationsCount: number;
    duplicateQuestionsCount: number;
    scoreBoundsValid: boolean;
    hasRequiredSections: boolean;
    groundingRatio: number;
  };
}

/**
 * Validates an Interview Preparation package against candidate evidence and governance rules.
 */
export function validateInterviewPrepGovernance(
  prep: InterviewPreparation,
  candidate: CandidateProfile,
): GovernanceValidationResult {
  const violations: string[] = [];
  const validEvidenceIds = new Set((candidate.evidenceItems || []).map((e) => e.id));

  let totalCitations = 0;
  let validCitations = 0;
  let unsupportedCitations = 0;

  // 1. Required Sections Check
  const hasRequiredSections = Boolean(
    prep.executiveRoleBrief &&
      prep.candidatePositioning &&
      Array.isArray(prep.strongestFitThemes) &&
      prep.strongestFitThemes.length > 0 &&
      Array.isArray(prep.questions) &&
      prep.questions.length >= 5 &&
      Array.isArray(prep.storyBank) &&
      prep.storyBank.length >= 1 &&
      prep.whyThisCompany &&
      prep.whyThisRole &&
      prep.whyYou &&
      Array.isArray(prep.questionsToAsk) &&
      prep.readinessScore &&
      typeof prep.readinessScore.overall === 'number'
  );

  if (!hasRequiredSections) {
    violations.push('Missing one or more required interview preparation sections.');
  }

  // 2. Readiness Score Bounds Check (0 - 100)
  let scoreBoundsValid = true;
  if (prep.readinessScore.overall < 0 || prep.readinessScore.overall > 100) {
    violations.push(`Readiness score ${prep.readinessScore.overall} is out of bounds (0-100).`);
    scoreBoundsValid = false;
  }

  for (const [dim, val] of Object.entries(prep.readinessScore.dimensions || {})) {
    if (typeof val !== 'number' || val < 0 || val > 100) {
      violations.push(`Readiness dimension ${dim} score ${val} is out of bounds (0-100).`);
      scoreBoundsValid = false;
    }
  }

  // 3. Evidence Grounding in Questions
  for (const q of prep.questions || []) {
    for (const eid of q.relevantEvidenceIds || []) {
      totalCitations++;
      if (validEvidenceIds.has(eid)) {
        validCitations++;
      } else {
        unsupportedCitations++;
        violations.push(`Question "${q.question}" references invalid evidence ID "${eid}".`);
      }
    }
  }

  // 4. Evidence Grounding in Story Bank
  for (const story of prep.storyBank || []) {
    for (const eid of story.evidenceIds || []) {
      totalCitations++;
      if (validEvidenceIds.has(eid)) {
        validCitations++;
      } else {
        unsupportedCitations++;
        violations.push(`Story "${story.title}" references invalid evidence ID "${eid}".`);
      }
    }
  }

  // 5. Evidence Grounding in Material Gap Bridges
  for (const gap of prep.materialGaps || []) {
    for (const eid of gap.supportingEvidenceIds || []) {
      totalCitations++;
      if (validEvidenceIds.has(eid)) {
        validCitations++;
      } else {
        unsupportedCitations++;
        violations.push(`Gap bridge for "${gap.gap}" references invalid evidence ID "${eid}".`);
      }
    }
  }

  // 6. Duplicate Interview Question Detection
  const questionTexts = new Set<string>();
  let duplicateQuestionsCount = 0;
  for (const q of prep.questions || []) {
    const normalized = q.question.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (questionTexts.has(normalized)) {
      duplicateQuestionsCount++;
      violations.push(`Duplicate question detected: "${q.question}"`);
    }
    questionTexts.add(normalized);
  }

  // 7. Fallback Identification
  if (prep.executionMode === 'deterministic') {
    if (!prep.executiveRoleBrief.includes('Simplified') && !prep.actualModel.includes('deterministic')) {
      violations.push('Deterministic fallback must be clearly identified as Simplified Interview Coaching.');
    }
  }

  const groundingRatio = totalCitations > 0 ? validCitations / totalCitations : 1.0;

  return {
    valid: violations.length === 0,
    violations,
    metrics: {
      evidenceCitationsCount: totalCitations,
      validCitationsCount: validCitations,
      unsupportedCitationsCount: unsupportedCitations,
      duplicateQuestionsCount,
      scoreBoundsValid,
      hasRequiredSections,
      groundingRatio,
    },
  };
}

/**
 * Validates a Mock Interview Session against scoring rubrics and grounding constraints.
 */
export function validateMockSessionGovernance(
  session: InterviewSession,
  candidate: CandidateProfile,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const validEvidenceIds = new Set((candidate.evidenceItems || []).map((e) => e.id));

  // 1. Overall Score Bounds (0 - 100)
  if (session.overallScore < 0 || session.overallScore > 100) {
    violations.push(`Session overall score ${session.overallScore} is out of bounds (0-100).`);
  }

  // 2. Per-Exchange Score Bounds (1 - 5)
  for (let i = 0; i < (session.exchanges || []).length; i++) {
    const ex = session.exchanges[i];
    const s = ex.score;
    if (!s) {
      violations.push(`Exchange ${i + 1} is missing score rubric.`);
      continue;
    }

    const dims: (keyof typeof s)[] = [
      'relevance',
      'evidenceSpecificity',
      'strategicDepth',
      'executiveCommunication',
      'structure',
      'concision',
    ];

    for (const dim of dims) {
      const val = s[dim];
      if (typeof val !== 'number' || val < 1 || val > 5) {
        violations.push(`Exchange ${i + 1} score dimension "${dim}" (${val}) is out of bounds (1-5).`);
      }
    }

    // 3. Evidence Citations in Exchange
    for (const eid of ex.evidenceCitations || []) {
      if (!validEvidenceIds.has(eid)) {
        violations.push(`Exchange ${i + 1} cited non-existent evidence ID "${eid}".`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
