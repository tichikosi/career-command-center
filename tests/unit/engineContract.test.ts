/**
 * Engine Contract & Benchmark Suite — Unit Tests
 *
 * Verifies the 5 Standard Benchmark Cases and Fallback Engine against:
 * 1. Schema Completeness: All 18 mandatory report sections populated
 * 2. Referential Integrity: Evidence citations map to candidate profile
 * 3. Score <-> Recommendation Consistency: Matches documented score ranges
 * 4. UI-State Coverage: All 4 match types and all 4 recommendations appear
 * 5. Input Boundary Handling: Min length, truncation, sanitization
 */

import { describe, it, expect } from 'vitest';
import { DeterministicSyntheticEngine } from '@/lib/engine';
import { defaultSyntheticCandidateProfile } from '@/data/candidate';
import { toAnalysisCandidate } from '@/lib/candidateAdapter';
import { sanitizeInput } from '@/lib/sanitize';
import { FitAnalysisReport } from '@/types/opportunity';

const BENCHMARK_ROLE_IDS = [
  'opp-role-1-ai-strategy',
  'opp-role-2-sales-ops',
  'opp-role-3-data-engineer',
  'opp-role-4-chief-of-staff',
  'opp-role-5-strategy-lead',
];

describe('Engine Contract — 18 Mandatory Sections', () => {
  const engine = new DeterministicSyntheticEngine();
  const candidate = toAnalysisCandidate(defaultSyntheticCandidateProfile);

  BENCHMARK_ROLE_IDS.forEach((roleId) => {
    it(`Benchmark Role "${roleId}" produces all 18 mandatory sections`, async () => {
      const report: FitAnalysisReport = await engine.analyzeRole(
        {
          jobTitle: 'Benchmark Test',
          company: 'Benchmark Co',
          jobDescription: 'A sufficiently long job description for testing purposes that exceeds fifty words to ensure valid evaluation by the deterministic engine. This text is specifically constructed to exceed the minimum threshold for word counts.',
          sampleRoleId: roleId,
        },
        candidate
      );

      // Section 1: Executive Summary
      expect(report.executiveSummary).toBeTruthy();
      expect(typeof report.executiveSummary).toBe('string');

      // Section 2: Likely Role Mandate
      expect(report.likelyMandate).toBeTruthy();
      expect(typeof report.likelyMandate).toBe('string');

      // Section 3: Key Requirements
      expect(Array.isArray(report.keyRequirements)).toBe(true);
      expect(report.keyRequirements.length).toBeGreaterThan(0);

      // Section 4: Required vs Preferred Qualifications
      expect(Array.isArray(report.qualifications)).toBe(true);
      expect(report.qualifications.length).toBeGreaterThan(0);
      const hasRequired = report.qualifications.some(q => q.category === 'Required');
      expect(hasRequired).toBe(true);

      // Section 5: Overall Fit Score
      expect(typeof report.overallFitScore).toBe('number');
      expect(report.overallFitScore).toBeGreaterThanOrEqual(0);
      expect(report.overallFitScore).toBeLessThanOrEqual(100);

      // Section 6: Explanation of Score
      expect(report.scoreExplanation).toBeTruthy();
      expect(typeof report.scoreExplanation).toBe('string');

      // Section 7, 8, 9, 11: Match Types (Strong, Partial, Gap, Unverified)
      report.qualifications.forEach(q => {
        expect(['Strong Match', 'Partial Match', 'Material Gap', 'Unverified']).toContain(q.matchType);
        expect(q.qualification).toBeTruthy();
        expect(q.explanation).toBeTruthy();
      });

      // Section 10: Supporting Candidate Evidence
      // Evidence citations must be arrays
      report.qualifications.forEach(q => {
        expect(Array.isArray(q.supportingEvidenceCitationIds)).toBe(true);
      });

      // Section 12: Likely Hiring Objections
      expect(Array.isArray(report.objections)).toBe(true);

      // Section 13: Recommended Action
      expect(['Apply', 'Network First', 'Monitor', 'Deprioritize']).toContain(report.recommendation);

      // Section 14: Positioning Narrative
      expect(report.positioningNarrative).toBeTruthy();
      expect(typeof report.positioningNarrative).toBe('string');

      // Section 15: Recruiter-Screen Questions
      expect(Array.isArray(report.recruiterQuestions)).toBe(true);
      expect(report.recruiterQuestions.length).toBeGreaterThan(0);

      // Section 16: Hiring-Manager Questions
      expect(Array.isArray(report.hiringManagerQuestions)).toBe(true);

      // Section 17: Recommended STAR Stories
      expect(Array.isArray(report.recommendedStarStories)).toBe(true);

      // Section 18: Next Actions
      expect(Array.isArray(report.nextActions)).toBe(true);
    });
  });
});

