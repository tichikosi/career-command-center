-- ==============================================================================
-- CAREER COMMAND CENTER V3.2
-- MIGRATION: CANDIDATE PROFILE ONE-USER-ONE-RECORD ENFORCEMENT & DEDUPLICATION
-- ==============================================================================

-- 1. Safely reconcile and deduplicate any duplicate candidate_profiles rows per user_id.
-- Preserves the newest, legitimate user profile (prioritizing real user data_mode and latest updated_at).
WITH RankedProfiles AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN data_mode = 'user' AND name NOT IN ('Alex Vance', 'Executive Candidate', '') THEN 0 ELSE 1 END,
        updated_at DESC,
        created_at DESC
    ) AS rank
  FROM public.candidate_profiles
  WHERE user_id IS NOT NULL
)
DELETE FROM public.candidate_profiles
WHERE id IN (
  SELECT id FROM RankedProfiles WHERE rank > 1
);

-- 2. Add UNIQUE constraint on user_id to guarantee one active candidate profile per cloud user.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'candidate_profiles_user_id_key'
      AND conrelid = 'public.candidate_profiles'::regclass
  ) THEN
    ALTER TABLE public.candidate_profiles
      ADD CONSTRAINT candidate_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Ensure deterministic index exists on user_id for high performance
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON public.candidate_profiles(user_id);
