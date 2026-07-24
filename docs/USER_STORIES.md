# Career Command Center — User Stories & Acceptance Criteria

## Overview

This document specifies user stories, acceptance criteria, and edge-case behaviors for **Career Command Center (Version 1)**. Stories are organized by core user workflow epics.

---

## Target Persona

- **Title**: Senior Strategic Professional (e.g., Director of RevOps, AI Strategy Lead, Chief of Staff, Senior Strategy & Operations Manager)
- **Goal**: Evaluate job opportunities efficiently, understand precise qualification fit based on verifiable experience, prepare high-impact interview materials, and track active recruiting conversations.

---

## Epic 1: Candidate Profile Inspection

### Story 1.1: View Synthetic Candidate Profile
- **As a** user reviewing the platform capabilities,
- **I want to** inspect the synthetic candidate's complete background, achievements, and verified competencies,
- **So that** I understand the baseline evidence used for role comparison.

#### Acceptance Criteria
1. Navigation menu includes a clear link to **Candidate Profile**.
2. Candidate profile displays structured sections: Executive Summary, Target Roles, Core Competencies, Career History, and Verified Achievements.
3. Every achievement includes quantified impact metrics (e.g., "$14M ARR growth", "35% efficiency gain").
4. A prominent banner explicitly states: `Synthetic Candidate Profile for Portfolio Demonstration`.

---

## Epic 2: Role Analysis & Ingestion

### Story 2.1: Input Job Description for Analysis
- **As a** job seeker evaluating a new opportunity,
- **I want to** select a sample job description or paste custom job description text into the analyzer,
- **So that** I can trigger a structured fit evaluation against the candidate profile.

#### Acceptance Criteria
1. **Analyze a Role** page provides a selection of pre-loaded synthetic job descriptions (e.g., "Director of AI Strategy", "VP of Revenue Operations", "Head of Business Operations").
2. Page includes a text area allowing users to paste raw job description text.
3. Input validation blocks submission if text is less than 50 words.
4. "Analyze Role Fit" button initiates the analysis workflow with a visual processing indicator.

### Story 2.2: Untrusted Text Handling & Sanitization
- **As a** user pasting raw text from external sources,
- **I want** the system to safely sanitize input text,
- **So that** formatting bugs or unintended script injections do not break the application.

#### Acceptance Criteria
1. Pasted HTML formatting or scripts are stripped client-side.
2. Text exceeding 15,000 characters is truncated gracefully with an informational notice.

---

## Epic 3: Fit Analysis & Evidence Inspection

### Story 3.1: Review Structured Fit Analysis Report
- **As a** strategic job seeker,
- **I want to** view a structured fit report after role analysis completes,
- **So that** I can make a data-driven decision on whether to apply.

#### Acceptance Criteria
1. The **Analysis Results** page renders all 18 mandatory analytical sections specified in the product brief.
2. An **Overall Fit Score** badge (0-100%) displays with color-coded tiering:
   - 85–100%: Strong Alignment (Green)
   - 70–84%: Moderate Alignment (Amber)
   - <70%: Low Alignment / High Gap (Slate/Red)
3. A strategic recommendation tag (`Apply`, `Network First`, `Monitor`, `Deprioritize`) is prominently displayed.
4. Required vs. Preferred qualifications are formatted in side-by-side comparative tables.

### Story 3.2: Inspect Line-Item Evidence & Gaps
- **As a** candidate preparing applications,
- **I want to** see explicit evidence citations for every match claim and clear labels for missing or unverified items,
- **So that** I know exactly where my background aligns and where I might face objections.

#### Acceptance Criteria
1. Strongest Matches display clickable links or citations referencing specific items in the candidate profile.
2. Qualifications without explicit evidence in the profile are clearly tagged as `Unverified` (not assumed false).
3. Material Gaps are explicitly distinguished from minor missing skills.

---

## Epic 4: Interview Preparation Generation

### Story 4.1: Role-Specific Interview Questions & Objection Strategies
- **As a** candidate preparing for recruiter and hiring manager calls,
- **I want to** access role-tailored questions, hiring objection strategies, and STAR stories,
- **So that** I can position my experience effectively.

#### Acceptance Criteria
1. Analysis report includes 3-5 tailored **Recruiter-Screen Questions** and 3-5 strategic **Hiring-Manager Questions**.
2. **Likely Hiring Objections** section outlines potential interviewer concerns alongside recommended counter-positioning statements.
3. **Recommended STAR Stories** section provides at least 2 structured Situation-Task-Action-Result narratives pulled directly from candidate evidence.

---

## Epic 5: Pipeline & Opportunity Management

### Story 5.1: Save Opportunity to Pipeline
- **As a** user managing multiple opportunities,
- **I want** analyzed roles to automatically save to my local pipeline,
- **So that** I can track my active career pipeline.

#### Acceptance Criteria
1. Upon completing an analysis, the role is saved to `localStorage` under active opportunities.
2. **Opportunities** page displays all saved roles with key metrics: Role Title, Company, Target Mandate, Fit Score, Recommendation, and Pipeline Stage (`Identified`, `Applied`, `Screening`, `Interviewing`, `Offer`, `Archived`).
3. User can change opportunity pipeline stage directly from the Opportunities table.
4. User can delete or archive an opportunity.

