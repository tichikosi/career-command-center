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
  classifyResumeIdentity,
  reconcileResumeUpdateIntoProfile,
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

describe('classifyResumeIdentity', () => {
  it('classifies demo profile as demo-candidate with replacement recommended', () => {
    const demoProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      name: 'Alex Vance',
      dataMode: 'synthetic',
    };

    const extraction = {
      name: 'Tanaka Ian Chikosi',
      careerHistory: [{ company: 'Google', title: 'AI GTM Lead' }],
    };

    const summary = classifyResumeIdentity(demoProfile, extraction);
    expect(summary.classification).toBe('demo-candidate');
    expect(summary.confidenceScore).toBe(1.0);
  });

  it('classifies same real person with matching name and employer overlap', () => {
    const activeProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      name: 'Tanaka Ian Chikosi',
      dataMode: 'user',
      careerHistory: [
        {
          id: 'role-1',
          company: 'Google',
          title: 'AI GTM Strategy & Operations',
          location: 'SF',
          startDate: '2022',
          endDate: 'Present',
          isCurrent: true,
          summary: '',
          skills: [],
          evidenceItemIds: ['evid-1'],
          createdAt: '',
          updatedAt: '',
        },
      ],
    };

    const newResumeExtraction = {
      name: 'Tanaka Ian Chikosi',
      careerHistory: [
        {
          company: 'Google',
          title: 'AI GTM Strategy & Operations Lead',
          startDate: '2022',
          endDate: 'Present',
          isCurrent: true,
          accomplishments: [{ description: 'Scaled enterprise pipeline to $45M', metric: '$45M' }],
        },
      ],
    };

    const summary = classifyResumeIdentity(activeProfile, newResumeExtraction);
    expect(summary.classification).toBe('same-person');
    expect(summary.nameMatch).toBe(true);
    expect(summary.employerOverlapCount).toBeGreaterThanOrEqual(1);
    expect(summary.matchingEmployerNames).toContain('Google');
  });

  it('classifies clear different person with warning', () => {
    const activeProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      name: 'Tanaka Ian Chikosi',
      dataMode: 'user',
      careerHistory: [
        {
          id: 'role-1',
          company: 'Google',
          title: 'AI GTM Lead',
          location: 'SF',
          startDate: '2022',
          endDate: 'Present',
          summary: '',
          skills: [],
          evidenceItemIds: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
    };

    const differentPersonExtraction = {
      name: 'Sarah Connor',
      careerHistory: [{ company: 'Cyberdyne Systems', title: 'Security Consultant' }],
    };

    const summary = classifyResumeIdentity(activeProfile, differentPersonExtraction);
    expect(summary.classification).toBe('different-person');
    expect(summary.nameMatch).toBe(false);
    expect(summary.employerOverlapCount).toBe(0);
  });

  it('classifies ambiguous identity when names conflict but employers overlap', () => {
    const activeProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      name: 'Tanaka Chikosi',
      dataMode: 'user',
      careerHistory: [
        {
          id: 'role-1',
          company: 'Google',
          title: 'Strategy Lead',
          location: 'SF',
          startDate: '2022',
          endDate: 'Present',
          summary: '',
          skills: [],
          evidenceItemIds: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'role-2',
          company: 'Meta',
          title: 'Operations Director',
          location: 'Menlo Park',
          startDate: '2018',
          endDate: '2022',
          summary: '',
          skills: [],
          evidenceItemIds: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
    };

    const ambiguousExtraction = {
      name: 'John Doe',
      careerHistory: [
        { company: 'Google', title: 'Engineer' },
        { company: 'Meta', title: 'Manager' },
      ],
    };

    const summary = classifyResumeIdentity(activeProfile, ambiguousExtraction);
    expect(summary.classification).toBe('ambiguous');
  });
});

