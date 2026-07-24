import React from 'react';
import { IconAlertTriangle } from '@/components/icons';

export function SyntheticDisclaimerBanner() {
  return (
    <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-medium tracking-wide text-slate-100 uppercase text-[10px]">
          Public Demonstration
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-300">
          100% Synthetic Data & Client-Side Processing (Version 1)
        </span>
      </div>
    </div>
  );
}

export function StorageWarningNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start gap-3 text-xs leading-relaxed my-4">
      <IconAlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-amber-950 block">
          Browser Storage Unavailable (Incognito / Storage Blocked)
        </span>
        Current-session interaction remains available, but data will be lost after refresh or navigation that reloads the application.
      </div>
    </div>
  );
}

export function FallbackAnalysisNotice({ text }: { text?: string }) {
  return (
    <div className="bg-indigo-50/70 border border-indigo-100 text-indigo-900 px-4 py-3 rounded-xl flex items-start gap-3 text-xs leading-relaxed mb-6">
      <IconAlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-indigo-950 block">
          Version 1 Simplified Heuristic Analysis
        </span>
        {text ||
          'This output uses lightweight keyword signal extraction. Live semantic AI analysis is planned for Version 2.'}
      </div>
    </div>
  );
}
