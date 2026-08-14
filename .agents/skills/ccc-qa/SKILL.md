---
name: ccc-qa
description: Automated QA playbook, quality gate procedures, and test runner instructions for Career Command Center.
---

# Career Command Center — QA & Evaluation Playbook

This skill outlines the automated quality assurance architecture, test commands, benchmark cases, and release verification gates for **Career Command Center (V1)**.

## 1. Automated QA Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CAREER COMMAND CENTER QA                 │
├──────────────────────────────┬──────────────────────────────┤
│ UNIT & CONTRACT TESTS        │ END-TO-END BROWSER TESTS     │
│ (Vitest)                     │ (Playwright)                 │
│ • stageActions.test.ts       │ • smoke.spec.ts              │
│ • candidateAdapter.test.ts   │ • pipelineWorkflow.spec.ts   │
│ • engineContract.test.ts     │ • candidateProfile.spec.ts   │
│ • search.test.ts             │ • customAnalysis.spec.ts     │
│ • dateUtils.test.ts          │ • regression.spec.ts         │
│ • normalization.test.ts      │                              │
│ • storage.test.ts            │                              │
└──────────────────────────────┴──────────────────────────────┘
```

## 2. Test Execution Commands

| Command | Scope & Purpose |
| :--- | :--- |
| `npm run test:unit` | Executes all 7 Vitest unit & contract test suites (127+ tests). |
| `npm run test:smoke` | Executes quick Playwright browser smoke tests on all 6 routes. |
| `npm run test:e2e` | Runs full suite of Playwright end-to-end user workflows. |
| `npm run test:regression` | Runs unit tests + Playwright regression suite. |
| `npm run build` | Compiles Next.js production build and typechecks. |
| `npm run lint` | ESLint rule enforcement. |
| `npm run qa` | **Master Quality Gate**: Runs lint + unit + build + e2e sequentially. |

## 3. Benchmark Verification Suite

The V1 contract test suite (`tests/unit/engineContract.test.ts`) verifies the 5 Standard Benchmark Cases against all 18 mandatory report sections:

1. **Benchmark 1**: Director of AI Strategy (`opp-role-1-ai-strategy`) -> 88–94% -> `Apply`
2. **Benchmark 2**: VP of Sales Operations (`opp-role-2-sales-ops`) -> 72–78% -> `Network First`
3. **Benchmark 3**: Principal Data Engineer (`opp-role-3-data-engineer`) -> 35–45% -> `Deprioritize`
4. **Benchmark 4**: Chief of Staff (`opp-role-4-chief-of-staff`) -> 85–89% -> `Apply`
5. **Benchmark 5**: Strategy Lead (`opp-role-5-strategy-lead`) -> 50–69% -> `Monitor`

## 4. Key Behavioral Invariants

- Action items completed in Stage A persist completed state when transitioning to Stage B and returning to Stage A.
- Inactive-stage actions do not inflate visible pending action count badges.
- Deleting a Career Role in Candidate Profile does NOT delete or destroy linked Evidence Items; it marks them unassigned while preserving IDs, metrics, and searchability.
- Analysis evidence snapshots remain immutable for historical reports.
- Browser print stylesheet prints clean reports and interview preparation materials without UI clutter.
