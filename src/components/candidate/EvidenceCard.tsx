import React from 'react';
import { Card } from '@/components/ui/Card';
import { EvidenceItem } from '@/types/candidate';

interface Props {
  evidence: EvidenceItem;
  roleInfo?: { title: string; company: string } | null;
  sourceLabel?: string | null;
  isHighlighted?: boolean;
}

export function EvidenceCard({
  evidence,
  roleInfo,
  sourceLabel,
  isHighlighted = false,
}: Props) {
  const citationTag = evidence.tags && evidence.tags.find((t) => t.startsWith('EVID-'));

  const highlightStyles = isHighlighted
    ? 'ring-2 ring-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-md transition-all duration-300'
    : 'border-slate-200/80 dark:border-slate-800';

  const formatVerificationStatus = (status: EvidenceItem['verificationStatus']) => {
    switch (status) {
      case 'synthetic':
        return 'Synthetic Evidence';
      case 'candidate-confirmed':
        return 'Candidate Confirmed';
      case 'imported-unverified':
        return 'Imported (Unverified)';
      default:
        return 'Unverified';
    }
  };

  return (
    <Card
      id={`evidence-card-${encodeURIComponent(evidence.id)}`}
      padding="lg"
      className={`space-y-3 transition-all ${highlightStyles}`}
    >
      {/* Card Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {citationTag && (
            <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-[10px] font-mono font-bold shrink-0">
              {citationTag}
            </span>
          )}
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {evidence.title}
          </h4>
        </div>

        {evidence.metric && (
          <span className="px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800/80 shrink-0">
            {evidence.metric}
          </span>
        )}
      </div>

      {/* Assignment, Org, Source & Verification Badges */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {roleInfo ? (
          <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800/80">
            Assigned: {roleInfo.title} ({roleInfo.company})
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/80 uppercase tracking-wider">
            Unassigned Evidence
          </span>
        )}

        {evidence.organization && (
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            Org: {evidence.organization}
          </span>
        )}

        {sourceLabel && (
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            Source: {sourceLabel}
          </span>
        )}

        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wider ml-auto">
          {formatVerificationStatus(evidence.verificationStatus)}
        </span>
      </div>

      {/* Description */}
      {evidence.description && (
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {evidence.description}
        </p>
      )}

      {/* Skills Tags */}
      {Array.isArray(evidence.skills) && evidence.skills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {evidence.skills.map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-medium border border-slate-200/80 dark:border-slate-700"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
