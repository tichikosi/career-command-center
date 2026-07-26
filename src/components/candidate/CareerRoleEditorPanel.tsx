import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { IconCheckCircle } from '@/components/icons';
import { CareerRoleDraft, normalizeRoleDraft, areRoleDraftsEqual } from '@/lib/candidateAdapter';
import { EditableStringList } from './EditableStringList';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

interface Props {
  initialDraft: CareerRoleDraft;
  onSave: (draft: CareerRoleDraft) => void;
  onCancel: () => void;
}

export function CareerRoleEditorPanel({ initialDraft, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<CareerRoleDraft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Smooth scroll into view when editor opens
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const isDirty = !areRoleDraftsEqual(draft, initialDraft);
  const isEditing = Boolean(initialDraft.id);

  const handleFieldChange = (fields: Partial<CareerRoleDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...fields };
      // If toggled to current, force endDate to Present
      if (fields.isCurrent === true) {
        next.endDate = 'Present';
      } else if (fields.isCurrent === false && prev.isCurrent) {
        next.endDate = '';
      }
      return next;
    });

    // Clear specific field errors on edit
    if (errors.company && fields.company !== undefined) {
      setErrors((prev) => { const n = { ...prev }; delete n.company; return n; });
    }
    if (errors.title && fields.title !== undefined) {
      setErrors((prev) => { const n = { ...prev }; delete n.title; return n; });
    }
    if (errors.startDate && fields.startDate !== undefined) {
      setErrors((prev) => { const n = { ...prev }; delete n.startDate; return n; });
    }
    if (errors.endDate && (fields.endDate !== undefined || fields.isCurrent !== undefined)) {
      setErrors((prev) => { const n = { ...prev }; delete n.endDate; return n; });
    }
  };

  const validate = (): { isValid: boolean; newErrors: Record<string, string> } => {
    const norm = normalizeRoleDraft(draft);
    const newErrors: Record<string, string> = {};

    if (!norm.company) {
      newErrors.company = 'Company name is required (max 150 characters).';
    } else if (norm.company.length > 150) {
      newErrors.company = 'Company name cannot exceed 150 characters.';
    }

    if (!norm.title) {
      newErrors.title = 'Job title is required (max 150 characters).';
    } else if (norm.title.length > 150) {
      newErrors.title = 'Job title cannot exceed 150 characters.';
    }

    if (norm.location.length > 120) {
      newErrors.location = 'Location cannot exceed 120 characters.';
    }

    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (!norm.startDate) {
      newErrors.startDate = 'Start date is required (YYYY-MM).';
    } else if (!dateRegex.test(norm.startDate)) {
      newErrors.startDate = 'Start date must be formatted as YYYY-MM (e.g. 2023-01).';
    }

    if (!norm.isCurrent) {
      if (!norm.endDate || norm.endDate === 'Present') {
        newErrors.endDate = 'End date is required when not a current role (YYYY-MM).';
      } else if (!dateRegex.test(norm.endDate)) {
        newErrors.endDate = 'End date must be formatted as YYYY-MM (e.g. 2024-12).';
      } else if (norm.startDate && dateRegex.test(norm.startDate) && norm.endDate < norm.startDate) {
        newErrors.endDate = 'End date cannot be before start date.';
      }
    }

    if (norm.summary.length > 2000) {
      newErrors.summary = 'Role summary cannot exceed 2,000 characters.';
    }

    return { isValid: Object.keys(newErrors).length === 0, newErrors };
  };

  const handleSave = () => {
    const { isValid, newErrors } = validate();

    if (!isValid) {
      setErrors(newErrors);
      if (newErrors.company && companyRef.current) {
        companyRef.current.focus();
      } else if (newErrors.title && titleRef.current) {
        titleRef.current.focus();
      } else if (newErrors.startDate && startDateRef.current) {
        startDateRef.current.focus();
      } else if (newErrors.endDate && endDateRef.current) {
        endDateRef.current.focus();
      }
      return;
    }

    setIsSaving(true);
    const normalized = normalizeRoleDraft(draft);
    onSave(normalized);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onCancel();
    }
  };

  const hasValidationErrors = Object.keys(errors).length > 0;

  return (
    <div ref={panelRef} className="space-y-6 animate-in fade-in duration-200">
      {/* Editor Panel Top Bar */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase tracking-wider">
              {isEditing ? 'Editing Career Role' : 'Add New Career Role'}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              {draft.company ? `${draft.title || 'Role'} at ${draft.company}` : isEditing ? 'Edit Career Role' : 'New Career Role'}
            </h2>
            <p className="text-xs text-slate-400">
              Configure executive position history, date ranges, leadership responsibilities, and competencies.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || isSaving || hasValidationErrors}
              className="px-5 py-2 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <IconCheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{isSaving ? 'Saving...' : 'Save Role'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Fields Panel */}
      <Card padding="lg" className="space-y-6">
        <CardHeader
          title="Role Details & Timeline"
          subtitle="Organization name, title, location, and employment period"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Company */}
          <div className="space-y-1">
            <label htmlFor="role-company-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Company / Organization <span className="text-rose-500">*</span>
            </label>
            <input
              id="role-company-input"
              ref={companyRef}
              type="text"
              maxLength={150}
              value={draft.company}
              onChange={(e) => handleFieldChange({ company: e.target.value })}
              placeholder="e.g. Apex Enterprise Software"
              className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.company
                  ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
              }`}
            />
            {errors.company && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.company}</p>
            )}
          </div>

          {/* Job Title */}
          <div className="space-y-1">
            <label htmlFor="role-title-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="role-title-input"
              ref={titleRef}
              type="text"
              maxLength={150}
              value={draft.title}
              onChange={(e) => handleFieldChange({ title: e.target.value })}
              placeholder="e.g. Director of AI Strategy & Operations"
              className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.title
                  ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
              }`}
            />
            {errors.title && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.title}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <label htmlFor="role-location-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Location
            </label>
            <input
              id="role-location-input"
              type="text"
              maxLength={120}
              value={draft.location}
              onChange={(e) => handleFieldChange({ location: e.target.value })}
              placeholder="e.g. San Francisco, CA (Hybrid) or Remote"
              className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.location
                  ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
              }`}
            />
            {errors.location && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.location}</p>
            )}
          </div>
        </div>

        {/* Date Ranges & Current Role Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Employment Timeline
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={draft.isCurrent}
                onChange={(e) => handleFieldChange({ isCurrent: e.target.checked })}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 dark:border-slate-700"
              />
              <span>Current Role (Present)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1">
              <label htmlFor="role-start-date-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Start Date (YYYY-MM) <span className="text-rose-500">*</span>
              </label>
              <input
                id="role-start-date-input"
                ref={startDateRef}
                type="text"
                placeholder="e.g. 2023-01"
                maxLength={7}
                value={draft.startDate}
                onChange={(e) => handleFieldChange({ startDate: e.target.value })}
                className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.startDate
                    ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
                }`}
              />
              {errors.startDate && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.startDate}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label htmlFor="role-end-date-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                End Date (YYYY-MM) {!draft.isCurrent && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="role-end-date-input"
                ref={endDateRef}
                type="text"
                disabled={draft.isCurrent}
                placeholder={draft.isCurrent ? 'Present' : 'e.g. 2024-12'}
                maxLength={7}
                value={draft.isCurrent ? 'Present' : draft.endDate}
                onChange={(e) => handleFieldChange({ endDate: e.target.value })}
                className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.endDate
                    ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
                }`}
              />
              {errors.endDate && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.endDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Role Summary */}
        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label htmlFor="role-summary-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Role Scope & Executive Summary
            </label>
            <span className="text-[10px] text-slate-400">
              {draft.summary.length}/2,000
            </span>
          </div>
          <textarea
            id="role-summary-input"
            rows={4}
            maxLength={2000}
            value={draft.summary}
            onChange={(e) => handleFieldChange({ summary: e.target.value })}
            placeholder="Summarize key executive responsibilities, P&L ownership, team size, and core accomplishments..."
            className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.summary
                ? 'border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-200'
                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-400'
            }`}
          />
          {errors.summary && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.summary}</p>
          )}
        </div>

        {/* Role Competencies / Skills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <EditableStringList
            label="Role Skills & Competencies"
            description="Specific leadership disciplines, methodologies, or technical toolsets associated with this role."
            items={draft.skills}
            onChange={(skills) => handleFieldChange({ skills })}
            placeholder="e.g. AI Strategy, GTM Enablement, RevOps..."
            maxItems={30}
            maxItemLength={80}
          />
        </div>
      </Card>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          {isDirty ? 'Unsaved edits detected.' : 'No changes made.'}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving || hasValidationErrors}
            className="px-5 py-2 text-xs font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <IconCheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-600" />
            <span>{isSaving ? 'Saving...' : 'Save Role'}</span>
          </button>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      <UnsavedChangesDialog
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        onConfirm={() => {
          setShowUnsavedModal(false);
          onCancel();
        }}
      />
    </div>
  );
}
