'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { RecommendationBadge, MatchTypeBadge } from '@/components/ui/Badge';
import { FallbackAnalysisNotice } from '@/components/ui/Notice';
import { Modal } from '@/components/ui/Modal';
import { OpportunityDetailsForm } from '@/components/ui/OpportunityDetailsForm';
import {
  IconArrowRight,
  IconAlertTriangle,
  IconTrash,
  IconExternalLink,
  IconPrinter,
} from '@/components/icons';
import { PipelineStage } from '@/types/opportunity';
import { useCandidateProfile } from '@/lib/useCandidate';
import {
  resolveEvidenceForReportCitations,
  getAnalysisFreshness,
  toAnalysisCandidate,
  getAnalysisCandidateSubtitle,
} from '@/lib/candidateAdapter';
import {
  updateOpportunityStage,
  deleteOpportunity,
  saveOpportunity,
} from '@/lib/storage';
import { useOpportunity } from '@/lib/useOpportunities';
import { useActivities } from '@/lib/useActivities';
import { useInterviewData } from '@/lib/useInterviewData';
import { useNetwork } from '@/lib/networkStorage';
import { findMatchingContacts } from '@/lib/networkMatcher';
import { countPendingActions, mergeActionsForStage } from '@/lib/stageActions';
import { validateUrl } from '@/lib/dateUtils';
import { getAnalysisEngine } from '@/lib/engine';
import { ActivityTimeline } from '@/components/interview/ActivityTimeline';
import { InterviewWarRoom } from '@/components/interview/InterviewWarRoom';
import { MockInterviewPanel } from '@/components/interview/MockInterviewPanel';
import { FollowUpEngineView } from '@/components/interview/FollowUpEngineView';

