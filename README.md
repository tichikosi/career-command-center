# Career Command Center v3.0 Core

> **AI-Native Career Intelligence, Autonomous Job Discovery, Opportunity Evaluation & Executive Recruiting CRM**
> Built for senior executives, strategy leaders, and operations practitioners.

---

## 🌟 Executive Overview

Career Command Center transforms fragmented career searches into an evidence-based, structured intelligence workflow. It couples a live **Gemini 3.7 / 3.6 Flash** evaluation engine with local browser-persisted privacy, structured résumé ingestion, professional network intelligence, an autonomous role discovery feed, and an accessible Kanban CRM.

---

## 🚀 Key Capabilities (V2.0 → V2.1 → V3.0 Core)

### 1. 🧭 Autonomous Job Discovery Workspace (V3.0 Core)
- **Autonomous Discovery Feed (`/discover`)**: Automatically surfaces new executive and leadership opportunities matching candidate target roles, preferred locations, and target industries.
- **Dual Discovery Provider Abstraction**:
  - **Gemini Intelligent Market Discovery**: Uses Gemini search grounding and real-time market synthesis to discover newly opened executive positions.
  - **Curated Strategic Feed**: Deterministic high-quality offline feed of executive roles at leading AI and technology platforms.
- **Smart Deduplication & Pre-Screening**: Rejects duplicate job postings by canonical URL and (Company + Title + Location) fingerprints. Evaluates relevance (`High Potential`, `Possible Fit`, `Low Relevance`) with transparent rationale.
- **One-Click Pipeline Promotion**: Promotes discovered opportunities directly into the `Identified` pipeline stage, immediately triggering network matching and candidate fit analysis.
- **Automation & Cron Readiness**: Endpoint `/api/discovery/cron` with Vercel Cron schedule (`vercel.json`) and audit run history (`ccc_discovery_history_v1`).

### 2. 🤖 Live Gemini Two-Step Fit Analysis Engine (V2.1)
- **Independent Requirement Extraction**: Pure JD parser extracts and freezes required vs. preferred qualifications strictly from the job posting before candidate matching begins.
- **Evidence-Grounding Validator**: Automatically filters AI citations to ensure zero fabricated achievements. Every qualification match is strictly grounded in real candidate evidence IDs (`EVID-IMP-*`).
- **Explainable Scoring Math**: Weighted qualification math (2x weight on Required, 1x on Preferred) guaranteeing recommendation parity (>=85% Apply, 70-84% Network First, 50-69% Monitor, <50% Deprioritize).
- **Transient Failover & Resilience**: Primary `gemini-3.7-flash` with automatic transient retry (3 attempts) and graceful live failover to `gemini-3.6-flash` and deterministic heuristic fallback.

### 3. 🌐 Professional Network & LinkedIn Intelligence (V2.0 & V2.1)
- **Connection Ingestion**: Robust CSV/XLSX parser with automatic header row detection after arbitrary informational preamble rows.
- **Deterministic Contact Ranking**: Transparent heuristic ranking (Exact Company Match > Seniority Level > Domain Alignment > Talent/Recruiting Role > Title Overlap).
- **Contextual Opportunity Deep Linking**: Navigating to `/network?opportunityId=<id>` or `/network?company=<company>` focuses directory on company matches, displays contextual return banner, and provides clear reset CTA.
- **Warm Outreach Intelligence**: Displays top 6 ranked contacts on opportunity evaluation cards and one-click creates duplicate-safe custom action items.

### 4. 📋 Kanban Opportunity CRM & Real Creation (V2.0 & V2.1)
- **+ Add Opportunity Workspace**: Create custom opportunities via manual entry, pasted JD, or safe SSRF-protected URL fetching (`/api/opportunity/fetch-url`).
- **Save vs. Analyze & Save**: Save un-analyzed `Identified` pipeline cards or immediately trigger full candidate fit evaluation.
- **Drag-and-Drop Pipeline**: Powered by `@dnd-kit` across 6 lifecycle stages (`Identified`, `Applied`, `Screening`, `Interviewing`, `Offer`, `Archived`).
- **Accessible Interactions**: Keyboard navigation, screen-reader coordinates, and accessible "Move to..." fallback menus.

### 5. 📄 Structured Résumé Ingestion & Knowledge Base (V2.0)
- **Multi-Format Parsing**: Ingests PDF (`pdf-parse`), Word DOCX (`mammoth`), and raw text files, as well as pasted text.
- **Local-First PDF Extraction**: Extracts text locally before passing to Gemini for structured extraction.
- **Merge or Replace Control**: Selectively merge new roles/skills into existing profiles or replace candidate profile with full data isolation.

### 6. 🗄️ Pluggable Storage & Cloud Readiness Architecture (V3.0 Core)
- Clean repository abstraction layer (`ICandidateRepository`, `IOpportunityRepository`, `INetworkRepository`, `IDiscoveryRepository`) under `src/lib/storage/`.
- 100% backward-compatible localStorage adapter with SSR safety and reactive event broadcasting.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router & Turbopack)
- **UI & Interaction**: React 19, Tailwind CSS v4, `@dnd-kit/core`, `@dnd-kit/sortable`
- **AI / LLM**: Google Gemini 3.7 Flash & 3.6 Flash (`@google/genai` official SDK)
- **Validation**: Zod 4 Schemas
- **Parsing**: `papaparse`, `xlsx`, `mammoth`, `pdf-parse`
- **Testing & Quality Gate**: Vitest 4 (233 Unit Tests), Playwright 1.62 (22 E2E Tests), ESLint 9

---

## 🚦 Getting Started

### Prerequisites
- Node.js 20+ (recommended Node 24)
- Google Gemini API Key (optional for live AI evaluation)

### Installation
```bash
git clone https://github.com/tichikosi/career-command-center.git
cd career-command-center
npm install
```

### Environment Configuration
Create `.env.local`:
```bash
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-3.7-flash"
GEMINI_FAILOVER_MODEL="gemini-3.6-flash"
CRON_SECRET="your-optional-cron-secret-token"
```

### Running Locally
```bash
# Start development server
npm run dev

# Or build and start production bundle
npm run build
npm run start
```

### Running Automated Quality Gate & Tests
```bash
# Full automated QA gate (Lint + Unit Tests + Build + E2E Tests)
npm run qa

# Unit tests only (233 tests across 17 test suites)
npm run test:unit

# Playwright E2E tests only (22 tests across 6 specs)
npm run test:e2e

# AI Evaluation & Governance Benchmark
npm run eval
```
