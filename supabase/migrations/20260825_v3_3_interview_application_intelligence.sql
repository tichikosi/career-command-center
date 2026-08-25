-- ==============================================================================
-- CAREER COMMAND CENTER V3.3 — INTERVIEW WAR ROOM + APPLICATION INTELLIGENCE
-- Target Database: PostgreSQL 15+ (Supabase)
-- IMPORTANT: Apply manually in Supabase SQL Editor. DO NOT run automatically.
-- ==============================================================================

-- 1. OPPORTUNITY ACTIVITIES (Mutable activity log per opportunity)
CREATE TABLE IF NOT EXISTS public.opportunity_activities (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  contact_id TEXT,
  contact_name TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INTERVIEW PREPARATIONS (AI-generated prep packages)
CREATE TABLE IF NOT EXISTS public.interview_preparations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  candidate_profile_id TEXT,
  prep_data JSONB NOT NULL,
  requested_model TEXT NOT NULL DEFAULT 'gemini-3.7-flash',
  actual_model TEXT NOT NULL DEFAULT 'gemini-3.7-flash',
  execution_mode TEXT NOT NULL DEFAULT 'gemini',
  candidate_updated_at TIMESTAMPTZ,
  opportunity_updated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_potentially_stale BOOLEAN NOT NULL DEFAULT FALSE,
  staleness_reason TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INTERVIEW SESSIONS (Mock interview transcripts with scoring)
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  prep_id TEXT REFERENCES public.interview_preparations(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'practice',
  difficulty TEXT NOT NULL DEFAULT 'standard',
  transcript JSONB NOT NULL DEFAULT '[]'::JSONB,
  overall_score INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::JSONB,
  improvement_areas JSONB NOT NULL DEFAULT '[]'::JSONB,
  requested_model TEXT NOT NULL DEFAULT 'gemini-3.7-flash',
  actual_model TEXT NOT NULL DEFAULT 'gemini-3.7-flash',
  execution_mode TEXT NOT NULL DEFAULT 'gemini',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_activities_user_opp ON public.opportunity_activities(user_id, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_type ON public.opportunity_activities(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_occurred ON public.opportunity_activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled ON public.opportunity_activities(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prep_user_opp ON public.interview_preparations(user_id, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_prep_active ON public.interview_preparations(opportunity_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user_opp ON public.interview_sessions(user_id, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON public.interview_sessions(completed_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.opportunity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- opportunity_activities RLS
CREATE POLICY "Users can view own activities"
  ON public.opportunity_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON public.opportunity_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON public.opportunity_activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON public.opportunity_activities FOR DELETE
  USING (auth.uid() = user_id);

-- interview_preparations RLS
CREATE POLICY "Users can view own preparations"
  ON public.interview_preparations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preparations"
  ON public.interview_preparations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preparations"
  ON public.interview_preparations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preparations"
  ON public.interview_preparations FOR DELETE
  USING (auth.uid() = user_id);

-- interview_sessions RLS
CREATE POLICY "Users can view own sessions"
  ON public.interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.interview_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.interview_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_preparations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
