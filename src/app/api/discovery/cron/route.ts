import { NextRequest, NextResponse } from 'next/server';
import { runDiscoveryForCandidate } from '@/lib/server/discoveryService';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { defaultSyntheticCandidateProfile } from '@/data/candidate';
import { CandidateProfile } from '@/types/candidate';
import { DiscoveredJob } from '@/types/discovery';
import { deduplicateDiscoveredJobs } from '@/lib/discoveryStorage';
import { isGeminiConfigured } from '@/lib/server/geminiConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request | NextRequest) {
  return handleCron(req);
}

export async function POST(req: Request | NextRequest) {
  return handleCron(req);
}

async function handleCron(req: Request | NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const customHeader = req.headers.get('x-cron-secret');

  // Verify Bearer authorization or x-cron-secret header if CRON_SECRET is configured
  if (cronSecret && cronSecret.trim().length > 0) {
    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    const isHeaderValid = customHeader === cronSecret;

    if (!isBearerValid && !isHeaderValid) {
      return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'CRON_SECRET must be configured in production to authorize scheduled jobs.' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const adminClient = getSupabaseAdminClient();

  // If Supabase Admin Client is not configured, run for default profile in fallback mode
  if (!adminClient) {
    try {
      const result = await runDiscoveryForCandidate(defaultSyntheticCandidateProfile, {
        providerPreference: isGeminiConfigured() ? 'gemini' : 'curated',
      });
      return NextResponse.json({
        success: true,
        mode: 'fallback_default_profile',
        timestamp: new Date().toISOString(),
        usersProcessed: 1,
        totalFound: result.totalFound,
        durationMs: Date.now() - startTime,
      });
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Fallback cron execution failed' },
        { status: 500 }
      );
    }
  }

  // Multi-User Cloud Execution
  try {
    // 1. Fetch up to 10 users with discovery enabled
    const { data: userPrefs, error: prefsError } = await adminClient
      .from('user_preferences')
      .select('user_id, discovery_enabled, discovery_cadence')
      .eq('discovery_enabled', true)
      .limit(10);

    if (prefsError) {
      return NextResponse.json({ error: `Failed to load user preferences: ${prefsError.message}` }, { status: 500 });
    }

    if (!userPrefs || userPrefs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No eligible users found with discovery enabled.',
        usersProcessed: 0,
        durationMs: Date.now() - startTime,
      });
    }

    const resultsSummary: {
      userId: string;
      status: 'success' | 'failed' | 'skipped';
      rolesDiscovered: number;
      error?: string;
    }[] = [];

    // 2. Process each user with strict isolation
    for (const pref of userPrefs) {
      const userId = pref.user_id;

      try {
        // Load candidate profile for this user
        const { data: candData } = await adminClient
          .from('candidate_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const candidateProfile: CandidateProfile = candData
          ? {
              id: candData.id,
              name: candData.name,
              headline: candData.headline || '',
              location: candData.location || '',
              summary: candData.summary || '',
              targetRoles: candData.target_roles || [],
              targetIndustries: candData.target_industries || [],
              preferredLocations: candData.preferred_locations || [],
              coreCompetencies: candData.core_competencies || [],
              careerHistory: candData.career_history || [],
              education: candData.education || [],
              certifications: candData.certifications || [],
              evidenceItems: candData.evidence_items || [],
              sources: candData.sources || [],
              updatedAt: candData.updated_at,
              dataMode: 'user',
            }
          : defaultSyntheticCandidateProfile;

        // Load existing active opportunities for dedupe
        const { data: oppsData } = await adminClient
          .from('opportunities')
          .select('id, company, title, location, source_url, stage')
          .eq('user_id', userId);

        const existingOpps = (oppsData || []).map((o) => ({
          id: o.id,
          company: o.company,
          title: o.title,
          location: o.location || '',
          sourceUrl: o.source_url,
          stage: o.stage,
        }));

        // Load existing discovery cache for dedupe
        const { data: discData } = await adminClient
          .from('discovery_jobs')
          .select('*')
          .eq('user_id', userId);

        const existingDiscovery: DiscoveredJob[] = (discData || []).map((d) => ({
          id: d.id,
          title: d.title,
          company: d.company,
          location: d.location || '',
          jobUrl: d.job_url,
          source: d.source,
          discoveredAt: d.discovered_at,
          status: d.status,
          relevanceScore: d.relevance_score,
          relevanceLevel: d.relevance_level,
          relevanceReasons: d.relevance_reasons || [],
          matchedPreferences: d.matched_preferences || [],
          provider: d.provider,
          groundingUsed: d.grounding_used,
          verificationStatus: d.verification_status,
        }));

        // Run discovery service for candidate
        const discoveryResult = await runDiscoveryForCandidate(candidateProfile, {
          providerPreference: isGeminiConfigured() ? 'gemini' : 'curated',
        });

        // Deduplicate against stored discovery queue AND active pipeline opportunities
        const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(
          discoveryResult.jobs,
          existingDiscovery,
          existingOpps
        );

        // Persist newly discovered jobs to Cloud Database
        if (uniqueJobs.length > 0) {
          const rows = uniqueJobs.map((j) => ({
            id: j.id,
            user_id: userId,
            title: j.title,
            company: j.company,
            location: j.location,
            compensation: j.compensation,
            job_url: j.jobUrl,
            final_canonical_url: j.finalCanonicalUrl,
            source: j.source,
            discovered_at: j.discoveredAt,
            status: j.status,
            relevance_score: j.relevanceScore,
            relevance_level: j.relevanceLevel,
            relevance_reasons: j.relevanceReasons,
            matched_preferences: j.matchedPreferences,
            provider: j.provider,
            grounding_used: j.groundingUsed,
            verification_status: j.verificationStatus,
            verified_at: j.verifiedAt,
            source_confidence: j.sourceConfidence,
            source_domain: j.sourceDomain,
            failure_reason: j.failureReason,
            snippet: j.snippet,
            description: j.description,
            raw_grounding_metadata: j.matchedGroundingChunks || null,
            updated_at: new Date().toISOString(),
          }));

          await adminClient.from('discovery_jobs').upsert(rows);
        }

        // Record history entry
        await adminClient.from('discovery_history').insert({
          id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          run_at: new Date().toISOString(),
          source: discoveryResult.source,
          roles_discovered: discoveryResult.totalFound,
          new_roles_count: uniqueJobs.length,
          deduplicated_count: duplicatesCount,
          duration_ms: discoveryResult.durationMs,
          status: 'success',
        });

        resultsSummary.push({
          userId,
          status: 'success',
          rolesDiscovered: discoveryResult.totalFound,
        });
      } catch (userErr: unknown) {
        const errorMsg = userErr instanceof Error ? userErr.message : String(userErr);
        resultsSummary.push({
          userId,
          status: 'failed',
          rolesDiscovered: 0,
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersProcessed: resultsSummary.length,
      durationMs: Date.now() - startTime,
      results: resultsSummary,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Multi-user cron processing failed' },
      { status: 500 }
    );
  }
}
