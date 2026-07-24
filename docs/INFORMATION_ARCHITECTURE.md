# Career Command Center — Information Architecture & Data Models

## 1. Site Map & Navigation Hierarchy

Career Command Center is organized into a clean, flat 6-page navigation structure designed for executive navigation.

```
                    ┌───────────────────────────────┐
                    │     Career Command Center     │
                    │        (Top Navigation)       │
                    └───────────────┬───────────────┘
                                    │
    ┌──────────────┬────────────────┼────────────────┬──────────────┬──────────────┐
    │              │                │                │              │              │
    ▼              ▼                ▼                ▼              ▼              ▼
┌─────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ ┌───────────┐
│Dashboard│ │Analyze a Role│ │Analysis Result││ Opportunities│ │ Candidate │ │ About the │
│ (Home)  │ │   (Input)    │ │ (Deep Output)│ │  (Pipeline)  │ │  Profile  │ │  Project  │
└─────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ └───────────┘
```

---

## 2. Page-Level Component & Layout Specs

### Page 1: Dashboard (`/`)
- **Header**: Active pipeline banner with synthetic data disclaimer badge.
- **Metric Summary Cards**:
  - Total Pipeline Roles
  - High Alignment Roles (Fit Score >= 85%)
  - Active Interviewing Roles
  - Pending Action Items (count of non-archived opportunities with non-empty `nextActions` arrays)
- **Primary CTA Section**: "Analyze New Opportunity" quick trigger.
- **Recent Analysis Carousel/Grid**: Cards showing the 3 most recently analyzed roles.
- **Pipeline Breakdown Table**: High-level summary of opportunities grouped by stage.

### Page 2: Analyze a Role (`/analyze`)
- **Candidate Context Bar**: Read-only chip summarizing current synthetic candidate profile ("Alex Vance — Director of AI Strategy & GTM Ops").
- **Mode Selector**: Toggle between "Select Sample Role" and "Paste Custom Job Description".
- **Sample Role Picker**: Interactive cards for pre-configured synthetic positions.
- **Custom Input Form**: Text area for job title, company name, and raw job description text.
- **Action Toolbar**: "Clear", "Load Sample", and "Analyze Role Fit" (triggers analysis engine).

### Page 3: Analysis Results (`/analysis/[id]`)
- **Executive Banner**: Role Title, Company, Overall Fit Score badge, Recommendation tag (`Apply`, `Network First`, `Monitor`, `Deprioritize`).
- **Tabbed / Scroll Navigation**:
  - **Overview**: Executive Summary, Likely Mandate, Key Requirements, Score Explanation.
  - **Qualification Comparison**: Required vs. Preferred comparison table with Match Status badges (`Strong Match`, `Partial Match`, `Material Gap`, `Unverified`).
  - **Evidence & Objections**: Line-item candidate evidence citations and likely hiring manager objections with counter-strategies.
  - **Interview Prep**: Recruiter screen questions, hiring manager questions, and recommended STAR stories.
  - **Next Actions**: Action item checklist and stage assignment dropdown.

### Page 4: Opportunities Pipeline (`/opportunities`)
- **Controls & Filters**: Search bar, Stage filter (`All`, `Identified`, `Applied`, `Screening`, `Interviewing`, `Offer`, `Archived`), Recommendation filter.
- **Opportunity Data Table**: Columns for Company, Title, Fit Score, Recommendation, Stage, Date Analyzed, and Actions (View Analysis, Update Stage, Archive, Delete).

### Page 5: Candidate Profile (`/profile`)
- **Header**: Synthetic candidate name, title, contact placeholder, and synthetic dataset banner.
- **Executive Summary**: Candidate positioning statement.
- **Core Competencies**: Tagged skill areas mapped to quantitative experience metrics.
- **Career History Accordion/Cards**: Role details, timeline, scope, key responsibilities, and verified achievement bullet points with cited impact metrics.

### Page 6: About the Project (`/about`)
- **Overview Card**: Portfolio context, purpose, and problem statement.
- **System Architecture**: High-level structural diagram explaining Next.js client-side execution and synthetic data engine.
- **Privacy & Safety Framework**: Summary of explicit guardrails preventing unsupported candidate claims and real data usage.

---

## 3. Data Models & Entity Schemas

