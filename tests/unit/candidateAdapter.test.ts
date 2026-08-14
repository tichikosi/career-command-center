/**
 * Candidate Adapter — Unit Tests
 *
 * Tests evidence eligibility, career role deletion,
 * analysis freshness, and report evidence resolution.
 */

import { describe, it, expect } from 'vitest';
import {
  getEligibleEvidenceForAnalysis,
  deleteCareerRoleFromProfile,
  getAnalysisFreshness,
  collectReferencedEvidence,
  moveCareerRole,
  getOrderedCareerRoles,
  getEvidenceLinkedToRole,
} from '@/lib/candidateAdapter';
import { TEST_CANDIDATE_PROFILE } from '../fixtures/test-data';
import { CandidateProfile } from '@/types/candidate';
import { FitAnalysisReport, CandidateProvenance } from '@/types/opportunity';

describe('getEligibleEvidenceForAnalysis', () => {
  it('returns only evidence linked to existing career roles', () => {
    const eligible = getEligibleEvidenceForAnalysis(TEST_CANDIDATE_PROFILE);
    // Should include items with roleId matching existing roles
    eligible.forEach(item => {
      expect(item.roleId).toBeDefined();
      const roleExists = TEST_CANDIDATE_PROFILE.careerHistory.some(r => r.id === item.roleId);
      expect(roleExists).toBe(true);
    });
  });

  it('excludes unassigned evidence (no roleId)', () => {
    const eligible = getEligibleEvidenceForAnalysis(TEST_CANDIDATE_PROFILE);
    const unassigned = eligible.filter(e => !e.roleId);
    expect(unassigned).toHaveLength(0);
  });

  it('handles null profile', () => {
    expect(getEligibleEvidenceForAnalysis(null)).toEqual([]);
  });

  it('handles profile with no career history', () => {
    const emptyProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      careerHistory: [],
    };
    expect(getEligibleEvidenceForAnalysis(emptyProfile)).toEqual([]);
  });
});

describe('deleteCareerRoleFromProfile', () => {
  it('removes the role from careerHistory', () => {
    const updated = deleteCareerRoleFromProfile(
      TEST_CANDIDATE_PROFILE,
      'role-test-001',
      '2026-08-01T00:00:00.000Z'
    );
    expect(updated.careerHistory.find(r => r.id === 'role-test-001')).toBeUndefined();
    expect(updated.careerHistory.length).toBe(TEST_CANDIDATE_PROFILE.careerHistory.length - 1);
  });

  it('unassigns evidence linked to the deleted role', () => {
    const updated = deleteCareerRoleFromProfile(
      TEST_CANDIDATE_PROFILE,
      'role-test-001',
      '2026-08-01T00:00:00.000Z'
    );
    const previouslyLinked = updated.evidenceItems.filter(
      e => TEST_CANDIDATE_PROFILE.evidenceItems.some(
        orig => orig.id === e.id && orig.roleId === 'role-test-001'
      )
    );
    previouslyLinked.forEach(ev => {
      expect(ev.roleId).toBeUndefined();
    });
  });

  it('does NOT delete the evidence items themselves', () => {
    const updated = deleteCareerRoleFromProfile(
      TEST_CANDIDATE_PROFILE,
      'role-test-001',
      '2026-08-01T00:00:00.000Z'
    );
    // Evidence count should remain the same
    expect(updated.evidenceItems.length).toBe(TEST_CANDIDATE_PROFILE.evidenceItems.length);
  });

  it('evidence IDs remain stable after deletion', () => {
    const updated = deleteCareerRoleFromProfile(
      TEST_CANDIDATE_PROFILE,
      'role-test-001',
      '2026-08-01T00:00:00.000Z'
    );
    const originalIds = new Set(TEST_CANDIDATE_PROFILE.evidenceItems.map(e => e.id));
    const updatedIds = new Set(updated.evidenceItems.map(e => e.id));
    expect(updatedIds).toEqual(originalIds);
  });

  it('sets dataMode to user after deletion', () => {
    const updated = deleteCareerRoleFromProfile(
      TEST_CANDIDATE_PROFILE,
      'role-test-001',
      '2026-08-01T00:00:00.000Z'
    );
    expect(updated.dataMode).toBe('user');
  });

  it('handles deleting a non-existent role gracefully', () => {
    const result = deleteCareerRoleFromProfile(
      TEST_CANDIDATE_PROFILE,
      'non-existent-role',
      '2026-08-01T00:00:00.000Z'
    );
    expect(result).toBe(TEST_CANDIDATE_PROFILE); // Same reference
  });
});

