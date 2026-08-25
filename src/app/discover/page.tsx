'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCandidateProfile } from '@/lib/useCandidate';
import { deduplicateDiscoveredJobs } from '@/lib/discoveryStorage';
import { useDiscovery } from '@/lib/useDiscovery';
import { useNetwork } from '@/lib/networkStorage';
import { useOpportunities } from '@/lib/useOpportunities';
import { findMatchingContacts } from '@/lib/networkMatcher';
import { DiscoveredJob, VerificationStatus } from '@/types/discovery';
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
  IconShield,
} from '@/components/icons';

type PrimaryDiscoveryTab = 'live' | 'saved' | 'promoted' | 'dismissed' | 'all';
type TrustFilter = 'all' | 'verified-live' | 'needs-verification' | 'curated' | 'unverified-legacy' | 'expired';

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

  const [activeTab, setActiveTab] = useState<PrimaryDiscoveryTab>('live');
  const [trustFilter, setTrustFilter] = useState<TrustFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRunningDiscovery, setIsRunningDiscovery] = useState(false);
  const [reverifyingId, setReverifyingId] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [groundingError, setGroundingError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [autoDiscoveryEnabled, setAutoDiscoveryEnabled] = useState(true);

  const mounted = candidateMounted;

  // Counts by primary category
  const counts = useMemo(() => {
    return {
      live: jobs.filter(
        (j) => (j.verificationStatus === 'verified-live' || j.verificationStatus === 'curated' || j.groundingUsed) && j.status !== 'dismissed' && j.status !== 'promoted'
      ).length,
      saved: jobs.filter((j) => j.status === 'saved').length,
      promoted: jobs.filter((j) => j.status === 'promoted').length,
      dismissed: jobs.filter((j) => j.status === 'dismissed').length,
      all: jobs.length,
    };
  }, [jobs]);

  // Filtered jobs list based on primary tab, secondary trust filter, and search query
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Primary Workflow Tab Filter
      switch (activeTab) {
        case 'live':
          if (
            (job.verificationStatus !== 'verified-live' && job.verificationStatus !== 'curated' && !job.groundingUsed) ||
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
        case 'all':
          break;
      }

      // 2. Secondary Trust / Source Filter
      if (trustFilter !== 'all') {
        if (trustFilter === 'needs-verification') {
          if (job.verificationStatus !== 'grounded-unverified' && job.verificationStatus !== 'unreachable' && job.verificationStatus !== 'needs-verification') {
            return false;
          }
        } else if (job.verificationStatus !== trustFilter) {
          return false;
        }
      }

      // 3. Search query matching
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesLocation = (job.location || '').toLowerCase().includes(q);
        const matchesProvider = (job.provider || '').toLowerCase().includes(q);
        const matchesDomain = (job.sourceDomain || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesProvider && !matchesDomain) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, activeTab, trustFilter, searchTerm]);

  // Execute Discovery Run (Live Google Search Grounding or Curated Pipeline Feed)
  const handleRunDiscovery = async (providerOverride?: 'gemini' | 'curated') => {
    setIsRunningDiscovery(true);
    setRunMessage(null);
    setGroundingError(null);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerPreference: providerOverride,
          provider: providerOverride,
          candidateProfile: candidate,
          candidateSnapshot: candidate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 || (data.error && data.error.includes('429'))) {
          setGroundingError(
            'Google Gemini Search Grounding API rate limit reached (HTTP 429 Quota Exhausted). You can explore our verified Curated Strategic Pipeline Feed or retry live search later.'
          );
        } else {
          setGroundingError(data.error || 'Failed to execute discovery engine.');
        }
        return;
      }

      const incomingJobs: DiscoveredJob[] = data.jobs || [];

      // Deduplicate against stored discovery queue AND active pipeline opportunities
      const { uniqueJobs, duplicatesCount } = deduplicateDiscoveredJobs(
        incomingJobs,
        jobs,
        opportunities
      );

      // Merge net-new discovered roles
      if (uniqueJobs.length > 0) {
        saveJobs([...uniqueJobs, ...jobs]);
      }

      // Record in run history
      const durationMs = Date.now() - startTime;
      recordRun({
        runAt: new Date().toISOString(),
        source: data.provider || (providerOverride === 'curated' ? 'Curated Strategic Feed' : 'Gemini Google Search Grounding'),
        provider: data.provider || (providerOverride === 'curated' ? 'curated' : 'gemini'),
        groundingEnabled: providerOverride !== 'curated',
        rolesDiscovered: incomingJobs.length,
        newRolesCount: uniqueJobs.length,
        deduplicatedCount: duplicatesCount,
        durationMs,
        status: 'success',
      });

      setRunMessage(
        `Discovered ${incomingJobs.length} roles (${uniqueJobs.length} net-new, ${duplicatesCount} deduplicated against pipeline & queue) in ${(durationMs / 1000).toFixed(1)}s via ${data.provider || 'Discovery Engine'}.`
      );
    } catch (err: unknown) {
      setGroundingError(
        err instanceof Error
          ? err.message
          : 'Network error connecting to Discovery server endpoint.'
      );
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  // Re-verify an individual role
  const handleReverify = async (job: DiscoveredJob) => {
    setReverifyingId(job.id);
    setRunMessage(null);

    try {
      const res = await fetch('/api/discovery/reverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          title: job.title,
          company: job.company,
          jobUrl: job.jobUrl || job.finalCanonicalUrl,
        }),
      });

      const data = await res.json();

      if (data.verificationStatus) {
        const updatedList = jobs.map((j) => {
          if (j.id === job.id) {
            return {
              ...j,
              verificationStatus: data.verificationStatus as VerificationStatus,
              verifiedAt: data.verifiedAt,
              sourceConfidence: data.matchConfidence !== undefined ? data.matchConfidence : j.sourceConfidence,
              failureReason: data.failureReason !== undefined ? data.failureReason : j.failureReason,
              finalCanonicalUrl: data.finalCanonicalUrl || j.finalCanonicalUrl,
              sourceDomain: data.finalDomain || j.sourceDomain,
            };
          }
          return j;
        });

        saveJobs(updatedList);
        setRunMessage(
          `Re-verified "${job.title} at ${job.company}": Trust status updated to "${data.verificationStatus}".`
        );
      } else if (data.error) {
        setRunMessage(`Re-verification notice: ${data.error}`);
      }
    } catch (err: unknown) {
      setRunMessage(
        `Re-verification failed: ${err instanceof Error ? err.message : 'Could not contact verification service.'}`
      );
    } finally {
      setReverifyingId(null);
    }
  };

  const handlePromote = (job: DiscoveredJob) => {
    promoteToOpportunity(job);
    setRunMessage(`Promoted "${job.title} at ${job.company}" to Active Pipeline!`);
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-64 animate-pulse"></div>
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800 backdrop-blur-xs">
              <IconSparkles className="w-3.5 h-3.5" />
              <span>Google Search Grounded Discovery & Cloud Persistence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <IconCompass className="w-7 h-7 text-indigo-400" />
              Autonomous Role Discovery Feed
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Searches live public employer portals and enterprise ATS listings matching your executive target preferences, verifies real-time availability, and preserves source provenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isRunningDiscovery}
              onClick={() => handleRunDiscovery('gemini')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg shadow-indigo-950 transition-all flex items-center gap-2"
            >
              {isRunningDiscovery ? (
                <>
                  <span className="animate-spin text-sm">🌀</span>
                  <span>Scanning Market...</span>
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
        <div className="pt-4 mt-4 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
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
            </div>

            {/* Automated Discovery Schedule Toggle */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700/80 text-slate-300">
              <span className="text-[11px] font-medium">Automatic Scheduled Discovery:</span>
              <button
                type="button"
                onClick={() => setAutoDiscoveryEnabled(!autoDiscoveryEnabled)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  autoDiscoveryEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {autoDiscoveryEnabled ? 'ON (Weekdays 6am)' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quota / Grounding Error Notice */}
      {groundingError && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-bold text-amber-100">Live Search Grounding Notice</div>
              <div>{groundingError}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleRunDiscovery('curated')}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors"
            >
              Load Curated Feed
            </button>
            <button
              onClick={() => setGroundingError(null)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Run Success / Status Message */}
      {runMessage && (
        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/80 text-indigo-200 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <IconCheckCircle className="w-4 h-4 text-indigo-400" />
            <span>{runMessage}</span>
          </div>
          <button
            onClick={() => setRunMessage(null)}
            className="text-indigo-400 hover:text-indigo-200 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Audit History Drawer */}
      {isHistoryOpen && (
        <Card className="p-5 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <IconClock className="w-4 h-4 text-indigo-500" />
              Discovery Execution Audit Log
            </h3>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Close
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No discovery executions recorded yet. Run Live Discovery or Curated Feed to log execution runs.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>{item.source}</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded font-bold ${
                        item.status === 'success'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(item.runAt).toLocaleString()} • Duration: {(item.durationMs / 1000).toFixed(2)}s
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.rolesDiscovered} found
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      +{item.newRolesCount} new / {item.deduplicatedCount} deduped
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Simplified Primary Tabs & Trust Filter Row (No Horizontal Scrollbar) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Primary Tabs (5 tabs, desktop-clean) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'live', label: 'Live', count: counts.live, icon: '⚡' },
                { key: 'saved', label: 'Saved', count: counts.saved, icon: '⭐' },
                { key: 'promoted', label: 'Promoted', count: counts.promoted, icon: '✓' },
                { key: 'dismissed', label: 'Dismissed', count: counts.dismissed, icon: '✕' },
                { key: 'all', label: 'All', count: counts.all, icon: '🌐' },
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
                <span>{icon}</span>
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

          {/* Secondary Trust / Source Filter & Keyword Search */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Secondary Trust Selector */}
            <select
              value={trustFilter}
              onChange={(e) => setTrustFilter(e.target.value as TrustFilter)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
              aria-label="Filter by Trust State"
            >
              <option value="all">All Trust States</option>
              <option value="verified-live">⚡ Verified Live</option>
              <option value="needs-verification">🔍 Needs Verification</option>
              <option value="curated">📁 Curated / Demo</option>
              <option value="unverified-legacy">⚠️ Legacy Unverified</option>
              <option value="expired">✕ Expired / Closed</option>
            </select>

            {/* Keyword Search Input */}
            <div className="relative w-full sm:w-56">
              <IconSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter title, company, domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Jobs List Grid */}
      {filteredJobs.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <IconCompass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {jobs.length === 0
                ? 'No discovered roles in workspace yet'
                : `No roles match current filters in "${activeTab}" view.`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {jobs.length === 0
                ? 'Click "Run Live Discovery" to search Google for verified open executive roles matching your candidate criteria.'
                : 'Try adjusting your trust filter or explore another tab.'}
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
              <Card
                key={job.id}
                className="p-5 flex flex-col justify-between space-y-4 border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  {/* Top Provenance & Relevance Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Trust Status Badge */}
                      {job.verificationStatus === 'verified-live' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <span>⚡</span>
                          <span>Verified Live</span>
                        </span>
                      )}
                      {job.verificationStatus === 'curated' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <span>📁</span>
                          <span>Curated Feed</span>
                        </span>
                      )}
                      {(job.verificationStatus === 'grounded-unverified' || job.verificationStatus === 'needs-verification') && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <span>🔍</span>
                          <span>Needs Verification</span>
                        </span>
                      )}
                      {job.verificationStatus === 'unverified-legacy' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Legacy Unverified</span>
                        </span>
                      )}
                      {job.verificationStatus === 'expired' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <span>✕</span>
                          <span>Expired / Closed</span>
                        </span>
                      )}

                      {/* Source Domain Badge */}
                      {job.sourceDomain && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
                          {job.sourceDomain}
                        </span>
                      )}
                    </div>

                    {/* Discovery Relevance Score Pill */}
                    <div className="text-right shrink-0">
                      <div className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                        {job.relevanceScore}% Match
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Discovery Relevance
                      </div>
                    </div>
                  </div>

                  {/* Title and Company */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {job.title}
                    </h3>
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {job.company}
                    </div>
                  </div>

                  {/* Metadata: Location & Compensation */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <span>📍</span>
                        <span>{job.location}</span>
                      </span>
                    )}
                    {job.compensation && (
                      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <span>💰</span>
                        <span>{job.compensation}</span>
                      </span>
                    )}
                  </div>

                  {/* Snippet / Context */}
                  {job.snippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                      {job.snippet}
                    </p>
                  )}

                  {/* Failure reason if unverified/expired */}
                  {job.failureReason && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>ℹ️</span>
                      <span>{job.failureReason}</span>
                    </div>
                  )}

                  {/* Matched Preferences */}
                  {job.matchedPreferences && job.matchedPreferences.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      <span className="text-[10px] font-bold text-slate-400">Target Match:</span>
                      {job.matchedPreferences.map((pref) => (
                        <span
                          key={pref}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                        >
                          {pref}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Network Intelligence Callout */}
                  {matchedNetwork.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <IconNetwork className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                          {matchedNetwork.length} Network Connection{matchedNetwork.length > 1 ? 's' : ''} at {job.company}
                        </span>
                      </div>
                      <Link
                        href={`/network?company=${encodeURIComponent(job.company)}`}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        View Contacts →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* View Original Listing Link */}
                    {job.jobUrl && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View Original Job Posting"
                      >
                        <IconExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {/* Re-verify Button for Unverified / Legacy roles */}
                    {(job.verificationStatus === 'unverified-legacy' ||
                      job.verificationStatus === 'needs-verification' ||
                      job.verificationStatus === 'grounded-unverified') && (
                      <button
                        type="button"
                        disabled={reverifyingId === job.id}
                        onClick={() => handleReverify(job)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                        title="Re-verify source availability"
                      >
                        {reverifyingId === job.id ? (
                          <>
                            <span className="animate-spin text-[10px]">🌀</span>
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <IconShield className="w-3 h-3 text-indigo-400" />
                            <span>Re-verify</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Save for later / Unsave */}
                    {job.status !== 'promoted' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(job.id, job.status === 'saved' ? 'new' : 'saved')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          job.status === 'saved'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {job.status === 'saved' ? '★ Saved' : '☆ Save'}
                      </button>
                    )}

                    {/* Dismiss / Restore */}
                    <button
                      type="button"
                      onClick={() => updateStatus(job.id, job.status === 'dismissed' ? 'new' : 'dismissed')}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      {job.status === 'dismissed' ? 'Restore' : 'Dismiss'}
                    </button>
                  </div>

                  {/* Promote to Opportunities Pipeline */}
                  {job.status === 'promoted' ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <IconCheckCircle className="w-3.5 h-3.5" />
                      <span>In Pipeline</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePromote(job)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>+ Add to Pipeline</span>
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
