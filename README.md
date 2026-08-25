# Career Command Center v3.2

> **AI-Native Career Intelligence, Live Grounded Job Discovery, Opportunity Evaluation, Supabase Cloud Persistence & Executive Recruiting CRM**
> Built for senior executives, strategy leaders, and operations practitioners.

---

## 🌟 Executive Overview

Career Command Center transforms fragmented career searches into an evidence-based, structured intelligence workflow. It couples a live **Gemini 3.7 / 3.6 Flash** evaluation engine with official **Google Search Grounding (`tools: [{ googleSearch: {} }]`)**, server-side SSRF URL validation, deterministic ATS listing verification, **Supabase PostgreSQL cloud persistence with Row Level Security (RLS)**, multi-device cloud authentication, automated local-to-cloud migration, structured résumé ingestion, professional network intelligence, and an accessible Kanban CRM.

---

## 🚀 Key Capabilities (V2.0 → V3.1 Grounded Discovery → V3.2 Cloud Automation)

### 1. ☁️ Supabase Cloud Persistence & Authentication (V3.2)
- **Multi-Device Cloud Sync**: Secure PostgreSQL persistence powered by Supabase with Row Level Security (RLS) policies enforcing multi-tenant isolation (`auth.uid() = user_id`).
- **Seamless Local-to-Cloud Migration**: Automatic preflight detection of local candidate profiles, opportunities, actions, network contacts (3,400+ scale), and discovery records with transactional chunked cloud sync and rollback resilience.
- **Active Candidate Source of Truth**: Authenticated cloud candidate profile takes absolute priority across Header, Profile, Fit Analysis, Opportunities, and Network directories, while cleanly suppressing synthetic benchmark personas in authenticated mode.
- **Local-First Privacy Fallback**: Complete offline resilience — if Supabase credentials are not configured, the entire application operates locally in browser `localStorage`.

### 2. 🧭 Live Google Search Grounded Job Discovery (V3.1 & V3.2)
- **Live Google Search Grounding (`tools: [{ googleSearch: {} }]`)**: Leverages official Google Search grounding via Gemini to discover real, active executive and leadership job postings matching candidate target roles, locations, and industries.
- **Strict Grounding Provenance & Trust State Machine**:
  - `Verified Live`: Model used real-time Google Search grounding with source citations and verified active ATS posting.
  - `Grounded`: Discovered via search grounding with verified web citation.
  - `Needs Verification`: Candidate listing reachable but content requires human confirmation.
  - `Curated / Demo`: Deterministic strategic pipeline feed (isolated from live feed with 100% confidence).
  - `Legacy Unverified`: Safely migrated historical discovery records.
- **Server-Side Safe URL & SSRF Validator**: Full protection against SSRF (RFC 1918, CGNAT, IPv6 ULA/link-local, cloud metadata `169.254.169.254` / `metadata.google.internal`), bounded redirects (max 5), strict timeouts, and bounded payload streaming.
- **Deterministic Listing Verifier**: Analyzes live job posting HTML for company match, title keywords, expiration cues ("position filled", "no longer accepting applications", 404), and enterprise ATS domains (Greenhouse, Lever, Ashby, Workday, etc.).
- **Smart Deduplication V2**: Strips tracking parameters (`utm_*`, `gh_src`, `ref`) for canonical URL matching and deduplicates across active pipeline opportunities, saved, promoted, and dismissed jobs.
- **Scheduled Multi-User Automation**: Server-side Vercel Cron worker (`/api/discovery/cron`) secured by `CRON_SECRET` and elevated service role execution for batch scheduled job discovery across active cloud subscribers.

### 3. 🤖 Live Gemini Two-Step Fit Analysis Engine (V2.1)
- **Independent Requirement Extraction**: Pure JD parser extracts and freezes required vs. preferred qualifications strictly from the job posting before candidate matching begins.
- **Evidence-Grounding Validator**: Automatically filters AI citations to ensure zero fabricated achievements. Every qualification match is strictly grounded in real candidate evidence IDs.
- **Explainable Scoring Math**: Weighted qualification math (2x weight on Required, 1x on Preferred) guaranteeing recommendation parity (>=85% Apply, 70-84% Network First, 50-69% Monitor, <50% Deprioritize).
- **Transient Failover & Resilience**: Primary `gemini-3.7-flash` with automatic transient retry (3 attempts) and graceful live failover to `gemini-3.6-flash` and deterministic heuristic fallback.

