import React, { useState, useRef } from 'react';
import { CandidateProfile } from '@/types/candidate';
import {
  OverviewDraft,
  normalizeOverviewDraft,
  isDraftEqual,
  isCandidatePopulated,
} from '@/lib/candidateAdapter';
import { generateId } from '@/lib/idUtils';
import { BasicInformationSection } from './BasicInformationSection';
import { CareerTargetsSection } from './CareerTargetsSection';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { IconCheckCircle } from '@/components/icons';

interface Props {
  profile: CandidateProfile;
  onSave: (updated: CandidateProfile) => void;
  onCancel: () => void;
}

export function CandidateOverviewEditor({ profile, onSave, onCancel }: Props) {
  const initialDraft: OverviewDraft = {
    name: profile.name || '',
    headline: profile.headline || '',
    location: profile.location || '',
    summary: profile.summary || '',
    targetRoles: Array.isArray(profile.targetRoles) ? [...profile.targetRoles] : [],
    targetIndustries: Array.isArray(profile.targetIndustries) ? [...profile.targetIndustries] : [],
    preferredLocations: Array.isArray(profile.preferredLocations) ? [...profile.preferredLocations] : [],
    compensationPreferences: profile.compensationPreferences ? { ...profile.compensationPreferences } : { currency: 'USD', bonusPreference: 'not-important', equityPreference: 'not-important' },
    workAuthorizationDetails: profile.workAuthorizationDetails ? { ...profile.workAuthorizationDetails } : { status: 'unspecified', sponsorshipRequiredNow: false, sponsorshipRequiredFuture: false },
    coreCompetencies: Array.isArray(profile.coreCompetencies) ? [...profile.coreCompetencies] : [],
  };

  const [draft, setDraft] = useState<OverviewDraft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const minSalaryRef = useRef<HTMLInputElement>(null);
  const maxSalaryRef = useRef<HTMLInputElement>(null);
  const visaTypeRef = useRef<HTMLInputElement>(null);

  const isDirty = !isDraftEqual(draft, initialDraft);

  const handleFieldChange = (fields: Partial<OverviewDraft>) => {
    setDraft((prev) => ({ ...prev, ...fields }));
    if (errors.name && fields.name !== undefined) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
    if (fields.compensationPreferences && (errors.baseSalaryMin || errors.baseSalaryMax)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.baseSalaryMin;
        delete next.baseSalaryMax;
        return next;
      });
    }
    if (fields.workAuthorizationDetails && errors.visaType) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.visaType;
        return next;
      });
    }
  };

  const handleSave = () => {
    const normalized = normalizeOverviewDraft(draft);
    const newErrors: Record<string, string> = {};

    const populated = isCandidatePopulated(profile, normalized);

    if (populated && !normalized.name) {
      newErrors.name = 'Full Name is required for candidate profile.';
    }

    const comp = draft.compensationPreferences;
    if (
      comp.baseSalaryMin !== undefined &&
      comp.baseSalaryMax !== undefined &&
      comp.baseSalaryMax < comp.baseSalaryMin
    ) {
      newErrors.baseSalaryMax = 'Maximum base salary cannot be less than minimum base salary.';
    }

    if (
      comp.bonusPreference !== 'not-important' &&
      comp.targetBonusPercent !== undefined &&
      (isNaN(comp.targetBonusPercent) || comp.targetBonusPercent < 0 || comp.targetBonusPercent > 100)
    ) {
      newErrors.targetBonusPercent = 'Target Bonus % must be between 0 and 100.';
    }

    const auth = normalized.workAuthorizationDetails;
    if (auth.status === 'other-visa' && !auth.visaType) {
      newErrors.visaType = 'Specific visa type is required when "Other Visa" status is selected.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name && nameInputRef.current) {
        nameInputRef.current.focus();
      } else if (newErrors.baseSalaryMax && maxSalaryRef.current) {
        maxSalaryRef.current.focus();
      } else if (newErrors.visaType && visaTypeRef.current) {
        visaTypeRef.current.focus();
      }
      return;
    }

    setIsSaving(true);

    const isInitiallyEmptySingleton =
      profile.dataMode === 'user' && !profile.name && profile.careerHistory.length === 0;

    const finalCandidateId = isInitiallyEmptySingleton
      ? generateId('cand-user')
      : profile.id || generateId('cand-user');

    const updatedProfile: CandidateProfile = {
      ...profile,
      ...normalized,
      id: finalCandidateId,
      updatedAt: new Date().toISOString(),
      dataMode: 'user',
    };

    onSave(updatedProfile);
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Editor Top Bar */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase tracking-wider">
              Editing Candidate Overview
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              {draft.name || 'New Candidate Overview'}
            </h1>
            <p className="text-xs text-slate-400">
              Update core candidate background, target roles, compensation preferences, and work authorization.
            </p>
          </div>

          {/* Top Actions */}
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
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <BasicInformationSection
        draft={draft}
        onChange={handleFieldChange}
        errors={errors}
        nameInputRef={nameInputRef}
      />

      {/* Career Targets & Competencies Section */}
      <CareerTargetsSection
        draft={draft}
        onChange={handleFieldChange}
        errors={errors}
        minSalaryRef={minSalaryRef}
        maxSalaryRef={maxSalaryRef}
        visaTypeRef={visaTypeRef}
      />

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
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
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
