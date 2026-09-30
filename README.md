# Career Command Center v3.4

> **AI-Native Career Operating System: Voice Interview Intelligence, Speech Delivery Metrics, Interview War Room, Mock Interview Simulator, Forward Activity Timeline, Smart Follow-Up Engine, Supabase Cloud Persistence & Executive Recruiting CRM**
> Built for senior executives, strategy leaders, and operations practitioners.

---

## 🌟 Executive Overview

Career Command Center transforms fragmented career searches into an evidence-based, structured intelligence workflow. It couples a live **Gemini 3.8 / 3.7 Flash** evaluation engine with official **Google Search Grounding (`tools: [{ googleSearch: {} }]`)**, server-side SSRF URL validation, deterministic ATS listing verification, **Supabase PostgreSQL cloud persistence with Row Level Security (RLS)**, multi-device cloud authentication, structured résumé ingestion, professional network intelligence, and an accessible Kanban CRM.

In **V3.4**, Career Command Center elevates the interview simulator into a full **Voice Interview Intelligence** system featuring **in-browser microphone capture**, **real-time speech-to-text preview**, **editable canonical transcript buffers**, **deterministic speech delivery metrics (WPM, filler rate, pause analysis)**, **dual Content (6 dimensions) vs Delivery (6 dimensions) scoring**, **Interviewer Personas**, **historical performance analytics**, and **ephemeral raw audio privacy by default**.

---

## 🚀 Key Capabilities

### 1. 🎙️ Voice Interview Intelligence & Speech Delivery Metrics (V3.4)
- **Answer Mode Flexibility (`[ Type ] [ Speak ]`)**: Rehearse via text or speak naturally using browser microphone capture.
- **Observable Speech Delivery Metrics**:
  - *Words Per Minute (WPM)*: Pacing evaluation against executive speaking reference band (130–165 WPM).
  - *Filler-Word Analysis*: Conservative detection of common fillers (`um`, `uh`, `basically`, `like`, `you know`) with rate per minute calculation.
  - *Pause Analysis*: Real audio silence interval measurement without fabricating unobservable values.
  - *Verbosity & Concision*: Response length classification (`too_brief`, `appropriate`, `potentially_overlong`).
- **Canonical Editable Transcript Buffer**: Candidate spoken transcripts are reviewed and editable prior to evaluation, ensuring only reviewed answers are scored.
- **Dual Scorecards & Question-Aware Weighting**:
  - Content Score (6 dimensions: Relevance, Evidence Specificity, Strategic Depth, Executive Comms, Structure, Concision).
  - Delivery Score (6 dimensions: Pace, Verbal Concision, Filler Control, Pausing, Clarity, Executive Delivery).
  - Question-aware weighting (e.g., Behavioral 75/25, Strategic 70/30, Culture 60/40, Text 100/0).
- **Interviewer Personas & Question Sets**: Recruiter, Hiring Manager, Executive / VP, Behavioral Coach, Peer / Tech Lead (~33% shared anchor questions, ~67% persona-specific questions).
- **Adaptive Live Simulation (Preview)**: Server-mediated conversational interview mode that evaluates candidate responses and dynamically generates contextual follow-ups probing metrics, personal ownership, strategic trade-offs, and stakeholder alignment according to the active persona.
- **Performance Analytics & Comparison**: Historical trend visualization across sessions and two-session comparison with metric deltas.
- **Ephemeral Audio Privacy by Default**: Raw microphone audio is held strictly in-memory during recording and never persisted to Supabase, localStorage, Vercel, or logs.

### 2. ⚔️ Interview War Room & Executive Readiness (V3.3 & V3.4)
- **Executive Role Brief & Positioning**: Strategic synthesis of the hiring mandate aligned directly to verified candidate narrative.
- **Executive Readiness Score (0–100)**: Multi-dimensional readiness index evaluating role understanding, positioning, story bank preparation, gap mitigation, company knowledge, and question readiness.
- **Grounded STAR Story Bank**: Verified achievements from candidate evidence mapped to anticipated competency, leadership, and operational questions.
- **Defensive Gap Mitigation**: Grounded framing bridges addressing identified experience or domain gaps.
- **Panel Questions & Risk Flags**: Curated high-signal questions to ask interviewers and strategic risk flags to navigate.
- **Staleness Detection**: Automated change detection when candidate profile or opportunity requirements update after initial brief generation.

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
- **AI & Grounding**: Google Gemini 3.8 Flash & 3.7 Flash (`@google/genai` official SDK) with Google Search Grounding (`googleSearch`)
- **Validation & Security**: Zod 4 Schemas, SSRF Safe Validator, Deterministic Listing Verifier
- **Testing & Quality Gate**: Vitest 4 (411 Unit Tests across 43 suites), Playwright 1.62 (36 E2E Tests across 7 specs), ESLint 9

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
GEMINI_MODEL="gemini-3.8-flash"
GEMINI_FAILOVER_MODEL="gemini-3.7-flash"

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

# Unit tests only (411 tests across 43 test suites)
npm run test:unit

# Playwright E2E tests only (36 tests across 7 specs)
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