### 4. 🌐 Professional Network & LinkedIn Intelligence (V2.0 & V2.1)
- **Connection Ingestion**: Robust CSV/XLSX parser with automatic header row detection after arbitrary informational preamble rows (supporting 3,400+ connections).
- **Deterministic Contact Ranking**: Transparent heuristic ranking (Exact Company Match > Seniority Level > Domain Alignment > Talent/Recruiting Role > Title Overlap).
- **Contextual Opportunity Deep Linking**: Navigating to `/network?opportunityId=<id>` or `/network?company=<company>` focuses directory on company matches, displays contextual return banner, and provides clear reset CTA.
- **Warm Outreach Intelligence**: Displays top ranked contacts on opportunity evaluation cards and one-click creates duplicate-safe custom action items.

### 5. 📋 Kanban Opportunity CRM & Real Creation (V2.0 & V2.1)
- **+ Add Opportunity Workspace**: Create custom opportunities via manual entry, pasted JD, or safe SSRF-protected URL fetching (`/api/opportunity/fetch-url`).
- **Save vs. Analyze & Save**: Save un-analyzed `Identified` pipeline cards or immediately trigger full candidate fit evaluation.
- **Drag-and-Drop Pipeline**: Powered by `@dnd-kit` across 6 lifecycle stages (`Identified`, `Applied`, `Screening`, `Interviewing`, `Offer`, `Archived`).
- **Accessible Interactions**: Keyboard navigation, screen-reader coordinates, and accessible "Move to..." fallback menus.

### 6. 📄 Structured Résumé Ingestion & Knowledge Base (V2.0)
- **Multi-Format Parsing**: Ingests PDF (`pdf-parse`), Word DOCX (`mammoth`), and raw text files, as well as pasted text.
- **Local-First PDF Extraction**: Extracts text locally before passing to Gemini for structured extraction.
- **Merge or Replace Control**: Selectively merge new roles/skills into existing profiles or replace candidate profile with full data isolation.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router & Turbopack)
- **UI & Interaction**: React 19, Tailwind CSS v4, `@dnd-kit/core`, `@dnd-kit/sortable`
- **Database & Auth**: Supabase PostgreSQL with RLS, Supabase Auth SSR SDK (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI & Grounding**: Google Gemini 3.7 Flash & 3.6 Flash (`@google/genai` official SDK) with Google Search Grounding (`googleSearch`)
- **Validation & Security**: Zod 4 Schemas, SSRF Safe Validator, Deterministic Listing Verifier
- **Parsing**: `papaparse`, `xlsx`, `mammoth`, `pdf-parse`
- **Testing & Quality Gate**: Vitest 4 (302 Unit Tests), Playwright 1.62 (25 E2E Tests), ESLint 9

---

## 🚦 Getting Started

### Prerequisites
- Node.js 20+ (recommended Node 24)
- Google Gemini API Key (optional for live AI evaluation)
- Supabase Project (optional for multi-device cloud persistence)

### Installation
```bash
git clone https://github.com/tichikosi/career-command-center.git
cd career-command-center
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local` and provide your API keys:
```bash
cp .env.example .env.local
```

```bash
# 1. Google Gemini AI Engine
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-3.7-flash"
GEMINI_FAILOVER_MODEL="gemini-3.6-flash"

# 2. Supabase Cloud Persistence (Optional, defaults to local-first browser storage)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# 3. Scheduled Discovery Security
CRON_SECRET="your-secure-random-cron-secret-token"
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
# Full automated QA gate (Lint + Unit Tests + Next.js Build + Playwright E2E + Git Diff Check)
npm run qa

# Unit tests only (302 tests across 29 test suites)
npm run test:unit

# Playwright E2E tests only (25 tests across 6 specs)
npm run test:e2e

# AI Evaluation & Governance Benchmark
npm run eval
```

---

## 🚀 Production Operations Guide

### 1. Vercel Deployment
To link and deploy to Vercel:
```bash
# 1. Authenticate with Vercel
npx vercel login

# 2. Link project
npx vercel link

# 3. Deploy Preview
npx vercel

# 4. Deploy Production
npx vercel --prod
```

### 2. Supabase URL Configuration
In the **Supabase Dashboard** -> **Authentication** -> **URL Configuration**:
- **Site URL**: `https://<your-project>.vercel.app`
- **Redirect URLs**:
  - `https://<your-project>.vercel.app/**`
  - `https://*-<your-team>.vercel.app/**` (for preview branches)
  - `http://localhost:3000/**` (for local development)

### 3. Vercel Cron Inspection
Vercel automatically detects `vercel.json` and schedules:
- **Path**: `/api/discovery/cron`
- **Schedule**: `0 14 * * 1-5` (9:00 AM EST Mon-Fri)
- **Headers**: Vercel automatically passes `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is added to Vercel Environment Variables.