describe('getAnalysisFreshness', () => {
  const makeProvenance = (overrides: Partial<CandidateProvenance> = {}): CandidateProvenance => ({
    candidateId: 'cand-test-v1',
    candidateName: 'Test Candidate',
    dataMode: 'synthetic',
    profileUpdatedAt: '2026-01-01T00:00:00.000Z',
    analyzedAt: '2026-07-01T00:00:00.000Z',
    provenanceStatus: 'known',
    ...overrides,
  });

  const makeReport = (provenance?: CandidateProvenance): FitAnalysisReport => ({
    executiveSummary: '',
    likelyMandate: '',
    keyRequirements: [],
    overallFitScore: 85,
    scoreExplanation: '',
    recommendation: 'Apply',
    positioningNarrative: '',
    qualifications: [],
    objections: [],
    recruiterQuestions: [],
    hiringManagerQuestions: [],
    recommendedStarStories: [],
    nextActions: [],
    candidateProvenance: provenance,
  });

  it('returns "unknown" when provenance is missing', () => {
    expect(getAnalysisFreshness(makeReport(undefined), TEST_CANDIDATE_PROFILE)).toBe('unknown');
  });

  it('returns "current" when candidate IDs match and both are synthetic', () => {
    const provenance = makeProvenance();
    expect(getAnalysisFreshness(makeReport(provenance), TEST_CANDIDATE_PROFILE)).toBe('current');
  });

  it('returns "stale" when candidate IDs differ', () => {
    const provenance = makeProvenance({ candidateId: 'different-candidate' });
    expect(getAnalysisFreshness(makeReport(provenance), TEST_CANDIDATE_PROFILE)).toBe('stale');
  });

  it('returns "stale" when data modes differ', () => {
    const provenance = makeProvenance({ dataMode: 'user' });
    expect(getAnalysisFreshness(makeReport(provenance), TEST_CANDIDATE_PROFILE)).toBe('stale');
  });

  it('returns "unknown" for legacy reports without candidateId', () => {
    const provenance = makeProvenance({ candidateId: null, provenanceStatus: 'unknown' });
    expect(getAnalysisFreshness(makeReport(provenance), TEST_CANDIDATE_PROFILE)).toBe('unknown');
  });
});

describe('collectReferencedEvidence', () => {
  it('collects evidence referenced by qualifications', () => {
    const report = {
      qualifications: [
        { supportingEvidenceCitationIds: ['EVID-2024-01'] },
      ],
    };
    const collected = collectReferencedEvidence(TEST_CANDIDATE_PROFILE, report);
    expect(collected.length).toBeGreaterThan(0);
    expect(collected.some(e => e.tags?.includes('EVID-2024-01'))).toBe(true);
  });

  it('returns empty array for empty report', () => {
    const collected = collectReferencedEvidence(TEST_CANDIDATE_PROFILE, {});
    expect(collected).toEqual([]);
  });

  it('deduplicates evidence items', () => {
    const report = {
      qualifications: [
        { supportingEvidenceCitationIds: ['EVID-2024-01'] },
        { supportingEvidenceCitationIds: ['EVID-2024-01'] },
      ],
    };
    const collected = collectReferencedEvidence(TEST_CANDIDATE_PROFILE, report);
    const ids = collected.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('moveCareerRole', () => {
  it('swaps display order when moving up', () => {
    const result = moveCareerRole(TEST_CANDIDATE_PROFILE.careerHistory, 'role-test-002', 'up');
    const ordered = getOrderedCareerRoles(result);
    expect(ordered[0].id).toBe('role-test-002');
    expect(ordered[1].id).toBe('role-test-001');
  });

  it('swaps display order when moving down', () => {
    const result = moveCareerRole(TEST_CANDIDATE_PROFILE.careerHistory, 'role-test-001', 'down');
    const ordered = getOrderedCareerRoles(result);
    expect(ordered[0].id).toBe('role-test-002');
    expect(ordered[1].id).toBe('role-test-001');
  });

  it('returns same array when moving first role up', () => {
    const result = moveCareerRole(TEST_CANDIDATE_PROFILE.careerHistory, 'role-test-001', 'up');
    const ordered = getOrderedCareerRoles(result);
    expect(ordered[0].id).toBe('role-test-001');
  });

  it('returns same array when moving last role down', () => {
    const result = moveCareerRole(TEST_CANDIDATE_PROFILE.careerHistory, 'role-test-002', 'down');
    const ordered = getOrderedCareerRoles(result);
    expect(ordered[1].id).toBe('role-test-002');
  });
});

describe('getEvidenceLinkedToRole', () => {
  it('returns evidence linked to a specific role', () => {
    const evidence = getEvidenceLinkedToRole(TEST_CANDIDATE_PROFILE, 'role-test-001');
    expect(evidence.length).toBe(2);
    evidence.forEach(e => {
      expect(e.roleId).toBe('role-test-001');
    });
  });

  it('returns empty for non-existent role', () => {
    expect(getEvidenceLinkedToRole(TEST_CANDIDATE_PROFILE, 'non-existent')).toEqual([]);
  });

  it('returns empty for null profile', () => {
    expect(getEvidenceLinkedToRole(null, 'role-test-001')).toEqual([]);
  });
});
