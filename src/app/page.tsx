'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/Card';
import { RecommendationBadge, PipelineStageBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  IconAnalyze,
  IconArrowRight,
  IconRefresh,
  IconHelpCircle,
} from '@/components/icons';
import { JobOpportunity, PipelineStage } from '@/types/opportunity';
import {
  getOpportunities,
  subscribeToStorage,
  resetDemoData,
} from '@/lib/storage';

export default function DashboardPage() {
  const [opportunities, setOpportunities] = useState<JobOpportunity[]>(() => getOpportunities());
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      setOpportunities(getOpportunities());
    };
    return subscribeToStorage(handleStorage);
  }, []);

  // Calculate Summary Metrics
  const totalCount = opportunities.length;
  const highFitCount = opportunities.filter((o) => o.analysis.overallFitScore >= 85).length;
  const activeInterviewingCount = opportunities.filter((o) => o.stage === 'Interviewing').length;
  const pendingActionsCount = opportunities.filter(
    (o) => o.stage !== 'Archived' && o.analysis.nextActions && o.analysis.nextActions.length > 0
  ).length;

  // Recent 3 opportunities
  const recentOpportunities = [...opportunities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Group by Stage
  const STAGES: PipelineStage[] = [
    'Identified',
    'Applied',
    'Screening',
    'Interviewing',
    'Offer',
    'Archived',
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Career Command Center
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Executive opportunity pipeline & evidence-backed role alignment dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <IconRefresh className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo Data</span>
          </button>
          <Link
            href="/analyze"
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <IconAnalyze className="w-4 h-4" />
            <span>Analyze New Role</span>
          </Link>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="border-l-4 border-l-slate-900">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Opportunities
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">Active in local pipeline</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-emerald-600">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            High Alignment Roles
          </p>
          <p className="text-3xl font-bold text-emerald-700 mt-2">{highFitCount}</p>
          <p className="text-xs text-slate-500 mt-1">Fit score &ge; 85% (Apply status)</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-indigo-600">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Active Interviewing
          </p>
          <p className="text-3xl font-bold text-indigo-900 mt-2">{activeInterviewingCount}</p>
          <p className="text-xs text-slate-500 mt-1">In active interview stage</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-amber-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Pending Action Items
          </p>
          <p className="text-3xl font-bold text-amber-700 mt-2">{pendingActionsCount}</p>
          <p className="text-xs text-slate-500 mt-1">Non-archived next actions</p>
        </Card>
      </div>

      {/* Empty State vs Recent Content */}
      {totalCount === 0 ? (
        <Card padding="lg" className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <IconHelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Opportunities Analyzed Yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
            Get started by analyzing a synthetic sample position or pasting a custom job description to calculate evidence-backed fit reports.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/analyze"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              Analyze Your First Role
            </Link>
            <button
              onClick={() => resetDemoData()}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Load Demo Fixtures
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Recent Analyses Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Recent Role Analyses
              </h2>
              <Link
                href="/opportunities"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
              >
                <span>View Full Pipeline</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentOpportunities.map((opp) => (
                <Card key={opp.id} padding="md" className="flex flex-col justify-between hover:border-slate-300">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {opp.company}
                        </span>
                        <h3 className="font-semibold text-slate-900 mt-0.5 line-clamp-1">
                          {opp.title}
                        </h3>
                      </div>
                      <RecommendationBadge recommendation={opp.analysis.recommendation} />
                    </div>

                    <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                      {opp.analysis.executiveSummary}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {opp.analysis.overallFitScore}%
                      </span>
                      <span className="text-slate-400">Fit</span>
                    </div>
                    <Link
                      href={`/analysis/${opp.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600 flex items-center gap-1"
                    >
                      <span>Full Report</span>
                      <IconArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Pipeline Breakdown Table */}
          <Card padding="none" className="overflow-hidden">
            <CardHeader
              title="Pipeline Stage Breakdown"
              subtitle="Opportunities organized by active recruiting stage"
              className="p-6 pb-4 mb-0"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-y border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Pipeline Stage</th>
                    <th className="py-3 px-6">Total Roles</th>
                    <th className="py-3 px-6">High Alignment (&ge;85%)</th>
                    <th className="py-3 px-6 text-right font-medium">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {STAGES.map((stage) => {
                    const stageOpps = opportunities.filter((o) => o.stage === stage);
                    const highFitInStage = stageOpps.filter(
                      (o) => o.analysis.overallFitScore >= 85
                    ).length;

                    return (
                      <tr key={stage} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6">
                          <PipelineStageBadge stage={stage} />
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {stageOpps.length}
                        </td>
                        <td className="py-3.5 px-6 font-medium text-emerald-700">
                          {highFitInStage}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Link
                            href={`/opportunities?stage=${stage}`}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Filter Stage &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Confirmation Modal for Reset */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => resetDemoData()}
        title="Reset Demo Data"
        description="Are you sure you want to clear all locally stored opportunities and restore the default 5 synthetic benchmark roles? Any custom-analyzed roles will be removed."
        confirmText="Reset All Data"
        isDanger={true}
      />
    </div>
  );
}
