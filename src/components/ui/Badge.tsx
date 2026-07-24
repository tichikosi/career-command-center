import React from 'react';
import { MatchType, RecommendationType, PipelineStage } from '@/types/opportunity';

export function RecommendationBadge({ recommendation }: { recommendation: RecommendationType }) {
  let styles = 'bg-slate-100 text-slate-800 border-slate-200';

  switch (recommendation) {
    case 'Apply':
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
      break;
    case 'Network First':
      styles = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      break;
    case 'Monitor':
      styles = 'bg-sky-50 text-sky-800 border-sky-200 font-medium';
      break;
    case 'Deprioritize':
      styles = 'bg-slate-100 text-slate-600 border-slate-200 font-normal';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles}`}>
      {recommendation}
    </span>
  );
}

export function MatchTypeBadge({ matchType }: { matchType: MatchType }) {
  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (matchType) {
    case 'Strong Match':
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium';
      break;
    case 'Partial Match':
      styles = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
      break;
    case 'Material Gap':
      styles = 'bg-rose-50 text-rose-800 border-rose-200 font-medium';
      break;
    case 'Unverified':
      styles = 'bg-slate-100 text-slate-600 border-slate-200 font-normal';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styles}`}>
      {matchType}
    </span>
  );
}

export function PipelineStageBadge({ stage }: { stage: PipelineStage }) {
  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (stage) {
    case 'Identified':
      styles = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
    case 'Applied':
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'Screening':
      styles = 'bg-sky-50 text-sky-700 border-sky-200';
      break;
    case 'Interviewing':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
      break;
    case 'Offer':
      styles = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
      break;
    case 'Archived':
      styles = 'bg-slate-100 text-slate-400 border-slate-200 line-through';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles}`}>
      {stage}
    </span>
  );
}
