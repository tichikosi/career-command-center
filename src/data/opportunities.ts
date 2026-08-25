import { JobOpportunity } from '@/types/opportunity';
import { fixtureRole1AIStrategy } from './fixtures/role-1-ai-strategy';
import { fixtureRole2SalesOps } from './fixtures/role-2-sales-ops';
import { fixtureRole3DataEngineer } from './fixtures/role-3-data-engineer';
import { fixtureRole4ChiefOfStaff } from './fixtures/role-4-chief-of-staff';
import { fixtureRole5StrategyLead } from './fixtures/role-5-strategy-lead';
import { fixtureQaTestGoogle } from './fixtures/qa-test-google';

// Note: actions arrays are populated by normalizeOpportunity() in storage.ts
// at first read. Fixtures define the canonical workflow data only.

export const initialOpportunities: JobOpportunity[] = [
  {
    id: 'opp-qa-test-google-ai-strategy',
    title: 'Director, AI Strategy & Operations',
    company: 'Google',
    location: 'Mountain View, CA (Hybrid)',
    compensation: '$250,000 - $310,000 + Equity',
    sourceUrl: 'https://careers.google.com/jobs/results/qa-test-director-ai-strategy',
    companyWebsiteUrl: 'https://about.google',
    applicationUrl: 'https://careers.google.com/jobs/results/qa-test-director-ai-strategy',
    rawJobDescription: `[QA TEST OPPORTUNITY]
Role: Director, AI Strategy & Operations at Google
Location: Mountain View, CA (Hybrid)

About the Role:
Google is seeking an experienced Director of AI Strategy & Operations to lead strategic AI enablement, cross-functional operational rhythms, and enterprise AI solution alignment across product and go-to-market teams.

Responsibilities:
- Drive enterprise AI strategy, operational planning, and executive decision frameworks.
- Lead cross-functional alignment between engineering, product, marketing, and sales operations.
- Develop scalable operational toolsets and AI-powered workflow automation.
- Foster executive stakeholder relationships and manage strategic program budgets.

Requirements:
- 10+ years in technology strategy, operations, or enterprise GTM leadership.
- Demonstrated success scaling AI initiatives and operational frameworks.
- Strong executive communication and matrixed stakeholder management experience.`,
    createdAt: '2026-08-14T20:00:00.000Z',
    updatedAt: '2026-08-14T20:00:00.000Z',
    stage: 'Identified',
    analysis: fixtureQaTestGoogle,
    priority: 'High',
    notes: '[QA TEST OPPORTUNITY] Created for human verification of Network-to-Opportunity matching with real Google network contacts.',
    followUpDate: '2026-08-21',
    archivedReason: '',
    actions: [],
  },
  {
    id: 'opp-role-1-ai-strategy',
    title: 'Director of AI Strategy & Operations',
    company: 'Vanguard Enterprise AI',
    location: 'San Francisco, CA (Hybrid)',
    compensation: '$220,000 - $260,000 + Equity',
    sourceUrl: 'https://example.com/careers/vanguard-director-ai-strategy',
    companyWebsiteUrl: 'https://www.vanguard-enterprise-ai.example.com',
    applicationUrl: 'https://example.com/careers/vanguard-director-ai-strategy',
    rawJobDescription: `Vanguard Enterprise AI is seeking a Director of AI Strategy & Operations to lead enterprise AI enablement and cross-functional operational rhythms.
Key Requirements:
- 10+ years experience in GTM strategy, RevOps, and executive operations
- Proven track record of enterprise AI enablement and toolset rollout
- Demonstrated GTM automation impact tied to top-line ARR growth
- Cross-functional leadership across matrixed executive stakeholders
- Experience managing large operational budgets ($20M+)`,
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    stage: 'Screening',
    analysis: fixtureRole1AIStrategy,
    priority: 'High',
    notes: '',
    followUpDate: '2026-07-28',
    archivedReason: '',
    actions: [],
  },
  {
    id: 'opp-role-2-sales-ops',
    title: 'VP of Sales Operations',
    company: 'ScaleMetric GTM Platform',
    location: 'Austin, TX (Remote)',
    compensation: '$210,000 - $245,000',
    sourceUrl: 'https://example.com/careers/scalemetric-vp-sales-ops',
    companyWebsiteUrl: 'https://www.scalemetric-platform.example.com',
    applicationUrl: 'https://example.com/careers/scalemetric-vp-sales-ops',
    rawJobDescription: `ScaleMetric is looking for a VP of Sales Operations to overhaul sales operations infrastructure, lead enablement, and optimize lead-to-opportunity funnel conversion.
Key Requirements:
- Proven track record in RevOps pipeline optimization and conversion tracking
- Sales enablement curriculum design and quota attainment strategy
- Direct operational management of 50+ quota-carrying field sales representatives
- Global GTM budget planning and territory allocation`,
    createdAt: '2026-07-18T14:30:00.000Z',
    updatedAt: '2026-07-18T14:30:00.000Z',
    stage: 'Identified',
    analysis: fixtureRole2SalesOps,
    priority: 'Medium',
    notes: 'Need to verify whether the direct IC management expectation is a hard requirement or negotiable.',
    followUpDate: '2026-07-31',
    archivedReason: '',
    actions: [],
  },
  {
    id: 'opp-role-3-data-engineer',
    title: 'Principal Data Engineer',
    company: 'DataCore Systems',
    location: 'New York, NY',
    compensation: '$230,000 - $270,000',
    sourceUrl: 'https://example.com/careers/datacore-principal-data-engineer',
    companyWebsiteUrl: 'https://www.datacore-systems.example.com',
    applicationUrl: 'https://example.com/careers/datacore-principal-data-engineer',
    rawJobDescription: `DataCore Systems requires a Principal Data Engineer to build low-latency distributed data pipelines in PySpark and Scala.
Key Requirements:
- 8+ years hands-on Distributed PySpark / Scala software development
- Deep expertise in database engine tuning and custom C++ ETL kernels
- Infrastructure-as-code and Kubernetes data cluster deployment`,
    createdAt: '2026-07-15T09:15:00.000Z',
    updatedAt: '2026-07-15T09:15:00.000Z',
    stage: 'Archived',
    analysis: fixtureRole3DataEngineer,
    priority: 'Low',
    notes: 'Deprioritized — PySpark and C++ engineering requirements are outside core competencies.',
    archivedReason: 'Material skill gap in hands-on software development requirements.',
    actions: [],
  },
  {
    id: 'opp-role-4-chief-of-staff',
    title: 'Chief of Staff to CEO',
    company: 'Aura Cloud Technologies',
    location: 'San Francisco, CA',
    compensation: '$225,000 - $250,000 + Executive Bonus',
    sourceUrl: 'https://example.com/careers/aura-chief-of-staff',
    companyWebsiteUrl: 'https://www.aura-cloud-tech.example.com',
    applicationUrl: 'https://example.com/careers/aura-chief-of-staff',
    rawJobDescription: `Aura Cloud Technologies is searching for a Chief of Staff to the CEO to serve as strategic thought partner and operational force multiplier.
Key Requirements:
- Strategic execution and executive review rhythm management
- Board of Directors governance and C-suite reporting frameworks
- Cross-functional program management & organizational alignment
- Post-merger integration and change management leadership`,
    createdAt: '2026-07-22T16:00:00.000Z',
    updatedAt: '2026-07-22T16:00:00.000Z',
    stage: 'Interviewing',
    analysis: fixtureRole4ChiefOfStaff,
    priority: 'High',
    notes: 'Panel interview scheduled with CEO and CPO. Focus prep on change management and board governance examples.',
    followUpDate: '2026-07-25',
    archivedReason: '',
    actions: [],
  },
  {
    id: 'opp-role-5-strategy-lead',
    title: 'Strategy Lead',
    company: 'Horizon Enterprise Group',
    location: 'Flexible / Hybrid',
    compensation: 'Salary Commensurate with Experience',
    sourceUrl: 'https://example.com/careers/horizon-strategy-lead',
    companyWebsiteUrl: 'https://www.horizon-enterprise-group.example.com',
    applicationUrl: 'https://example.com/careers/horizon-strategy-lead',
    rawJobDescription: `Horizon Enterprise Group seeks a Strategy Lead for cross-functional planning and strategic execution.
Key Requirements:
- General business strategy and leadership experience
- Cross-functional collaboration
- Strategic project delivery`,
    createdAt: '2026-07-12T11:45:00.000Z',
    updatedAt: '2026-07-12T11:45:00.000Z',
    stage: 'Identified',
    analysis: fixtureRole5StrategyLead,
    priority: 'Medium',
    notes: 'JD is vague. Confirm scope and reporting structure before investing application time.',
    archivedReason: '',
    actions: [],
  },
];
