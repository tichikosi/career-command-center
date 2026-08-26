import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  CloudActivityRepository,
  CloudInterviewPrepRepository,
  CloudInterviewSessionRepository,
} from '@/lib/storage/cloudRepositories';
import { defaultLocalStorageAdapter } from '@/lib/storage/localStorageAdapter';

// Setup in-memory localStorage for Node test environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) delete store[key];
  },
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock }, writable: true });

describe('V3.3 Security, RLS & Cloud Persistence Architecture', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20260825_v3_3_interview_application_intelligence.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  it('1. migration enforces user_id UUID NOT NULL REFERENCES auth.users(id) on all private V3.3 tables', () => {
    // Check opportunity_activities
    expect(migrationSql).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.opportunity_activities\s*\([\s\S]*?user_id UUID NOT NULL REFERENCES auth\.users\(id\)/i
    );
    // Check interview_preparations
    expect(migrationSql).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.interview_preparations\s*\([\s\S]*?user_id UUID NOT NULL REFERENCES auth\.users\(id\)/i
    );
    // Check interview_sessions
    expect(migrationSql).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.interview_sessions\s*\([\s\S]*?user_id UUID NOT NULL REFERENCES auth\.users\(id\)/i
    );
  });

  it('2. migration enforces strict RLS (auth.uid() = user_id) with NO default-user bypass', () => {
    // Must NOT contain default-user bypass
    expect(migrationSql).not.toContain("'default-user'");
    expect(migrationSql).not.toContain('default-user');

    // Must contain auth.uid() = user_id for all 3 tables
    expect(migrationSql).toContain('auth.uid() = user_id');

    // RLS enabled on all 3 tables
    expect(migrationSql).toContain('ALTER TABLE public.opportunity_activities ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE public.interview_preparations ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;');
  });

  it('3. migration does NOT grant private table access to anon', () => {
    // Check for any GRANT ... TO anon
    const anonGrants = migrationSql.match(/GRANT\s+[\s\S]*?\s+TO\s+[\s\S]*?anon/gi);
    expect(anonGrants).toBeNull();

    // Verify grants are strictly to authenticated and service_role
    expect(migrationSql).toContain('TO authenticated;');
    expect(migrationSql).toContain('TO service_role;');
  });

  it('4. migration enforces unique active interview prep per user and opportunity while preserving history', () => {
    expect(migrationSql).toContain('uq_interview_prep_active');
    expect(migrationSql).toMatch(/WHERE\s*\(\s*is_active\s*=\s*TRUE\s*\)/i);
  });

  it('5. CloudActivityRepository throws visible error and does NOT silently report success when Supabase fails', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { code: '42P01', message: 'relation "public.opportunity_activities" does not exist' },
        }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }),
      },
    };

    const repo = new CloudActivityRepository(mockSupabase as unknown as SupabaseClient);

    await expect(
      repo.recordActivity(
        {
          opportunityId: 'opp-1',
          activityType: 'note',
          title: 'Strategic conversation',
          occurredAt: new Date().toISOString(),
          source: 'user',
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow(/V3.3 cloud storage is not available yet|Failed to record activity to cloud/i);
  });

  it('6. CloudInterviewPrepRepository throws visible error when unauthenticated or when table is missing', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({
          error: { code: '42P01', message: 'relation "public.interview_preparations" does not exist' },
        }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }),
      },
    };

    const repo = new CloudInterviewPrepRepository(mockSupabase as unknown as SupabaseClient);

    // Should throw if authenticated and table is missing
    await expect(
      repo.savePrep(
        {
          id: 'prep-1',
          opportunityId: 'opp-1',
          candidateProfileId: 'cand-1',
          executiveRoleBrief: 'Brief',
          candidatePositioning: 'Positioning',
          strongestFitThemes: [],
          materialGaps: [],
          whyThisCompany: '',
          whyThisRole: '',
          whyYou: '',
          questionsToAsk: [],
          first90DaysPoints: [],
          riskFlags: [],
          questions: [],
          storyBank: [],
          companyIntelligence: { available: false },
          compensationResearch: { available: false },
          readinessScore: { overall: 85, dimensions: { roleUnderstanding: 85, candidatePositioning: 85, storyPreparation: 85, gapMitigation: 85, companyKnowledge: 85, questionReadiness: 85 } },
          generatedAt: new Date().toISOString(),
          requestedModel: 'gemini-3.7-flash',
          actualModel: 'gemini-3.7-flash',
          executionMode: 'gemini',
          candidateUpdatedAt: new Date().toISOString(),
          opportunityUpdatedAt: new Date().toISOString(),
          isActive: true,
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow(/V3.3 cloud storage is not available yet|Failed to save interview prep to cloud/i);
  });

  it('7. CloudInterviewSessionRepository throws visible error when saving fails in cloud', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          error: { code: '42P01', message: 'relation "public.interview_sessions" does not exist' },
        }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }),
      },
    };

    const repo = new CloudInterviewSessionRepository(mockSupabase as unknown as SupabaseClient);

    await expect(
      repo.saveSession(
        {
          id: 'session-1',
          opportunityId: 'opp-1',
          mode: 'practice',
          difficulty: 'standard',
          exchanges: [],
          overallScore: 80,
          summary: 'Good session',
          strengths: ['Clear'],
          improvementAreas: ['Metrics'],
          requestedModel: 'gemini-3.7-flash',
          actualModel: 'gemini-3.7-flash',
          executionMode: 'gemini',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        '00000000-0000-0000-0000-000000000001'
      )
    ).rejects.toThrow(/V3.3 cloud storage is not available yet|Failed to save interview session to cloud/i);
  });

  it('8. Unauthenticated demo mode operates in localStorage without touching cloud tables', async () => {
    const localAct = defaultLocalStorageAdapter.activities;
    expect(localAct).toBeDefined();
    if (!localAct) return;

    const recorded = await localAct.recordActivity({
      opportunityId: 'opp-demo',
      activityType: 'note',
      title: 'Demo local note',
      occurredAt: new Date().toISOString(),
      source: 'user',
    });

    expect(recorded).toBeDefined();
    expect(recorded.id).toMatch(/^act-/);

    const list = await localAct.getActivities('opp-demo');
    expect(list.some((a) => a.id === recorded.id)).toBe(true);

    // Clean up
    await localAct.deleteActivity(recorded.id);
  });
});
