import { DiscoveredJob, DiscoveryQuery, JobDiscoveryProvider } from '@/types/discovery';

const CURATED_SAMPLE_JOBS: Array<Omit<DiscoveredJob, 'id' | 'discoveredAt' | 'status' | 'relevanceScore' | 'relevanceLevel' | 'relevanceReasons' | 'matchedPreferences' | 'provider' | 'groundingUsed' | 'verificationStatus' | 'verificationReason' | 'sourceConfidence' | 'verifiedAt' | 'sourceDomain'>> = [
  {
    title: 'Director, AI Strategy & GTM Operations',
    company: 'Anthropic',
    location: 'San Francisco, CA (Hybrid)',
    compensation: '$240,000 - $310,000 + Equity',
    jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/director-ai-strategy-gtm',
    source: 'Curated / Demo Feed',
    postingDate: '2026-03-15',
    snippet: 'Lead go-to-market strategy, operational scaling, and enterprise customer deployment rhythms for Claude enterprise offerings.',
    description: `About the Role:
Anthropic is seeking an experienced Director of AI Strategy & GTM Operations to scale enterprise adoption of Claude. You will partner directly with product, revenue, and engineering leadership to design repeatable operational frameworks, optimize sales enablement workflows, and execute executive stakeholder rhythms.

Key Responsibilities:
- Lead enterprise AI GTM strategy, revenue pipeline acceleration, and partner operations.
- Partner with cross-functional executive leadership across Product, Sales, and Applied AI.
- Design operational metrics, board review rhythms, and scalable onboarding playbooks.
- Drive adoption of automated workflows and modern enterprise AI systems.

Requirements:
- 8+ years of experience in GTM Operations, BizOps, Strategy, or Enterprise SaaS leadership.
- Proven track record scaling revenue teams from $10M to $100M+ ARR.
- Strong executive communication and matrixed stakeholder governance.
- Deep familiarity with generative AI systems, enterprise deployment, and LLM adoption.`,
  },
  {
    title: 'Head of Business Operations & Strategy',
    company: 'Scale AI',
    location: 'San Francisco, CA / Remote',
    compensation: '$230,000 - $290,000 + Equity',
    jobUrl: 'https://scale.com/careers/head-bizops-strategy',
    source: 'Curated / Demo Feed',
    postingDate: '2026-03-12',
    snippet: 'Drive critical corporate strategy, operational excellence, and organizational scaling initiatives across enterprise data platform verticals.',
    description: `About Scale AI:
Scale is accelerating AI development. We are looking for a Head of BizOps & Strategy to lead cross-functional company initiatives, strategic resource allocation, and operational cadence.

What You Will Do:
- Architect operational rhythms, quarterly OKR tracking, and executive review cadences.
- Lead strategic growth initiatives across new enterprise AI products and government partnerships.
- Build high-performing strategy and operations teams.

Qualifications:
- 7+ years in Management Consulting, Venture Capital, Investment Banking, or high-growth Tech BizOps.
- Demonstrated success leading complex cross-functional transformations.
- Exceptional analytical, modeling, and executive presentation capabilities.`,
  },
  {
    title: 'Senior Director, Revenue Operations & Pipeline Strategy',
    company: 'Stripe',
    location: 'San Francisco, CA (Hybrid) or Seattle, WA',
    compensation: '$260,000 - $340,000 + Equity',
    jobUrl: 'https://stripe.com/jobs/senior-director-revops-strategy',
    source: 'Curated / Demo Feed',
    postingDate: '2026-03-10',
    snippet: 'Architect global revenue operations infrastructure, pipeline forecasting models, and sales compensation architectures.',
    description: `Stripe is looking for an operational leader to head global revenue strategy and pipeline intelligence.

Key Mandates:
- Own the end-to-end global revenue tech stack, pipeline governance, and forecasting precision.
- Optimize multi-channel GTM motions across enterprise, mid-market, and self-serve tiers.
- Partner closely with CFO and CRO on annual operating budgets and quota allocations.`,
  },
  {
    title: 'Principal, AI Solutions & Strategic Engagements',
    company: 'OpenAI',
    location: 'San Francisco, CA (Hybrid)',
    compensation: '$250,000 - $330,000 + Equity',
    jobUrl: 'https://openai.com/careers/principal-ai-solutions',
    source: 'Curated / Demo Feed',
    postingDate: '2026-03-08',
    snippet: 'Work directly with Fortune 500 C-suites to design transformational enterprise AI roadmaps, technical architecture, and deployment governance.',
    description: `OpenAI seeks a Principal of AI Solutions to lead transformational enterprise deployments.

Responsibilities:
- Engage C-level executives on frontier model adoption, security frameworks, and ROI governance.
- Collaborate with research and engineering on productizing bespoke enterprise capabilities.
- Define industry-specific blueprints for finance, healthcare, and technology verticals.`,
  },
  {
    title: 'VP of Operations & Enterprise Scaled Services',
    company: 'Databricks',
    location: 'San Francisco, CA / Hybrid',
    compensation: '$275,000 - $360,000 + Equity',
    jobUrl: 'https://databricks.com/company/careers/vp-operations-enterprise-services',
    source: 'Curated / Demo Feed',
    postingDate: '2026-03-05',
    snippet: 'Scale global enterprise customer operations, service delivery architectures, and technical enablement programs.',
    description: `Databricks is hiring a VP of Operations to oversee global delivery frameworks, customer operational excellence, and enterprise data enablement.`,
  },
  {
    title: 'Director, Strategy & Business Operations',
    company: 'Google',
    location: 'Mountain View, CA / San Francisco, CA',
    compensation: '$265,000 - $350,000 + Equity',
    jobUrl: 'https://careers.google.com/jobs/results/director-strategy-bizops-cloud',
    source: 'Curated / Demo Feed',
    postingDate: '2026-03-01',
    snippet: 'Drive Cloud & AI strategic initiatives, cross-functional operating rhythms, and executive decision frameworks.',
    description: `Join Google Cloud's Strategy & Operations team to guide market expansion, portfolio resource allocation, and key executive reviews across global regions.`,
  },
];

