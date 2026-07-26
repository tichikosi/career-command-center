import React, { RefObject } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { OverviewDraft } from '@/lib/candidateAdapter';

interface Props {
  draft: OverviewDraft;
  onChange: (fields: Partial<OverviewDraft>) => void;
  errors: Record<string, string>;
  nameInputRef?: RefObject<HTMLInputElement | null>;
}

export function BasicInformationSection({ draft, onChange, errors, nameInputRef }: Props) {
  return (
    <Card padding="lg" className="space-y-4">
      <CardHeader
        title="Basic Information"
        subtitle="Core identity and executive background summary"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="candidate-name-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {draft.name.length}/100
            </span>
          </div>
          <input
            id="candidate-name-input"
            ref={nameInputRef}
            type="text"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={100}
            placeholder="e.g. Alex Vance"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'candidate-name-error' : undefined}
            className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.name
                ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-100'
                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
            }`}
          />
          {errors.name && (
            <p id="candidate-name-error" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {errors.name}
            </p>
          )}
        </div>

        {/* Professional Headline */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="candidate-headline-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Professional Headline
            </label>
            <span className="text-[10px] text-slate-400">
              {draft.headline.length}/150
            </span>
          </div>
          <input
            id="candidate-headline-input"
            type="text"
            value={draft.headline}
            onChange={(e) => onChange({ headline: e.target.value })}
            maxLength={150}
            placeholder="e.g. VP of Operations & AI Strategy"
            className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          />
          {errors.headline && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.headline}</p>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="candidate-location-input"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Location
          </label>
          <span className="text-[10px] text-slate-400">
            {draft.location.length}/100
          </span>
        </div>
        <input
          id="candidate-location-input"
          type="text"
          value={draft.location}
          onChange={(e) => onChange({ location: e.target.value })}
          maxLength={100}
          placeholder="e.g. San Francisco, CA (Open to Remote)"
          className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
        />
        {errors.location && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.location}</p>
        )}
      </div>

      {/* Executive Summary */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="candidate-summary-input"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Executive Summary
          </label>
          <span className="text-[10px] text-slate-400">
            {draft.summary.length}/2000
          </span>
        </div>
        <textarea
          id="candidate-summary-input"
          value={draft.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          rows={5}
          maxLength={2000}
          placeholder="Write a brief executive summary highlighting your leadership, core strengths, and career narrative..."
          className="w-full p-3 text-xs leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
        />
        {errors.summary && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.summary}</p>
        )}
      </div>
    </Card>
  );
}
