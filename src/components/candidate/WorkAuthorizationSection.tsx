import React from 'react';
import { WorkAuthorizationDetails, WorkAuthorizationStatus } from '@/types/candidate';
import { WORK_AUTH_STATUS_LABELS } from '@/lib/workAuthHelpers';

interface Props {
  details: WorkAuthorizationDetails;
  onChange: (updated: WorkAuthorizationDetails) => void;
  errors: Record<string, string>;
  visaTypeRef?: React.RefObject<HTMLInputElement | null>;
}

export function WorkAuthorizationSection({ details, onChange, errors, visaTypeRef }: Props) {
  const currentStatus = details.status || 'unspecified';

  const isCitizenOrPR = currentStatus === 'us-citizen' || currentStatus === 'us-permanent-resident';
  const isHideDetails = currentStatus === 'prefer-not-to-say' || currentStatus === 'unspecified';

  const handleStatusChange = (newStatus: WorkAuthorizationStatus) => {
    if (newStatus === 'us-citizen' || newStatus === 'us-permanent-resident') {
      onChange({
        ...details,
        status: newStatus,
        sponsorshipRequiredNow: false,
        sponsorshipRequiredFuture: false,
      });
    } else if (newStatus === 'sponsorship-required') {
      onChange({
        ...details,
        status: newStatus,
        sponsorshipRequiredNow: details.sponsorshipRequiredNow ?? true,
        sponsorshipRequiredFuture: details.sponsorshipRequiredFuture ?? true,
      });
    } else {
      onChange({
        ...details,
        status: newStatus,
      });
    }
  };

  const statusOptions: WorkAuthorizationStatus[] = [
    'us-citizen',
    'us-permanent-resident',
    'employment-authorization-document',
    'h1b',
    'l1',
    'o1',
    'tn',
    'f1-opt',
    'f1-stem-opt',
    'j1',
    'other-visa',
    'sponsorship-required',
    'prefer-not-to-say',
    'unspecified',
  ];

  return (
    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Work Authorization & Sponsorship Details
        </h4>
        <span className="text-[10px] text-slate-400">Status & Visa Conditions</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status Dropdown */}
        <div className="space-y-1 col-span-1 sm:col-span-2">
          <label htmlFor="work-auth-status-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Primary Work Authorization Status
          </label>
          <select
            id="work-auth-status-select"
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value as WorkAuthorizationStatus)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          >
            {statusOptions.map((st) => (
              <option key={st} value={st}>
                {WORK_AUTH_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        {/* Conditional Visa Type */}
        {currentStatus === 'other-visa' && (
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <label htmlFor="work-auth-visa-type-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Specific Visa Type / Authorization Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="work-auth-visa-type-input"
              ref={visaTypeRef}
              type="text"
              value={details.visaType || ''}
              onChange={(e) => onChange({ ...details, visaType: e.target.value })}
              placeholder="e.g. E-3 Visa, H-4 EAD, Permanent Resident (Pending)..."
              className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.visaType
                  ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
              }`}
            />
            {errors.visaType && (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{errors.visaType}</p>
            )}
          </div>
        )}

        {/* Conditional Expiration Date & Sponsorship Toggles */}
        {!isCitizenOrPR && !isHideDetails && (
          <>
            {/* Expiration Date */}
            <div className="space-y-1">
              <label htmlFor="work-auth-exp-date-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Authorization / Visa Expiration Date
              </label>
              <input
                id="work-auth-exp-date-input"
                type="date"
                value={details.expirationDate || ''}
                onChange={(e) => onChange({ ...details, expirationDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
            </div>

            {/* Sponsorship Checkboxes */}
            <div className="space-y-2 pt-1 flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(details.sponsorshipRequiredNow)}
                  onChange={(e) => onChange({ ...details, sponsorshipRequiredNow: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 dark:border-slate-700"
                />
                <span>Requires employment sponsorship now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(details.sponsorshipRequiredFuture)}
                  onChange={(e) => onChange({ ...details, sponsorshipRequiredFuture: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 dark:border-slate-700"
                />
                <span>Will require employment sponsorship in the future</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Work Authorization Notes */}
      {!isHideDetails && (
        <div className="space-y-1 pt-1">
          <label htmlFor="work-auth-notes-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Work Authorization Notes
          </label>
          <input
            id="work-auth-notes-input"
            type="text"
            maxLength={150}
            value={details.notes || ''}
            onChange={(e) => onChange({ ...details, notes: e.target.value })}
            placeholder="e.g. Eligible to work for any employer without sponsorship..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          />
        </div>
      )}
    </div>
  );
}
