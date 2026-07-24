# Career Command Center — Evaluation Plan & Benchmark Strategy

## 1. Purpose & Evaluation Philosophy

Career Command Center must provide reliable, evidence-backed evaluation outputs. To maintain high precision and prevent unsupported candidate claims, this document outlines the **Evaluation Plan and Quality Benchmark Framework**.

The evaluation framework operates in two distinct phases:
- **Version 1 (Current)**: Deterministic evaluation of client-side synthetic parsing rules against reference benchmark cases.
- **Version 2 (Future)**: Quantitative benchmark evaluation of live LLM outputs against a curated Ground-Truth dataset.

---

## 2. Version 1 Evaluation Metrics (Contract & Integration Testing)

In Version 1, the analysis engine is deterministic. Evaluating deterministic output against its own fixtures for semantic accuracy would be circular. Instead, V1 evaluation focuses on **contract compliance and integration correctness** — verifying that the engine honors its interface contract, all UI states are exercised, and data integrity is preserved.

| Metric | Target | Definition & Measurement Method |
| :--- | :---: | :--- |
| **Schema Completeness** | **100%** | Every `FitAnalysisReport` returned by the engine contains all 18 mandatory sections populated (non-null, non-empty strings or arrays). |
| **Referential Integrity** | **100%** | Every `supportingEvidenceCitationIds` value in the report maps to a valid `citationId` in the `CandidateProfile`. No orphaned or invalid references. |
| **Score↔Recommendation Consistency** | **100%** | The `recommendation` value aligns with the documented score-to-recommendation mapping (defined in PRODUCT_BRIEF.md) for every analysis result. **Exception**: If the engine returns zero extractable qualifications, a `Monitor` recommendation is returned regardless of the 0% score (which would normally map to `Deprioritize`). |
| **UI-State Coverage** | **100%** | Across the full benchmark suite, all four match types (`Strong Match`, `Partial Match`, `Material Gap`, `Unverified`) and all four recommendation categories (`Apply`, `Network First`, `Monitor`, `Deprioritize`) appear at least once. |
| **Input Boundary Handling** | **100%** | Empty text, minimum-length text (50 words), maximum-length text (15,000 characters), and HTML/script-injected text are handled gracefully without errors or unsafe rendering. |
| **localStorage Persistence** | **100%** | Analyzed opportunities persist correctly after page reload. Reset mechanism clears all stored data and restores initial state. |
| **Sanitization Enforcement** | **100%** | HTML tags, script elements, and embedded entities in pasted job descriptions are stripped before processing and rendering. |

---

## 3. Synthetic Benchmark Test Suite

To evaluate system accuracy, a test suite of **5 Standard Benchmark Roles** has been designed. Each role possesses a pre-computed "Ground Truth" answer key:

### Benchmark Case 1: High Alignment — Director of AI Strategy & Ops
- **Expected Fit Score**: 88% – 94%
- **Expected Recommendation**: `Apply`
- **Known Matches**: AI Enablement, Cross-Functional Leadership, $14M ARR Growth (Cited: `EVID-2024-01`).
- **Known Gaps**: None material.
- **Unverified Items**: Specific experience with EU AI Act compliance frameworks.

### Benchmark Case 2: Moderate Alignment — VP of Sales Operations
- **Expected Fit Score**: 72% – 78%
- **Expected Recommendation**: `Network First`
- **Known Matches**: Sales Process Optimization, GTM Metric Tracking.
- **Known Gaps**: Direct management of field sales reps (Material Gap).
- **Unverified Items**: Experience with Salesforce CPQ administration.

### Benchmark Case 3: Low Alignment — Principal Data Engineer
- **Expected Fit Score**: 35% – 45%
- **Expected Recommendation**: `Deprioritize`
- **Known Matches**: Strategic Planning, Executive Presentation.
- **Known Gaps**: 8+ years hands-on Distributed PySpark / Scala development (Material Gap).

