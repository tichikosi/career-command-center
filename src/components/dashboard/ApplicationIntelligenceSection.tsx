'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { JobOpportunity } from '@/types/opportunity';
import { OpportunityActivity, NextBestAction } from '@/types/interview';
import { calculateNextBestActions } from '@/lib/followUpEngine';
import {
  IconCalendar,
  IconClock,
  IconMessageSquare,
  IconBrain,
  IconArrowRight,
  IconTarget,
  IconZap,
  IconCheckCircle,
  IconAlertTriangle,
} from '@/components/icons';
import { formatShortDate } from '@/lib/dateUtils';

interface ApplicationIntelligenceSectionProps {
  opportunities: JobOpportunity[];
  activities: OpportunityActivity[];
}

export function ApplicationIntelligenceSection({
  opportunities,
  activities,
}: ApplicationIntelligenceSectionProps) {
  const activeOpportunities = opportunities.filter((o) => o.stage !== 'Archived');
  const now = Date.now();

  // 1. Group activities by opportunityId
  const activitiesByOpp = new Map<string, OpportunityActivity[]>();
  for (const act of activities) {
    const list = activitiesByOpp.get(act.opportunityId) || [];
    list.push(act);
    activitiesByOpp.set(act.opportunityId, list);
  }

  // 2. Calculate Next Best Career Actions
  const nextActions = calculateNextBestActions(opportunities, activitiesByOpp);
  const primaryAction = nextActions[0] || null;

  // 3. Upcoming Scheduled Interviews
  const upcomingInterviews = activities
    .filter((a) => {
      if (a.activityType !== 'interview_scheduled') return false;
      const t = a.scheduledFor ? new Date(a.scheduledFor).getTime() : new Date(a.occurredAt).getTime();
      return t >= now - 1000 * 60 * 60 * 2; // future or very recent
    })
    .sort((a, b) => {
      const ta = a.scheduledFor ? new Date(a.scheduledFor).getTime() : new Date(a.occurredAt).getTime();
      const tb = b.scheduledFor ? new Date(b.scheduledFor).getTime() : new Date(b.occurredAt).getTime();
      return ta - tb;
    })
    .slice(0, 3);

  // 4. Stale Applications (Applied stage with no activity in > 7 days)
  const staleApplications = activeOpportunities.filter((opp) => {
    if (opp.stage !== 'Applied') return false;
    const oppActs = activitiesByOpp.get(opp.id) || [];
    const latest = oppActs[0] ? new Date(oppActs[0].occurredAt).getTime() : new Date(opp.updatedAt || opp.createdAt).getTime();
    return (now - latest) > 1000 * 60 * 60 * 24 * 7;
  });

  // 5. Application Momentum (Activities logged in last 14 days)
  const recentActivitiesCount = activities.filter(
    (a) => (now - new Date(a.occurredAt).getTime()) <= 1000 * 60 * 60 * 24 * 14
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <IconZap className="w-5 h-5 text-amber-500" />
          <span>Application Intelligence & Tactical Momentum</span>
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {recentActivitiesCount} activities recorded past 14 days
        </span>
      </div>

      {/* Primary Next Best Career Action Banner */}
      {primaryAction && (
        <Card padding="md" className="border-l-4 border-l-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                  Next Best Career Action
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {primaryAction.company}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {primaryAction.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {primaryAction.description}
              </p>
            </div>

            <Link
              href={`/analysis/${primaryAction.opportunityId}`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-center shadow-xs"
            >
              <span>{primaryAction.actionLabel}</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      )}

      {/* Intelligence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Widget 1: Upcoming Interviews */}
        <Card padding="md" className="flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <IconCalendar className="w-4 h-4 text-indigo-500" />
                <span>Upcoming Interviews</span>
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {upcomingInterviews.length}
              </span>
            </div>

            {upcomingInterviews.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No upcoming interviews scheduled.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {upcomingInterviews.map((interview) => {
                  const opp = opportunities.find((o) => o.id === interview.opportunityId);
                  return (
                    <li key={interview.id} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span>{opp?.company || 'Company'}</span>
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                          {interview.scheduledFor ? formatShortDate(interview.scheduledFor) : 'Scheduled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{interview.title}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/opportunities"
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-2 inline-flex items-center gap-1"
          >
            <span>View all opportunities</span>
            <IconArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Widget 2: Stale Applications */}
        <Card padding="md" className="flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <IconClock className="w-4 h-4 text-amber-500" />
                <span>Stale Applications (7d+)</span>
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {staleApplications.length}
              </span>
            </div>

            {staleApplications.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">All applied opportunities have recent touchpoints.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {staleApplications.slice(0, 3).map((opp) => (
                  <li key={opp.id} className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{opp.company}</span>
                    <Link
                      href={`/analysis/${opp.id}`}
                      className="text-[11px] text-indigo-600 hover:underline shrink-0 ml-2"
                    >
                      Follow Up
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            Keep applications moving with proactive recruiter check-ins.
          </div>
        </Card>

        {/* Widget 3: Recent Activity Feed */}
        <Card padding="md" className="flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <IconTarget className="w-4 h-4 text-emerald-500" />
                <span>Recent Milestone Activity</span>
              </span>
              <span className="text-xs text-slate-400">Live</span>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {activities.slice(0, 3).map((act) => {
                  const opp = opportunities.find((o) => o.id === act.opportunityId);
                  return (
                    <li key={act.id} className="text-slate-700 dark:text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {opp?.company || 'Opportunity'}: {act.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{formatShortDate(act.occurredAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            Total recorded pipeline activities: {activities.length}
          </div>
        </Card>
      </div>
    </div>
  );
}
