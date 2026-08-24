import React from 'react';
import { Card, CardHeader } from '@/components/ui/Card';

export const metadata = {
  title: 'About the Project — Career Command Center',
  description:
    'Architecture overview, product philosophy, evidence grounding approach, privacy commitments, and technical roadmap.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-xs space-y-2">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-emerald-300 border border-slate-700 uppercase tracking-wider">
          Architecture & System Specification v2.0
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">About Career Command Center</h1>
        <p className="text-sm text-slate-300">
          Executive-grade career opportunity evaluation system built with live Gemini AI intelligence, structured evidence grounding, and local-first privacy.
        </p>
      </div>

      {/* 1. Problem & Motivation */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="1. Problem & Motivation" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Senior strategic professionals (AI Strategy, RevOps, Chief of Staff, GTM Ops leads) possess non-linear achievements, matrixed leadership experience, and quantified business impact. Traditional Applicant Tracking Systems (ATS) and keyword-matching tools fail senior candidates by treating career evaluation as a superficial word-overlap exercise.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Career Command Center replaces subjective job hunting with structured, evidence-backed candidate-to-role matching. It analyzes job mandates line-by-line, verifies candidate accomplishments, calculates transparent fit scores, and provides strategic interview preparation.
        </p>
      </Card>

      {/* 2. Target User Persona */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="2. Target User Persona" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Designed specifically for senior strategic individual contributors, Directors, and Chiefs of Staff pursuing high-complexity roles in technology, SaaS, enterprise software, and growth-stage ventures.
        </p>
      </Card>

      {/* 3. Product Principles */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="3. Product Prioritization Principles" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Rigor Over Automation</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              High-precision evidence mapping is prioritized over automated bulk applying.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Privacy Over Cloud Lock-in</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Local browser-persisted intelligence is prioritized over invasive centralized data collection.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Executive Aesthetics Over Complexity</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Spacious, restrained typography hierarchy is prioritized over busy dashboards and decorative widgets.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Core Workflow */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="4. End-to-End Analysis Workflow" />
        <ol className="list-decimal list-inside text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
          <li>Inspect or import candidate profile evidence index (PDF/DOCX/text résumé parsing or Alex Vance synthetic benchmark).</li>
          <li>Select sample benchmark position or paste custom job description text.</li>
          <li>Evaluate requirements with live Gemini 2.5 Flash structured analysis or deterministic offline fallback.</li>
          <li>Compare extracted signals line-by-line against candidate evidence citations.</li>
          <li>Calculate transparent weighted Fit Score (2&times; required, 1&times; preferred, -100% gap penalty).</li>
          <li>Assign strategic recommendation tag (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Apply</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Network First</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Monitor</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Deprioritize</code>).</li>
          <li>Map internal LinkedIn network connections at target company for warm outreach.</li>
          <li>Generate role-tailored recruiter screen questions, hiring manager questions, and STAR stories.</li>
          <li>Track active recruiting status across Kanban board stages or structured table view.</li>
        </ol>
      </Card>

      {/* 5. Technical Architecture Summary */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="5. Technical Architecture Summary" />
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
          <li><strong>Framework:</strong> Next.js 16 (App Router with Turbopack) using React 19 Server Components for static views and Client Components for local state.</li>
          <li><strong>AI Engine:</strong> Official Google Gen AI SDK (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">@google/genai</code>) powering <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">gemini-3.6-flash</code> with strict Zod structured outputs.</li>
          <li><strong>Type Safety & Validation:</strong> TypeScript Strict Mode and Zod 4 schemas across all API endpoints and data models.</li>
          <li><strong>Kanban CRM:</strong> Drag-and-drop state management powered by <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">@dnd-kit</code> with full keyboard accessibility.</li>
          <li><strong>Quality Gate:</strong> 145 Vitest unit tests, 17 Playwright end-to-end tests, and automated AI evaluation harness.</li>
        </ul>
      </Card>

      {/* 6. Evidence-Grounding Approach */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="6. Evidence-Grounding Approach" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          The system is designed to prevent unsupported candidate claims. Every positive match claim mandates explicit citation back to verifiable achievement IDs (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">EVID-2024-01</code>) in the candidate profile. Unconfirmed items are explicitly classified as <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Unverified</code> rather than assumed true or false.
        </p>
      </Card>

      {/* 7. Privacy Commitments */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="7. Privacy Commitments & Data Hygiene" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Career Command Center processes résumé files and job descriptions transiently in memory for structured extraction. User-provided candidate profiles, custom opportunities, notes, and professional connections are saved exclusively in local browser storage (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">localStorage</code>). No user data is stored on remote servers or sold to third parties.
        </p>
      </Card>

      {/* 8. What Is Synthetic */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="8. Synthetic Benchmark Baseline" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          All default candidate profiles, career histories, sample job descriptions, and pipeline records use 100% synthetic benchmark data (Alex Vance persona) to ensure complete privacy, IP protection, and compliance in public portfolio deployments.
        </p>
      </Card>

      {/* 9. AI Governance & Safety */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="9. AI Governance & Safety Standards" />
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>Strict Zod response validation guarantees structured JSON with zero truncation.</li>
          <li>Citation filtering eliminates AI hallucinations by verifying all evidence IDs against active profile records.</li>
          <li>Headless evaluation runner (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">npm run eval</code>) ensures benchmark consistency and regression protection.</li>
        </ul>
      </Card>

      {/* 10. Product Roadmap */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="10. Multi-Phase Product Roadmap" />
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-900 text-white rounded-lg">
            <span className="font-bold text-emerald-400">V1.0 (Completed):</span> Client-side deterministic synthetic engine, 18-section fit analysis, dark mode & global search.
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg">
            <span className="font-bold text-emerald-400">V2.0 (Current Release Candidate):</span> Live Gemini 2.5 Flash Engine, PDF/DOCX Résumé Ingestion, LinkedIn Network Directory, Kanban CRM, and AI Evaluation Harness.
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200">
            <span className="font-bold text-slate-900 dark:text-slate-100">V3.0 (Future):</span> Multi-tenant cloud database (PostgreSQL/Supabase), automated email outreach templates, and interview audio mock simulator.
          </div>
        </div>
      </Card>

      {/* 11. Source Code Repository */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="11. Source Code Repository" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          View source code on GitHub:{' '}
          <a
            href="https://github.com/tichikosi/career-command-center"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 dark:text-slate-100 underline hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            github.com/tichikosi/career-command-center
          </a>
        </p>
      </Card>
    </div>
  );
}
