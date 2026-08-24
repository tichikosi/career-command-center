export type DiscoveredJobStatus = 'new' | 'saved' | 'dismissed' | 'promoted';

export type RelevanceLevel = 'High Potential' | 'Possible Fit' | 'Low Relevance';

export interface DiscoveredJob {
  id: string;
  title: string;
  company: string;
  location: string;
  compensation?: string;
  jobUrl?: string;
  source: string;
  postingDate?: string;
  snippet?: string;
  description?: string;
  discoveredAt: string;
  status: DiscoveredJobStatus;
  relevanceScore: number;
  relevanceLevel: RelevanceLevel;
  relevanceReasons: string[];
  matchedPreferences: string[];
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
  rolesDiscovered: number;
  newRolesCount: number;
  deduplicatedCount: number;
  durationMs: number;
  status: 'success' | 'failed' | 'partial';
  message?: string;
}

export interface JobDiscoveryProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  discoverJobs(query: DiscoveryQuery): Promise<DiscoveredJob[]>;
}
