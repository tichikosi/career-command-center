export type VerificationStatus =
  | 'candidate-confirmed'
  | 'candidate-provided'
  | 'imported-unverified'
  | 'verified'
  | 'synthetic';

export type EvidenceType =
  | 'achievement'
  | 'metric'
  | 'responsibility'
  | 'skill'
  | 'leadership'
  | 'project'
  | 'industry'
  | 'education'
  | 'certification';

export type CandidateSourceType =
  | 'manual'
  | 'pasted-text'
  | 'text-file'
  | 'markdown-file'
  | 'json-import'
  | 'synthetic-fixture';

export type DataClassification = 'synthetic' | 'user-provided';

export interface CandidateSource {
  id: string;
  type: CandidateSourceType;
  name: string;
  importedAt: string;
  rawText?: string;
  retainRawText: boolean;
  fileName?: string;
  dataClassification: DataClassification;
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  metric?: string;
  organization?: string;
  roleId?: string;
  skills: string[];
  tags: string[];
  sourceId?: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CareerRole {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate: string;   // YYYY-MM or 'Present'
  isCurrent?: boolean;
  summary: string;
  evidenceItemIds: string[]; // Stable IDs referencing EvidenceItem records

  // TODO: Transitional field retained for backward compatibility & current editor.
  // Role skills may later migrate to a top-level candidate skill graph or first-class Skill entity.
  skills: string[];

  sourceIds?: string[];
  createdAt: string;
  updatedAt: string;

  // TODO: Reserved for supporting future manual/chronological reordering.
  displayOrder?: number;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  notes?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  verificationUrl?: string;
}

// --- Work Authorization Types (v1.2A2.1.1) ---

export type WorkAuthorizationStatus =
  | 'us-citizen'
  | 'us-permanent-resident'
  | 'employment-authorization-document'
  | 'h1b'
  | 'l1'
  | 'o1'
  | 'tn'
  | 'f1-opt'
  | 'f1-stem-opt'
  | 'j1'
  | 'other-visa'
  | 'sponsorship-required'
  | 'prefer-not-to-say'
  | 'unspecified';

export interface WorkAuthorizationDetails {
  status: WorkAuthorizationStatus;
  visaType?: string;
  expirationDate?: string;
  sponsorshipRequiredNow?: boolean;
  sponsorshipRequiredFuture?: boolean;
  notes?: string;
}

// --- Compensation Types (v1.2A2.1.1) ---

export type CompensationCurrency =
  | 'USD'
  | 'CAD'
  | 'GBP'
  | 'EUR'
  | 'ZAR'
  | 'KES'
  | 'AUD'
  | 'CHF'
  | 'SGD'
  | 'AED'
  | 'NGN'
  | 'GHS'
  | 'ZWL'
  | 'OTHER';

export type CompensationPreference =
  | 'required'
  | 'preferred'
  | 'not-important';

export interface CompensationPreferences {
  currency: CompensationCurrency;
  baseSalaryMin?: number;
  baseSalaryMax?: number;
  bonusPreference: CompensationPreference;
  targetBonusPercent?: number;
  equityPreference: CompensationPreference;
  notes?: string;
}

// TODO: Future expansion roadmap markers:
// - current compensation
// - total compensation
// - structured locations / Google Places IDs
// - employer sponsorship matching
// - richer compensation compatibility scoring

export interface CandidateProfile {
  id: string;
  name: string;
  headline: string;
  location: string;
  summary: string;
  targetRoles: string[];
  targetIndustries: string[];
  preferredLocations: string[];

  // Structured Canonical Models (v1.2A2.1.1)
  compensationPreferences?: CompensationPreferences;
  workAuthorizationDetails?: WorkAuthorizationDetails;

  // Legacy Fields (Temporarily Retained for Backward Compatibility & Migration)
  compensationTarget?: string;
  workAuthorization?: string;

  coreCompetencies: string[];
  careerHistory: CareerRole[];
  education: EducationItem[];
  certifications: CertificationItem[];
  evidenceItems: EvidenceItem[];
  sources: CandidateSource[];
  updatedAt: string;
  dataMode: 'synthetic' | 'user';
}

/** Legacy type alias for backward compatibility during engine migration */
export interface LegacyAchievement {
  id: string;
  citationId: string;
  description: string;
  metric: string;
  skillsDemonstrated: string[];
}
