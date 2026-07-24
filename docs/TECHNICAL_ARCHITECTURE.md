# Career Command Center — Technical Architecture & Design System

## 1. Technology Stack Specification

| Layer | Framework / Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router) | Standard React framework with modern file-based routing and layout system. |
| **Language** | TypeScript (Strict Mode) | Ensures strict end-to-end type safety across domain models and components. |
| **Styling** | Tailwind CSS | Utility-first styling framework enabling a bespoke, executive design system. |
| **Icons** | Lucide React | Clean, minimalist, modern stroke icons matching an executive UI. |
| **Persistence** | Browser `localStorage` | Pure client-side zero-dependency persistence for V1. |

---

## 2. System Architecture (Client-Side V1)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js App Router                            │
│                                                                        │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐   │
│   │ Dashboard    │     │ Analyze Role │     │ Analysis Results     │   │
│   │ Page         │     │ Page         │     │ Page                 │   │
│   └──────┬───────┘     └──────┬───────┘     └──────────┬───────────┘   │
│          │                    │                        │               │
│          └────────────────────┼────────────────────────┘               │
│                               │                                        │
│                               ▼                                        │
│                  ┌─────────────────────────┐                           │
│                  │ Opportunity State Store │                           │
│                  └────────────┬────────────┘                           │
│                               │                                        │
│                               ▼                                        │
│                  ┌─────────────────────────┐                           │
│                  │  Fit Analysis Engine    │                           │
│                  │  (Abstract Interface)   │                           │
│                  └────────────┬────────────┘                           │
│                               │                                        │
│         ┌─────────────────────┴─────────────────────┐                  │
│         ▼                                           ▼                  │
│  ┌──────────────┐                          ┌─────────────────┐         │
│  │ Synthetic    │                          │ External LLM    │         │
│  │ Rule Engine  │                          │ Engine API      │         │
│  │ (V1 Active)  │                          │ (V2 Ready)      │         │
│  └──────────────┘                          └─────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Fit Analysis Engine Abstraction

To strictly adhere to the rule that AI integration occurs only after the non-AI interface works, Career Command Center uses an abstract `IFitAnalysisEngine` TypeScript interface.

```typescript
export interface AnalysisInput {
  jobTitle: string;
  company: string;
  jobDescription: string;
  location?: string;
  compensation?: string;
  sourceUrl?: string;
}

export interface IFitAnalysisEngine {
  analyzeRole(
    input: AnalysisInput,
    candidateProfile: CandidateProfile
  ): Promise<FitAnalysisReport>;
}

// V1 Implementation: Deterministic Synthetic Engine
export class DeterministicSyntheticEngine implements IFitAnalysisEngine {
  async analyzeRole(
    input: AnalysisInput,
    candidateProfile: CandidateProfile
  ): Promise<FitAnalysisReport> {
    // 1. Sanitize input.jobDescription text
    // 2. Check fixture registry for pre-authored sample match
    // 3. If no fixture match, run keyword-extraction fallback
    // 4. Apply fit score methodology to assembled qualification matches
    // 5. Return fully structured 18-section FitAnalysisReport
  }
}
```

This pattern ensures that swapping the engine for a live LLM API in V2 requires changing zero UI components or data schemas.

### 3.1 Version 1 Engine Strategy: Hybrid Fixture + Keyword Fallback

The V1 `DeterministicSyntheticEngine` uses a two-tier hybrid strategy to produce realistic analysis output without requiring an LLM backend.

#### Tier 1: Pre-Authored Fixture Responses (Sample Job Descriptions)

For the 3–5 pre-loaded synthetic sample job descriptions, the engine returns **complete, pre-authored `FitAnalysisReport` objects** stored as structured JSON fixtures. These fixtures are manually crafted to:

- Populate all 18 mandatory report sections with realistic, detailed content.
- Demonstrate all four match types (`Strong Match`, `Partial Match`, `Material Gap`, `Unverified`) across the fixture set.
- Contain valid `supportingEvidenceCitationIds` referencing real `citationId` values in the synthetic candidate profile.
- Cover the full recommendation spectrum (`Apply`, `Network First`, `Monitor`, `Deprioritize`).

**Fixture selection**: When the user selects a sample role, the engine performs an exact key lookup against the fixture registry and returns the corresponding pre-authored report.

#### Tier 2: Keyword-Extraction Fallback (Custom-Pasted Job Descriptions)

When the user pastes a custom job description that does not match any fixture key, the engine applies a **lightweight, deterministic keyword-extraction pipeline**:

