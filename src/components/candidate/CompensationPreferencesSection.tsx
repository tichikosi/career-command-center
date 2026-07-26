import React, { useState } from 'react';
import { CompensationPreferences, CompensationPreference, CompensationCurrency } from '@/types/candidate';
import {
  CURRENCY_OPTIONS,
  PREFERENCE_LABELS,
  parseSalaryInput,
  formatSalaryDisplay,
} from '@/lib/compensationHelpers';

interface Props {
  preferences: CompensationPreferences;
  onChange: (updated: CompensationPreferences) => void;
  errors: Record<string, string>;
  minSalaryRef?: React.RefObject<HTMLInputElement | null>;
  maxSalaryRef?: React.RefObject<HTMLInputElement | null>;
}

export function CompensationPreferencesSection({ preferences, onChange, errors, minSalaryRef, maxSalaryRef }: Props) {
  const [minInput, setMinInput] = useState<string>(formatSalaryDisplay(preferences.baseSalaryMin));
  const [maxInput, setMaxInput] = useState<string>(formatSalaryDisplay(preferences.baseSalaryMax));

  const [prevMin, setPrevMin] = useState(preferences.baseSalaryMin);
  const [prevMax, setPrevMax] = useState(preferences.baseSalaryMax);

  if (preferences.baseSalaryMin !== prevMin) {
    setPrevMin(preferences.baseSalaryMin);
    setMinInput(formatSalaryDisplay(preferences.baseSalaryMin));
  }

  if (preferences.baseSalaryMax !== prevMax) {
    setPrevMax(preferences.baseSalaryMax);
    setMaxInput(formatSalaryDisplay(preferences.baseSalaryMax));
  }

  const handleMinBlur = () => {
    const num = parseSalaryInput(minInput);
    setMinInput(formatSalaryDisplay(num));
    onChange({ ...preferences, baseSalaryMin: num });
  };

  const handleMaxBlur = () => {
    const num = parseSalaryInput(maxInput);
    setMaxInput(formatSalaryDisplay(num));
    onChange({ ...preferences, baseSalaryMax: num });
  };

  const prefOptions: CompensationPreference[] = ['required', 'preferred', 'not-important'];

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Target Compensation & Preferences
        </h4>
        <span className="text-[10px] text-slate-400">Structured Currency & Range</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Currency Selector */}
        <div className="space-y-1">
          <label htmlFor="comp-currency-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Currency
          </label>
          <select
            id="comp-currency-select"
            value={preferences.currency || 'USD'}
            onChange={(e) => onChange({ ...preferences, currency: e.target.value as CompensationCurrency })}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Annual Base Salary */}
        <div className="space-y-1">
          <label htmlFor="comp-min-salary-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Minimum Annual Base Salary
          </label>
          <input
            id="comp-min-salary-input"
            ref={minSalaryRef}
            type="text"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handleMinBlur}
            placeholder="e.g. 220,000"
            className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.baseSalaryMin
                ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
            }`}
          />
          {errors.baseSalaryMin && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{errors.baseSalaryMin}</p>
          )}
        </div>

        {/* Maximum Annual Base Salary */}
        <div className="space-y-1">
          <label htmlFor="comp-max-salary-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Maximum Annual Base Salary
          </label>
          <input
            id="comp-max-salary-input"
            ref={maxSalaryRef}
            type="text"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handleMaxBlur}
            placeholder="e.g. 260,000"
            className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.baseSalaryMax
                ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
            }`}
          />
          {errors.baseSalaryMax && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{errors.baseSalaryMax}</p>
          )}
        </div>
      </div>

      {/* Bonus & Equity Preferences */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Bonus Preference */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Bonus
          </label>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {prefOptions.map((opt) => {
              const selected = (preferences.bonusPreference || 'not-important') === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...preferences,
                      bonusPreference: opt,
                      targetBonusPercent: opt === 'not-important' ? undefined : preferences.targetBonusPercent,
                    })
                  }
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    selected
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {PREFERENCE_LABELS[opt]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Bonus Percentage */}
        <div className="space-y-1">
          <label htmlFor="comp-bonus-pct-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Target Bonus %
          </label>
          <input
            id="comp-bonus-pct-input"
            type="number"
            min={0}
            max={100}
            disabled={preferences.bonusPreference === 'not-important'}
            value={
              preferences.bonusPreference !== 'not-important' && preferences.targetBonusPercent !== undefined
                ? preferences.targetBonusPercent
                : ''
            }
            onChange={(e) => {
              const rawVal = e.target.value;
              const val = rawVal === '' ? undefined : parseFloat(rawVal);
              onChange({ ...preferences, targetBonusPercent: val });
            }}
            placeholder={preferences.bonusPreference === 'not-important' ? 'N/A' : 'e.g. 20'}
            className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              errors.targetBonusPercent
                ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
            }`}
          />
          {errors.targetBonusPercent && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{errors.targetBonusPercent}</p>
          )}
        </div>

        {/* Equity Preference */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Equity
          </label>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {prefOptions.map((opt) => {
              const selected = (preferences.equityPreference || 'not-important') === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange({ ...preferences, equityPreference: opt })}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    selected
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {PREFERENCE_LABELS[opt]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compensation Notes */}
      <div className="space-y-1 pt-1">
        <label htmlFor="comp-notes-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Compensation Notes & Requirements
        </label>
        <input
          id="comp-notes-input"
          type="text"
          maxLength={150}
          value={preferences.notes || ''}
          onChange={(e) => onChange({ ...preferences, notes: e.target.value })}
          placeholder="e.g. Open to equity-heavy packages or sign-on bonuses..."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
        />
      </div>
    </div>
  );
}
