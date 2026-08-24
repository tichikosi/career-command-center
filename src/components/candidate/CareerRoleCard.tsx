import React from 'react';
import { Card } from '@/components/ui/Card';
import { CareerRole, EvidenceItem } from '@/types/candidate';
import { formatRoleDateRange } from '@/lib/dateUtils';

interface Props {
  role: CareerRole;
  evidenceMap: Map<string, EvidenceItem>;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (role: CareerRole) => void;
  onMoveUp: (role: CareerRole) => void;
  onMoveDown: (role: CareerRole) => void;
  onDelete: (role: CareerRole) => void;
}

export function CareerRoleCard({
  role,
  evidenceMap,
  isFirst,
  isLast,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const roleEvidences = Array.isArray(role.evidenceItemIds)
    ? role.evidenceItemIds
        .map((evId) => evidenceMap.get(evId))
        .filter((ev): ev is EvidenceItem => Boolean(ev))
    : [];

  const dateRangeStr = formatRoleDateRange(role.startDate, role.endDate, role.isCurrent);

  return (
    <Card padding="lg" className="space-y-4 transition-all border-slate-200 dark:border-slate-800">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {role.company}
            </span>
            {role.isCurrent && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                Current Role
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {role.title}
          </h3>
        </div>

        {/* Date Badge & Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full mr-1">
            {dateRangeStr} {role.location ? `| ${role.location}` : ''}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(role)}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Edit Role
            </button>

            {/* Move Up Button */}
            <button
              type="button"
              onClick={() => onMoveUp(role)}
              disabled={isFirst}
              aria-label={`Move ${role.title} at ${role.company} up`}
              title={`Move ${role.title} at ${role.company} up`}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              &uarr; Up
            </button>

            {/* Move Down Button */}
            <button
              type="button"
              onClick={() => onMoveDown(role)}
              disabled={isLast}
              aria-label={`Move ${role.title} at ${role.company} down`}
              title={`Move ${role.title} at ${role.company} down`}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              &darr; Down
            </button>

            {/* Delete Role Button */}
            <button
              type="button"
              onClick={() => onDelete(role)}
              aria-label={`Delete ${role.title} at ${role.company}`}
              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800/60 transition-colors ml-1"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Role Summary */}
      {role.summary && (
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Role Overview & Impact
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {role.summary}
          </p>
        </div>
      )}

      {/* Skills */}
      {Array.isArray(role.skills) && role.skills.length > 0 && (
        <div className="pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Role Competencies
          </span>
          <div className="flex flex-wrap gap-1.5">
            {role.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium border border-slate-200/80 dark:border-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Linked Evidence Summary Badges */}
      {roleEvidences.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Linked Evidence Records ({roleEvidences.length})
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {roleEvidences.map((ev) => {
              const citationTag = ev.tags && ev.tags.find((t) => t.startsWith('EVID-'));

              return (
                <div
                  key={ev.id}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 text-xs"
                >
                  {citationTag && (
                    <span className="px-1.5 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-[9px] font-mono font-bold">
                      {citationTag}
                    </span>
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {ev.title}
                  </span>
                  {ev.metric && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                      {ev.metric}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
