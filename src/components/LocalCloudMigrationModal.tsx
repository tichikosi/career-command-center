'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { inspectLocalData } from '@/lib/storage/migrationService';
import { MigrationSummary } from '@/types/auth';

export function LocalCloudMigrationModal() {
  const { migrationPending, runMigration, dismissMigration } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!migrationPending) return null;

  const local = inspectLocalData();

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      const res = await runMigration();
      setSummary(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Migration failed.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30 text-white shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center shrink-0">
            <span className="text-base">☁️</span>
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
              Local Executive Data Detected
            </div>
            <div className="text-xs text-slate-300">
              Found {local.opportunitiesCount} opportunities, {local.networkContactsCount} contacts, and {local.discoveryJobsCount} discovered roles stored locally. Sync to your secure cloud account?
            </div>
          </div>
        </div>

        {summary ? (
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <span>✓ Cloud Sync Complete ({summary.opportunitiesCount} opps, {summary.networkContactsCount} contacts)</span>
            <button
              onClick={dismissMigration}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {error && <span className="text-xs text-rose-400">{error}</span>}
            <button
              disabled={isMigrating}
              onClick={handleMigrate}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
            >
              {isMigrating ? (
                <>
                  <span className="animate-spin text-xs">🌀</span>
                  <span>Syncing...</span>
                </>
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
