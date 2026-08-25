export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id?: string;
  userId: string;
  discoveryEnabled: boolean;
  discoveryCadence: 'daily_weekday' | 'daily_all' | 'weekly';
  emailNotificationsEnabled: boolean;
  theme?: 'dark' | 'light' | 'system';
  migrationCompleted?: boolean;
  migrationCompletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  user: UserProfile | null;
  accessToken: string | null;
  expiresAt?: number;
}

export interface MigrationSummary {
  candidateProfileMigrated: boolean;
  opportunitiesCount: number;
  networkContactsCount: number;
  discoveryJobsCount: number;
  discoveryHistoryCount: number;
  analysisReportsCount: number;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}
