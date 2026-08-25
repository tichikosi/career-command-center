# Career Command Center v3.3

> **AI-Native Career Operating System: Grounded Opportunity Evaluation, Interview War Room, Mock Interview Simulator, Forward Activity Timeline, Smart Follow-Up Engine, Supabase Cloud Persistence & Executive Recruiting CRM**
> Built for senior executives, strategy leaders, and operations practitioners.

---

## 🌟 Executive Overview

Career Command Center transforms fragmented career searches into an evidence-based, structured intelligence workflow. It couples a live **Gemini 3.7 / 3.6 Flash** evaluation engine with official **Google Search Grounding (`tools: [{ googleSearch: {} }]`)**, server-side SSRF URL validation, deterministic ATS listing verification, **Supabase PostgreSQL cloud persistence with Row Level Security (RLS)**, multi-device cloud authentication, automated local-to-cloud migration, structured résumé ingestion, professional network intelligence, and an accessible Kanban CRM.

In **V3.3**, Career Command Center completes the end-to-end career lifecycle with the **Interview War Room**, **Interactive Mock Interview Simulator with 6-Dimension AI Coaching**, **Forward-Only Activity Timeline**, **Deterministic Smart Follow-Up Engine**, and **Comprehensive Dashboard Application Intelligence**.

---

## 🚀 Key Capabilities

### 1. ⚔️ Interview War Room & Executive Readiness (V3.3)
- **Executive Role Brief & Positioning**: Strategic synthesis of the hiring mandate aligned directly to verified candidate narrative.
- **Executive Readiness Score (0–100)**: Multi-dimensional readiness index evaluating role understanding, positioning, story bank preparation, gap mitigation, company knowledge, and question readiness.
- **Grounded STAR Story Bank**: Verified achievements from candidate evidence mapped to anticipated competency, leadership, and operational questions.
- **Defensive Gap Mitigation**: Grounded framing bridges addressing identified experience or domain gaps.
- **Panel Questions & Risk Flags**: Curated high-signal questions to ask interviewers and strategic risk flags to navigate.
- **Staleness Detection**: Automated change detection when candidate profile or opportunity requirements update after initial brief generation.

### 2. 🎙️ Interactive Mock Interview Simulator & 6-Dimension AI Coaching (V3.3)
- **Interactive Practice Console**: Practice anticipated interview questions one by one across behavioral, strategic, and leadership categories.
- **6-Dimension AI Evaluation**:
  - *Relevance*: Alignment with question intent.
  - *Evidence Specificity*: Concrete facts, metrics, and outcomes.
  - *Strategic Depth*: Executive perspective and systemic thinking.
  - *Executive Communication*: Tone, presence, and articulation.
  - *Structure*: Coherent STAR framework.
  - *Concision*: Economy of language and signal density.
- **Truth-Preserving Improved Framing**: AI suggests structural enhancements and executive phrasing without fabricating candidate facts or scope.
- **Resilient Coaching Fallback**: Transparently transitions to clearly labeled `Simplified Interview Coaching` heuristic mode if AI services are unavailable.

### 3. ⏱️ Activity Timeline & Touchpoint Ledger (V3.3)
- **Forward-Only Activity Ledger**: Chronological tracking of recruiter calls, screening dates, scheduled and completed interviews, thank-you notes, offers, and decisions.
- **Professional Network Linking**: Direct association between timeline activities and contacts from the candidate's Professional Network.
- **Scheduled Interview Modal**: Date, time, interview type, and contact auto-fill.

### 4. 📬 Deterministic Smart Follow-Up Engine (V3.3)
- **Rules-Based Follow-Up Urgency**: Deterministic evaluation of follow-up priorities (Overdue explicit dates, Post-Interview Thank-You required, Application Silence, Recruiter Silence, Referral Nudges).
- **AI Follow-Up Drafter**: Composes executive follow-up communications across Professional, Warm, and Assertive tones.
- **Human-in-the-Loop Safeguard**: Explicitly no automated email/LinkedIn sending; all outreach is user-reviewed and recorded.

### 5. 📊 Dashboard Application Intelligence & Next Best Career Action (V3.3)
- **Upcoming Interviews Calendar & Follow-Ups Due**: Immediate visibility into active touchpoints and critical dates.
- **Next Best Career Action**: Deterministic prioritization engine answering: *"What should I focus on next?"*

### 6. ☁️ Supabase Cloud Persistence & Multi-Device Sync (V3.2 & V3.3)
- **Multi-Tenant Security**: PostgreSQL tables protected by Row Level Security (RLS) enforcing `auth.uid() = user_id`.
- **Dual Storage Architecture**: Authenticated accounts sync across devices in cloud PostgreSQL; unauthenticated visitors run completely in browser `localStorage`.

### 7. 🧭 Grounded Job Discovery & AI Role Fit Analysis (V2.x & V3.x)
- **Google Search Grounded Discovery**: Real-time live listing discovery with SSRF protection and provenance state machine (`Verified Live`, `Grounded`, `Curated / Demo`).
- **Two-Step Fit Analysis**: Requirement extraction frozen prior to candidate matching, weighted fit scoring, and strict citation validation.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router & Turbopack)
- **UI & Interaction**: React 19, Tailwind CSS v4, `@dnd-kit/core`, `@dnd-kit/sortable`
- **Database & Auth**: Supabase PostgreSQL with RLS, Supabase Auth SSR SDK (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI & Grounding**: Google Gemini 3.7 Flash & 3.6 Flash (`@google/genai` official SDK) with Google Search Grounding (`googleSearch`)
- **Validation & Security**: Zod 4 Schemas, SSRF Safe Validator, Deterministic Listing Verifier
- **Testing & Quality Gate**: Vitest 4 (339 Unit Tests), Playwright 1.62 (30 E2E Tests), ESLint 9

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

# Unit tests only (339 tests across 37 test suites)
npm run test:unit

# Playwright E2E tests only (30 tests across 7 specs)
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