### Story 5.2: Pipeline Overview Dashboard
- **As a** user opening the application,
- **I want to** see an executive summary dashboard of my active career pipeline,
- **So that** I can quickly prioritize my daily actions.

#### Acceptance Criteria
1. **Dashboard** displays summary metrics: Total Opportunities, High-Fit Roles (>=85%), Pending Action Items, and Pipeline Breakdown by Stage.
2. **Pending Action Items** is defined as: the count of non-archived opportunities with non-empty `nextActions` arrays.
3. Displays recent analysis activity and quick-action links ("Analyze New Role", "View Pipeline").

### Story 5.3: Empty Pipeline State
- **As a** first-time visitor with no analyzed opportunities,
- **I want to** see a clear, helpful empty state on the Dashboard and Opportunities pages,
- **So that** I understand how to get started rather than seeing a blank or broken interface.

#### Acceptance Criteria
1. **Dashboard** displays a welcome message and a prominent "Analyze Your First Role" call-to-action when zero opportunities exist in `localStorage`.
2. **Opportunities** page displays an empty-state message (e.g., "No opportunities analyzed yet") with a link to the Analyze a Role page.
3. Summary metric cards display zeros gracefully (e.g., "0 Total Opportunities") without visual breakage.

### Story 5.4: Reset Demo Data
- **As a** user who wants to restart the demo experience,
- **I want to** clear all locally stored data and restore the initial synthetic state,
- **So that** I can explore the demo from a clean starting point.

#### Acceptance Criteria
1. A "Reset Demo Data" action is accessible from the Dashboard or application settings.
2. Triggering reset clears all `ccc_*` keys from `localStorage`.
3. After reset, the application reloads to its initial state with default synthetic data pre-populated.
4. A confirmation dialog prevents accidental resets.

### Story 5.5: localStorage Unavailable or Disabled
- **As a** user in a restricted browser environment (e.g., strict incognito mode, disabled storage),
- **I want** the application to degrade gracefully,
- **So that** I can still view the interface and understand the product without encountering errors.

#### Acceptance Criteria
1. If `localStorage` is unavailable, the application displays a non-blocking notice explaining that data persistence is disabled.
2. Core navigation and static pages (Candidate Profile, About the Project) remain fully functional.
3. Analysis can still be triggered and viewed in the current session, but a notice warns that results will not persist after page reload.
4. No unhandled JavaScript exceptions are thrown due to storage access failures.

---

## Epic 6: Transparency & Project Meta Information

### Story 6.1: Review Project Architecture & Portfolio Background
- **As a** hiring manager, engineer, or portfolio reviewer evaluating this project,
- **I want to** read a comprehensive overview of the project's purpose, architecture, and design discipline,
- **So that** I can assess the candidate's product thinking, AI strategy, and engineering rigor.

#### Acceptance Criteria
1. **About the Project** page includes all of the following sections:
   - **Problem & Motivation**: Why senior professionals need structured role evaluation beyond keyword matching.
   - **Target User**: Description of the intended user persona.
   - **Product Principles**: The three prioritization principles (Rigor Over Automation, Privacy Over Friction, Executive Aesthetics Over Complexity).
   - **Core Workflow**: Summary of the end-to-end analysis workflow.
   - **Technical Architecture Summary**: Tech stack, client-side execution model, and engine abstraction.
   - **Evidence-Grounding Approach**: How the system ensures citations, prevents unsupported candidate claims, and classifies match types.
   - **Privacy Commitments**: Summary of the data hygiene protocol and prohibited data list.
   - **What Is Synthetic**: Clear explanation of what data is synthetic and why.
   - **Current Limitations**: Honest disclosure of V1 constraints (deterministic engine, keyword fallback limitations, no LLM).
   - **Roadmap**: High-level summary of planned phases.
   - **Source Code**: Link to the GitHub repository.
2. The page does not contain fake testimonials, fake usage metrics, or inflated claims.
3. The page renders the synthetic data disclaimer banner consistent with all other pages.

---

## Version 1 vs. Future Version Feature Matrix

| Feature / Capability | Version 1 (Current Scope) | Future Roadmap (V2+) |
| :--- | :--- | :--- |
| **Data Baseline** | Synthetic candidate profile & pre-loaded JDs | Custom user résumé upload (PDF/Docx) |
| **Analysis Engine** | Client-side deterministic synthetic engine | Live Gemini / LLM API integration |
| **Storage** | Browser `localStorage` | Cloud database (PostgreSQL / Firestore) |
| **User Authentication** | None (Single public demo session) | Multi-tenant user auth (OAuth / Passkeys) |
| **External Integrations** | None | Calendar, Gmail, LinkedIn automation |

---

## Key Assumptions & Dependencies

1. **Browser Persistence**: User browser supports standard HTML5 `localStorage`.
2. **Synthetic Accuracy**: Pre-loaded synthetic evaluation fixtures provide sufficient variety to demonstrate all UI states realistically.

---

## Unresolved Questions

1. *Opportunity Editing*: Should V1 allow users to manually edit the generated fit score or recommendation notes after creation? *(Recommended: Allow editing notes/stage, lock raw fit score)*.