export default function AnalysisResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { profile, mounted } = useCandidateProfile();
  const idFromPath =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const opportunity = useOpportunity(idFromPath);
  const { contacts } = useNetwork();
  const matchingContacts = opportunity ? findMatchingContacts(opportunity.company, contacts) : [];

  const {
    activities,
    isLoading: activitiesLoading,
    addActivity,
    editActivity,
    removeActivity,
  } = useActivities(opportunity?.id);

  const {
    activePrep,
    prepHistory,
    sessions,
    isLoading: prepLoading,
    savePrep,
    deletePrep,
    saveSession,
    deleteSession,
  } = useInterviewData(opportunity?.id || '');

  const [activeTab, setActiveTab] = useState<
    'overview' | 'qualifications' | 'evidence' | 'prep' | 'action-plan' | 'timeline' | 'war-room' | 'mock' | 'follow-up'
  >('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);

  if (!opportunity) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Analysis Report Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The requested role evaluation could not be loaded from local storage.
        </p>
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <span>Return to Opportunities Pipeline</span>
          <IconArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const { analysis } = opportunity;
  const freshness = mounted ? getAnalysisFreshness(analysis, profile) : 'current';

  const strongMatches = analysis.qualifications.filter((q) => q.matchType === 'Strong Match');
  const partialMatches = analysis.qualifications.filter((q) => q.matchType === 'Partial Match');
  const materialGaps = analysis.qualifications.filter((q) => q.matchType === 'Material Gap');
  const unverifiedQualifications = analysis.qualifications.filter((q) => q.matchType === 'Unverified');

  const uniqueCitationIds = Array.from(
    new Set(
      analysis.qualifications
        .filter((q) => q.matchType === 'Strong Match' || q.matchType === 'Partial Match')
        .flatMap((q) => q.supportingEvidenceCitationIds)
    )
  );
  const resolvedAchievements = mounted ? resolveEvidenceForReportCitations(analysis, profile, uniqueCitationIds) : [];

  const handleStageChange = async (newStage: PipelineStage) => {
    const oldStage = opportunity.stage;
    updateOpportunityStage(opportunity.id, newStage);

    if (oldStage !== newStage) {
      await addActivity({
        opportunityId: opportunity.id,
        activityType: 'stage_change',
        title: `Pipeline Stage Changed to ${newStage}`,
        notes: `Advanced opportunity status from ${oldStage} to ${newStage}.`,
        occurredAt: new Date().toISOString(),
        source: 'user',
        metadata: { oldStage, newStage },
      });
    }
  };

  const handleGeneratePrep = async () => {
    if (!opportunity || isGeneratingPrep) return;
    setIsGeneratingPrep(true);
    try {
      const res = await fetch('/api/interview/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            company: opportunity.company,
            location: opportunity.location,
            compensation: opportunity.compensation,
            rawJobDescription: opportunity.rawJobDescription,
            stage: opportunity.stage,
            updatedAt: opportunity.updatedAt,
          },
          candidateSnapshot: profile,
          analysisReport: opportunity.analysis,
        }),
      });

      const data = await res.json();
      if (data.success && data.prep) {
        await savePrep(data.prep);
        await addActivity({
          opportunityId: opportunity.id,
          activityType: 'prep_generated',
          title: 'Interview War Room Briefing Generated',
          notes: `Synthesized executive positioning, ${data.prep.questions?.length || 0} questions, and ${data.prep.storyBank?.length || 0} grounded STAR stories. Readiness: ${data.prep.readinessScore?.overall || 0}%.`,
          occurredAt: new Date().toISOString(),
          source: 'user',
        });
      }
    } catch (err) {
      console.error('[AnalysisResultsPage] Generate prep error:', err);
    } finally {
      setIsGeneratingPrep(false);
    }
  };

  const handleDelete = () => {
    deleteOpportunity(opportunity.id);
    router.push('/opportunities');
  };

  const handleReanalyze = async () => {
    if (!opportunity || isReanalyzing) return;
    setIsReanalyzing(true);
    try {
      const engine = getAnalysisEngine('gemini');
      const freshReport = await engine.analyzeRole(
        {
          jobTitle: opportunity.title,
          company: opportunity.company,
          jobDescription: opportunity.rawJobDescription,
          location: opportunity.location,
          compensation: opportunity.compensation,
          sourceUrl: opportunity.sourceUrl,
          sampleRoleId: opportunity.id.startsWith('opp-role-') ? opportunity.id : undefined,
        },
        toAnalysisCandidate(profile)
      );

      const updatedActions = mergeActionsForStage(
        opportunity.id,
        opportunity.stage,
        freshReport.nextActions,
        opportunity.actions
      );

      const updatedOpportunity = {
        ...opportunity,
        analysis: freshReport,
        actions: updatedActions,
        updatedAt: new Date().toISOString(),
      };

      saveOpportunity(updatedOpportunity);
      window.location.reload();
    } catch (err) {
      console.error('Failed to re-analyze opportunity:', err);
      setIsReanalyzing(false);
    }
  };

  const companyUrl = validateUrl(opportunity.companyWebsiteUrl ?? '');
  const appUrl = validateUrl(opportunity.applicationUrl ?? '');

  const pendingVisibleActionCount = countPendingActions(opportunity.actions, opportunity.stage);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumb & Delete */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Link href="/opportunities" className="hover:text-slate-900 dark:hover:text-slate-100 font-medium">
            Opportunities
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">{opportunity.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.print()}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors"
            title="Print or Save PDF"
            aria-label="Print Report"
          >
            <IconPrinter className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors"
          >
            <IconTrash className="w-4 h-4" />
            <span>Delete Role</span>
          </button>
        </div>
      </div>

      {/* Fallback notice */}
      {analysis.isFallbackAnalysis && (
        <FallbackAnalysisNotice text={analysis.analysisNotice} />
      )}

      {/* Historical Provenance & Freshness Warning Banners */}
      {mounted && freshness === 'stale' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-4 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              Historical Analysis (Candidate Profile Changed)
            </span>
            <p className="text-amber-800 dark:text-amber-300">
              Historical analysis generated using {analysis.candidateProvenance?.candidateName || 'a previous candidate profile'}. Active candidate profile is {profile.name || 'Current Profile'}. Re-run the analysis to evaluate the active candidate.
            </p>
          </div>
          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing}
            className="px-3.5 py-2 bg-amber-900 dark:bg-amber-100 text-white dark:text-amber-900 font-semibold rounded-lg text-xs shrink-0 w-fit hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
          >
            {isReanalyzing ? 'Re-analyzing Role...' : 'Re-analyze for Active Candidate'}
          </button>
        </div>
      )}

      {mounted && freshness === 'unknown' && (
        <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 p-4 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-sm text-slate-900 dark:text-slate-100">
              Historical Legacy Analysis
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Historical analysis created before candidate provenance was tracked. Re-run the analysis to evaluate the active profile.
            </p>
          </div>
          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing}
            className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-lg text-xs shrink-0 w-fit hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
          >
            {isReanalyzing ? 'Re-analyzing Role...' : 'Re-analyze Role'}
          </button>
        </div>
      )}

      {/* Executive Header Banner */}
      <Card padding="lg" className="border-t-4 border-t-slate-900 dark:border-t-slate-100">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {opportunity.company}
              </span>
              {opportunity.location && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{opportunity.location}</span>
                </>
              )}
              {companyUrl && (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  <IconExternalLink className="w-3 h-3" />
                  <span>Company Site</span>
                </a>
              )}
              {appUrl && (
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <IconExternalLink className="w-3 h-3" />
                  <span>Apply</span>
                </a>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {opportunity.title}
            </h1>
            {opportunity.compensation && (
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                Compensation: {opportunity.compensation}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Overall Fit
                </span>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {analysis.overallFitScore}%
                </span>
              </div>
              <RecommendationBadge recommendation={analysis.recommendation} />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Stage:</span>
              <select
                value={opportunity.stage}
                onChange={(e) => handleStageChange(e.target.value as PipelineStage)}
                aria-label="Pipeline stage"
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                <option value="Identified">Identified</option>
                <option value="Applied">Applied</option>
                <option value="Screening">Screening</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
        {(
          [
            { key: 'overview', label: 'Executive Overview' },
            { key: 'qualifications', label: `Qualifications & Gaps (${analysis.qualifications.length})` },
            { key: 'evidence', label: `Evidence & Objections (${resolvedAchievements.length})` },
            { key: 'prep', label: 'Interview Preparation' },
            { key: 'action-plan', label: `Action Plan${pendingVisibleActionCount > 0 ? ` (${pendingVisibleActionCount})` : ''}` },
            { key: 'timeline', label: `Activity & Timeline${activities.length > 0 ? ` (${activities.length})` : ''}` },
            { key: 'war-room', label: `Interview War Room${activePrep ? ' (Ready)' : ''}` },
            { key: 'mock', label: `Mock Interview${sessions.length > 0 ? ` (${sessions.length})` : ''}` },
            { key: 'follow-up', label: 'Smart Follow-Up' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === key
                ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Executive Summary" />
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {analysis.executiveSummary}
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="lg" className="space-y-3">
              <CardHeader title="Likely Role Mandate" />
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {analysis.likelyMandate}
              </p>
            </Card>
            <Card padding="lg" className="space-y-3">
              <CardHeader title="Fit Score & Rationale" />
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.scoreExplanation}
              </p>
            </Card>
          </div>

          <Card padding="lg" className="space-y-4">
            <CardHeader title="Top Key Requirements" />
            <ul className="space-y-2">
              {analysis.keyRequirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg" className="space-y-4">
            <CardHeader title="Positioning Narrative" />
            <blockquote className="p-4 bg-slate-50 dark:bg-slate-800/60 border-l-4 border-slate-900 dark:border-slate-100 text-sm italic text-slate-800 dark:text-slate-200 rounded-r-lg leading-relaxed">
              &ldquo;{analysis.positioningNarrative}&rdquo;
            </blockquote>
          </Card>
        </div>
      )}

      {/* Tab 2: Qualifications & Gaps */}
      {activeTab === 'qualifications' && (
        <div className="space-y-6">
          <Card padding="none" className="overflow-hidden">
            <CardHeader
              title="Required vs. Preferred Qualifications"
              subtitle={getAnalysisCandidateSubtitle(analysis, profile)}
              className="p-6 pb-4 mb-0"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Category</th>
                    <th className="py-3 px-6">Qualification</th>
                    <th className="py-3 px-6">Match Status</th>
                    <th className="py-3 px-6">Evidence & Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analysis.qualifications.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            q.category === 'Required'
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {q.category} (x{q.category === 'Required' ? 2 : 1})
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-slate-100 max-w-xs">
                        {q.qualification}
                      </td>
                      <td className="py-3.5 px-6">
                        <MatchTypeBadge matchType={q.matchType} />
                      </td>
                      <td className="py-3.5 px-6 max-w-md text-slate-600 dark:text-slate-400 leading-relaxed">
                        {q.explanation}
                        {q.supportingEvidenceCitationIds.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {q.supportingEvidenceCitationIds.map((cid) => (
                              <span
                                key={cid}
                                className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700"
                              >
                                {cid}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Strongest Matches */}
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Strongest Matches" subtitle="UI-derived view: Direct, evidence-backed alignment" />
            {strongMatches.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No strong matches identified.</p>
            ) : (
              <div className="space-y-3">
                {strongMatches.map((m) => (
                  <div key={m.id} className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-emerald-900 dark:text-emerald-300 mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Partial Matches */}
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Partial Matches" subtitle="UI-derived view: Adjacent or partial experience fit" />
            {partialMatches.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No partial matches identified.</p>
            ) : (
              <div className="space-y-3">
                {partialMatches.map((m) => (
                  <div key={m.id} className="p-3.5 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-200">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-300 mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Material Gaps */}
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Material Gaps" subtitle="UI-derived view: Critical missing requirements" />
            {materialGaps.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Zero material gaps identified for this role.</p>
            ) : (
              <div className="space-y-3">
                {materialGaps.map((m) => (
                  <div key={m.id} className="p-3.5 bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-rose-950 dark:text-rose-200">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-rose-900 dark:text-rose-300 mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Unverified Qualifications */}
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Unverified Qualifications" subtitle="UI-derived view: Requirements lacking sufficient evidence to confirm or deny" />
            {unverifiedQualifications.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No unverified qualifications.</p>
            ) : (
              <div className="space-y-3">
                {unverifiedQualifications.map((m) => (
                  <div key={m.id} className="p-3.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Evidence & Objections */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <Card padding="lg" className="space-y-4">
            <CardHeader
              title="Supporting Candidate Evidence"
              subtitle="Verifiable evidence records from candidate snapshot cited in this analysis"
            />
            {resolvedAchievements.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                {uniqueCitationIds.length > 0
                  ? 'Supporting evidence from the original candidate profile is unavailable for this legacy analysis.'
                  : 'No specific evidence citations recorded for positive matches.'}
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedAchievements.map((ach) => (
                  <div key={ach.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-[10px] font-mono font-bold">
                        {ach.citationId}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
                        Metric: {ach.metric}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">{ach.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Context: {ach.roleTitle} at {ach.company}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding="lg" className="space-y-4">
            <CardHeader
              title="Likely Hiring Manager Objections"
              subtitle="Anticipated reservations alongside evidence-backed counter-positioning responses"
            />
            {analysis.objections.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No specific objections identified.</p>
            ) : (
              <div className="space-y-4">
                {analysis.objections.map((obj) => (
                  <div key={obj.id} className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-2">
                    <div className="flex items-start gap-2">
                      <IconAlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                      <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                        Objection: &ldquo;{obj.objection}&rdquo;
                      </h4>
                    </div>
                    <div className="pl-6 border-l-2 border-amber-300 dark:border-amber-700">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Counter-Positioning Strategy:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {obj.counterPositioning}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 4: Interview Preparation */}
      {activeTab === 'prep' && (
        <div className="space-y-6">
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Recruiter-Screen Questions" />
            <ul className="space-y-3">
              {analysis.recruiterQuestions.map((q, idx) => (
                <li key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg" className="space-y-4">
            <CardHeader title="Hiring-Manager Questions" />
            {analysis.hiringManagerQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No hiring-manager questions generated for this report.</p>
            ) : (
              <ul className="space-y-3">
                {analysis.hiringManagerQuestions.map((q, idx) => (
                  <li key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="lg" className="space-y-4">
            <CardHeader title="Tailored STAR Stories" />
            {analysis.recommendedStarStories.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No STAR stories generated.</p>
            ) : (
              <div className="space-y-6">
                {analysis.recommendedStarStories.map((star) => (
                  <div key={star.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{star.title}</h4>
                      <div className="flex items-center gap-1">
                        {star.citationIds.map((cid) => (
                          <span key={cid} className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-[10px] font-mono">
                            {cid}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Situation:</span>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{star.situation}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Task:</span>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{star.task}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Action:</span>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{star.action}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">Result:</span>
                        <p className="text-emerald-800 dark:text-emerald-400 font-semibold mt-0.5">{star.result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 5: Action Plan */}
      {activeTab === 'action-plan' && (
        <OpportunityDetailsForm
          opportunity={opportunity}
          onSave={() => {}}
        />
      )}

      {/* Tab 6: Activity & Timeline */}
      {activeTab === 'timeline' && (
        <ActivityTimeline
          opportunityId={opportunity.id}
          opportunityCompany={opportunity.company}
          activities={activities}
          matchingContacts={matchingContacts}
          onAddActivity={addActivity}
          onEditActivity={editActivity}
          onDeleteActivity={removeActivity}
          isLoading={activitiesLoading}
        />
      )}

      {/* Tab 7: Interview War Room */}
      {activeTab === 'war-room' && (
        <InterviewWarRoom
          opportunity={opportunity}
          candidate={profile}
          analysisReport={opportunity.analysis}
          activePrep={activePrep}
          prepHistory={prepHistory}
          onGeneratePrep={handleGeneratePrep}
          onSelectHistoricalPrep={(selected) => savePrep(selected)}
          isGenerating={isGeneratingPrep}
        />
      )}

      {/* Tab 8: Mock Interview */}
      {activeTab === 'mock' && (
        <MockInterviewPanel
          opportunity={opportunity}
          candidate={profile}
          activePrep={activePrep}
          sessions={sessions}
          onSaveSession={saveSession}
          onDeleteSession={deleteSession}
          onRecordActivity={addActivity}
        />
      )}

      {/* Tab 9: Smart Follow-Up */}
      {activeTab === 'follow-up' && (
        <FollowUpEngineView
          opportunity={opportunity}
          candidate={profile}
          activities={activities}
          onRecordActivity={addActivity}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Opportunity"
        description={`Are you sure you want to delete ${opportunity.title} at ${opportunity.company}? This action will remove the record from your local storage.`}
        confirmText="Delete Role"
        isDanger={true}
      />
    </div>
  );
}
