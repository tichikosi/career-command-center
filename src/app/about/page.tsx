import React from 'react';
import { Card, CardHeader } from '@/components/ui/Card';

export const metadata = {
  title: 'Architecture & System Specification v3.3 — Career Command Center',
  description:
    'Comprehensive technical architecture, product philosophy, evidence grounding, cloud persistence, and AI governance specification for Career Command Center v3.3.',
};

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-7 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-indigo-300 border border-slate-700 uppercase tracking-wider">
            Architecture & System Specification v3.3
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            Release Candidate
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">About Career Command Center</h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
          Career Command Center is an AI-native career operating system for evaluating opportunities, managing a professional job-search pipeline, analyzing network paths, preparing for interviews, and turning structured candidate evidence into grounded career strategy.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          The platform combines live Gemini intelligence, structured evidence grounding, deterministic decision logic, authenticated cloud persistence, privacy-aware data isolation, and an executive-grade user experience.
        </p>
      </div>

      {/* 1. Problem & Motivation */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="1. Problem & Motivation" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Senior strategic professionals (such as AI Strategy leads, GTM & Revenue Operations directors, Chiefs of Staff, and business transformation operators) possess complex, non-linear career achievements. Their value is frequently defined by matrixed leadership, cross-functional influence, indirect ownership, complex operating models, strategic program management, and quantified commercial outcomes.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Traditional Applicant Tracking Systems (ATS) and keyword-matching tools evaluate senior candidates poorly by reducing career evaluation to superficial exact-title matching. Conversely, generic generative AI tools often produce flattering but ungrounded career narratives that cannot withstand rigorous executive interview scrutiny.
        </p>
        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60">
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 leading-relaxed">
            Core Operating Principle: The objective is not to automate as many applications as possible. The objective is to improve the quality of career decisions and execution.
          </p>
        </div>
      </Card>

      {/* 2. Target User Persona */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="2. Target User Persona" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Designed specifically for senior individual contributors, managers, directors, functional/program leads, Chiefs of Staff, and operators navigating transitions between adjacent strategic functions.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
          {[
            'AI Strategy & Adoption',
            'GTM Strategy & Operations',
            'Revenue Operations (RevOps)',
            'Business Operations (BizOps)',
            'Marketing Operations',
            'Enterprise Technology & SaaS',
            'Management Consulting',
            'Strategic Transformation',
            'Growth-Stage Leadership',
          ].map((domain) => (
            <div key={domain} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {domain}
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Product Principles */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="3. Product Prioritization Principles" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Rigor Over Automation</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              High-quality evaluation and decision support are prioritized over bulk application automation.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Evidence Over Plausibility</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              AI must never transform plausible career narratives into fabricated facts, ungrounded metrics, or invented achievements.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Deterministic Logic Where Possible</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Rules govern pipeline states, follow-up urgency, deduplication, and data integrity; AI is reserved for language reasoning and synthesis.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Privacy by Architecture</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Private cloud records are user-scoped via PostgreSQL Row Level Security (RLS). Synthetic public demo state is completely isolated.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 md:col-span-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Executive Usability Over Feature Density</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Clear visual hierarchy, strategic context, concise actionable recommendations, and restrained executive interface design over visual clutter.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. End-to-End Lifecycle Workflow */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="4. End-to-End V3.3 Lifecycle Workflow" />
        <div className="p-3 bg-slate-900 text-indigo-300 dark:bg-slate-950 font-mono text-xs rounded-xl overflow-x-auto text-center font-bold tracking-wider">
          DISCOVER &rarr; ANALYZE &rarr; NETWORK &rarr; APPLY &rarr; PREPARE &rarr; INTERVIEW &rarr; FOLLOW UP &rarr; TRACK OUTCOME &rarr; LEARN
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
          {[
            { step: '1', title: 'Build Candidate Evidence', desc: 'Structure career history into discrete, verifiable evidence records with stable identifiers.' },
            { step: '2', title: 'Discover Opportunities', desc: 'Surface grounded job listings matching candidate role, seniority, compensation, and location preferences.' },
            { step: '3', title: 'Analyze Role Fit', desc: 'Deconstruct job descriptions into explicit requirements and evaluate fit against verified candidate experience.' },
            { step: '4', title: 'Map Candidate Evidence', desc: 'Cite specific evidence IDs for every required and preferred requirement.' },
            { step: '5', title: 'Identify Material Gaps', desc: 'Isolate genuine experience gaps and formulate grounded mitigation positioning.' },
            { step: '6', title: 'Generate Career Strategy', desc: 'Synthesize positioning narratives, key strengths, and strategic recommendation tags.' },
            { step: '7', title: 'Analyze Professional Network', desc: 'Identify warm connection paths at target employers from imported network contacts.' },
            { step: '8', title: 'Create Action Plan', desc: 'Generate stage-specific execution checklists and tactical outreach steps.' },
            { step: '9', title: 'Manage Recruiting Pipeline', desc: 'Track opportunities across customizable stages in Kanban or tabular CRM views.' },
            { step: '10', title: 'Track Application Activity', desc: 'Maintain forward-only chronological logs of recruiter calls, screens, and notes.' },
            { step: '11', title: 'Prepare for Interviews', desc: 'Generate grounded role briefs, anticipated question banks, and mapped STAR story banks.' },
            { step: '12', title: 'Practice Through Mock Interviews', desc: 'Engage in interactive Q&A with 6-dimension AI coaching and improved framing.' },
            { step: '13', title: 'Manage Follow-Up', desc: 'Receive deterministic urgency recommendations and draft tailored executive follow-up communications.' },
            { step: '14', title: 'Learn From Outcomes', desc: 'Audit touchpoints and optimize positioning for future pipeline cycles.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Step {step}: {title}</span>
              <p className="text-slate-600 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. Technical Architecture Summary */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="5. Technical Architecture Summary" />
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-1">Application Layer</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Next.js 16 (App Router) &bull; React 19 &bull; TypeScript (Strict Mode) &bull; Tailwind CSS 4 &bull; @dnd-kit (Accessible Kanban CRM) &bull; Node.js
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-1">AI & Intelligence Layer</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Official Google Gen AI SDK (<code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">@google/genai</code>) &bull; Primary model <code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">gemini-3.7-flash</code> &bull; Resilient failover to <code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">gemini-3.6-flash</code> &bull; Strict Zod structured validation &bull; Grounded web search &bull; Labeled deterministic fallback (<code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">Simplified Interview Coaching</code>) &bull; Execution metadata auditing
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-1">Data Layer (Dual Persistence Architecture)</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              <strong>Authenticated Cloud:</strong> Supabase PostgreSQL 15+ &bull; Supabase Auth &bull; Strict Row Level Security (RLS) &bull; Cloud Repositories &bull; Paginated network hydration &bull; Canonical candidate profile constraint &bull; User-scoped private domains.<br />
              <strong>Unauthenticated Demo:</strong> Isolated browser <code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">localStorage</code> &bull; Synthetic benchmark fixtures &bull; Zero remote data leak.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-1">Deployment & Automation</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Git & GitHub &bull; Vercel (Edge network & automated branch Preview deployments) &bull; Supabase Managed Database &bull; Vercel Cron &bull; Production release safety controls
            </p>
          </div>
        </div>
      </Card>

      {/* 6. Candidate Evidence & Grounding */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="6. Candidate Evidence & Grounding Architecture" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Candidate experience is converted into structured, reusable evidence objects with stable identifiers (such as <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">EVID-2024-01</code>) rather than stored only as unparsed résumé text.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          The evaluation engine distinguishes among <strong>grounded evidence</strong>, <strong>adjacent evidence</strong>, <strong>partial evidence</strong>, <strong>unsupported claims</strong>, and <strong>material gaps</strong>. AI-generated evidence citations are rigorously validated against active candidate records.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          Note on AI Reliability: The architecture reduces the likelihood that unsupported candidate claims reach the user as fact and makes invalid evidence references detectable.
        </p>
      </Card>

      {/* 7. Opportunity Intelligence Object */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="7. Opportunity Intelligence Model" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Each opportunity functions as a persistent decision object encompassing the raw job mandate, fit analysis, requirement-to-evidence mappings, identified gaps, candidate positioning, network contact matches, action plan checklist, pipeline stage, follow-up timeline, interview preparation brief, and mock interview transcripts.
        </p>
      </Card>

      {/* 8. Interview War Room */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="8. Interview War Room & Executive Readiness" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          The Interview War Room provides a comprehensive briefing console before high-stakes conversations:
        </p>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
          <li><strong>Executive Readiness Score:</strong> 0–100 index evaluated across role understanding, positioning, story preparation, gap mitigation, company knowledge, and question readiness.</li>
          <li><strong>Executive Role Brief & Positioning:</strong> Grounded strategic summary of the mandate and candidate narrative.</li>
          <li><strong>Categorized Question Bank:</strong> Anticipated technical, leadership, and cultural questions, alongside strategic questions to ask the interview panel.</li>
          <li><strong>Grounded STAR Story Bank:</strong> Verified achievements mapped to anticipated questions.</li>
          <li><strong>Defensive Gap Mitigation:</strong> Proactive framing bridges for identified experience gaps.</li>
          <li><strong>Staleness Detection:</strong> Automated alerts when candidate profile or role details update after initial brief generation.</li>
        </ul>
      </Card>

      {/* 9. Interactive Mock Interviewing */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="9. Interactive Mock Interviewing & 6-Dimension AI Coaching" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Candidates can practice interview questions interactively with structured 6-dimension evaluation:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
          {[
            { dim: 'Relevance', desc: 'Direct alignment with the question intent' },
            { dim: 'Evidence Specificity', desc: 'Inclusion of concrete facts, metrics, and outcomes' },
            { dim: 'Strategic Depth', desc: 'Executive perspective and systemic thinking' },
            { dim: 'Executive Communication', desc: 'Tone, authority, and professional presence' },
            { dim: 'Structure', desc: 'Coherent STAR or problem-solution framework' },
            { dim: 'Concision', desc: 'High signal-to-noise ratio and economy of words' },
          ].map(({ dim, desc }) => (
            <div key={dim} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100">{dim}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Improved answer suggestions enhance framing and structural clarity but are strictly prohibited from fabricating candidate facts or scope.
        </p>
      </Card>

      {/* 10. Activity Timeline & Smart Follow-Up */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="10. Activity Timeline & Smart Follow-Up Engine" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong>Forward-Only Activity Ledger:</strong> Tracks recruiter calls, scheduled interviews, screenings, thank-yous, and executive notes, with optional direct linking to contacts from the Professional Network.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong>Deterministic Follow-Up Priority:</strong> Core urgency is governed by deterministic rules (overdue explicit follow-up date, post-interview thank-you required, application silence, recruiter silence, referral nudge) with suppressed triggers for closed/rejected states. AI assists with draft composition across professional, warm, and assertive tones.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
          Important: No automated email or LinkedIn sending occurs in V3.3. All outreach is manually reviewed, copied, and recorded by the user.
        </p>
      </Card>

      {/* 11. Professional Network Integration */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="11. Professional Network Directory" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          The Professional Network supports importing, deduplicating, and managing large-scale connection datasets containing thousands of contacts. Company normalization algorithms automatically identify and surface relevant contacts at target employers during role analysis and interview preparation.
        </p>
      </Card>

      {/* 12. Grounded Discovery */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="12. Grounded Opportunity Discovery" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Gemini-assisted job discovery evaluates candidate target roles, compensation preferences, geography, and seniority against current external listings. Provenance tracking identifies whether listings are live-grounded or curated benchmarks, preventing duplicate discovery runs.
        </p>
      </Card>

      {/* 13. Cloud Security & Privacy Architecture */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="13. Cloud Security & Row Level Security (RLS)" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Authenticated users persist private data (candidate profile, opportunities, network contacts, activity notes, interview preparations, and mock transcripts) in Supabase PostgreSQL.
        </p>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>Every private table enforces foreign keys to <code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">auth.users(id)</code> with CASCADE deletion.</li>
          <li>PostgreSQL Row Level Security (RLS) ensures users can only access their own records via <code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">auth.uid() = user_id</code>.</li>
          <li>No anonymous access (<code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">anon</code>) is granted on private application tables.</li>
          <li>Cloud write failures fail visibly rather than silently misrepresenting unpersisted data as cloud-saved.</li>
          <li>Private API credentials and keys remain strictly server-side.</li>
        </ul>
      </Card>

      {/* 14. Dashboard Intelligence */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="14. Dashboard Application Intelligence" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          The executive dashboard synthesizes high-priority pipeline state into a unified tactical hub: Upcoming Interviews calendar, Follow-Ups Due, Stale Applications, Recent Milestone Activity feed, and a deterministic Next Best Career Action engine answering: <em>&ldquo;What should I focus on next?&rdquo;</em>
        </p>
      </Card>

      {/* 15. Quality Engineering */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="15. Quality Engineering & Automated Quality Gate" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Career Command Center enforces comprehensive automated testing across all business logic and user workflows:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">37 Files / 339 Tests</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vitest Unit Tests</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">30 Tests</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Playwright E2E Tests</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Zero Warnings</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ESLint & Git Check</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Automated</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">AI Eval Harness</div>
          </div>
        </div>
      </Card>

      {/* 16. Development & Release Workflow */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="16. Development & Release Workflow" />
        <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
          <li>Feature branch isolation from production baseline.</li>
          <li>Local implementation with deterministic unit and integration test authoring.</li>
          <li>Automated QA gate verification (<code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">npm run qa</code>).</li>
          <li>Push to branch triggering ephemeral Vercel Preview deployment.</li>
          <li>Database migration applied and verified in Supabase cloud environment.</li>
          <li>Authenticated end-to-end user acceptance testing in isolated incognito sessions.</li>
          <li>Squash-merge to main branch with automated Vercel production deployment.</li>
          <li>Production smoke test and immutable semantic Git version tagging.</li>
        </ol>
      </Card>

      {/* 17. Multi-Phase Roadmap */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="17. Multi-Phase Product Roadmap" />
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">V1.0 — Completed:</span>
              <span className="text-slate-400">Deterministic Synthetic Engine</span>
            </div>
            <p className="text-slate-300">Client-side rule engine, 18-section fit analysis, candidate evidence parsing, dark mode, and global search.</p>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">V2.x — Completed:</span>
              <span className="text-slate-400">AI-Native Intelligence & Kanban CRM</span>
            </div>
            <p className="text-slate-300">Live Gemini model evaluation, PDF/DOCX résumé ingestion, LinkedIn network directory import & company matching, and Kanban CRM.</p>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">V3.2 — Completed:</span>
              <span className="text-slate-400">Supabase Cloud Persistence & Multi-Device Sync</span>
            </div>
            <p className="text-slate-300">Authenticated PostgreSQL persistence, Row Level Security, large-network paginated hydration, scheduled discovery cron, and production Vercel deployment.</p>
          </div>
          <div className="p-3 bg-indigo-950/80 border border-indigo-800 text-white rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-300">V3.3 — Current Release Candidate:</span>
              <span className="text-slate-300">Interview Intelligence & Application War Room</span>
            </div>
            <p className="text-slate-200">
              Grounded executive interview briefs, 15-section pre-interview cheat sheet (Markdown & Print/PDF export), interactive mock interview simulator (2-axis model: Practice / Timed Screen with 90s countdown / 4-round Full Loop; Standard / Rigorous VP / Stress Test difficulty), activity timeline, deterministic smart follow-up engine (Scenarios A–J), searchable network contact picker, and password visibility toggle.
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 text-white rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400">V3.4 — Planned Roadmap:</span>
              <span className="text-slate-400">Real-Time Voice Mock & Integrations</span>
            </div>
            <p className="text-slate-400">
              Live Gemini voice mock interviews (audio in/out), Google Calendar and Gmail interview synchronization, client-side PNG cheat sheet graphic rendering, and automated executive email drafting.
            </p>
          </div>
        </div>
      </Card>

      {/* 18. What the System Demonstrates */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="18. Architectural Philosophy: What This System Demonstrates" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Beyond the end-user product itself, Career Command Center demonstrates an approach to building production AI systems that combines generative AI, deterministic business logic, structured data, evidence governance, model routing, cloud architecture, privacy controls, human-in-the-loop decision making, automated testing, and production deployment.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          The system intentionally avoids using AI for every problem. Instead, it asks:
        </p>
        <blockquote className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border-l-4 border-indigo-600 text-xs font-semibold text-slate-800 dark:text-slate-200 italic">
          &ldquo;Where does probabilistic intelligence create genuine value, and where should deterministic software remain in control?&rdquo;
        </blockquote>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          This principle informs all architectural decisions: fit scoring is transparent and weighted, follow-up urgency is rules-governed, mock interview feedback is multi-dimensional, and cloud persistence is strictly authenticated.
        </p>
      </Card>

      {/* 19. Source Code Repository */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="19. Source Code & Open Reference" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          View source code and implementation documentation on GitHub:{' '}
          <a
            href="https://github.com/tichikosi/career-command-center"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            github.com/tichikosi/career-command-center
          </a>
        </p>
      </Card>
    </div>
  );
}
