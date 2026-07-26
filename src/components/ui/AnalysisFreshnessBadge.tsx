import React from 'react';
import { AnalysisFreshness } from '@/lib/candidateAdapter';

interface Props {
  freshness: AnalysisFreshness;
  compact?: boolean;
}

export function AnalysisFreshnessBadge({ freshness, compact = false }: Props) {
  if (freshness === 'current') return null;

  if (freshness === 'stale') {
    return (
      <span
        title="Active candidate profile has changed since this analysis was generated."
        className={`inline-flex items-center gap-1 rounded-full font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 ${
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
        <span>Profile Changed</span>
      </span>
    );
  }

  return (
    <span
      title="Historical analysis created before candidate provenance tracking."
      className={`inline-flex items-center gap-1 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
      <span>Historical</span>
    </span>
  );
}
