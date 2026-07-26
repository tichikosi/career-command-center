import React from 'react';
import { Card } from '@/components/ui/Card';
import { CareerRole, EvidenceItem } from '@/types/candidate';

interface Props {
  role: CareerRole;
  evidenceMap: Map<string, EvidenceItem>;
  onEdit: (role: CareerRole) => void;
}

export function CareerRoleCard({ role, evidenceMap, onEdit }: Props) {
  const roleEvidences = Array.isArray(role.evidenceItemIds)
    ? role.evidenceItemIds
        .map((evId) => evidenceMap.get(evId))
        .filter((ev): ev is EvidenceItem => Boolean(ev))
    : [];

  return (
    <Card padding="lg" className="space-y-4 transition-all border-slate-200 dark:border-slate-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
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

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {role.startDate} &mdash; {role.endDate} {role.location ? `| ${role.location}` : ''}
          </div>

          <button
            type="button"
            onClick={() => onEdit(role)}
            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Edit Role
          </button>
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

      {/* Linked Evidence Item Count */}
      {roleEvidences.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Linked Evidence Records ({roleEvidences.length})
            </span>
          </div>

          <div className="space-y-2">
            {roleEvidences.map((ev) => {
              const citationTag = ev.tags && ev.tags.find((t) => t.startsWith('EVID-'));

              return (
                <div
                  key={ev.id}
                  className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {citationTag && (
                        <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-[10px] font-mono font-bold">
                          {citationTag}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {ev.title}
                      </span>
                    </div>
                    {ev.metric && (
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
                        {ev.metric}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-normal text-slate-700 dark:text-slate-300 leading-relaxed">
                    {ev.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
