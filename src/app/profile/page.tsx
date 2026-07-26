'use client';

import React, { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { useCandidateProfile } from '@/lib/useCandidate';
import { EvidenceItem } from '@/types/candidate';

export default function ProfilePage() {
  const {
    profile,
    mounted,
    isSynthetic,
    resetCandidateDemoData,
    clearCandidateData,
    exportCandidateData,
  } = useCandidateProfile();

  const [confirmClear, setConfirmClear] = useState(false);

  // Map of evidence items for quick lookup by ID
  const evidenceMap = new Map<string, EvidenceItem>();
  if (Array.isArray(profile.evidenceItems)) {
    for (const ev of profile.evidenceItems) {
      if (ev && ev.id && !evidenceMap.has(ev.id)) {
        evidenceMap.set(ev.id, ev);
      }
    }
  }

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Candidate Data Mode Header */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                isSynthetic
                  ? 'bg-slate-800 text-emerald-300 border-slate-700'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {isSynthetic ? 'Synthetic Benchmark Candidate' : 'Active Candidate Evidence Profile'}
              </span>
              <span className="text-xs text-slate-400">
                {isSynthetic ? '100% Synthetic Demo Fixture' : 'User-Configured Data'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {profile.name || 'Empty Candidate Profile'}
            </h1>
            {profile.headline && (
              <p className="text-sm text-slate-300 font-medium">{profile.headline}</p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={exportCandidateData}
              title="Downloads your candidate profile as a JSON file."
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg border border-slate-700 transition-colors"
            >
              Export Candidate Data
            </button>
            <button
              onClick={resetCandidateDemoData}
              title="Restore the Alex Vance demo candidate? Your current candidate profile will be replaced. Opportunities and workflow data will not be changed."
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              Restore Demo Candidate
            </button>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-xs font-semibold text-rose-300 rounded-lg border border-rose-800/60 transition-colors"
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
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-lg transition-colors"
                >
                  Confirm Clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Local Storage Privacy Banner */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Candidate data is stored locally in your browser (`ccc_candidate_v1`). No information is transmitted to external servers.
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
            You have cleared candidate data. Opportunities and application settings remain untouched. You can click &ldquo;Restore Demo Candidate&rdquo; at any time to restore the Alex Vance synthetic fixture.
          </p>
          <div className="pt-2">
            <button
              onClick={resetCandidateDemoData}
              title="Restore the Alex Vance demo candidate? Your current candidate profile will be replaced. Opportunities and workflow data will not be changed."
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-xs"
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Career History & Evidence Index ({profile.evidenceItems.length} Referenced Records)
              </h2>
            </div>

            {profile.careerHistory.map((role) => {
              const roleEvidences = role.evidenceItemIds
                .map((evId) => evidenceMap.get(evId))
                .filter((ev): ev is EvidenceItem => Boolean(ev));

              return (
                <Card key={role.id} padding="lg" className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {role.company}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {role.title}
                      </h3>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full w-fit">
                      {role.startDate} &mdash; {role.endDate} {role.location ? `| ${role.location}` : ''}
                    </div>
                  </div>

                  {/* Role Summary */}
                  {role.summary && (
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Role Scope & Overview
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {role.summary}
                      </p>
                    </div>
                  )}

                  {/* Verified Evidence Items */}
                  {roleEvidences.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Evidence Records & Citations ({roleEvidences.length})
                      </span>
                      <div className="space-y-2.5">
                        {roleEvidences.map((ev) => {
                          const citationTag = ev.tags && ev.tags.find((t) => t.startsWith('EVID-'));

                          return (
                            <div
                              key={ev.id}
                              className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5"
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

                              {ev.skills.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  {ev.skills.map((skill, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded text-[10px] font-medium"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
