'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCandidateProfile } from '@/lib/useCandidate';
import { deduplicateDiscoveredJobs } from '@/lib/discoveryStorage';
import { useDiscovery } from '@/lib/useDiscovery';
import { useNetwork } from '@/lib/networkStorage';
import { useOpportunities } from '@/lib/useOpportunities';
import { findMatchingContacts } from '@/lib/networkMatcher';
import { DiscoveredJob } from '@/types/discovery';
import { Card } from '@/components/ui/Card';
import {
  IconCompass,
  IconSparkles,
  IconSearch,
  IconExternalLink,
  IconNetwork,
  IconCheckCircle,
  IconClock,
  IconPlus,
} from '@/components/icons';

type DiscoveryTab = 'live' | 'needs-verification' | 'saved' | 'promoted' | 'dismissed' | 'curated' | 'all';

export default function DiscoverPage() {
  const { profile: candidate, mounted: candidateMounted } = useCandidateProfile();
  const {
    jobs,
    saveJobs,
    updateStatus,
    recordRun,
    history,
    promoteToOpportunity,
  } = useDiscovery();
  const { contacts: networkContacts } = useNetwork();
  const opportunities = useOpportunities();

  const [activeTab, setActiveTab] = useState<DiscoveryTab>('live');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRunningDiscovery, setIsRunningDiscovery] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [groundingError, setGroundingError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const mounted = candidateMounted;

  // Counts by tab category
  const counts = useMemo(() => {
    return {
      live: jobs.filter((j) => j.verificationStatus === 'verified-live' && j.status !== 'dismissed' && j.status !== 'promoted').length,
      'needs-verification': jobs.filter(
        (j) => (j.verificationStatus === 'grounded-unverified' || j.verificationStatus === 'unreachable') && j.status !== 'dismissed' && j.status !== 'promoted'
      ).length,
      saved: jobs.filter((j) => j.status === 'saved').length,
      promoted: jobs.filter((j) => j.status === 'promoted').length,
      dismissed: jobs.filter((j) => j.status === 'dismissed').length,
      curated: jobs.filter((j) => j.verificationStatus === 'curated' && j.status !== 'dismissed' && j.status !== 'promoted').length,
      all: jobs.length,
    };
  }, [jobs]);

  // Filtered jobs list based on active tab and search query
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Tab matching logic
      switch (activeTab) {
        case 'live':
          if (job.verificationStatus !== 'verified-live' || job.status === 'dismissed' || job.status === 'promoted') {
            return false;
          }
          break;
        case 'needs-verification':
          if (
            (job.verificationStatus !== 'grounded-unverified' && job.verificationStatus !== 'unreachable') ||
            job.status === 'dismissed' ||
            job.status === 'promoted'
          ) {
            return false;
          }
          break;
        case 'saved':
          if (job.status !== 'saved') return false;
          break;
        case 'promoted':
          if (job.status !== 'promoted') return false;
          break;
        case 'dismissed':
          if (job.status !== 'dismissed') return false;
          break;
        case 'curated':
          if (job.verificationStatus !== 'curated' || job.status === 'dismissed' || job.status === 'promoted') {
            return false;
          }
          break;
        case 'all':
          break;
      }

      // Search term matching
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const text = `${job.title} ${job.company} ${job.location} ${job.snippet || ''} ${job.sourceDomain || ''} ${(job.matchedPreferences || []).join(' ')}`.toLowerCase();
        if (!text.includes(term)) return false;
      }

      return true;
    });
  }, [jobs, activeTab, searchTerm]);

  const handleRunDiscovery = async (providerPreference: 'gemini' | 'curated' = 'gemini') => {
    setIsRunningDiscovery(true);
    setRunMessage(null);
    setGroundingError(null);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateSnapshot: candidate,
          providerPreference,
        }),
      });

      const data = await res.json();
      const stats = data.stats || {};
      const durationMs = Date.now() - startTime;

      if (!res.ok || data.success === false) {
        const errorMsg = data.error || stats.sanitizedFailureReason || 'Live search temporarily unavailable.';
        setGroundingError(errorMsg);

        recordRun({
          runAt: new Date().toISOString(),
          source: stats.source || 'Gemini Search Grounding',
          provider: stats.provider || 'Gemini Intelligent Market Discovery',
          rolesDiscovered: 0,
          newRolesCount: 0,
          deduplicatedCount: 0,
          jobsGrounded: 0,
          jobsUrlValid: 0,
          jobsVerifiedLive: 0,
          jobsRejected: 0,
          durationMs,
          status: 'failed',
          groundingEnabled: stats.groundingEnabled ?? true,
          sanitizedFailureReason: errorMsg,
          message: errorMsg,
        });
        return;
      }

      const incomingJobs: DiscoveredJob[] = data.jobs || [];
      const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(incomingJobs, jobs, opportunities);

      const mergedJobs = [...uniqueJobs, ...jobs];
      saveJobs(mergedJobs);

      recordRun({
        runAt: new Date().toISOString(),
        source: stats.source || 'Gemini Search Grounding',
        provider: stats.provider || 'Gemini Intelligent Market Discovery',
        modelRequested: stats.modelRequested,
        modelUsed: stats.modelUsed,
        groundingEnabled: stats.groundingEnabled ?? (providerPreference === 'gemini'),
        groundingQueries: stats.groundingQueries || [],
        rolesDiscovered: incomingJobs.length,
        newRolesCount: uniqueJobs.length,
        deduplicatedCount: duplicatesCount,
        jobsGrounded: stats.jobsGrounded || 0,
        jobsUrlValid: stats.jobsUrlValid || 0,
        jobsVerifiedLive: stats.jobsVerifiedLive || 0,
        jobsRejected: stats.jobsRejected || 0,
        durationMs,
        status: uniqueJobs.length > 0 ? 'success' : 'partial',
      });

      const liveCount = uniqueJobs.filter((j) => j.verificationStatus === 'verified-live').length;
      setRunMessage(
        `Discovered ${incomingJobs.length} roles (${liveCount} Verified Live): ${uniqueJobs.length} new added, ${duplicatesCount} deduplicated.`
      );

      if (providerPreference === 'curated') {
        setActiveTab('curated');
      } else {
        setActiveTab('live');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Discovery scan encountered a network error.';
      setGroundingError(msg);
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  const handlePromote = (job: DiscoveredJob) => {
    promoteToOpportunity(job);
    setRunMessage(`Promoted "${job.title} at ${job.company}" to Active Pipeline!`);
  };

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse py-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="h-4 bg-slate-800 rounded w-48"></div>
          <div className="h-8 bg-slate-800 rounded w-72"></div>
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <span>⚡</span>
                <span>V3.1 Grounded Discovery</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Google Search Grounding
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <IconCompass className="w-7 h-7 text-indigo-400" />
              Autonomous Role Discovery Feed
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Searches live public employer portals and enterprise ATS listings matching your executive target preferences, verifies real-time availability, and preserves source provenance.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              disabled={isRunningDiscovery}
              onClick={() => handleRunDiscovery('gemini')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {isRunningDiscovery ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Grounding Live Search...</span>
                </>
              ) : (
                <>
                  <IconSparkles className="w-4 h-4" />
                  <span>Run Live Discovery</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isRunningDiscovery}
              onClick={() => handleRunDiscovery('curated')}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-300 rounded-xl border border-slate-700 transition-colors"
            >
              Curated Feed
            </button>

            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <IconClock className="w-3.5 h-3.5" />
              <span>Audit History ({history.length})</span>
            </button>
          </div>
        </div>

        {/* Candidate Preference Context Strip */}
        <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap text-slate-400">
            <span className="font-bold text-slate-200">Active Profile Targets:</span>
            <span className="text-white font-semibold">
              {candidate.name || 'Active Candidate'}
            </span>
            <span className="text-slate-600">•</span>

            {candidate.targetRoles && candidate.targetRoles.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {candidate.targetRoles.slice(0, 3).map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}

            {candidate.preferredLocations && candidate.preferredLocations.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {candidate.preferredLocations.slice(0, 2).map((l) => (
                  <span
                    key={l}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    📍 {l}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grounding Error / Quota Notice Banner */}
      {groundingError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                ⚠️ Live Google Search Grounding Temporarily Unavailable
              </span>
              <p className="text-amber-700 dark:text-amber-300/90 leading-relaxed">
                {groundingError}
              </p>
            </div>
            <button
              onClick={() => setGroundingError(null)}
              className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 font-bold text-sm"
            >
              ✕
            </button>
          </div>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleRunDiscovery('gemini')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-[11px]"
            >
              Retry Live Search
            </button>
            <button
              type="button"
              onClick={() => handleRunDiscovery('curated')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition-colors text-[11px]"
            >
              View Curated Demo Feed
            </button>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {runMessage && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
          <span>{runMessage}</span>
          <button
            onClick={() => setRunMessage(null)}
            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Discovery Audit History Drawer */}
      {isHistoryOpen && (
        <Card padding="md" className="space-y-3 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <IconClock className="w-4 h-4 text-indigo-500" />
              <span>Discovery Execution Audit History</span>
            </h3>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No previous discovery runs recorded.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{h.provider || h.source}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          h.status === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : h.status === 'partial'
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {h.status.toUpperCase()}
                      </span>
                      {h.groundingEnabled && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          🌐 Grounded
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                      {new Date(h.runAt).toLocaleString()} • {h.durationMs}ms {h.modelUsed ? `(${h.modelUsed})` : ''}
                    </span>
                    {h.sanitizedFailureReason && (
                      <span className="text-rose-600 dark:text-rose-400 text-[10px] block">
                        Reason: {h.sanitizedFailureReason}
                      </span>
                    )}
                  </div>
                  <div className="text-right flex items-center sm:flex-col gap-2 sm:gap-0.5 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      +{h.newRolesCount} added
                    </span>
                    {h.deduplicatedCount > 0 && (
                      <span className="text-[10px] text-slate-400 block">
                        {h.deduplicatedCount} deduped
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'live', label: 'Live Roles', count: counts.live, icon: '⚡' },
              { key: 'needs-verification', label: 'Needs Verification', count: counts['needs-verification'], icon: '🔍' },
              { key: 'saved', label: 'Saved', count: counts.saved, icon: '⭐' },
              { key: 'promoted', label: 'Promoted', count: counts.promoted, icon: '✓' },
              { key: 'dismissed', label: 'Dismissed', count: counts.dismissed, icon: '✕' },
              { key: 'curated', label: 'Curated / Demo', count: counts.curated, icon: '📁' },
              { key: 'all', label: 'All Discovered', count: counts.all, icon: '🌐' },
            ] as const
          ).map(({ key, label, count, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === key
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {icon && <span>{icon}</span>}
              <span>{label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === key
                    ? 'bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roles, companies, domains..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Discovered Roles List */}
      {filteredJobs.length === 0 ? (
        <Card padding="lg" className="text-center py-16 space-y-4">
          <IconCompass className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {jobs.length === 0
                ? 'No Discovered Roles Yet'
                : `No roles in "${activeTab}" view.`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {jobs.length === 0
                ? 'Click "Run Live Discovery" to search Google for verified open executive roles matching your candidate criteria.'
                : 'Try adjusting your search filter or explore another tab.'}
            </p>
          </div>

          {jobs.length === 0 && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isRunningDiscovery}
                onClick={() => handleRunDiscovery('gemini')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <IconSparkles className="w-4 h-4" />
                <span>Run Live Discovery</span>
              </button>
              <button
                type="button"
                disabled={isRunningDiscovery}
                onClick={() => handleRunDiscovery('curated')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl border border-slate-700 transition-colors"
              >
                Load Demo Pipeline
              </button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const matchedNetwork = findMatchingContacts(job.company, networkContacts);

            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Header & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Company Badge */}
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {job.company}
                        </span>

                        {/* Trust / Verification Status Badge */}
                        {job.verificationStatus === 'verified-live' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                            <span>✓</span>
                            <span>Verified Live</span>
                          </span>
                        )}

                        {job.verificationStatus === 'grounded-unverified' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Grounded (Needs Verification)
                          </span>
                        )}

                        {job.verificationStatus === 'curated' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            Curated / Demo
                          </span>
                        )}

                        {job.verificationStatus === 'unverified-legacy' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200">
                            Legacy Unverified
                          </span>
                        )}

                        {/* Source Domain Tag */}
                        {job.sourceDomain && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                            🌐 {job.sourceDomain}
                          </span>
                        )}
                      </div>

                      {/* Job Title */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {job.title}
                      </h3>
                    </div>

                    {/* External Link */}
                    {job.jobUrl && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 shrink-0"
                        title="Open external job listing"
                      >
                        <IconExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Discovery Relevance Score Strip (Explicitly distinguished from Full Fit Score) */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Discovery Relevance:
                    </span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {job.relevanceScore}% Match ({job.relevanceLevel})
                    </span>
                  </div>

                  {/* Location & Compensation */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                    <span>📍 {job.location}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    {job.compensation && !job.isCompensationInferred ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        💰 {job.compensation}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        💰 Compensation not disclosed by employer
                      </span>
                    )}
                  </div>

                  {/* Network Warm Outreach Banner */}
                  {matchedNetwork.length > 0 && (
                    <div className="p-2 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-lg flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                        <IconNetwork className="w-3.5 h-3.5" />
                        <span>
                          {matchedNetwork.length} connection{matchedNetwork.length !== 1 ? 's' : ''} at {job.company}
                        </span>
                      </div>
                      <Link
                        href={`/network?company=${encodeURIComponent(job.company)}`}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Contacts →
                      </Link>
                    </div>
                  )}

                  {/* Snippet / Rationale */}
                  {job.snippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {job.snippet}
                    </p>
                  )}

                  {/* Matched Preference Tags */}
                  {job.matchedPreferences && job.matchedPreferences.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {job.matchedPreferences.map((pref) => (
                        <span
                          key={pref}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {pref}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Freshness / Verification Notice */}
                  <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                    <span>
                      {job.postingDate ? `Posted: ${job.postingDate}` : `Verified: ${job.discoveredAt.slice(0, 10)}`}
                    </span>
                    {job.verificationReason && (
                      <span className="text-[10px] text-slate-400 max-w-[200px] truncate" title={job.verificationReason}>
                        {job.verificationReason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Strip */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    {job.status !== 'promoted' ? (
                      <button
                        type="button"
                        onClick={() => handlePromote(job)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <IconPlus className="w-3.5 h-3.5" />
                        <span>+ Add to Pipeline</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <IconCheckCircle className="w-3.5 h-3.5" />
                        <span>In Pipeline</span>
                      </span>
                    )}

                    {job.status === 'new' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(job.id, 'saved')}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors"
                      >
                        Save
                      </button>
                    )}

                    {job.status === 'saved' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(job.id, 'new')}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors"
                      >
                        Unsave
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {job.status !== 'dismissed' ? (
                      <button
                        type="button"
                        onClick={() => updateStatus(job.id, 'dismissed')}
                        className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg"
                        title="Dismiss role"
                      >
                        Dismiss
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateStatus(job.id, 'new')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline p-1.5"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
