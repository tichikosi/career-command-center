import { describe, it, expect } from 'vitest';
import { DeterministicSyntheticEngine } from '@/lib/engine';
import { CandidateProfile } from '@/types/candidate';
import { initialOpportunities } from '@/data/opportunities';
import {
  getAnalysisFreshness,
  resolveEvidenceForReportCitations,
  getAnalysisCandidateSubtitle,
} from '@/lib/candidateAdapter';
import { fixtureRole1AIStrategy } from '@/data/fixtures/role-1-ai-strategy';
import { alexVanceProfile } from '@/data/candidate';

describe('Candidate-Context Analysis Isolation & Grounding Unit Tests', () => {
  // Tanaka Ian Chikosi Real Executive Candidate Profile Fixture
  const tanakaProfile: CandidateProfile = {
    id: 'cand-user-tanaka-001',
    name: 'Tanaka Ian Chikosi',
    headline: 'AI GTM, Strategy & Operations Leader',
    location: 'San Francisco, CA',
    summary: 'Executive leader with 12+ years driving AI GTM strategy, operations, and enterprise governance.',
    targetRoles: ['Director of AI Strategy & Operations', 'VP Business Operations', 'Chief of Staff'],
    targetIndustries: ['Enterprise AI', 'Cloud Software', 'Venture Capital'],
    preferredLocations: ['San Francisco, CA', 'Remote'],
    coreCompetencies: ['AI Strategy', 'GTM Operations', 'RevOps', 'Executive Rhythms', 'Cross-Functional Leadership'],
    dataMode: 'user',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    careerHistory: [
      {
        id: 'role-google-01',
        company: 'Google',
        title: 'AI GTM Strategy & Operations Lead',
        location: 'San Francisco, CA',
        startDate: '2022',
        endDate: 'Present',
        isCurrent: true,
        summary: 'Led enterprise generative AI enablement and cross-functional operations across GTM teams.',
        skills: ['AI Strategy', 'GTM Operations', 'Enterprise Enablement'],
        evidenceItemIds: ['EVID-TANAKA-01', 'EVID-TANAKA-02'],
        sourceIds: ['source-resume-import'],
        displayOrder: 1,
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'role-dnx-01',
        company: 'DNX Ventures',
        title: 'EVP Operations & Portfolio Strategy',
        location: 'San Mateo, CA',
        startDate: '2019',
        endDate: '2022',
        isCurrent: false,
        summary: 'Directed operational portfolio governance and executive review rhythms.',
        skills: ['Executive Governance', 'Portfolio Operations'],
        evidenceItemIds: ['EVID-TANAKA-03'],
        sourceIds: ['source-resume-import'],
        displayOrder: 2,
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'role-meta-01',
        company: 'Meta',
        title: 'Operations Director',
        location: 'Menlo Park, CA',
        startDate: '2016',
        endDate: '2019',
        isCurrent: false,
        summary: 'Scaled strategic business operations across international divisions.',
        skills: ['Business Operations', 'Strategic Scale'],
        evidenceItemIds: ['EVID-TANAKA-04'],
        sourceIds: ['source-resume-import'],
        displayOrder: 3,
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
    ],
    evidenceItems: [
      {
        id: 'EVID-TANAKA-01',
        type: 'metric',
        title: 'Enterprise Pipeline Expansion',
        description: 'Scaled enterprise generative AI pipeline to $45M in qualified opportunity value.',
        metric: '$45M pipeline',
        organization: 'Google',
        roleId: 'role-google-01',
        skills: ['AI Strategy', 'GTM Operations'],
        tags: ['resume-import', 'google', 'ai-gtm'],
        verificationStatus: 'candidate-provided',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'EVID-TANAKA-02',
        type: 'achievement',
        title: 'AI Toolset Enablement Taskforce',
        description: 'Chaired cross-functional AI taskforce accelerating toolset rollout across 800+ team members.',
        metric: '800+ team members',
        organization: 'Google',
        roleId: 'role-google-01',
        skills: ['Enterprise Enablement', 'AI Strategy'],
        tags: ['resume-import', 'google'],
        verificationStatus: 'candidate-provided',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'EVID-TANAKA-03',
        type: 'metric',
        title: 'Portfolio Governance Cycle Compression',
        description: 'Compressed quarterly executive review cadence from 21 days down to 4 days.',
        metric: '4-day governance cadence',
        organization: 'DNX Ventures',
        roleId: 'role-dnx-01',
        skills: ['Executive Governance'],
        tags: ['resume-import', 'dnx-ventures'],
        verificationStatus: 'candidate-provided',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'EVID-TANAKA-04',
        type: 'metric',
        title: 'International Business Scale',
        description: 'Expanded operational coverage across EMEA and APAC with 30% efficiency improvement.',
        metric: '30% efficiency',
        organization: 'Meta',
        roleId: 'role-meta-01',
        skills: ['Business Operations'],
        tags: ['resume-import', 'meta'],
        verificationStatus: 'candidate-provided',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
    ],
  };

  const sampleVanguard = initialOpportunities.find((o) => o.id === 'opp-role-1-ai-strategy')!;
  const sampleScaleMetric = initialOpportunities.find((o) => o.id === 'opp-role-2-sales-ops')!;

  it('1. Alex Vance sample fixture exists and preserves benchmark metadata', () => {
    expect(sampleVanguard).toBeDefined();
    expect(sampleVanguard.title).toBe('Director of AI Strategy & Operations');
    expect(sampleVanguard.company).toBe('Vanguard Enterprise AI');
    expect(fixtureRole1AIStrategy.overallFitScore).toBe(91);
    expect(fixtureRole1AIStrategy.candidateProvenance?.candidateName).toBe('Alex Vance');
  });

  it('2, 3 & 4. Analyzing sample opportunity with active candidate Tanaka generates a fresh candidate-specific analysis', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
        sampleRoleId: sampleVanguard.id,
      },
      tanakaProfile
    );

    expect(report).toBeDefined();
    expect(report.candidateProvenance?.candidateName).toBe('Tanaka Ian Chikosi');
    expect(report.candidateProvenance?.candidateId).toBe('cand-user-tanaka-001');
    expect(report.candidateProvenance?.dataMode).toBe('user');
  });

  it('5. New analysis candidate snapshot belongs strictly to Tanaka', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
        sampleRoleId: sampleVanguard.id,
      },
      tanakaProfile
    );

    expect(report.candidateProvenance?.candidateName).toBe('Tanaka Ian Chikosi');
    expect(report.candidateProvenance?.candidateId).toBe('cand-user-tanaka-001');
    expect(report.evidenceSnapshot?.length).toBe(tanakaProfile.evidenceItems.length);
  });

  it('6. Legacy Alex Vance evidence and companies do NOT appear in Tanaka analysis', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
        sampleRoleId: sampleVanguard.id,
      },
      tanakaProfile
    );

    const fullReportJson = JSON.stringify(report);

    // Verify zero legacy Alex Vance artifact strings
    expect(fullReportJson).not.toContain('Nexus Global Operations');
    expect(fullReportJson).not.toContain('Horizon Tech');
    expect(fullReportJson).not.toContain('$14M ARR');
    expect(fullReportJson).not.toContain('450+ leaders');
    expect(fullReportJson).not.toContain('$25M GTM budget');
    expect(fullReportJson).not.toContain('EVID-2024-01');
    expect(fullReportJson).not.toContain('EVID-2024-05');

    // Verify presence of Tanaka's real employers & evidence
    expect(fullReportJson).toContain('Google');
    expect(fullReportJson).toContain('Tanaka Ian Chikosi');
  });

  it('7. Fit score is freshly computed from candidate qualifications', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
        sampleRoleId: sampleVanguard.id,
      },
      tanakaProfile
    );

    // Fit score must be a valid number between 0 and 100
    expect(typeof report.overallFitScore).toBe('number');
    expect(report.overallFitScore).toBeGreaterThanOrEqual(50);
    expect(report.overallFitScore).toBeLessThanOrEqual(100);
    expect(['Apply', 'Network First', 'Monitor', 'Deprioritize']).toContain(report.recommendation);
  });

  it('8. Current analysis evidence citation IDs resolve ONLY to Tanaka evidence records', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
        sampleRoleId: sampleVanguard.id,
      },
      tanakaProfile
    );

    const citationIds = report.qualifications.flatMap((q) => q.supportingEvidenceCitationIds);
    const validTanakaIds = new Set(tanakaProfile.evidenceItems.map((e) => e.id));

    citationIds.forEach((id) => {
      expect(validTanakaIds.has(id)).toBe(true);
    });

    const uniqueCitationIds = Array.from(new Set(citationIds));
    const resolved = resolveEvidenceForReportCitations(report, tanakaProfile, uniqueCitationIds);
    expect(resolved.length).toBe(uniqueCitationIds.length);
    resolved.forEach((item) => {
      expect(item.organization).toBeDefined();
      expect(['Google', 'DNX Ventures', 'Meta']).toContain(item.organization);
    });
  });

  it('9. Historical Alex Vance analysis can remain stored without becoming current for Tanaka', () => {
    // Legacy stored opportunity with Alex Vance analysis
    const legacyOppAnalysis = sampleVanguard.analysis;

    // Freshness check against Tanaka profile MUST return 'stale'
    const freshness = getAnalysisFreshness(legacyOppAnalysis, tanakaProfile);
    expect(freshness).toBe('stale');
  });

  it('10. Analyzing role does not mutate sample opportunity job description metadata', async () => {
    const originalJd = sampleVanguard.rawJobDescription;
    const originalCompany = sampleVanguard.company;
    const originalTitle = sampleVanguard.title;

    const engine = new DeterministicSyntheticEngine();
    await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
        sampleRoleId: sampleVanguard.id,
      },
      tanakaProfile
    );

    expect(sampleVanguard.rawJobDescription).toBe(originalJd);
    expect(sampleVanguard.company).toBe(originalCompany);
    expect(sampleVanguard.title).toBe(originalTitle);
  });

  it('11. Re-analysis creates a new snapshot with fresh provenance timestamp', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report1 = await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
      },
      tanakaProfile
    );

    expect(report1.candidateProvenance?.analyzedAt).toBeDefined();
    const freshness1 = getAnalysisFreshness(report1, tanakaProfile);
    expect(freshness1).toBe('current');
  });

  it('12. Stale-candidate report receives appropriate legacy/historical freshness treatment', () => {
    const staleReport = {
      ...sampleVanguard.analysis,
      candidateProvenance: {
        candidateId: alexVanceProfile.id,
        candidateName: alexVanceProfile.name,
        dataMode: 'synthetic' as const,
        profileUpdatedAt: alexVanceProfile.updatedAt,
        analyzedAt: '2026-07-20T10:00:00.000Z',
        provenanceStatus: 'known' as const,
      },
    };

    expect(getAnalysisFreshness(staleReport, tanakaProfile)).toBe('stale');
    expect(getAnalysisFreshness(staleReport, alexVanceProfile)).toBe('current');
  });

  it('13 & 14. Deterministic fallback for ScaleMetric is also grounded only in current candidate evidence', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: sampleScaleMetric.title,
        company: sampleScaleMetric.company,
        jobDescription: sampleScaleMetric.rawJobDescription,
        sampleRoleId: sampleScaleMetric.id,
      },
      tanakaProfile
    );

    expect(report.candidateProvenance?.candidateName).toBe('Tanaka Ian Chikosi');
    expect(JSON.stringify(report)).not.toContain('Horizon Tech');
    expect(JSON.stringify(report)).not.toContain('Nexus Global Operations');
    expect(JSON.stringify(report)).not.toContain('EVID-2024-');
    expect(JSON.stringify(report)).not.toContain('Alex Vance');
  });

  it('15. Dynamic subtitle renders candidate name for Tanaka Ian Chikosi analysis', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: sampleVanguard.title,
        company: sampleVanguard.company,
        jobDescription: sampleVanguard.rawJobDescription,
        sampleRoleId: sampleVanguard.id,
      },
      tanakaProfile
    );

    const subtitle = getAnalysisCandidateSubtitle(report, tanakaProfile);
    expect(subtitle).toBe("Line-item breakdown matching Tanaka Ian Chikosi's evidence against role specifications");
    expect(subtitle).not.toContain('Alex Vance');
  });

  it('16. Historical snapshot maintains original candidate name in subtitle regardless of active profile', () => {
    const alexReport = {
      ...sampleVanguard.analysis,
      candidateProvenance: {
        candidateId: alexVanceProfile.id,
        candidateName: 'Alex Vance',
        dataMode: 'synthetic' as const,
        profileUpdatedAt: alexVanceProfile.updatedAt,
        analyzedAt: '2026-07-20T10:00:00.000Z',
        provenanceStatus: 'known' as const,
      },
    };

    // Stored Alex Vance report viewed while Tanaka profile is active
    const subtitle = getAnalysisCandidateSubtitle(alexReport, tanakaProfile);
    expect(subtitle).toBe("Line-item breakdown matching Alex Vance's evidence against role specifications");
  });

  it('17. Subtitle gracefully uses neutral fallback when candidate identity is unavailable', () => {
    const emptyProfile: CandidateProfile = {
      id: 'cand-empty',
      name: '',
      headline: '',
      location: '',
      summary: '',
      targetRoles: [],
      targetIndustries: [],
      preferredLocations: [],
      coreCompetencies: [],
      careerHistory: [],
      education: [],
      certifications: [],
      evidenceItems: [],
      sources: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      dataMode: 'user',
    };

    const emptyReport = {
      ...sampleVanguard.analysis,
      candidateProvenance: undefined,
    };

    const subtitle = getAnalysisCandidateSubtitle(emptyReport, emptyProfile);
    expect(subtitle).toBe('Line-item breakdown matching candidate evidence against role specifications');
    expect(subtitle).not.toContain('Alex Vance');
  });
});
