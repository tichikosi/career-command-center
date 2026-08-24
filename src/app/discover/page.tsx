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

type DiscoveryFilter = 'all' | 'new' | 'saved' | 'promoted' | 'dismissed';

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

  const [activeFilter, setActiveFilter] = useState<DiscoveryFilter>('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRunningDiscovery, setIsRunningDiscovery] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const mounted = candidateMounted;

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Status tab matching
      if (activeFilter !== 'all' && job.status !== activeFilter) {
        return false;
      }

      // Search term matching
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const text = `${job.title} ${job.company} ${job.location} ${job.snippet || ''} ${(job.matchedPreferences || []).join(' ')}`.toLowerCase();
        if (!text.includes(term)) return false;
      }

      return true;
    });
  }, [jobs, activeFilter, searchTerm]);

  // Counts by status
  const counts = useMemo(() => {
    return {
      all: jobs.length,
      new: jobs.filter((j) => j.status === 'new').length,
      saved: jobs.filter((j) => j.status === 'saved').length,
      promoted: jobs.filter((j) => j.status === 'promoted').length,
      dismissed: jobs.filter((j) => j.status === 'dismissed').length,
    };
  }, [jobs]);

  const handleRunDiscovery = async (providerPreference?: 'gemini' | 'curated') => {
    setIsRunningDiscovery(true);
    setRunMessage(null);
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run discovery service');
      }

      const incomingJobs: DiscoveredJob[] = data.jobs || [];
      const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(incomingJobs, jobs, opportunities);

      const mergedJobs = [...uniqueJobs, ...jobs];
      saveJobs(mergedJobs);

      const durationMs = Date.now() - startTime;
      recordRun({
        runAt: new Date().toISOString(),
        source: data.stats?.source || 'Discovery Engine',
        rolesDiscovered: incomingJobs.length,
        newRolesCount: uniqueJobs.length,
        deduplicatedCount: duplicatesCount,
        durationMs,
        status: 'success',
      });

      setRunMessage(
        `Discovered ${incomingJobs.length} roles: ${uniqueJobs.length} newly added, ${duplicatesCount} deduplicated.`
      );
    } catch (err: unknown) {
      setRunMessage(err instanceof Error ? err.message : 'Discovery scan encountered an error.');
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
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase tracking-wider">
                Discovery Workspace (V3.0 Core)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <IconCompass className="w-7 h-7 text-indigo-400" />
              Autonomous Role Discovery Feed
            </h1>
            <p className="text-xs text-slate-300">
              Scans executive market openings aligned to your candidate background, target roles, and location preferences.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              disabled={isRunningDiscovery}
              onClick={() => handleRunDiscovery()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {isRunningDiscovery ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Scanning Market...</span>
                </>
              ) : (
                <>
                  <IconSparkles className="w-4 h-4" />
                  <span>Run Discovery Now</span>
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
              <span>History ({history.length})</span>
            </button>
          </div>
        </div>

        {/* Candidate Preference Context Strip */}
        <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap text-slate-400">
            <span className="font-bold text-slate-200">Active Criteria:</span>
            <span className="text-white font-semibold">
              {candidate.name || 'Candidate Profile'}
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

      {/* Notification Banner */}
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

      {/* Discovery History Drawer */}
      {isHistoryOpen && (
        <Card padding="md" className="space-y-3 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <IconClock className="w-4 h-4 text-indigo-500" />
              <span>Discovery Execution History</span>
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
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{h.source}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                      {new Date(h.runAt).toLocaleString()} ({h.durationMs}ms)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      +{h.newRolesCount} new
                    </span>
                    {h.deduplicatedCount > 0 && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
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
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { key: 'new', label: 'New Queue', count: counts.new },
              { key: 'saved', label: 'Saved', count: counts.saved },
              { key: 'promoted', label: 'Promoted', count: counts.promoted },
              { key: 'dismissed', label: 'Dismissed', count: counts.dismissed },
              { key: 'all', label: 'All Discovered', count: counts.all },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeFilter === key
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeFilter === key
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
            placeholder="Search roles, companies, or tags..."
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
                ? 'No Roles Discovered Yet'
                : `No roles in "${activeFilter}" filter.`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {jobs.length === 0
                ? 'Click "Run Discovery Now" to autonomously scan the market for newly opened roles matching your executive profile and location criteria.'
                : 'Try adjusting your search query or switching tabs.'}
            </p>
          </div>

          {jobs.length === 0 && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isRunningDiscovery}
                onClick={() => handleRunDiscovery()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <IconSparkles className="w-4 h-4" />
                <span>Run Discovery Now</span>
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
                  {/* Top Metadata */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {job.company}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            job.relevanceLevel === 'High Potential'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : job.relevanceLevel === 'Possible Fit'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {job.relevanceScore}% Fit • {job.relevanceLevel}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {job.title}
                      </h3>
                    </div>

                    {job.jobUrl && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 shrink-0"
                        title="Open job posting"
                      >
                        <IconExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Location & Compensation */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                    <span>📍 {job.location}</span>
                    {job.compensation && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          💰 {job.compensation}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Network Match Badge */}
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

                  {/* Snippet */}
                  {job.snippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
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
