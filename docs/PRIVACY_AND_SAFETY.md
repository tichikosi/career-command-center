# Career Command Center — Privacy, Safety & Data Hygiene Protocol

## 1. Data Privacy & Hygiene Principles

Career Command Center enforces a zero-compromise data hygiene protocol to protect personal privacy, intellectual property, and confidential information in public portfolio deployments.

### Prohibited Data List (Strict Exclusion)
The codebase, synthetic datasets, documentation, and client-side storage must **NEVER** contain:

1. **Real Résumés or CVs**: No actual personal CVs or unredacted employment histories.
2. **Real Recruiter Communications**: No copied emails, LinkedIn messages, or recruiter notes.
3. **Real Contact Details**: No personal phone numbers, physical addresses, or private email addresses.
4. **Real Job-Search Notes**: No personal interview debriefs or salary negotiations.
5. **Google Confidential Information**: No internal Google communications, strategies, or project data.
6. **Google Internal Frameworks**: No internal Google tools, acronyms, process guides, or design documents.
7. **Proprietary Launch Materials**: No unreleased product details or confidential roadmap documents.
8. **Private URLs**: No internal document links, private staging URLs, or restricted drive links.
9. **API Keys or Secrets**: No API keys, credentials, or access tokens stored in code or repository.
10. **Full Copyrighted Job Descriptions**: No verbatim full-text copies of proprietary job listings from external employers.

---

## 2. AI Product Safety Rules & Guardrails

To maintain portfolio-quality rigor and prevent common AI failure modes, all analytical outputs must strictly observe nine product safety rules:

### Rule 1: No Unsupported Candidate Claims
The engine is designed to prevent unsupported candidate claims. It must never invent, assume, or extrapolate candidate achievements beyond explicit facts present in the candidate profile. The evaluation target is a 0% unsupported-candidate-claim rate across the defined benchmark suite.

### Rule 2: Mandatory Evidence Citation
Every claim of alignment or match must provide a explicit citation linking back to specific achievements or metrics in the candidate profile.

### Rule 3: Explicit Unverified Qualifications
Any role requirement that cannot be conclusively confirmed or refuted by profile evidence must be labeled as `Unverified`, preventing false positive or false negative assertions.

### Rule 4: Material Gap vs. Minor Deficit Distinction
The system must explicitly categorize missing or incomplete experience using the four canonical match types:
- **Material Gap**: Core operational requirement missing entirely (e.g., lacks required 5+ years P&L responsibility). This represents a significant hiring risk.
- **Partial Match** (with explanatory context): When experience is adjacent but incomplete, the qualification is classified as `Partial Match`. The explanation field may note that the deficit is a "learnable skill" or "minor gap" to distinguish it from a structural mismatch, but the canonical `matchType` value remains `Partial Match`.

The four canonical match types used across the system are: `Strong Match`, `Partial Match`, `Material Gap`, and `Unverified`. No additional enum values are created for minor deficits or learnable skills.

### Rule 5: Rejection of Keyword-Only Matching
Keyword overlap does not constitute valid evidence. Matching requires contextual proof of execution and impact.

### Rule 6: Non-Predictive Disclaimer on Fit Scores
Fit scores measure structural profile alignment against posted requirements. They must **never** be presented as a prediction of securing an interview or job offer.

### Rule 7: Mandatory Recommendation Rationale
Every action recommendation (`Apply`, `Network First`, `Monitor`, `Deprioritize`) must be accompanied by an explicit, transparent plain-English explanation.

### Rule 8: Untrusted Input Isolation
All text supplied via job description inputs must be sanitized client-side to mitigate XSS and prompt-injection risks before parsing.

### Rule 9: Explicit System-Generated & Synthetic Output Labeling
Every view displaying synthetic data or system-generated analysis output must render clear visual labels. In Version 1, output is labeled as system-generated analysis (deterministic engine). In Version 2, LLM-generated output will be labeled as AI-generated analysis and will remain subject to review and evaluation.

---

## 2.1 User-Supplied Data Handling (Version 1)

In the Version 1 public demo, users may paste custom job description text into the analyzer. The following rules govern how this user-supplied data is handled:

1. **Browser-Only Storage**: User-pasted job description text is stored exclusively in the user's browser `localStorage`. It is never transmitted to any external server, API, or third-party service.
2. **No External Transmission**: Version 1 operates entirely client-side. No network requests are made with user-supplied content.
3. **Persistence in localStorage**: Pasted job descriptions are stored as part of `JobOpportunity` records in `localStorage` and persist across browser sessions until manually cleared.
4. **User Reset Capability**: The application provides a "Reset Demo Data" mechanism that clears all locally stored data, including any user-pasted job descriptions, and restores the initial synthetic state.
5. **Advisory Against Confidential Input**: The Analyze a Role page displays an advisory notice recommending that users avoid pasting confidential, proprietary, or sensitive job descriptions into the public demo.
6. **No Enterprise-Grade Privacy Claim**: The public demo does not claim to provide enterprise-grade data protection, encryption at rest, or regulatory compliance. It is a portfolio demonstration operating in a single browser session.

---

## 3. Synthetic Data Standard

All public demo data must follow the **Synthetic Data Specification**:

- Candidate Name: `Alex Vance` (Fictional Persona)
- Candidate History: Synthetic amalgamation of generalized industry accomplishments.
- Companies & Institutions: Generalized corporate descriptions (e.g., "Apex Enterprise Software", "Nexus Global Operations").
- Disclaimers: Prominent banner on all pages stating `Public Demonstration — 100% Synthetic Data`.

---

## 4. Acceptance Criteria

- [ ] Repository contains zero instances of prohibited data items.
- [ ] Analysis output schemas explicitly mandate evidence citations for all positive matches.
- [ ] Every page header renders the synthetic data disclaimer banner.
- [ ] Pasted job descriptions are sanitized prior to processing.
- [ ] Analyze a Role page displays an advisory notice about pasting confidential content.
- [ ] Reset Demo Data mechanism successfully clears all user-supplied data from `localStorage`.

---

## 5. Key Assumptions

- Public synthetic data provides sufficient realism to demonstrate executive utility without referencing real individuals or corporate entities.

---

## 6. Unresolved Questions

- *Sanitization Automated Checks*: Should a pre-commit hook be added in V2 to scan for accidental private email or phone patterns? *(Recommended: Yes)*.
