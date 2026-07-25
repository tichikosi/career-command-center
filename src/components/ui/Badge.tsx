import React from 'react';
import { MatchType, RecommendationType, PipelineStage, OpportunityPriority } from '@/types/opportunity';

export function RecommendationBadge({ recommendation }: { recommendation: RecommendationType }) {
  let styles = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';

  switch (recommendation) {
    case 'Apply':
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold';
      break;
    case 'Network First':
      styles = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80 font-semibold';
      break;
    case 'Monitor':
      styles = 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/80 font-medium';
      break;
    case 'Deprioritize':
      styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-normal';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles}`}>
      {recommendation}
    </span>
  );
}

export function MatchTypeBadge({ matchType }: { matchType: MatchType }) {
  let styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  switch (matchType) {
    case 'Strong Match':
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80 font-medium';
      break;
    case 'Partial Match':
      styles = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80 font-medium';
      break;
    case 'Material Gap':
      styles = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80 font-medium';
      break;
    case 'Unverified':
      styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-normal';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styles}`}>
      {matchType}
    </span>
  );
}

export function PipelineStageBadge({ stage }: { stage: PipelineStage }) {
  let styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  switch (stage) {
    case 'Identified':
      styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      break;
    case 'Applied':
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80';
      break;
    case 'Screening':
      styles = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/80';
      break;
    case 'Interviewing':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80 font-medium';
      break;
    case 'Offer':
      styles = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/80 font-semibold';
      break;
    case 'Archived':
      styles = 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 line-through';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles}`}>
      {stage}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: OpportunityPriority }) {
  let styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  switch (priority) {
    case 'High':
      styles = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80 font-semibold';
      break;
    case 'Medium':
      styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80 font-medium';
      break;
    case 'Low':
      styles = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-normal';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styles}`}>
      {priority}
    </span>
  );
}

export function FollowUpStatusBadge({ status }: { status: 'Overdue' | 'Due Today' | 'Upcoming' | 'No Date' }) {
  let styles = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

  switch (status) {
    case 'Overdue':
      styles = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80 font-semibold';
      break;
    case 'Due Today':
      styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80 font-medium';
      break;
    case 'Upcoming':
      styles = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/80';
      break;
    case 'No Date':
      styles = 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styles}`}>
      {status}
    </span>
  );
}