describe('Referential Integrity of Evidence Citations', () => {
  const engine = new DeterministicSyntheticEngine();
  const candidate = toAnalysisCandidate(defaultSyntheticCandidateProfile);

  // Build a set of all valid citation tags and IDs from candidate profile
  const validCitationTags = new Set<string>();
  defaultSyntheticCandidateProfile.evidenceItems.forEach(ev => {
    validCitationTags.add(ev.id);
    if (Array.isArray(ev.tags)) {
      ev.tags.forEach(t => validCitationTags.add(t));
    }
  });

  BENCHMARK_ROLE_IDS.forEach((roleId) => {
    it(`Benchmark Role "${roleId}" citations exist in candidate profile`, async () => {
      const report = await engine.analyzeRole(
        {
          jobTitle: 'Citations Test',
          company: 'Citations Co',
          jobDescription: 'Job description text with more than fifty words to satisfy minimum length requirements. Adding extra sentences here to ensure we cross the boundary easily.',
          sampleRoleId: roleId,
        },
        candidate
      );

      // Check all qualification citations
      report.qualifications.forEach(q => {
        q.supportingEvidenceCitationIds.forEach(citationId => {
          expect(validCitationTags.has(citationId)).toBe(true);
        });
      });

      // Check STAR story citations
      report.recommendedStarStories.forEach(star => {
        star.citationIds.forEach(citationId => {
          expect(validCitationTags.has(citationId)).toBe(true);
        });
      });
    });
  });
});

describe('Score to Recommendation Consistency', () => {
  const engine = new DeterministicSyntheticEngine();
  const candidate = toAnalysisCandidate(defaultSyntheticCandidateProfile);

  it('Benchmark 1 (AI Strategy) is Apply (>=85%)', async () => {
    const report = await engine.analyzeRole(
      { jobTitle: 'AI', company: 'Co', jobDescription: 'Text of sufficient length for test', sampleRoleId: 'opp-role-1-ai-strategy' },
      candidate
    );
    expect(report.overallFitScore).toBeGreaterThanOrEqual(85);
    expect(report.recommendation).toBe('Apply');
  });

  it('Benchmark 2 (Sales Ops) is Network First (70-84%)', async () => {
    const report = await engine.analyzeRole(
      { jobTitle: 'Sales', company: 'Co', jobDescription: 'Text of sufficient length for test', sampleRoleId: 'opp-role-2-sales-ops' },
      candidate
    );
    expect(report.overallFitScore).toBeGreaterThanOrEqual(70);
    expect(report.overallFitScore).toBeLessThan(85);
    expect(report.recommendation).toBe('Network First');
  });

  it('Benchmark 3 (Data Engineer) is Deprioritize (<50%)', async () => {
    const report = await engine.analyzeRole(
      { jobTitle: 'Data Eng', company: 'Co', jobDescription: 'Text of sufficient length for test', sampleRoleId: 'opp-role-3-data-engineer' },
      candidate
    );
    expect(report.overallFitScore).toBeLessThan(50);
    expect(report.recommendation).toBe('Deprioritize');
  });

  it('Benchmark 4 (Chief of Staff) is Apply (>=85%)', async () => {
    const report = await engine.analyzeRole(
      { jobTitle: 'CoS', company: 'Co', jobDescription: 'Text of sufficient length for test', sampleRoleId: 'opp-role-4-chief-of-staff' },
      candidate
    );
    expect(report.overallFitScore).toBeGreaterThanOrEqual(85);
    expect(report.recommendation).toBe('Apply');
  });

  it('Benchmark 5 (Strategy Lead) is Monitor (50-69%)', async () => {
    const report = await engine.analyzeRole(
      { jobTitle: 'Strat', company: 'Co', jobDescription: 'Text of sufficient length for test', sampleRoleId: 'opp-role-5-strategy-lead' },
      candidate
    );
    expect(report.overallFitScore).toBeGreaterThanOrEqual(50);
    expect(report.overallFitScore).toBeLessThan(70);
    expect(report.recommendation).toBe('Monitor');
  });
});

