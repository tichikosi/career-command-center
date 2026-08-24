import { describe, it, expect } from 'vitest';
import { extractJobRequirements } from '@/lib/requirementExtractor';
import { DeterministicSyntheticEngine } from '@/lib/engine';
import { CandidateProfile } from '@/types/candidate';

describe('Fit Score Quality & Requirement Independence', () => {
  const sampleJd = `
Role: Senior Director, AI GTM Strategy & Operations
Company: ScaleMetric Technologies
Location: San Francisco, CA

About the Role:
ScaleMetric is hiring a Senior Director to lead our Enterprise AI GTM motions and RevOps scaling.

Minimum Qualifications:
- 8+ years of experience leading GTM strategy, RevOps, and enterprise sales pipeline execution.
- Proven track record scaling revenue operations and driving cross-functional alignment.
- Hands-on experience with Enterprise AI enablement, automation toolsets, and technology adoption.
- Executive stakeholder management and board presentation experience.

Preferred Qualifications:
- Advanced degree (MBA or equivalent quantitative master's).
- Prior experience in high-growth venture-backed or scale-up technology companies.
`;

  const tanakaProfile: CandidateProfile = {
    id: 'cand-tanaka-test',
    name: 'Tanaka Ian Chikosi',
    headline: 'AI GTM, Strategy & Operations Leader',
    location: 'San Francisco, CA',
    summary: 'Executive leader with 12+ years driving AI GTM strategy, operations, and enterprise governance.',
    targetRoles: ['Director of AI Strategy & Operations', 'VP Business Operations', 'Chief of Staff'],
    targetIndustries: ['Enterprise AI', 'Cloud Software', 'Venture Capital'],
    preferredLocations: ['San Francisco, CA', 'Remote'],
    coreCompetencies: ['AI Strategy', 'GTM Operations', 'RevOps', 'Executive Rhythms', 'Cross-Functional Leadership'],
    dataMode: 'user',
    careerHistory: [
      {
        id: 'role-google',
        company: 'Google',
        title: 'AI GTM Strategy & Operations Lead',
        startDate: '2022-01',
        endDate: 'Present',
        summary: 'Led enterprise generative AI enablement and cross-functional operations across global GTM teams.',
        skills: ['AI Strategy', 'GTM Operations', 'Enterprise Enablement'],
        evidenceItemIds: ['ev-1', 'ev-2'],
      },
      {
        id: 'role-dnx',
        company: 'DNX Ventures',
        title: 'EVP Operations & Portfolio Strategy',
        startDate: '2019-01',
        endDate: '2022-01',
        summary: 'Directed operational portfolio governance, capital allocation, and executive review rhythms.',
        skills: ['Executive Governance', 'Portfolio Operations'],
        evidenceItemIds: ['ev-3', 'ev-4'],
      },
    ],
    education: [],
    certifications: [],
    evidenceItems: [
      {
        id: 'ev-1',
        title: 'Enterprise AI Enablement',
        organization: 'Google',
        description: 'Architected and rolled out Generative AI enablement playbooks and operational tooling across Google enterprise sales.',
        metric: '2,500+ sellers enabled with 42% faster ramp',
        skills: ['AI Strategy', 'Automation', 'Enterprise Enablement'],
        tags: ['EVID-IMP-01'],
      },
      {
        id: 'ev-2',
        title: 'GTM Pipeline & Executive Rhythms',
        organization: 'Google',
        description: 'Streamlined quarterly executive strategy reviews and sales pipeline governance managing operational program budgets.',
        metric: 'Compressed cycle time by 40% with $25M budget managed',
        skills: ['GTM Operations', 'RevOps', 'Executive Rhythms', 'Budget Management'],
        tags: ['EVID-IMP-02'],
      },
      {
        id: 'ev-3',
        title: 'Portfolio Scale & Governance',
        organization: 'DNX Ventures',
        description: 'Managed operational frameworks, scaling teams, and budget governance for 30+ enterprise software companies.',
        metric: '$85M in capital deployment oversight',
        skills: ['Portfolio Operations', 'Governance', 'Budget Oversight', 'Team Scaling'],
        tags: ['EVID-IMP-03'],
      },
      {
        id: 'ev-4',
        title: 'Hypergrowth Scale-up Operations',
        organization: 'DNX Ventures',
        description: 'Scaled venture-backed scale-up startups from Series A through growth stage.',
        metric: '12 portfolio companies accelerated',
        skills: ['Scale-up', 'Hypergrowth', 'Operations'],
        tags: ['EVID-IMP-04'],
      },
    ],
    sources: [],
    updatedAt: '2026-08-14T00:00:00.000Z',
  };

  it('1. extracts structured requirements independently from Job Description alone', () => {
    const extracted = extractJobRequirements(sampleJd, 'Senior Director, AI GTM Strategy & Operations');

    expect(extracted).toBeDefined();
    expect(Array.isArray(extracted.requiredQualifications)).toBe(true);
    expect(extracted.requiredQualifications.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(extracted.preferredQualifications)).toBe(true);
    expect(extracted.preferredQualifications.length).toBeGreaterThanOrEqual(1);

    // Verify keyword extraction
    const gtmReq = extracted.requiredQualifications.find((q) =>
      q.keywords.includes('gtm') || q.keywords.includes('revops')
    );
    expect(gtmReq).toBeDefined();

    const aiReq = extracted.requiredQualifications.find((q) =>
      q.keywords.includes('ai') || q.keywords.includes('automation')
    );
    expect(aiReq).toBeDefined();
  });

  it('2. produces the exact same frozen requirements regardless of candidate identity', () => {
    const reqs1 = extractJobRequirements(sampleJd, 'Director Role');
    const reqs2 = extractJobRequirements(sampleJd, 'Director Role');

    expect(reqs1.requiredQualifications.map((r) => r.text)).toEqual(
      reqs2.requiredQualifications.map((r) => r.text)
    );
    expect(reqs1.preferredQualifications.map((r) => r.text)).toEqual(
      reqs2.preferredQualifications.map((r) => r.text)
    );
  });

  it('3. evaluates candidate profile strictly against frozen requirements', async () => {
    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: 'Senior Director, AI GTM Strategy & Operations',
        company: 'ScaleMetric Technologies',
        jobDescription: sampleJd,
      },
      tanakaProfile
    );

    expect(report).toBeDefined();
    expect(typeof report.overallFitScore).toBe('number');
    expect(report.overallFitScore).toBeGreaterThanOrEqual(70);
    expect(['Apply', 'Network First']).toContain(report.recommendation);

    // Verify qualifications are grounded in candidate evidence
    const strongMatches = report.qualifications.filter((q) => q.matchType === 'Strong Match');
    expect(strongMatches.length).toBeGreaterThan(0);
    for (const match of strongMatches) {
      expect(match.supportingEvidenceCitationIds.length).toBeGreaterThan(0);
      expect(match.supportingEvidenceCitationIds.every((id) => ['ev-1', 'ev-2', 'ev-3', 'ev-4'].includes(id))).toBe(true);
    }

    // Verify candidate provenance
    expect(report.candidateProvenance?.candidateName).toBe('Tanaka Ian Chikosi');
    expect(report.candidateProvenance?.candidateId).toBe('cand-tanaka-test');
  });

  it('4. demonstrates clear ordinal score separation across Positive, Middle, and Negative controls', async () => {
    const engine = new DeterministicSyntheticEngine();

    const positiveControlJd = `
Role: Director of AI Strategy & GTM Operations
Company: Anthropic
Location: San Francisco, CA

Minimum Qualifications:
- 10+ years in technology strategy, operations, or enterprise GTM leadership.
- Demonstrated success scaling AI initiatives, enablement playbooks, and operational frameworks.
- Strong executive communication, executive review rhythms, and cross-functional matrixed leadership.
- Experience managing operational program budgets and scaling teams.

Preferred Qualifications:
- Experience operating in hypergrowth venture-backed or scale-up AI technology environments.
- Master's or MBA degree.
`;

    const middleControlJd = `
Role: Director of Product Marketing & Strategic Enablement
Company: CoreInfrastructure Inc
Location: San Francisco, CA

Minimum Qualifications:
- 10+ years in technology leadership, executive communication, and cross-functional operations.
- Experience managing operational program budgets and matrixed stakeholder alignment.
- Deep hands-on experience authoring technical developer whitepapers and infrastructure benchmarking guides.
- Hands-on technical product marketing (PMM) for distributed storage engines (Ceph, MinIO).

Preferred Qualifications:
- Experience operating in hypergrowth venture-backed or scale-up technology companies.
- Technical degree in Computer Science or Electrical Engineering.
`;

    const negativeControlJd = `
Role: Principal Machine Learning Systems Engineer
Company: DeepScale AI
Location: Sunnyvale, CA

Minimum Qualifications:
- 8+ years hands-on production software engineering in C++, CUDA, Python, and Go.
- Deep expertise in distributed deep learning training frameworks (PyTorch DDP, Megatron-LM, DeepSpeed).
- Proven track record optimizing low-level GPU memory bandwidth, NCCL communication primitives, and custom kernel fusion.
- Experience designing fault-tolerant cluster schedulers on Slurm and Kubernetes at scale (10,000+ GPUs).

Preferred Qualifications:
- PhD in Computer Science, Computer Engineering, or related technical field with focus on ML systems.
- Contributions to open-source PyTorch or CUDA libraries.
`;

    const [posReport, midReport, negReport] = await Promise.all([
      engine.analyzeRole(
        { jobTitle: 'Director of AI Strategy & GTM Operations', company: 'Anthropic', jobDescription: positiveControlJd },
        tanakaProfile
      ),
      engine.analyzeRole(
        { jobTitle: 'Director of Product Marketing & Technical Evangelism', company: 'CoreInfrastructure Inc', jobDescription: middleControlJd },
        tanakaProfile
      ),
      engine.analyzeRole(
        { jobTitle: 'Principal Machine Learning Systems Engineer', company: 'DeepScale AI', jobDescription: negativeControlJd },
        tanakaProfile
      ),
    ]);

    // Positive control: high alignment (Apply / Network First >= 75%)
    expect(posReport.overallFitScore).toBeGreaterThanOrEqual(75);
    expect(['Apply', 'Network First']).toContain(posReport.recommendation);

    // Negative control: severe technical gaps (must not be Apply, score <= 30%)
    expect(negReport.overallFitScore).toBeLessThanOrEqual(30);
    expect(negReport.recommendation).toBe('Deprioritize');
    expect(negReport.qualifications.filter((q) => q.matchType === 'Material Gap').length).toBeGreaterThanOrEqual(2);

    // Ordinal separation check: Positive > Middle > Negative
    expect(posReport.overallFitScore).toBeGreaterThan(midReport.overallFitScore);
    expect(midReport.overallFitScore).toBeGreaterThan(negReport.overallFitScore);
  });

  it('5. ensures missing evidence cannot become Strong Match and score denominator includes all qualifications', async () => {
    const emptyCandidate: CandidateProfile = {
      id: 'cand-empty-test',
      name: 'Unqualified Candidate',
      headline: 'Beginner',
      location: 'None',
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
      updatedAt: '2026-08-14T00:00:00.000Z',
      dataMode: 'user',
    };

    const technicalJd = `
Role: Senior Distributed Systems Architect
Company: CoreInfrastructure Inc

Minimum Qualifications:
- 10+ years hands-on PySpark, Scala, and low-level C++ kernel optimization.
- Kubernetes distributed storage controllers and bare metal networking.
`;

    const engine = new DeterministicSyntheticEngine();
    const report = await engine.analyzeRole(
      {
        jobTitle: 'Senior Distributed Systems Architect',
        company: 'CoreInfrastructure Inc',
        jobDescription: technicalJd,
      },
      emptyCandidate
    );

    // Should score 0% with Deprioritize
    expect(report.overallFitScore).toBe(0);
    expect(report.recommendation).toBe('Deprioritize');
    expect(report.qualifications.every((q) => q.matchType !== 'Strong Match')).toBe(true);
    expect(report.qualifications.filter((q) => q.matchType === 'Material Gap').length).toBeGreaterThanOrEqual(2);

    // Score explanation must describe the qualification counts
    expect(report.scoreExplanation).toContain('Required:');
    expect(report.scoreExplanation).toContain('Preferred:');
    expect(report.scoreExplanation).toContain('Weighted sum:');
  });

  it('6. validates zero-credit Material Gap math (prevents double-penalty)', async () => {
    const engine = new DeterministicSyntheticEngine();

    // 3 Required qualifications, 1 Preferred qualification:
    // Candidate has 2 Strong Required (+4), 1 Material Gap Required (0), 1 Strong Preferred (+1)
    // Denominator = 2*3 + 1*1 = 7
    // Numerator = 4 + 0 + 1 = 5
    // Score = 5/7 = 71% -> Network First
    const customJd = `
Role: Director of AI Strategy
Company: Google

Minimum Qualifications:
- 10+ years in technology strategy, operations, or enterprise GTM leadership.
- Demonstrated success scaling AI initiatives, enablement playbooks, and operational frameworks.
- Deep hands-on C++ GPU kernel compilation and CUDA driver programming.

Preferred Qualifications:
- Experience operating in hypergrowth venture-backed or scale-up technology companies.
`;

    const report = await engine.analyzeRole(
      { jobTitle: 'Director of AI Strategy', company: 'Google', jobDescription: customJd },
      tanakaProfile
    );

    const reqStrong = report.qualifications.filter((q) => q.category === 'Required' && q.matchType === 'Strong Match').length;
    const reqGap = report.qualifications.filter((q) => q.category === 'Required' && q.matchType === 'Material Gap').length;
    const prefStrong = report.qualifications.filter((q) => q.category === 'Preferred' && q.matchType === 'Strong Match').length;

    expect(reqStrong).toBe(2);
    expect(reqGap).toBe(1);
    expect(prefStrong).toBe(1);

    // Score must be exactly 71% (5/7) and Network First
    expect(report.overallFitScore).toBe(71);
    expect(report.recommendation).toBe('Network First');
    expect(report.scoreExplanation).toContain('Required: 2 Strong, 0 Partial, 1 Gap');
    expect(report.scoreExplanation).toContain('Weighted sum: 5 / Max possible: 7');
  });
});