1. **Text Normalization**: Sanitize input, lowercase, and tokenize into phrases.
2. **Requirement Signal Extraction**: Scan for common qualification patterns (e.g., "X+ years of…", "experience with…", "proficiency in…", degree requirements) using string-matching heuristics.
3. **Competency Index Matching**: Compare extracted signals against a structured **Candidate Competency Index** — a lookup table mapping keywords and phrases to specific `citationId` values and match types in the synthetic candidate profile.
4. **Report Assembly**: Construct a `FitAnalysisReport` from matched and unmatched signals. Matched signals receive `Strong Match` or `Partial Match` with valid evidence citations. Unmatched signals are classified as `Unverified`.
5. **Template Sections**: Positioning narrative, STAR stories, recruiter questions, and hiring-manager questions use **template-based generation** with variable substitution from matched evidence rather than dynamic natural-language generation.
6. **Score Calculation**: Apply the fit score methodology (defined in PRODUCT_BRIEF.md) to the assembled qualification matches.

#### Explicit Limitations of the Keyword Fallback

The Tier 2 fallback **does not**:

- Perform semantic understanding of job descriptions.
- Infer role mandates beyond basic title and keyword analysis.
- Detect nuanced context, seniority implications, or industry-specific jargon.
- Generate original natural-language positioning narratives or STAR stories. These use templates with variable substitution.
- Produce output comparable to LLM-powered analysis. Custom-pasted JD results will contain more `Unverified` items and less specific interview preparation content than fixture-based results.

These limitations are acceptable for a portfolio demonstration. The About the Project page will disclose that custom-pasted JD analysis uses simplified heuristics. The abstract `IFitAnalysisEngine` interface ensures that replacing this engine with a live LLM in Version 2 requires zero changes to UI components or data schemas.

---

## 4. Client Storage & Persistence Architecture

A custom React hook (`useOpportunities`) wraps all interactions with `localStorage`, providing fallback handling, JSON schema validation, and reactivity.

### Persistence Guidelines
- Key structure: `ccc_opportunities_v1`.
- Automatic initialization with default synthetic opportunity records if storage is empty.
- Error boundary fallback if `localStorage` access is restricted (e.g. strict incognito mode).

---

## 5. Input Sanitization & Security Pipeline

Job descriptions supplied by users are treated as **untrusted input**.

### Security Rules
1. **HTML & Script Removal**: All input text passes through plain-text sanitization, stripping tags, scripts, and embedded HTML entities.
2. **Length Guardrails**: Input text is constrained to a minimum of 50 words and maximum of 15,000 characters.
3. **No Dynamic Execution**: Input text is rendered exclusively as sanitized string nodes within standard React JSX (no `dangerouslySetInnerHTML`).

---

## 6. Executive UI/UX Design System Guidelines

Career Command Center implements a custom design system tailored for executive presentation:

### Aesthetic & Layout Principles
- **Executive & Professional**: High contrast typography, dark/light balanced theme with slate, navy, and muted indigo accents.
- **Spacious & Minimal**: Generous padding (`p-6`, `gap-8`), uncluttered visual hierarchy, and distinct section borders.
- **Zero Cheap Aesthetic Elements**:
  - No generic robot icons or sci-fi AI vector art.
  - No fake customer logos, testimonials, or usage metrics.
  - No imitation of popular AI chat product branding.
  - No unnecessary decorative charts or gauges.
- **Accessible & Responsive**: Fully accessible contrast ratios (WCAG AA standard) and responsive layout down to mobile viewports.

### Design Tokens (Tailwind Config Preview)
- **Primary Text**: `slate-900`
- **Secondary Text**: `slate-600` / `slate-500`
- **Background Layer**: `bg-slate-50` / `bg-white`
- **Accent Highlighting**: `indigo-900` / `slate-800`
- **Status Badges**:
  - Apply / High Match: `emerald-700` text on `emerald-50` bg
  - Network / Moderate: `amber-700` text on `amber-50` bg
  - Deprioritize / Gap: `slate-600` text on `slate-100` bg

---

## 7. Acceptance Criteria

- [ ] Codebase compiles under TypeScript Strict Mode with zero implicit `any` types.
- [ ] Analysis engine interface completely decouples UI components from the underlying parsing engine.
- [ ] All user inputs pass through plain-text sanitization.
- [ ] UI styling strictly adheres to the executive design principles without generic AI tropes.

---

## 8. Key Assumptions

- Next.js App Router client components handles local state updates cleanly without requiring third-party global state managers (like Redux or Zustand).

---

## 9. Unresolved Questions

- *Theme Mode*: Should V1 support a toggleable dark mode, or launch with a unified executive light theme? *(Recommended: High-contrast executive light/slate theme for V1)*.