describe('UI State Coverage across Benchmark Suite', () => {
  const engine = new DeterministicSyntheticEngine();
  const candidate = toAnalysisCandidate(defaultSyntheticCandidateProfile);

  it('all 4 match types and all 4 recommendations appear across benchmarks', async () => {
    const reports = await Promise.all(
      BENCHMARK_ROLE_IDS.map(roleId =>
        engine.analyzeRole(
          { jobTitle: 'Test', company: 'Co', jobDescription: 'Long description text', sampleRoleId: roleId },
          candidate
        )
      )
    );

    const matchTypes = new Set<string>();
    const recommendations = new Set<string>();

    reports.forEach(r => {
      recommendations.add(r.recommendation);
      r.qualifications.forEach(q => matchTypes.add(q.matchType));
    });

    expect(matchTypes.has('Strong Match')).toBe(true);
    expect(matchTypes.has('Partial Match')).toBe(true);
    expect(matchTypes.has('Material Gap')).toBe(true);
    expect(matchTypes.has('Unverified')).toBe(true);

    expect(recommendations.has('Apply')).toBe(true);
    expect(recommendations.has('Network First')).toBe(true);
    expect(recommendations.has('Monitor')).toBe(true);
    expect(recommendations.has('Deprioritize')).toBe(true);
  });
});

describe('Input Boundary & Sanitization Handling', () => {
  it('strips script tags and malicious HTML', () => {
    const malicious = '<script>alert("xss")</script><p>Clean text</p>';
    const result = sanitizeInput(malicious);
    expect(result.sanitizedText).not.toContain('<script>');
    expect(result.sanitizedText).not.toContain('</script>');
    expect(result.sanitizedText).toContain('Clean text');
  });

  it('truncates text exceeding 15,000 characters', () => {
    const longText = 'a '.repeat(10000); // 20,000 chars
    const result = sanitizeInput(longText);
    expect(result.sanitizedText.length).toBeLessThanOrEqual(15000);
    expect(result.sanitizedText.length).toBe(15000);
  });

  it('handles empty input gracefully', () => {
    const result = sanitizeInput('');
    expect(result.sanitizedText).toBe('');
    expect(result.isValid).toBe(false);
    expect(result.wordCount).toBe(0);
  });

  it('fallback engine generates a valid report for custom text', async () => {
    const engine = new DeterministicSyntheticEngine();
    const candidate = toAnalysisCandidate(defaultSyntheticCandidateProfile);

    const report = await engine.analyzeRole(
      {
        jobTitle: 'Custom Strategy Director',
        company: 'CustomCorp',
        jobDescription: 'Looking for a Director of Strategy with experience in revenue operations, enterprise AI enablement, GTM strategy, cross-functional leadership, and scaling business units.',
      },
      candidate
    );

    expect(report.isFallbackAnalysis).toBe(true);
    expect(report.executiveSummary).toBeTruthy();
    expect(report.qualifications.length).toBeGreaterThan(0);
    expect(typeof report.overallFitScore).toBe('number');
  });
});
