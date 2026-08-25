'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { inspectLocalData } from '@/lib/storage/migrationService';
import { MigrationSummary } from '@/types/auth';

export function LocalCloudMigrationModal() {
  const { migrationPending, migrationProgress, runMigration, dismissMigration, resetMigrationProgress } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!migrationPending) return null;

  const local = inspectLocalData();

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    setSummary(null);
    try {
      const res = await runMigration();
      setSummary(res);
      if (res.status !== 'success') {
        const firstError = res.errors?.[0] || 'Cloud sync incomplete. Some records could not be verified.';
        setError(firstError);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cloud migration failed.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setSummary(null);
    resetMigrationProgress();
    handleMigrate();
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30 text-white shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center shrink-0">
            <span className="text-base">☁️</span>
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
              <span>Local Executive Data Detected</span>
              {isMigrating && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Syncing
                </span>
              )}
            </div>
            <div className="text-xs text-slate-300">
              {isMigrating ? (
                <span className="font-mono text-indigo-200">
                  {migrationProgress?.stepDescription || 'Syncing data to cloud...'}
                </span>
              ) : summary && summary.status !== 'success' ? (
                <span className="text-amber-200 font-medium">
                  Partial sync state: Candidate: {summary.candidateProfileMigrated ? '✓' : '—'} | Opps: {summary.opportunitiesCount} | Network: {summary.networkContactsCount} | Discovery: {summary.discoveryJobsCount}
                </span>
              ) : (
                <span>
                  Found {local.opportunitiesCount} opportunities, {local.networkContactsCount} contacts, and {local.discoveryJobsCount} discovered roles stored locally. Sync to your secure cloud account?
                </span>
              )}
            </div>
          </div>
        </div>

        {summary && summary.status === 'success' ? (
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <span>
              ✓ Cloud Sync Verified ({summary.opportunitiesCount} opps, {summary.networkContactsCount} contacts, {summary.discoveryJobsCount} roles)
            </span>
            <button
              onClick={dismissMigration}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {error && (
              <span className="text-xs text-rose-400 max-w-md truncate" title={error}>
                ⚠️ {error}
              </span>
            )}
            <button
              disabled={isMigrating}
              onClick={summary && summary.status !== 'success' ? handleRetry : handleMigrate}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
            >
              {isMigrating ? (
                <>
                  <span className="animate-spin text-xs">🌀</span>
                  <span>Syncing...</span>
                </>
              ) : summary && summary.status !== 'success' ? (
                <span>Retry Cloud Sync</span>
              ) : (
                <span>Sync to Cloud Account</span>
              )}
            </button>
            <button
              disabled={isMigrating}
              onClick={dismissMigration}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Keep Local Only
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
