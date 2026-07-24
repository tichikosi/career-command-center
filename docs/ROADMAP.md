# Career Command Center — Product Roadmap & Phase Specification

## 1. Overview & Phased Progression

The **Career Command Center** product strategy follows a disciplined, multi-phase evolution. This roadmap strictly separates the initial portfolio demonstration release (**Version 1**) from future capabilities (**Version 2 and beyond**).

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│        PHASE 1          │     │        PHASE 2          │     │        PHASE 3          │     │        PHASE 4          │
│ Version 1 Public Demo   │────>│  Live LLM Integration   │────>│   Cloud Persistence     │────>│ Ecosystem Integrations  │
│  (Current Scope V1)     │     │    & Custom Profiles    │     │   & User Accounts       │     │  (Email/Cal/LinkedIn)   │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

---

## 2. Detailed Phase Specifications

### Phase 1: Version 1 Public Portfolio Demo (Current Scope)
- **Goal**: Deliver a portfolio-quality, client-side interactive web application demonstrating high-fidelity UI/UX, evidence-backed career fit analysis, and pipeline management.
- **Core Scope**:
  - Next.js App Router, TypeScript, Tailwind CSS frontend.
  - 100% synthetic candidate profile (`Alex Vance`) and pre-loaded sample job descriptions.
  - Client-side deterministic evaluation engine producing all 18 mandatory analysis report sections.
  - Browser `localStorage` persistence.
  - 6 Core pages: Dashboard, Analyze a Role, Analysis Results, Opportunities, Candidate Profile, About the Project.
- **Explicit Exclusions in V1**:
  - No live LLM external API calls or API keys.
  - No external database (PostgreSQL / Firestore).
  - No user authentication or login system.
  - No résumé file uploading (PDF/Docx).
  - No external scraping or API integrations.

---

### Phase 2: Live LLM Engine & Custom Candidate Ingestion (Version 2)
- **Goal**: Enable real-time AI evaluation using Gemini API and allow users to upload custom candidate profiles.
- **Key Features**:
  - Swappable `FitAnalysisEngine` implementation connecting to the Gemini API (or configurable model provider).
  - PDF & Docx custom résumé parsing into the structured `CandidateProfile` schema.
  - Interactive analysis customization (allowing users to adjust mandate assumptions).
  - Headless evaluation runner (`npm run eval`) for benchmarking LLM output accuracy.
  - Kanban board view for the Opportunities pipeline with drag-and-drop stage management.

---

### Phase 3: Cloud Persistence, Accounts & Multi-Tenancy (Version 3)
- **Goal**: Transition from client-side browser storage to a secure multi-tenant cloud application.
- **Key Features**:
  - User authentication (Passkeys, OAuth 2.0).
  - Cloud database (PostgreSQL via Supabase or Cloud SQL).
  - Encrypted storage for candidate profiles and job application history.
  - Collaborative sharing (allowing candidates to share fit reports with mentors/coaches).

---

### Phase 4: Ecosystem & Active Pipeline Automation (Version 4+)
- **Goal**: Integrate with external communication and workflow platforms.
- **Key Features**:
  - Calendar integration for interview scheduling and debrief tracking.
  - Email notification digests for pipeline reminders.
  - Export capabilities (PDF executive summary downloads, Markdown exports).
  - *Strict Policy*: No non-compliant scraping or unauthorized third-party automation.

---

## 3. Prioritization Framework & Trade-Off Principles

To maintain scope discipline, all feature requests are evaluated against three core principles:

1. **Rigor Over Automation**: High-precision evidence mapping is prioritized over automated bulk applying.
2. **Privacy Over Friction**: Local, client-controlled processing is prioritized over invasive background sync.
3. **Executive Aesthetics Over Complexity**: Clean, spacious UI hierarchy is prioritized over busy dashboards or arbitrary widgets.

---

## 4. Acceptance Criteria

- [ ] Version 1 implementation strictly enforces Phase 1 boundaries with zero leaked scope from Phase 2–4.
- [ ] Technical architecture preserves clean abstraction layers ensuring smooth Phase 2 engine upgrade.
- [ ] Roadmap explicitly communicates V1 constraints to portfolio reviewers.

---

## 5. Key Assumptions

- Delivering a polished, flawless V1 synthetic demo provides a stronger portfolio signal than an incomplete app attempting live API integration without proper guardrails.

---

## 6. Unresolved Questions

- *PDF Export in V1*: Should client-side PDF export of the Fit Analysis Report be included in V1 or deferred to V2? *(Recommended: Standard browser print stylesheet in V1, native PDF generator in V2)*.
