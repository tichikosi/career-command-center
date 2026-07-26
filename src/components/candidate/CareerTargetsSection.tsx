import React from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { OverviewDraft } from '@/lib/candidateAdapter';
import { EditableStringList } from './EditableStringList';

interface Props {
  draft: OverviewDraft;
  onChange: (fields: Partial<OverviewDraft>) => void;
  errors: Record<string, string>;
}

export function CareerTargetsSection({ draft, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      {/* Career Targets Card */}
      <Card padding="lg" className="space-y-6">
        <CardHeader
          title="Career Targets & Preferences"
          subtitle="Target executive roles, industries, locations, and compensation targets"
        />

        <EditableStringList
          label="Target Roles"
          description="Specify job titles or leadership functions you are actively targeting."
          items={draft.targetRoles}
          onChange={(targetRoles) => onChange({ targetRoles })}
          placeholder="e.g. VP of Operations, Chief of Staff..."
          maxItems={15}
          maxItemLength={80}
        />

        <EditableStringList
          label="Target Industries"
          description="Sectors or verticals where your executive domain experience applies."
          items={draft.targetIndustries}
          onChange={(targetIndustries) => onChange({ targetIndustries })}
          placeholder="e.g. Enterprise Software, B2B SaaS, HealthTech..."
          maxItems={15}
          maxItemLength={80}
        />

        <EditableStringList
          label="Preferred Locations"
          description="Cities, regions, or work arrangements (e.g. Remote, Hybrid, SF Bay Area)."
          items={draft.preferredLocations}
          onChange={(preferredLocations) => onChange({ preferredLocations })}
          placeholder="e.g. Remote, San Francisco, New York..."
          maxItems={15}
          maxItemLength={80}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Compensation Target */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="compensation-target-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Compensation Target
              </label>
              <span className="text-[10px] text-slate-400">
                {draft.compensationTarget.length}/100
              </span>
            </div>
            <input
              id="compensation-target-input"
              type="text"
              value={draft.compensationTarget}
              onChange={(e) => onChange({ compensationTarget: e.target.value })}
              maxLength={100}
              placeholder="e.g. $250k - $300k Base + Equity"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
            {errors.compensationTarget && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errors.compensationTarget}
              </p>
            )}
          </div>

          {/* Work Authorization */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="work-authorization-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Work Authorization
              </label>
              <span className="text-[10px] text-slate-400">
                {draft.workAuthorization.length}/100
              </span>
            </div>
            <input
              id="work-authorization-input"
              type="text"
              value={draft.workAuthorization}
              onChange={(e) => onChange({ workAuthorization: e.target.value })}
              maxLength={100}
              placeholder="e.g. US Citizen / Authorized to work in US"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
            {errors.workAuthorization && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errors.workAuthorization}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Core Competencies Card */}
      <Card padding="lg" className="space-y-4">
        <CardHeader
          title="Core Competencies & Capabilities"
          subtitle="Primary executive skills, operational disciplines, and leadership domains"
        />

        <EditableStringList
          label="Core Competencies"
          description="Highlight top skills evaluated by recruiters and executive match engines."
          items={draft.coreCompetencies}
          onChange={(coreCompetencies) => onChange({ coreCompetencies })}
          placeholder="e.g. Operational Strategy, Cross-Functional Leadership, P&L Management..."
          maxItems={25}
          maxItemLength={80}
        />
      </Card>
    </div>
  );
}
