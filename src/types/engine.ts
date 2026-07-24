import { CandidateProfile } from './candidate';
import { FitAnalysisReport } from './opportunity';

export interface AnalysisInput {
  jobTitle: string;
  company: string;
  jobDescription: string;
  location?: string;
  compensation?: string;
  sourceUrl?: string;
  sampleRoleId?: string;
}

export interface IFitAnalysisEngine {
  analyzeRole(
    input: AnalysisInput,
    candidateProfile: CandidateProfile
  ): Promise<FitAnalysisReport>;
}
