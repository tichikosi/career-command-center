-- ==============================================================================
-- CAREER COMMAND CENTER V3.2 — CLOUD DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Target Database: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES & PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  discovery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  discovery_cadence TEXT NOT NULL DEFAULT 'daily_weekday',
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  migration_completed BOOLEAN NOT NULL DEFAULT FALSE,
  migration_completed_at TIMESTAMPTZ,
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CANDIDATE PROFILES & EVIDENCE
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  headline TEXT,
  location TEXT,
  summary TEXT,
  target_roles JSONB NOT NULL DEFAULT '[]'::JSONB,
  target_industries JSONB NOT NULL DEFAULT '[]'::JSONB,
  preferred_locations JSONB NOT NULL DEFAULT '[]'::JSONB,
  core_competencies JSONB NOT NULL DEFAULT '[]'::JSONB,
  career_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  education JSONB NOT NULL DEFAULT '[]'::JSONB,
  certifications JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  sources JSONB NOT NULL DEFAULT '[]'::JSONB,
  data_mode TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. OPPORTUNITIES PIPELINE
CREATE TABLE IF NOT EXISTS public.opportunities (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  compensation TEXT,
  source_url TEXT,
  application_url TEXT,
  raw_job_description TEXT,
  stage TEXT NOT NULL DEFAULT 'Identified',
  priority TEXT NOT NULL DEFAULT 'Medium',
  notes TEXT,
  verification_status TEXT,
  verified_at TIMESTAMPTZ,
  source_domain TEXT,
  match_confidence INTEGER,
  discovery_relevance_score INTEGER,
  analysis_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.opportunity_actions (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. IMMUTABLE ANALYSIS REPORTS HISTORY
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fit_score INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  executive_summary TEXT,
  required_analysis JSONB NOT NULL DEFAULT '[]'::JSONB,
  preferred_analysis JSONB NOT NULL DEFAULT '[]'::JSONB,
  material_gaps JSONB NOT NULL DEFAULT '[]'::JSONB,
  raw_report JSONB NOT NULL,
  model_used TEXT NOT NULL,
  engine_type TEXT NOT NULL DEFAULT 'gemini-live',
  is_active_snapshot BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PROFESSIONAL NETWORK DIRECTORY (3,400+ SCALE)
CREATE TABLE IF NOT EXISTS public.network_contacts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  connection_date TEXT,
  notes TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. AUTONOMOUS JOB DISCOVERY & RUN HISTORY
CREATE TABLE IF NOT EXISTS public.discovery_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  compensation TEXT,
  job_url TEXT,
  final_canonical_url TEXT,
  source TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  relevance_score INTEGER NOT NULL DEFAULT 70,
  relevance_level TEXT NOT NULL DEFAULT 'High Potential',
  relevance_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  matched_preferences JSONB NOT NULL DEFAULT '[]'::JSONB,
  provider TEXT NOT NULL,
  grounding_used BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'grounded-unverified',
  verified_at TIMESTAMPTZ,
  source_confidence INTEGER,
  source_domain TEXT,
  failure_reason TEXT,
  snippet TEXT,
  description TEXT,
  raw_grounding_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discovery_history (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  roles_discovered INTEGER NOT NULL DEFAULT 0,
  new_roles_count INTEGER NOT NULL DEFAULT 0,
  deduplicated_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & SEARCH
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_candidate_user ON public.candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_opps_user_stage ON public.opportunities(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_opps_user_company ON public.opportunities(user_id, company);
CREATE INDEX IF NOT EXISTS idx_network_user_company ON public.network_contacts(user_id, company);
CREATE INDEX IF NOT EXISTS idx_network_user_name ON public.network_contacts(user_id, name);
CREATE INDEX IF NOT EXISTS idx_discovery_user_status ON public.discovery_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_discovery_user_verif ON public.discovery_jobs(user_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_discovery_canonical ON public.discovery_jobs(user_id, final_canonical_url);
CREATE INDEX IF NOT EXISTS idx_analysis_opp_active ON public.analysis_reports(opportunity_id, is_active_snapshot);
CREATE INDEX IF NOT EXISTS idx_user_preferences_enabled ON public.user_preferences(discovery_enabled);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_history ENABLE ROW LEVEL SECURITY;

-- 1. user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. candidate_profiles
DROP POLICY IF EXISTS "Users can manage own candidate profile" ON public.candidate_profiles;
CREATE POLICY "Users can manage own candidate profile" ON public.candidate_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. opportunities & actions
DROP POLICY IF EXISTS "Users can manage own opportunities" ON public.opportunities;
CREATE POLICY "Users can manage own opportunities" ON public.opportunities
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own opportunity actions" ON public.opportunity_actions;
CREATE POLICY "Users can manage own opportunity actions" ON public.opportunity_actions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. analysis_reports
DROP POLICY IF EXISTS "Users can manage own analysis reports" ON public.analysis_reports;
CREATE POLICY "Users can manage own analysis reports" ON public.analysis_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. network_contacts
DROP POLICY IF EXISTS "Users can manage own network contacts" ON public.network_contacts;
CREATE POLICY "Users can manage own network contacts" ON public.network_contacts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. discovery_jobs & history
DROP POLICY IF EXISTS "Users can manage own discovery jobs" ON public.discovery_jobs;
CREATE POLICY "Users can manage own discovery jobs" ON public.discovery_jobs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own discovery history" ON public.discovery_history;
CREATE POLICY "Users can manage own discovery history" ON public.discovery_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create user_profiles and user_preferences upon auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, discovery_enabled, discovery_cadence)
  VALUES (NEW.id, TRUE, 'daily_weekday')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- GRANTS & ROLE PRIVILEGES (FOR AUTHENTICATED USERS)
-- ==============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table privileges for authenticated users (strictly constrained by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant sequence privileges
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Ensure default privileges apply to future tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
