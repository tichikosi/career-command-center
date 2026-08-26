'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { useCandidateProfile } from '@/lib/useCandidate';
import { CandidateOverviewEditor } from '@/components/candidate/CandidateOverviewEditor';
import { CareerHistorySection } from '@/components/candidate/CareerHistorySection';
import { EvidenceLibrarySection } from '@/components/candidate/EvidenceLibrarySection';
import { ResumeImportModal } from '@/components/candidate/ResumeImportModal';
import { formatCompensationPreferences } from '@/lib/compensationHelpers';
import { getWorkAuthorizationLabel } from '@/lib/workAuthHelpers';
import { IconUpload } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';

function ProfileQueryHandler({
  children,
}: {
  children: (params: { evidenceId?: string }) => React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const evidenceId = searchParams.get('evidenceId') ?? undefined;
  return <>{children({ evidenceId })}</>;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const {
    profile,
    mounted,
    isSynthetic,
    updateProfile,
    resetCandidateDemoData,
    clearCandidateData,
    exportCandidateData,
  } = useCandidateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Pre-hydration neutral skeleton placeholder
  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse py-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="h-4 bg-slate-800 rounded w-48"></div>
          <div className="h-8 bg-slate-800 rounded w-72"></div>
          <div className="h-3 bg-slate-800 rounded w-64"></div>
        </div>
        <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800"></div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800"></div>
      </div>
    );
  }

  const isEmpty = profile.dataMode === 'user' && !profile.name && profile.careerHistory.length === 0;

  // Edit Mode
  if (isEditing) {
    return (
      <CandidateOverviewEditor
        profile={profile}
        onSave={(updated) => {
          updateProfile(updated);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  // View Mode
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Candidate Data Mode Header */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-xs space-y-5">
        <div className="space-y-3">
          {/* 1. Compact Status Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wider ${
              isSynthetic
                ? 'bg-slate-800 text-emerald-300 border-slate-700'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {isSynthetic ? 'Synthetic Benchmark Candidate' : 'Active Candidate Evidence Profile'}
            </span>
            <span className="text-xs text-slate-400">
              {isSynthetic ? '100% Synthetic Demo Fixture' : isAuthenticated ? 'Authenticated Cloud Profile' : 'User-Configured Data'}
            </span>
          </div>

          {/* 2. Candidate Name on One Line */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
            {profile.name || 'Empty Candidate Profile'}
          </h1>

          {/* 3. Professional Headline on One Line */}
          {profile.headline && (
            <p className="text-sm text-slate-300 font-medium truncate">{profile.headline}</p>
          )}

          {/* 4. Location Beneath */}
          {profile.location && (
            <p className="text-xs text-slate-400 font-normal">{profile.location}</p>
          )}

          {/* 5. Action Buttons on Separate Row Beneath Identity Info */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsResumeModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <IconUpload className="w-3.5 h-3.5" />
              <span>Import Résumé</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
            >
              Edit Candidate Overview
            </button>
            <button
              onClick={exportCandidateData}
              title="Downloads your candidate profile as a JSON file."
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg border border-slate-700 transition-colors"
            >
              Export Candidate Data
            </button>
            <button
              onClick={resetCandidateDemoData}
              title="Restore the Alex Vance demo candidate? Your current candidate profile will be replaced. Opportunities and workflow data will not be changed."
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              Restore Demo Candidate
            </button>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-xs font-semibold text-rose-300 rounded-lg border border-rose-800/60 transition-colors"
              >
                Clear Data
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    clearCandidateData();
                    setConfirmClear(false);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-lg transition-colors"
                >
                  Confirm Clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Authenticated / Local Privacy Banner */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            {isAuthenticated || profile.dataMode === 'user'
              ? 'Candidate profile and evidence records are securely persisted in your private Supabase cloud repository with Row Level Security (RLS) isolation.'
              : 'Candidate data is stored locally in your browser (`ccc_candidate_v1`). No information is transmitted to external servers.'}
          </span>
          <span className="font-mono text-slate-500 shrink-0">
            {profile.evidenceItems.length} Evidence Items | {profile.careerHistory.length} Roles
          </span>
        </div>
      </div>

      {isEmpty ? (
        <Card padding="lg" className="py-12 text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Candidate Profile is Currently Empty
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            You have cleared candidate data. Opportunities and application settings remain untouched. You can click &ldquo;Create Candidate Profile&rdquo; to build your profile or &ldquo;Restore Demo Candidate&rdquo; to reload the Alex Vance synthetic fixture.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Create Candidate Profile
            </button>
            <button
              onClick={resetCandidateDemoData}
              title="Restore the Alex Vance demo candidate? Your current candidate profile will be replaced. Opportunities and workflow data will not be changed."
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Restore Demo Candidate
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Executive Summary */}
          {profile.summary && (
            <Card padding="lg" className="space-y-3">
              <CardHeader title="Executive Background & Value Proposition" />
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {profile.summary}
              </p>

              {profile.targetRoles.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-2">
                    Target Executive Roles:
                  </span>
                  {profile.targetRoles.map((role, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Preferences & Compensation Targets */}
          {(() => {
            const formattedComp = formatCompensationPreferences(profile.compensationPreferences);
            const formattedAuth = getWorkAuthorizationLabel(profile.workAuthorizationDetails) || profile.workAuthorization;

            const salaryText = formattedComp.salaryFormatted || profile.compensationTarget;
            const hasCompInfo = Boolean(salaryText) || Boolean(formattedComp.bonusFormatted) || Boolean(formattedComp.equityFormatted);
            const hasAuthInfo = Boolean(formattedAuth);
            const hasIndustries = profile.targetIndustries.length > 0;
            const hasLocations = profile.preferredLocations.length > 0;

            if (!hasCompInfo && !hasAuthInfo && !hasIndustries && !hasLocations) {
              return null;
            }

            return (
              <Card padding="lg" className="space-y-4">
                <CardHeader title="Career Targets & Preferences" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {salaryText && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px]">Base Salary Target</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mt-1 block">{salaryText}</span>
                    </div>
                  )}
                  {formattedComp.bonusFormatted && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px]">Bonus</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mt-1 block">
                        {formattedComp.bonusFormatted}
                        {formattedComp.bonusPercentFormatted ? ` · Target ${formattedComp.bonusPercentFormatted}` : ''}
                      </span>
                    </div>
                  )}
                  {formattedComp.equityFormatted && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px]">Equity</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mt-1 block">{formattedComp.equityFormatted}</span>
                    </div>
                  )}
                  {formattedAuth && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px]">Work Authorization</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mt-1 block">{formattedAuth}</span>
                    </div>
                  )}
                  {hasIndustries && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 col-span-1 sm:col-span-2">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px] mb-1">Target Industries</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.targetIndustries.map((ind, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-800 dark:text-slate-200">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasLocations && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 col-span-1 sm:col-span-2">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px] mb-1">Preferred Locations</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.preferredLocations.map((loc, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-800 dark:text-slate-200">
                            {loc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}

          {/* Core Competencies */}
          {profile.coreCompetencies.length > 0 && (
            <Card padding="lg" className="space-y-4">
              <CardHeader title="Core Executive Competencies" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {profile.coreCompetencies.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100"></span>
                    <span>{comp}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Career History & Referenced Evidence Items */}
          <CareerHistorySection
            profile={profile}
            onUpdateProfile={updateProfile}
          />

          {/* Full Evidence Library Index */}
          <Suspense fallback={null}>
            <ProfileQueryHandler>
              {({ evidenceId }) => (
                <EvidenceLibrarySection
                  profile={profile}
                  selectedEvidenceId={evidenceId}
                />
              )}
            </ProfileQueryHandler>
          </Suspense>
        </>
      )}

      {/* Résumé AI Import Modal */}
      <ResumeImportModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        currentProfile={profile}
        onSaveProfile={(updated) => {
          updateProfile(updated);
          setIsResumeModalOpen(false);
        }}
      />
    </div>
  );
}
