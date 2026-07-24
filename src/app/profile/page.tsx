import React from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { alexVanceProfile } from '@/data/candidate';

export const metadata = {
  title: 'Synthetic Candidate Profile — Alex Vance | Career Command Center',
  description:
    'Inspect the synthetic profile, structured accomplishments, and evidence citation index for Alex Vance.',
};

export default function ProfilePage() {
  const profile = alexVanceProfile;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Synthetic Candidate Disclaimer Header */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-emerald-300 border border-slate-700 uppercase tracking-wider">
            Synthetic Candidate Profile for Portfolio Demonstration
          </span>
          <span className="text-xs text-slate-400">100% Synthetic Data</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{profile.name}</h1>
        <p className="text-sm text-slate-300 font-medium">{profile.headline}</p>
      </div>

      {/* Executive Summary */}
      <Card padding="lg" className="space-y-3">
        <CardHeader title="Executive Background & Value Proposition" />
        <p className="text-sm text-slate-700 leading-relaxed font-normal">{profile.summary}</p>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
            Target Executive Roles:
          </span>
          {profile.targetRoles.map((role, idx) => (
            <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-full border border-slate-200">
              {role}
            </span>
          ))}
        </div>
      </Card>

      {/* Core Competencies */}
      <Card padding="lg" className="space-y-4">
        <CardHeader title="Core Executive Competencies" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {profile.coreCompetencies.map((comp, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900"></span>
              <span>{comp}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Career History & Verifiable Evidence Citation Index */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Career History & Evidence Index ({profile.careerHistory.flatMap(r => r.achievements).length} Cited Achievements)
          </h2>
          <span className="text-xs text-slate-500 font-mono">Stable Citation IDs: EVID-2020-01 to EVID-2024-05</span>
        </div>

        {profile.careerHistory.map((role) => (
          <Card key={role.id} padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {role.company}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{role.title}</h3>
              </div>
              <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit">
                {role.startDate} &mdash; {role.endDate} | {role.location}
              </div>
            </div>

            {/* Core Responsibilities */}
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Role Scope & Responsibilities
              </span>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-1">
                {role.responsibilities.map((resp, idx) => (
                  <li key={idx}>{resp}</li>
                ))}
              </ul>
            </div>

            {/* Verified Achievements List */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Verifiable Achievements & Evidence Citations ({role.achievements.length})
              </span>
              <div className="space-y-2.5">
                {role.achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono font-bold">
                        {ach.citationId}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        {ach.metric}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                      {ach.description}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {ach.skillsDemonstrated.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 bg-slate-200/60 text-slate-700 rounded text-[10px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
