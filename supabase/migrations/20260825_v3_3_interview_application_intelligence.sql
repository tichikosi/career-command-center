-- ==============================================================================
-- CAREER COMMAND CENTER V3.3 — INTERVIEW WAR ROOM + APPLICATION INTELLIGENCE
-- Target Database: PostgreSQL 15+ (Supabase)
-- IMPORTANT: Apply manually in Supabase SQL Editor. DO NOT run automatically.
-- ==============================================================================

-- 1. OPPORTUNITY ACTIVITIES (Chronological forward-only touchpoints & notes)
CREATE TABLE IF NOT EXISTS public.opportunity_activities (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  contact_id TEXT REFERENCES public.network_contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INTERVIEW PREPARATIONS (AI-generated interview briefs with full history support)
CREATE TABLE IF NOT EXISTS public.interview_preparations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  candidate_profile_id TEXT REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
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

-- 3. INTERVIEW SESSIONS (Mock interview transcripts with 6-dimension scoring)
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
-- INDEXES & CONSTRAINTS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_activities_user_opp ON public.opportunity_activities(user_id, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_type ON public.opportunity_activities(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_occurred ON public.opportunity_activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled ON public.opportunity_activities(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_contact ON public.opportunity_activities(contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prep_user_opp ON public.interview_preparations(user_id, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_prep_generated ON public.interview_preparations(generated_at DESC);
-- Guarantee exactly one active preparation per user and opportunity while preserving full generation history
CREATE UNIQUE INDEX IF NOT EXISTS uq_interview_prep_active ON public.interview_preparations(user_id, opportunity_id) WHERE (is_active = TRUE);

CREATE INDEX IF NOT EXISTS idx_sessions_user_opp ON public.interview_sessions(user_id, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON public.interview_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON public.interview_sessions(created_at DESC);

-- ==============================================================================
-- UPDATED_AT TRIGGER FOR OPPORTUNITY ACTIVITIES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opportunity_activities_updated_at ON public.opportunity_activities;
CREATE TRIGGER trg_opportunity_activities_updated_at
  BEFORE UPDATE ON public.opportunity_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (STRICTLY AUTHENTICATED USER SCOPED)
-- ==============================================================================

ALTER TABLE public.opportunity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- 1. opportunity_activities RLS
DROP POLICY IF EXISTS "Users can view own activities" ON public.opportunity_activities;
CREATE POLICY "Users can view own activities"
  ON public.opportunity_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activities" ON public.opportunity_activities;
CREATE POLICY "Users can insert own activities"
  ON public.opportunity_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activities" ON public.opportunity_activities;
CREATE POLICY "Users can update own activities"
  ON public.opportunity_activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activities" ON public.opportunity_activities;
CREATE POLICY "Users can delete own activities"
  ON public.opportunity_activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. interview_preparations RLS
DROP POLICY IF EXISTS "Users can view own preparations" ON public.interview_preparations;
CREATE POLICY "Users can view own preparations"
  ON public.interview_preparations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preparations" ON public.interview_preparations;
CREATE POLICY "Users can insert own preparations"
  ON public.interview_preparations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preparations" ON public.interview_preparations;
CREATE POLICY "Users can update own preparations"
  ON public.interview_preparations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preparations" ON public.interview_preparations;
CREATE POLICY "Users can delete own preparations"
  ON public.interview_preparations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. interview_sessions RLS
DROP POLICY IF EXISTS "Users can view own sessions" ON public.interview_sessions;
CREATE POLICY "Users can view own sessions"
  ON public.interview_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.interview_sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.interview_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.interview_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.interview_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.interview_sessions;
CREATE POLICY "Users can delete own sessions"
  ON public.interview_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- ROLE GRANTS (AUTHENTICATED & SERVICE_ROLE ONLY — NO ANON GRANTS)
-- ==============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_activities TO authenticated;
GRANT ALL ON public.opportunity_activities TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_preparations TO authenticated;
GRANT ALL ON public.interview_preparations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
GRANT ALL ON public.interview_sessions TO service_role;
