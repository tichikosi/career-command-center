---
name: ccc-qa
description: Automated QA playbook, quality gate procedures, and test runner instructions for Career Command Center.
---

# Career Command Center — QA & Evaluation Playbook

This skill outlines the automated quality assurance architecture, test commands, benchmark cases, AI evaluation harness, and release verification gates for **Career Command Center (V2.0 → V2.1 → V3.0 Core)**.

## 1. Automated QA Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CAREER COMMAND CENTER V3.0 CORE QA                   │
├──────────────────────────────┬───────────────────────────┬──────────────┤
│ UNIT & CONTRACT TESTS        │ END-TO-END BROWSER TESTS  │ AI GOVERNANCE│
│ (Vitest 233/233 PASS)        │ (Playwright 22/22 PASS)   │ (Harness)    │
│ • stageActions.test.ts       │ • smoke.spec.ts           │ • evaluator  │
│ • candidateAdapter.test.ts   │ • pipelineWorkflow.spec.ts│ • evalRunner │
│ • engineContract.test.ts     │ • candidateProfile.spec.ts│ • latest.json│
│ • search.test.ts             │ • customAnalysis.spec.ts  │ • latest.md  │
│ • dateUtils.test.ts          │ • v2Features.spec.ts      │              │
│ • normalization.test.ts      │ • regression.spec.ts      │              │
│ • storage.test.ts            │                           │              │
│ • geminiEngine.test.ts       │                           │              │
│ • geminiResilience.test.ts   │                           │              │
│ • candidateIsolation.test.ts │                           │              │
│ • resumeParser.test.ts       │                           │              │
│ • network.test.ts            │                           │              │
│ • opportunityCreation.test.ts│                           │              │
│ • scoringIndependence.test.ts│                           │              │
│ • discovery.test.ts          │                           │              │
│ • storageRepositories.test.ts│                           │              │
│ • evaluator.test.ts          │                           │              │
└──────────────────────────────┴───────────────────────────┴──────────────┘
```

## 2. Test Execution Commands

| Command | Scope & Purpose |
| :--- | :--- |
| `npm run test:unit` | Executes all 17 Vitest unit & contract test suites (233 tests). |
| `npm run test:smoke` | Executes quick Playwright browser smoke tests across all routes. |
| `npm run test:e2e` | Runs full suite of Playwright end-to-end user workflows (22 tests). |
| `npm run test:regression` | Runs unit tests + Playwright regression suite. |
| `npm run build` | Compiles Next.js production build with Turbopack and typechecks. |
| `npm run lint` | ESLint 9 rule enforcement (0 errors, 0 warnings). |
| `npm run eval` | Executes AI Evaluation and Governance benchmark runner. |
| `npm run qa` | **Master Quality Gate**: Runs lint + unit + build + e2e sequentially. |

## 3. AI Evaluation & Governance Harness

The AI evaluation runner (`scripts/evalRunner.ts`) runs multi-metric scoring across synthetic benchmark roles:
- **Schema Adherence**: 100% Zod validation of fit analysis reports.
- **Evidence Grounding**: Filters citations to verify every claim is backed by real candidate evidence.
- **Hallucination Safety**: Flags any fabricated claims or unattributed metrics.
- **Gap Identification**: Assesses material gap detection against unfulfilled requirements.
- **Recommendation Consistency**: Validates strategic recommendation alignment with fit scores.

Run the evaluation harness:
```bash
npm run eval
# Or evaluate with a subset limit
npm run eval -- --limit 2
```
Output artifacts are saved to `eval-results/latest.json` and `eval-results/latest.md`.

## 4. Key Behavioral & Architectural Invariants

- **Two-Step Fit Scoring**: Requirements are extracted independently from JD text before candidate matching begins; candidate evaluation strictly cites real evidence items (`EVID-IMP-*`).
- **Action State Persistence**: Action items completed in Stage A persist completed state across stage transitions.
- **Evidence Preservation**: Deleting a Career Role in Candidate Profile does NOT destroy linked Evidence Items; it retains unassigned evidence with IDs and metrics intact.
- **Candidate Data Isolation**: Sample opportunities and fresh analyses are strictly isolated to active candidate context.
- **Network Normalization & Ranking**: Company names are stripped of legal suffixes and matched accurately; contacts are deterministically ranked by seniority and domain alignment.
- **Opportunity Creation & Safe Fetching**: Supports manual entry, pasted JD, and SSRF-safe URL scraping rejecting private/loopback IPs.
- **Autonomous Discovery Workspace**: Deduplicates jobs by URL and fingerprint, scores candidate relevance (`High Potential`, `Possible Fit`), supports 1-click promotion to active pipeline.
- **Safe Hydration**: LocalStorage subscriptions use `useSyncExternalStore` with frozen immutable snapshots, guaranteeing zero hydration mismatches and zero cascading renders.
