'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { JobOpportunity, PipelineStage } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { findMatchingContacts } from '@/lib/networkMatcher';
import { countPendingActions } from '@/lib/stageActions';
import { classifyFollowUpDate } from '@/lib/dateUtils';
import { IconClock, IconNetwork, IconFileText } from '@/components/icons';

const ALL_STAGES: PipelineStage[] = [
  'Identified',
  'Applied',
  'Screening',
  'Interviewing',
  'Offer',
  'Archived',
];

interface Props {
  opportunity: JobOpportunity;
  networkContacts: NetworkContact[];
  onStageChange: (oppId: string, newStage: PipelineStage) => void;
}

export function KanbanCard({ opportunity, networkContacts, onStageChange }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const matchedContacts = findMatchingContacts(opportunity.company, networkContacts);
  const pendingActionCount = countPendingActions(opportunity.actions, opportunity.stage);
  const followUpStatus = classifyFollowUpDate(opportunity.followUpDate);

  const fitScore = opportunity.analysis.overallFitScore;
  const fitBadgeColor =
    fitScore >= 85
      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : fitScore >= 70
      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
      : fitScore >= 50
      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 space-y-2.5 shadow-xs transition-shadow hover:shadow-md ${
        isDragging
          ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Card Header & Drag Handle */}
      <div className="flex items-start justify-between gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-1">
          <Link
            href={`/analysis/${opportunity.id}`}
            className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1"
          >
            {opportunity.title}
          </Link>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
            {opportunity.company}
          </span>
        </div>

        {/* Accessible Move-To Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={`Move ${opportunity.title}`}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
          >
            •••
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 text-[11px] animate-in fade-in zoom-in-95 duration-100">
              <span className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 block">Move to Stage</span>
              {ALL_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onStageChange(opportunity.id, s);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded transition-colors ${
                    s === opportunity.stage
                      ? 'text-slate-400 cursor-default bg-slate-50 dark:bg-slate-900/50'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges Strip */}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
        <span className={`px-2 py-0.5 rounded-full font-bold border ${fitBadgeColor}`}>
          {fitScore}% Fit
        </span>
        <span
          className={`px-1.5 py-0.5 rounded font-semibold border ${
            opportunity.priority === 'High'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              : opportunity.priority === 'Medium'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}
        >
          {opportunity.priority}
        </span>

        {/* Compact Source Trust Indicator */}
        {opportunity.verificationStatus === 'verified-live' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            ⚡ Live
          </span>
        )}
        {opportunity.verificationStatus === 'curated' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
            📁 Demo
          </span>
        )}
        {opportunity.verificationStatus === 'unverified-legacy' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ⚠️ Unverified
          </span>
        )}
        {opportunity.verificationStatus === 'expired' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            ✕ Expired
          </span>
        )}
      </div>

      {/* Meta Indicators */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {matchedContacts.length > 0 && (
            <Link
              href={`/network?opportunityId=${opportunity.id}`}
              title={`${matchedContacts.length} Network Contacts at ${opportunity.company} (Click to view)`}
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold"
            >
              <IconNetwork className="w-3.5 h-3.5" />
              <span>{matchedContacts.length}</span>
            </Link>
          )}

          {pendingActionCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {pendingActionCount} act
            </span>
          )}

          {opportunity.notes && (
            <span title="Contains notes" className="text-slate-400">
              <IconFileText className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {opportunity.followUpDate && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium ${
              followUpStatus === 'Overdue'
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : followUpStatus === 'Due Today'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-400'
            }`}
          >
            <IconClock className="w-3 h-3" />
            <span>{opportunity.followUpDate.slice(5)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