### Benchmark Case 4: Adjacent Alignment — Chief of Staff to CEO
- **Expected Fit Score**: 85% – 89%
- **Expected Recommendation**: `Apply`
- **Known Matches**: Strategic Execution (Cited: `EVID-2023-05`), Board Prep & Executive Communication (Cited: `EVID-2023-02`), Operational Rhythms & Cross-Functional Program Management (Cited: `EVID-2024-03`).
- **Known Gaps**: None material. Direct CEO reporting relationship is a contextual match, not a skills gap.
- **Unverified Items**: Investor relations experience, M&A due diligence support.

### Benchmark Case 5: Ambiguous / Low Detail Job Description
- **Expected Fit Score**: 50% – 60%
- **Expected Recommendation**: `Monitor`
- **Known Matches**: General leadership and strategic planning signals match broadly (Cited: `EVID-2023-01`).
- **Known Gaps**: Cannot determine specific gaps due to vague job description text.
- **Unverified Items**: 4+ qualifications classified as `Unverified` because the job description lacks sufficient specificity to confirm or deny alignment.
- **Known Behavior**: The engine produces a valid report with a high proportion of `Unverified` qualifications, demonstrating that the system correctly handles ambiguous input rather than over-claiming matches.

---

## 4. Evaluation Execution Procedure

### V1 Contract & Integration Testing Procedure
1. Execute analysis for each of the 5 Benchmark Cases via the pre-authored fixture path (Tier 1).
2. Execute analysis for at least 1 custom-pasted job description via the keyword-extraction fallback path (Tier 2).
3. **Assert schema completeness**: Verify all 18 report sections are populated (non-null, non-empty) for every result.
4. **Assert referential integrity**: Verify every `supportingEvidenceCitationIds` value maps to a valid `citationId` in the `CandidateProfile`.
5. **Assert score↔recommendation consistency**: Verify each result's recommendation matches its score range per the documented fit score methodology.
6. **Assert UI-state coverage**: Verify that all four `matchType` values and all four `recommendation` values appear across the benchmark suite.
7. **Assert input boundary handling**: Submit empty text, 49-word text, 15,001-character text, and `<script>alert('x')</script>` payloads. Verify graceful rejection or sanitization.
8. **Assert localStorage persistence**: Reload the page after analysis and verify opportunities are retained. Trigger "Reset Demo Data" and verify all `ccc_*` keys are cleared.
9. **Assert rendering completeness**: Verify all 18 report sections render visually on the Analysis Results page with correct content.

### V2 Semantic Accuracy Evaluation (Roadmap)
When a live LLM is integrated in Version 2, the evaluation framework will expand to include ground-truth semantic accuracy metrics:
- **Citation Precision**: Percentage of positive matches citing valid evidence from the candidate profile (target: 100%).
- **Unsupported Candidate Claim Rate**: Percentage of claims citing candidate experience not present in the profile (target: 0.0%). LLM outputs remain subject to review and evaluation.
- **Gap/Missing Distinction Accuracy**: Correct classification of `Material Gap` vs. `Partial Match` vs. `Unverified` against human-annotated ground truth (target: ≥ 95%).
- **Prompt-Injection Robustness**: Resistance to adversarial text embedded in job description inputs.
- Ground-truth comparison against the 5 Benchmark Case expected outputs using the pre-computed answer keys.

---

## 5. Acceptance Criteria

- [ ] V1 deterministic engine passes 100% of assertions on all 5 Benchmark Test Cases.
- [ ] Zero positive match claims are generated without evidence citations.
- [ ] Evaluation report format explicitly separates V1 synthetic testing from V2 LLM evaluation scripts.

---

## 6. Key Assumptions

- The 5 synthetic benchmark test cases provide sufficient variance across high, medium, low, and ambiguous role alignments to test all UI and engine paths thoroughly.

---

## 7. Unresolved Questions

- *Automated CI Evaluation*: Should the `npm run eval` benchmark suite run as a GitHub Action on pull requests in V2? *(Recommended: Yes)*.
