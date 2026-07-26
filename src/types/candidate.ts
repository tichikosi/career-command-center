export type VerificationStatus =
  | 'candidate-confirmed'
  | 'imported-unverified'
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
  skills: string[];
  sourceIds?: string[];
  createdAt: string;
  updatedAt: string;
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

export interface CandidateProfile {
  id: string;
  name: string;
  headline: string;
  location: string;
  summary: string;
  targetRoles: string[];
  targetIndustries: string[];
  preferredLocations: string[];
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
