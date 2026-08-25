export type DiscoveredJobStatus = 'new' | 'saved' | 'dismissed' | 'promoted';

export type VerificationStatus =
  | 'verified-live'
  | 'grounded-unverified'
  | 'needs-verification'
  | 'curated'
  | 'unverified-legacy'
  | 'expired'
  | 'unreachable'
  | 'unsupported';

export type RelevanceLevel = 'High Potential' | 'Possible Fit' | 'Low Relevance';

export interface GroundingChunkReference {
  uri?: string;
  title?: string;
}

export interface DiscoveredJob {
  id: string;
  title: string;
  company: string;
  location: string;
  compensation?: string;
  isCompensationInferred?: boolean;
  jobUrl?: string;
  source: string;
  sourceDomain?: string;
  sourceTitle?: string;
  sourceSnippet?: string;
  sourcePublishedDate?: string;
  postingDate?: string;
  snippet?: string;
  description?: string;
  discoveredAt: string;
  status: DiscoveredJobStatus;
  relevanceScore: number;
  relevanceLevel: RelevanceLevel;
  relevanceReasons: string[];
  matchedPreferences: string[];

  // Grounding & Provenance Metadata
  provider: string;
  modelRequested?: string;
  modelUsed?: string;
  groundingUsed: boolean;
  verificationStatus: VerificationStatus;
  verificationReason?: string;
  failureReason?: string;
  verifiedAt?: string;
  sourceConfidence?: number;
  httpStatus?: number;
  redirectCount?: number;
  finalCanonicalUrl?: string;
  matchedGroundingChunks?: GroundingChunkReference[];
  searchQueries?: string[];
}

export interface DiscoveryQuery {
  targetRoles: string[];
  targetIndustries: string[];
  preferredLocations: string[];
  compensationTarget?: string;
  seniorityLevel?: string;
}

export interface DiscoveryHistoryItem {
  id: string;
  runAt: string;
  source: string;
  provider: string;
  modelRequested?: string;
  modelUsed?: string;
  groundingEnabled: boolean;
  groundingQueries?: string[];
  rolesDiscovered: number;
  newRolesCount: number;
  deduplicatedCount: number;
  jobsGrounded?: number;
  jobsUrlValid?: number;
  jobsVerifiedLive?: number;
  jobsRejected?: number;
  durationMs: number;
  status: 'success' | 'failed' | 'partial';
  message?: string;
  sanitizedFailureReason?: string;
  errorDetails?: string;
}

export interface JobDiscoveryProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  discoverJobs(query: DiscoveryQuery): Promise<DiscoveredJob[]>;
}
