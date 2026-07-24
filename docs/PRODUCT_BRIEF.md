# Career Command Center — Product Brief

## 1. Executive Summary & Purpose

**Career Command Center** is an executive-grade career evaluation and opportunity management system designed for AI-powered analysis. Built specifically for senior strategic professionals (such as AI Strategy, GTM Ops, BizOps, RevOps, Chief of Staff, and Program Management leaders), the system replaces subjective job-hunting with structured, evidence-based candidate-to-role matching. Version 1 operates with a deterministic synthetic analysis engine; Version 2 introduces live LLM-powered analysis.

Rather than relying on superficial keyword matching or generic résumé optimization, Career Command Center systematically analyzes target job mandates, extracts required and preferred qualifications, checks candidate evidence line-by-line, identifies hiring objections, generates targeted interview preparation material, and tracks pipeline progress locally in the browser.

---

## 2. Target User Persona

The primary target user is a senior individual contributor or Director-level professional seeking roles in:

- **AI Strategy & AI Enablement**
- **GTM Strategy & Operations / Revenue Operations**
- **Marketing Operations & Business Operations**
- **Strategy & Operations / Chief of Staff**
- **Senior Program Management & Strategic Execution**

### User Attributes & Needs
- **High Complexity Experience**: Possesses non-linear achievements, cross-functional leadership, and quantified business impact that traditional applicant tracking systems (ATS) frequently misinterpret.
- **Strategic Rigor**: Requires objective alignment feedback, hiring objection analysis, and tailored positioning narratives before investing time in applications.
- **Privacy Consciousness**: Demands strict control over career history data and prefers client-side processing without third-party data retention.

---

## 3. Version 1 Public Demo Scope

The initial release (Version 1) is a high-fidelity, interactive public portfolio demonstration.

### Scope Boundaries
- **Synthetic Data Baseline**: All candidate profile data, sample job descriptions, and pipeline records in the public demo use 100% synthetic data.
- **Client-Side Processing**: Operates entirely inside the browser using `localStorage`. No external database, user login, or server state is required.
- **Static & Synthetic AI Interface Engine**: Operates via a deterministic client-side evaluation engine utilizing structured synthetic evaluation rules and mock AI processing states.
- **Page Coverage (6 Pages)**:
  1. **Dashboard**: High-level pipeline overview and quick actions.
  2. **Analyze a Role**: Job description input, candidate profile context, and analysis trigger.
  3. **Analysis Results**: Deep-dive fit analysis, evidence mapping, objection handling, and STAR stories.
  4. **Opportunities**: Active opportunity pipeline with filtering and stage management.
  5. **Candidate Profile**: Inspection of the synthetic candidate's structured experience and achievements.
  6. **About the Project**: System architecture notes, privacy commitments, and portfolio metadata.

---

## 4. Core Application Workflow

```
[1. View Candidate Profile] 
            │
            ▼
[2. Input/Select Job Description] 
            │
            ▼
[3. Mandate & Qualification Extraction]
            │
            ▼
[4. Evidence Comparison vs. Profile]
            │
            ▼
[5. Structured Fit Score & Analysis]
            │
            ▼
[6. Strategic Recommendation (Apply / Network / Monitor / Deprioritize)]
            │
            ▼
[7. Role-Specific Interview Prep & Objections]
            │
            ▼
[8. Save locally to browser localStorage]
            │
            ▼
[9. Pipeline Updated on Opportunities & Dashboard]
```

---

## 5. Required Analysis Output Specification

Every role evaluation processed by Career Command Center must generate a structured report covering the following 18 analytical sections:

1. **Executive Summary**: 2-3 sentence strategic verdict on role fit.
2. **Likely Role Mandate**: The core objective the hiring manager is trying to solve (e.g., "Scale GTM operations from $10M to $50M ARR").
3. **Key Requirements**: Top 3-5 non-negotiable operational requirements.
4. **Required vs. Preferred Qualifications**: Explicit breakdown categorizing hard requirements vs. nice-to-have skills.
5. **Overall Fit Score**: Calculated numerical score (0–100%) based on weighted evidence.
6. **Explanation of Score**: Plain-English rationale behind the numerical score.
7. **Strongest Matches**: Direct, evidence-backed alignment between candidate experience and role demands.
8. **Partial Matches**: Areas where candidate experience is adjacent or partially satisfies the mandate.
9. **Material Gaps**: Critical missing qualifications or experience deficits that present real hiring risks.
10. **Supporting Candidate Evidence**: Line-item citations mapping candidate accomplishments to role requirements.
11. **Unverified Qualifications**: Requirements where the candidate profile lacks sufficient data to confirm or deny fit.
12. **Likely Hiring Objections**: Anticipated reservations a hiring manager or recruiter will raise.
13. **Recommended Action**: One of `Apply`, `Network First`, `Monitor`, or `Deprioritize`.
14. **Positioning Narrative**: A 30-second elevator pitch positioning the candidate for this specific role.
15. **Recruiter-Screen Questions**: 3-5 tailored questions to ask during the initial call.
16. **Hiring-Manager Questions**: 3-5 strategic questions demonstrating deep mandate understanding.
17. **Recommended STAR Stories**: 2-3 specific accomplishments from the candidate profile formatted in Situation-Task-Action-Result structure tailored to the role.
18. **Next Actions**: Actionable list of steps (e.g., "Draft cold outreach to VP of RevOps").