### 3.1 Candidate Profile Schema (`CandidateProfile`)
```typescript
interface CandidateProfile {
  id: string;
  isSynthetic: boolean; // Always true in V1
  name: string;
  headline: string;
  summary: string;
  targetRoles: string[];
  coreCompetencies: string[];
  careerHistory: CareerRole[];
}

interface CareerRole {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate: string;   // YYYY-MM or 'Present'
  responsibilities: string[];
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  citationId: string; // e.g. "EVID-2024-01"
  description: string;
  metric: string;     // e.g. "$14M ARR", "35% efficiency"
  skillsDemonstrated: string[];
}
```

### 3.2 Job Opportunity & Analysis Schema (`JobOpportunity`)
```typescript
type PipelineStage = 'Identified' | 'Applied' | 'Screening' | 'Interviewing' | 'Offer' | 'Archived';
type RecommendationType = 'Apply' | 'Network First' | 'Monitor' | 'Deprioritize';
type MatchType = 'Strong Match' | 'Partial Match' | 'Material Gap' | 'Unverified';

interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location?: string;
  rawJobDescription: string;
  createdAt: string; // ISO Date String
  updatedAt: string;
  stage: PipelineStage;
  analysis: FitAnalysisReport;
}

interface FitAnalysisReport {
  executiveSummary: string;
  likelyMandate: string;
  keyRequirements: string[];
  overallFitScore: number; // 0 - 100
  scoreExplanation: string;
  recommendation: RecommendationType;
  positioningNarrative: string;
  qualifications: QualificationMatch[];
  objections: HiringObjection[];
  recruiterQuestions: string[];
  hiringManagerQuestions: string[];
  recommendedStarStories: StarStory[];
  nextActions: string[];
}

interface QualificationMatch {
  id: string;
  category: 'Required' | 'Preferred';
  qualification: string;
  matchType: MatchType;
  explanation: string;
  supportingEvidenceCitationIds: string[]; // Links to CandidateProfile Achievement citationIds
}

interface HiringObjection {
  id: string;
  objection: string;
  counterPositioning: string;
  supportingCitationId?: string;
}

interface StarStory {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  citationIds: string[];
}
```

### 3.3 UI-Derived Report Sections (No Schema Duplication)

The Product Brief specifies 18 mandatory report sections. The `FitAnalysisReport` schema stores a single normalized `qualifications: QualificationMatch[]` array as the source of truth. Five of the 18 report sections are **UI-derived views** — rendered by filtering the `qualifications` array rather than stored as separate schema fields. This prevents data duplication.

| Report Section | Rendering Rule |
| :--- | :--- |
| **7. Strongest Matches** | Filter `qualifications` where `matchType === 'Strong Match'`. Display qualification name, explanation, and linked evidence citations. |
| **8. Partial Matches** | Filter `qualifications` where `matchType === 'Partial Match'`. Display qualification name, explanation, and any explanatory context (e.g., "learnable skill"). |
| **9. Material Gaps** | Filter `qualifications` where `matchType === 'Material Gap'`. Display qualification name and explanation of the gap's hiring risk. |
| **10. Supporting Candidate Evidence** | Collect all unique `supportingEvidenceCitationIds` from qualifications where `matchType` is `Strong Match` or `Partial Match`. Resolve each `citationId` against the `CandidateProfile` to display the linked achievement description and metric. |
| **11. Unverified Qualifications** | Filter `qualifications` where `matchType === 'Unverified'`. Display qualification name and a note that evidence could not be confirmed from the candidate profile. |

**Implementation rule**: The engine populates only the `qualifications[]` array with correct `matchType` values. The UI layer is responsible for filtering and rendering sections 7–11. No duplicate arrays (e.g., `strongestMatches[]`, `materialGaps[]`) are stored in the `FitAnalysisReport` schema.

---

## 4. LocalStorage State Layout

In Version 1, all application state is stored locally in the browser under structured JSON keys:

- `ccc_candidate_profile_v1`: Stores the default synthetic candidate profile instance.
- `ccc_opportunities_v1`: Stores an array of `JobOpportunity` objects.
- `ccc_settings_v1`: Stores user UI settings (e.g. view mode preference).

---

## 5. Acceptance Criteria

- [ ] All 6 pages conform to the component and section specs outlined.
- [ ] TypeScript interfaces strictly represent all 18 required analysis sections.
- [ ] Data relationships enable bidirectionally linking qualifications back to Candidate Profile evidence citations.

---

## 6. Key Assumptions

- Schema structures are designed to be 100% compatible with future backend API responses without frontend component modification.

---

## 7. Unresolved Questions

- *Migration Strategy*: When upgrading to V2, will local `localStorage` records be importable into remote database storage? *(Design schema with UUIDs to allow clean future export/import)*.