export class CuratedDiscoveryProvider implements JobDiscoveryProvider {
  name = 'Curated Strategic Pipeline Feed';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async discoverJobs(query: DiscoveryQuery): Promise<DiscoveredJob[]> {
    const now = new Date().toISOString();
    const queryRoles = (query.targetRoles || []).map((r) => r.toLowerCase());
    const queryLocations = (query.preferredLocations || []).map((l) => l.toLowerCase());

    return CURATED_SAMPLE_JOBS.map((job, idx) => {
      const id = `disc-curated-${idx + 1}-${Date.now()}`;
      const matched = queryRoles.length > 0 ? queryRoles.slice(0, 2) : ['Strategy', 'AI Operations'];
      if (queryLocations.length > 0) {
        matched.push(queryLocations[0]);
      }

      let sourceDomain = 'company.com';
      if (job.jobUrl) {
        try {
          sourceDomain = new URL(job.jobUrl).hostname;
        } catch {
          // fallback
        }
      }

      return {
        ...job,
        id,
        discoveredAt: now,
        status: 'new',
        relevanceScore: 85,
        relevanceLevel: 'High Potential',
        relevanceReasons: ['Curated Strategic Fit', 'Executive Seniority Match', 'Target Industry Alignment'],
        matchedPreferences: matched,
        provider: 'Curated Strategic Pipeline Feed',
        groundingUsed: false,
        verificationStatus: 'curated',
        verificationReason: 'Pre-vetted executive role from curated strategic demo feed.',
        verifiedAt: now,
        sourceConfidence: 100,
        sourceDomain,
      };
    });
  }
}