### Fit Score Methodology

The Overall Fit Score (0–100%) uses a transparent, weighted heuristic designed as an evidence-based prioritization aid, not a hiring prediction.

**Weighting Rules**:
- **Required qualifications** are weighted at **2×** base value.
- **Preferred qualifications** are weighted at **1×** base value.

**Credit Rules by Match Type**:

| Match Type | Credit Applied |
| :--- | :--- |
| **Strong Match** | Full credit (100% of qualification weight) |
| **Partial Match** | Half credit (50% of qualification weight) |
| **Material Gap** | Negative impact (−100% of qualification weight) |
| **Unverified** | No credit and no penalty (0%) |

**Score Calculation**: Fit Score = (Sum of weighted credits across all qualifications) ÷ (Maximum possible weighted score) × 100, bounded to 0–100%.

**Score-to-Recommendation Mapping**:

| Score Range | Recommendation |
| :--- | :--- |
| 85–100% | `Apply` |
| 70–84% | `Network First` |
| 50–69% | `Monitor` |
| 0–49% | `Deprioritize` |

**Constraints**:
- Negative sums floor at 0%. The score cannot be negative.
- The score measures structural profile alignment against posted requirements. It is explicitly **not** a prediction of interview success, offer likelihood, or career fit.
- If a role has zero extractable qualifications, the maximum possible weighted score is zero. To avoid division by zero, the engine returns a score of 0% with a `Monitor` recommendation (overriding the normal 0–49% → `Deprioritize` mapping) and an explanation noting insufficient data for evaluation. This is an explicit exception to the standard score-to-recommendation mapping.

---

## 6. Critical AI Product Rules

- **No Unsupported Candidate Claims**: The system is designed to prevent unsupported candidate claims. Never invent, assume, or extrapolate candidate achievements beyond explicit profile evidence.
- **Mandatory Evidence Citation**: Every positive match claim must reference specific accomplishments or metrics from the candidate profile.
- **Explicit Unverified Labeling**: Any qualification not explicitly confirmed by profile data must be labeled as `Unverified`, rather than assumed false or true.
- **Material Gap vs. Missing Distinction**: Differentiate between an operational deal-breaker (Material Gap) and a learnable skill missing from the profile.
- **Reject Keyword Overlap**: Keyword matching alone does not constitute evidence; contextual proof of execution is required.
- **No Outcome Predictions**: The Fit Score represents structural profile alignment, not a guarantee of an interview or job offer.
- **Untrusted Input Handling**: Treat all user-pasted job description text as untrusted content; sanitize and isolate before parsing.
- **Transparent System-Generated & Synthetic Labeling**: All system-generated analysis output and synthetic data must be explicitly labeled across the UI. In Version 1, output is labeled as system-generated analysis; in Version 2, LLM-generated output will be labeled as AI-generated analysis.

---

## 7. Acceptance Criteria

- [ ] All 6 specified V1 pages render cleanly and navigate seamlessly.
- [ ] Role analysis output contains all 18 mandatory analytical sections.
- [ ] Synthetic candidate profile displays verifiable metrics and structured experience.
- [ ] Submitting a job description generates a complete fit report stored in `localStorage`.
- [ ] Created opportunities populate the Opportunities pipeline and update Dashboard metrics.
- [ ] No real personal, recruiter, or proprietary data is present in the codebase.
- [ ] Application runs entirely in the browser without server dependencies or external API keys in V1.

---

## 8. Key Assumptions

1. Synthetic candidate profile provides sufficient depth (15+ structured achievements with metrics) to enable realistic evidence mapping.
2. Browser `localStorage` is available and has sufficient storage capacity (~5MB) for V1 demo sessions.
3. Users operate modern evergreen web browsers (Chrome, Safari, Firefox, Edge).

---

## 9. Unresolved Questions

1. *Deterministic Rule Engine Complexity*: What schema structure best ensures client-side synthetic parsing produces realistic output variation across different job descriptions without an active LLM backend in V1?
2. *Local Storage Reset Mechanism*: Should V1 provide an explicit "Reset Demo Data" button on the UI to reload initial synthetic state? *(Recommended: Yes)*.
