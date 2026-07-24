export interface Achievement {
  id: string;
  citationId: string; // e.g. "EVID-2024-01"
  description: string;
  metric: string;     // e.g. "$14M ARR", "35% efficiency"
  skillsDemonstrated: string[];
}

export interface CareerRole {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate: string;   // YYYY-MM or 'Present'
  responsibilities: string[];
  achievements: Achievement[];
}

export interface CandidateProfile {
  id: string;
  isSynthetic: boolean; // Always true in V1
  name: string;
  headline: string;
  summary: string;
  targetRoles: string[];
  coreCompetencies: string[];
  careerHistory: CareerRole[];
}
