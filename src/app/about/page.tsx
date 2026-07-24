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
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xs space-y-2">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-emerald-300 border border-slate-700 uppercase tracking-wider">
          Architecture & System Specification
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">About Career Command Center</h1>
        <p className="text-sm text-slate-300">
          Executive-grade career opportunity evaluation system built with disciplined non-AI and AI architectural separation.
        </p>
      </div>

      {/* 1. Problem & Motivation */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="1. Problem & Motivation" />
        <p className="text-sm text-slate-700 leading-relaxed">
          Senior strategic professionals (AI Strategy, RevOps, Chief of Staff, GTM Ops leads) possess non-linear achievements, matrixed leadership experience, and quantified business impact. Traditional Applicant Tracking Systems (ATS) and keyword-matching tools fail senior candidates by treating career evaluation as a superficial word-overlap exercise.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Career Command Center replaces subjective job hunting with structured, evidence-backed candidate-to-role matching. It analyzes job mandates line-by-line, verifies candidate accomplishments, calculates transparent fit scores, and provides strategic interview preparation.
        </p>
      </Card>

      {/* 2. Target User Persona */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="2. Target User Persona" />
        <p className="text-sm text-slate-700 leading-relaxed">
          Designed specifically for senior strategic individual contributors, Directors, and Chiefs of Staff pursuing high-complexity roles in technology, SaaS, enterprise software, and growth-stage ventures.
        </p>
      </Card>

      {/* 3. Product Principles */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="3. Product Prioritization Principles" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Rigor Over Automation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              High-precision evidence mapping is prioritized over automated bulk applying.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Privacy Over Friction</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Local client-controlled processing is prioritized over invasive third-party cloud data collection.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Executive Aesthetics Over Complexity</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Spacious, restrained typography hierarchy is prioritized over busy dashboards and decorative widgets.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Core Workflow */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="4. End-to-End Analysis Workflow" />
        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2 leading-relaxed">
          <li>Inspect candidate profile evidence index (Alex Vance synthetic profile).</li>
          <li>Select sample benchmark position or paste custom job description text.</li>
          <li>Normalize input text and extract requirement signals.</li>
          <li>Compare extracted signals line-by-line against candidate evidence citations.</li>
          <li>Calculate transparent weighted Fit Score (2&times; required, 1&times; preferred, -100% gap penalty).</li>
          <li>Assign strategic recommendation tag (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Apply</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Network First</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Monitor</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Deprioritize</code>).</li>
          <li>Generate role-tailored recruiter screen questions, hiring manager questions, and STAR stories.</li>
          <li>Save report to browser local storage under <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">ccc_opportunities_v1</code>.</li>
          <li>Track active recruiting status across pipeline stages on the Dashboard and Opportunities page.</li>
        </ol>
      </Card>

      {/* 5. Technical Architecture Summary */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="5. Technical Architecture Summary" />
        <ul className="text-sm text-slate-700 space-y-2 leading-relaxed">
          <li><strong>Framework:</strong> Next.js 14+ (App Router) using React Server Components for static views and Client Components for local state.</li>
          <li><strong>Type Safety:</strong> TypeScript Strict Mode enforcing strict domain model schemas.</li>
          <li><strong>Styling:</strong> Tailwind CSS v4 custom design system.</li>
          <li><strong>Engine Abstraction:</strong> Abstract <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">IFitAnalysisEngine</code> interface implemented by <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">DeterministicSyntheticEngine</code> in Version 1. Swapping to a live Gemini API in Version 2 requires changing zero UI components.</li>
        </ul>
      </Card>

      {/* 6. Evidence-Grounding Approach */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="6. Evidence-Grounding Approach" />
        <p className="text-sm text-slate-700 leading-relaxed">
          The system is designed to prevent unsupported candidate claims. Every positive match claim mandates explicit citation back to verifiable achievement IDs (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">EVID-2024-01</code>) in the candidate profile. Unconfirmed items are explicitly classified as <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Unverified</code> rather than assumed true or false.
        </p>
      </Card>

      {/* 7. Privacy Commitments */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="7. Privacy Commitments & Data Hygiene" />
        <p className="text-sm text-slate-700 leading-relaxed">
          Version 1 operates entirely client-side inside the user’s browser. No network requests are made with user-pasted job description text, no external databases are used, and no credentials or secrets are required.
        </p>
      </Card>

      {/* 8. What Is Synthetic */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="8. What Is Synthetic & Why" />
        <p className="text-sm text-slate-700 leading-relaxed">
          All candidate profiles, career histories, sample job descriptions, and pipeline records in this public demo use 100% synthetic data (Alex Vance persona) to ensure complete privacy, IP protection, and compliance in public portfolio deployments.
        </p>
      </Card>

      {/* 9. Current Limitations */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="9. Current Version 1 Limitations" />
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>Version 1 uses a deterministic synthetic rule engine (no live LLM backend in public demo).</li>
          <li>Custom-pasted job descriptions use simplified heuristic keyword signal extraction.</li>
          <li>All persistence is client-side browser <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">localStorage</code>.</li>
        </ul>
      </Card>

      {/* 10. Product Roadmap */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="10. Multi-Phase Product Roadmap" />
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-900 text-white rounded-lg">
            <span className="font-bold text-emerald-400">Phase 1 (Current):</span> Version 1 Public Demo — Client-side deterministic synthetic engine & 6-page interactive interface.
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-800">
            <span className="font-bold text-slate-900">Phase 2 (Planned):</span> Live Gemini API integration, custom PDF/Docx résumé parser, and Kanban board view.
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-800">
            <span className="font-bold text-slate-900">Phase 3 (Planned):</span> Multi-tenant cloud database (PostgreSQL) and user accounts.
          </div>
        </div>
      </Card>

      {/* 11. Source Code Repository */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="11. Source Code Repository" />
        <p className="text-sm text-slate-700 leading-relaxed">
          View source code on GitHub:{' '}
          <a
            href="https://github.com/tichikosi/career-command-center"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 underline hover:text-indigo-600"
          >
            github.com/tichikosi/career-command-center
          </a>
        </p>
      </Card>
    </div>
  );
}