describe('reconcileResumeUpdateIntoProfile', () => {
  it('reconciles existing roles by company/title without creating duplicate roles', () => {
    const activeProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      name: 'Tanaka Ian Chikosi',
      dataMode: 'user',
      careerHistory: [
        {
          id: 'role-existing-google',
          company: 'Google',
          title: 'AI GTM Strategy',
          location: 'San Francisco, CA',
          startDate: '2022',
          endDate: 'Present',
          isCurrent: true,
          summary: 'Original Google summary',
          skills: ['AI Strategy'],
          evidenceItemIds: ['evid-google-1'],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      evidenceItems: [
        {
          id: 'evid-google-1',
          type: 'metric',
          title: 'Original Metric',
          description: 'Original achievement description',
          metric: '$30M',
          organization: 'Google',
          roleId: 'role-existing-google',
          skills: ['AI Strategy'],
          tags: ['resume-import'],
          verificationStatus: 'candidate-provided',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
    };

    const newResume = {
      name: 'Tanaka Ian Chikosi',
      careerHistory: [
        {
          company: 'Google',
          title: 'AI GTM Strategy & Operations Lead',
          startDate: '2022',
          endDate: 'Present',
          isCurrent: true,
          accomplishments: [
            {
              description: 'Scaled cross-functional matrix across 12 divisions with 40% efficiency gains',
              metric: '40% efficiency',
            },
          ],
        },
      ],
    };

    const { profile: updated, summary } = reconcileResumeUpdateIntoProfile(activeProfile, newResume);

    // Should NOT create duplicate Google roles
    expect(updated.careerHistory.filter((r) => r.company.toLowerCase().includes('google'))).toHaveLength(1);
    expect(updated.careerHistory[0].id).toBe('role-existing-google'); // Persistent ID preserved!
    expect(summary.reconciledRolesCount).toBe(1);
    expect(summary.newRolesCount).toBe(0);

    // New achievement added into evidence library linked to the same role
    expect(updated.evidenceItems.length).toBe(2);
    expect(updated.evidenceItems.some((e) => e.metric === '40% efficiency')).toBe(true);
    expect(updated.evidenceItems.some((e) => e.id === 'evid-google-1')).toBe(true); // Historical preserved!
  });

  it('strictly preserves historical evidence omitted from the new resume (zero-deletion rule)', () => {
    const activeProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      name: 'Tanaka Ian Chikosi',
      dataMode: 'user',
      careerHistory: [
        {
          id: 'role-dnx',
          company: 'DNX Ventures',
          title: 'EVP Operations',
          location: 'SF',
          startDate: '2019',
          endDate: '2022',
          isCurrent: false,
          summary: '',
          skills: [],
          evidenceItemIds: ['evid-dnx-1', 'evid-dnx-2'],
          createdAt: '',
          updatedAt: '',
        },
      ],
      evidenceItems: [
        {
          id: 'evid-dnx-1',
          type: 'metric',
          title: 'DNX Governance',
          description: 'Improved portfolio governance cycles from 21 days down to 4 days',
          metric: '4 days',
          organization: 'DNX Ventures',
          roleId: 'role-dnx',
          skills: [],
          tags: ['resume-import'],
          verificationStatus: 'candidate-provided',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'evid-dnx-2',
          type: 'achievement',
          title: 'Historical Omitted Fact',
          description: 'Omitted from 2-page executive summary',
          organization: 'DNX Ventures',
          roleId: 'role-dnx',
          skills: [],
          tags: ['historical'],
          verificationStatus: 'candidate-provided',
          createdAt: '',
          updatedAt: '',
        },
      ],
    };

    // New resume only lists 1 accomplishment for DNX
    const newResume = {
      name: 'Tanaka Ian Chikosi',
      careerHistory: [
        {
          company: 'DNX Ventures',
          title: 'EVP Operations',
          startDate: '2019',
          endDate: '2022',
          accomplishments: [
            { description: 'Updated governance rhythm text', metric: '4 days' },
          ],
        },
      ],
    };

    const { profile: updated } = reconcileResumeUpdateIntoProfile(activeProfile, newResume);

    // Both historical evidence items remain in evidence library
    expect(updated.evidenceItems.some((e) => e.id === 'evid-dnx-1')).toBe(true);
    expect(updated.evidenceItems.some((e) => e.id === 'evid-dnx-2')).toBe(true);
  });

  it('strictly preserves user strategy fields and never overwrites/infers work authorization', () => {
    const activeProfile: CandidateProfile = {
      ...TEST_CANDIDATE_PROFILE,
      name: 'Tanaka Ian Chikosi',
      targetRoles: ['Chief of Staff', 'VP AI Strategy'],
      targetIndustries: ['Enterprise AI', 'Cloud Infrastructure'],
      preferredLocations: ['San Francisco, CA', 'Remote'],
      workAuthorization: 'US Citizen',
      workAuthorizationDetails: {
        status: 'us-citizen',
        sponsorshipRequiredNow: false,
        sponsorshipRequiredFuture: false,
      },
      compensationPreferences: {
        currency: 'USD',
        baseSalaryMin: 280000,
        baseSalaryMax: 350000,
        bonusPreference: 'preferred',
        equityPreference: 'required',
      },
    };

    const newResume = {
      name: 'Tanaka Ian Chikosi',
      headline: 'Executive Director',
      targetRoles: ['Temporary Parsed Role'], // should NOT overwrite user targetRoles
      targetIndustries: ['Software'],
      preferredLocations: ['New York'],
      careerHistory: [{ company: 'Google', title: 'Director' }],
    };

    const { profile: updated } = reconcileResumeUpdateIntoProfile(activeProfile, newResume);

    // User-controlled strategy and authorization fields are completely protected
    expect(updated.workAuthorization).toBe('US Citizen');
    expect(updated.workAuthorizationDetails?.status).toBe('us-citizen');
    expect(updated.targetRoles).toEqual(['Chief of Staff', 'VP AI Strategy']);
    expect(updated.targetIndustries).toEqual(['Enterprise AI', 'Cloud Infrastructure']);
    expect(updated.preferredLocations).toEqual(['San Francisco, CA', 'Remote']);
    expect(updated.compensationPreferences?.baseSalaryMin).toBe(280000);
  });
});
