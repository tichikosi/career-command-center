'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  RecommendationBadge,
  PipelineStageBadge,
  PriorityBadge,
} from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  IconAnalyze,
  IconArrowRight,
  IconRefresh,
  IconHelpCircle,
  IconAlertTriangle,
  IconClock,
  IconFlag,
  IconCheckCircle,
  IconCalendar,
} from '@/components/icons';
import { AnalysisFreshnessBadge } from '@/components/ui/AnalysisFreshnessBadge';
import { useCandidateProfile } from '@/lib/useCandidate';
import { getAnalysisFreshness } from '@/lib/candidateAdapter';
import { PipelineStage } from '@/types/opportunity';
import { resetDemoData, toggleActionCompleted } from '@/lib/storage';
import { countPendingActions } from '@/lib/stageActions';
import { useOpportunities } from '@/lib/useOpportunities';
import { useActivities } from '@/lib/useActivities';
import { ApplicationIntelligenceSection } from '@/components/dashboard/ApplicationIntelligenceSection';
import { classifyFollowUpDate, formatShortDate } from '@/lib/dateUtils';

export default function DashboardPage() {
  const opportunities = useOpportunities();
  const { activities } = useActivities();
  const { profile, mounted } = useCandidateProfile();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Active (non-archived) opportunities
  const activeOpportunities = opportunities.filter((o) => o.stage !== 'Archived');
  const totalCount = opportunities.length;
  const activeCount = activeOpportunities.length;

  // High priority active
  const highPriorityActive = activeOpportunities.filter((o) => o.priority === 'High');

  // Overdue follow-ups
  const overdueOpportunities = activeOpportunities.filter(
    (o) => classifyFollowUpDate(o.followUpDate) === 'Overdue'
  );

  // Due today
  const dueTodayOpportunities = activeOpportunities.filter(
    (o) => classifyFollowUpDate(o.followUpDate) === 'Due Today'
  );

  // Dynamic pending actions: count incomplete actions across active opportunities for their current stage
  const totalPendingActions = activeOpportunities.reduce((sum, o) => {
    return sum + countPendingActions(o.actions, o.stage);
  }, 0);

  // Highest-priority active opportunity (High > Medium > Low, then by fit score)
  const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  const topOpportunity = [...activeOpportunities].sort((a, b) => {
    const rankDiff = (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return b.analysis.overallFitScore - a.analysis.overallFitScore;
  })[0] ?? null;

  const topNextAction = topOpportunity
    ? topOpportunity.actions.find(
        (a) => !a.completed && (a.source !== 'stage' || a.stage === topOpportunity.stage || !a.stage)
      )
    : null;

  // Recent 3 opportunities (by createdAt desc)
  const recentOpportunities = [...opportunities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const STAGES: PipelineStage[] = [
    'Identified', 'Applied', 'Screening', 'Interviewing', 'Offer', 'Archived',
  ];

  const hasAlerts = overdueOpportunities.length > 0 || dueTodayOpportunities.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Career Command Center</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Executive opportunity pipeline & evidence-backed role alignment dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <IconRefresh className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Restore Demo Opportunities</span>
          </button>
          <Link
            href="/analyze"
            className="px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <IconAnalyze className="w-4 h-4" />
            <span>Analyze New Role</span>
          </Link>
        </div>
      </div>

      {/* Follow-up Alert Banner */}
      {hasAlerts && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">Follow-up Attention Required</h2>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {overdueOpportunities.length > 0 && (
              <Link
                href="/opportunities?followUp=Overdue"
                className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                {overdueOpportunities.length} Overdue — {overdueOpportunities.map((o) => o.title).join(', ')}
              </Link>
            )}
            {dueTodayOpportunities.length > 0 && (
              <Link
                href="/opportunities?followUp=Due Today"
                className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
              >
                <IconClock className="w-3 h-3 shrink-0" />
                {dueTodayOpportunities.length} Due Today — {dueTodayOpportunities.map((o) => o.title).join(', ')}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="border-l-4 border-l-slate-900 dark:border-l-slate-100">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Opportunities</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">{activeCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {totalCount > activeCount ? `${totalCount - activeCount} archived` : 'In local pipeline'}
          </p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-rose-500">
          <div className="flex items-center gap-1.5 mb-1">
            <IconFlag className="w-3.5 h-3.5 text-rose-500" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">High Priority</p>
          </div>
          <p className="text-3xl font-bold text-rose-700 dark:text-rose-400 mt-1">{highPriorityActive.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active high-priority roles</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-amber-500">
          <div className="flex items-center gap-1.5 mb-1">
            <IconClock className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overdue Follow-ups</p>
          </div>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1">{overdueOpportunities.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Require immediate attention</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-1.5 mb-1">
            <IconCheckCircle className="w-3.5 h-3.5 text-indigo-500" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Actions</p>
          </div>
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">{totalPendingActions}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across all active roles</p>
        </Card>
      </div>

      {/* V3.3 Application Intelligence Section */}
      {totalCount > 0 && (
        <ApplicationIntelligenceSection opportunities={opportunities} activities={activities} />
      )}

      {/* Empty State vs Content */}
      {totalCount === 0 ? (
        <Card padding="lg" className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-4">
            <IconHelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Opportunities Analyzed Yet</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2">
            Get started by analyzing a synthetic sample position or pasting a custom job description.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/analyze"
              className="px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg shadow-xs transition-colors"
            >
              Analyze Your First Role
            </Link>
            <button
              onClick={() => resetDemoData()}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Load Demo Fixtures
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Top Priority Next Action */}
          {topOpportunity && topNextAction && (
            <Card padding="md" className="border-l-4 border-l-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleActionCompleted(topOpportunity.id, topNextAction.id)}
                    aria-label={`Mark complete: ${topNextAction.text}`}
                    className="w-5 h-5 mt-0.5 rounded-full border-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-slate-800 shrink-0 flex items-center justify-center cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    <span className="sr-only">Complete action</span>
                  </button>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Next Recommended Action
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{topNextAction.text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <PriorityBadge priority={topOpportunity.priority} />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {topOpportunity.title} — {topOpportunity.company}
                      </span>
                    </div>
                    {topOpportunity.followUpDate && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <IconCalendar className="w-3 h-3" />
                        <span>Follow-up: {formatShortDate(topOpportunity.followUpDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href={`/analysis/${topOpportunity.id}`}
                  className="shrink-0 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Open Report</span>
                  <IconArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          )}

          {/* High Priority Active Opportunities */}
          {highPriorityActive.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  High Priority — Active
                </h2>
                <Link
                  href="/opportunities?priority=High"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                >
                  <span>View All High Priority</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {highPriorityActive.slice(0, 3).map((opp) => {
                  const followUpStatus = classifyFollowUpDate(opp.followUpDate);
                  const pendingCount = opp.actions.filter((a) => !a.completed).length;
                  return (
                    <Card key={opp.id} padding="md" className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 border-l-2 border-l-rose-400">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{opp.company}</span>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-1 text-sm">{opp.title}</h3>
                          </div>
                          <RecommendationBadge recommendation={opp.analysis.recommendation} />
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <PipelineStageBadge stage={opp.stage} />
                          <AnalysisFreshnessBadge freshness={mounted ? getAnalysisFreshness(opp.analysis, profile) : 'current'} compact />
                          {opp.followUpDate && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              followUpStatus === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' :
                              followUpStatus === 'Due Today' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                              'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                            }`}>
                              {followUpStatus === 'No Date' ? '' : followUpStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="text-slate-500 dark:text-slate-400">
                          {pendingCount > 0 ? (
                            <span>{pendingCount} action{pendingCount !== 1 ? 's' : ''} remaining</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">All actions complete</span>
                          )}
                        </div>
                        <Link
                          href={`/analysis/${opp.id}`}
                          className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                        >
                          <span>Open</span>
                          <IconArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Analyses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Recent Role Analyses</h2>
              <Link
                href="/opportunities"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
              >
                <span>View Full Pipeline</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentOpportunities.map((opp) => (
                <Card key={opp.id} padding="md" className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{opp.company}</span>
                          {opp.verificationStatus === 'verified-live' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              ⚡ Live
                            </span>
                          )}
                          {opp.verificationStatus === 'curated' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                              📁 Demo
                            </span>
                          )}
                          {opp.verificationStatus === 'unverified-legacy' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              ⚠️ Unverified
                            </span>
                          )}
                          {opp.verificationStatus === 'expired' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              ✕ Expired
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-1">{opp.title}</h3>
                      </div>
                      <RecommendationBadge recommendation={opp.analysis.recommendation} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                      {opp.analysis.executiveSummary}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{opp.analysis.overallFitScore}%</span>
                      <span className="text-slate-400 dark:text-slate-500">Fit</span>
                      <AnalysisFreshnessBadge freshness={mounted ? getAnalysisFreshness(opp.analysis, profile) : 'current'} compact />
                    </div>
                    <Link
                      href={`/analysis/${opp.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                    >
                      <span>Full Report</span>
                      <IconArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Pipeline Stage Breakdown */}
          <Card padding="none" className="overflow-hidden">
            <CardHeader
              title="Pipeline Stage Breakdown"
              subtitle="Opportunities organized by active recruiting stage"
              className="p-6 pb-4 mb-0"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-y border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Pipeline Stage</th>
                    <th className="py-3 px-6">Total Roles</th>
                    <th className="py-3 px-6">High Alignment (≥85%)</th>
                    <th className="py-3 px-6 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {STAGES.map((stage) => {
                    const stageOpps = opportunities.filter((o) => o.stage === stage);
                    const highFitInStage = stageOpps.filter((o) => o.analysis.overallFitScore >= 85).length;
                    return (
                      <tr key={stage} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-6">
                          <PipelineStageBadge stage={stage} />
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-slate-100">{stageOpps.length}</td>
                        <td className="py-3.5 px-6 font-medium text-emerald-700 dark:text-emerald-400">{highFitInStage}</td>
                        <td className="py-3.5 px-6 text-right">
                          <Link
                            href={`/opportunities?stage=${stage}`}
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
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

      {/* Reset Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => { resetDemoData(); setIsResetModalOpen(false); }}
        title="Restore demo opportunities?"
        description="Restore demo opportunities? Opportunity stages, workflow actions, notes, and follow-ups will be reset. Candidate data will not be changed."
        confirmText="Restore Opportunities"
        isDanger={true}
      />
    </div>
  );
}
