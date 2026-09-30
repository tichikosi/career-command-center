import React from 'react';
import { IconAlertTriangle } from '@/components/icons';

export function SyntheticDisclaimerBanner() {
  return (
    <div className="bg-slate-900 dark:bg-slate-950 text-slate-200 text-xs px-4 py-1.5 flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-medium tracking-wide text-slate-100 uppercase text-[10px]">
          Career Command Center V3.4 Release Candidate
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-300">
          Voice Interview Intelligence • Public Synthetic Demo (Alex Vance) • Authenticated Cloud Persistence
        </span>
      </div>
    </div>
  );
}

export function StorageWarningNotice() {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-xl flex items-start gap-3 text-xs leading-relaxed my-4">
      <IconAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-amber-950 dark:text-amber-100 block">
          Browser Storage Unavailable (Incognito / Storage Blocked)
        </span>
        Current-session interaction remains available, but data will be lost after refresh or navigation that reloads the application.
      </div>
    </div>
  );
}

export function FallbackAnalysisNotice({ text }: { text?: string }) {
  return (
    <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 px-4 py-3 rounded-xl flex items-start gap-3 text-xs leading-relaxed mb-6 shadow-xs">
      <IconAlertTriangle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-indigo-950 dark:text-indigo-100 block">
          Simplified Heuristic Evaluation
        </span>
        <p className="text-indigo-800 dark:text-indigo-300 mt-0.5">
          {text && !text.includes('{') && !text.includes('error') && !text.includes('quota')
            ? text
            : 'Live AI analysis was unavailable, so Career Command Center used its candidate-grounded deterministic evaluation.'}
        </p>
      </div>
    </div>
  );
}
