'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { RecommendationBadge, MatchTypeBadge } from '@/components/ui/Badge';
import { FallbackAnalysisNotice } from '@/components/ui/Notice';
import { Modal } from '@/components/ui/Modal';
import {
  IconArrowRight,
  IconCheckCircle,
  IconAlertTriangle,
  IconTrash,
} from '@/components/icons';
import { JobOpportunity, PipelineStage } from '@/types/opportunity';
import { alexVanceProfile } from '@/data/candidate';
import {
  getOpportunityById,
  updateOpportunityStage,
  deleteOpportunity,
} from '@/lib/storage';

export default function AnalysisResultsPage() {
  const router = useRouter();
  const params = useParams();
  const idFromPath = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null;

  const [prevId, setPrevId] = useState<string | null>(idFromPath);
  const [opportunity, setOpportunity] = useState<JobOpportunity | null>(() =>
    idFromPath ? getOpportunityById(idFromPath) || null : null
  );

  // Synchronously update state during render if path ID changes (React 19 pattern)
  if (idFromPath !== prevId) {
    setPrevId(idFromPath);
    setOpportunity(idFromPath ? getOpportunityById(idFromPath) || null : null);
  }

  const [activeTab, setActiveTab] = useState<'overview' | 'qualifications' | 'evidence' | 'prep' | 'next'>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!opportunity) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Analysis Report Not Found</h2>
        <p className="text-sm text-slate-600">
          The requested role evaluation could not be loaded from local storage.
        </p>
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-indigo-600"
        >
          <span>Return to Opportunities Pipeline</span>
          <IconArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const { analysis } = opportunity;

  // UI-derived sections filtering from normalized qualifications array
  const strongMatches = analysis.qualifications.filter((q) => q.matchType === 'Strong Match');
  const partialMatches = analysis.qualifications.filter((q) => q.matchType === 'Partial Match');
  const materialGaps = analysis.qualifications.filter((q) => q.matchType === 'Material Gap');
  const unverifiedQualifications = analysis.qualifications.filter((q) => q.matchType === 'Unverified');

  // Collect unique evidence citation IDs from Strong & Partial matches
  const uniqueCitationIds = Array.from(
    new Set(
      analysis.qualifications
        .filter((q) => q.matchType === 'Strong Match' || q.matchType === 'Partial Match')
        .flatMap((q) => q.supportingEvidenceCitationIds)
    )
  );

  // Resolve citation IDs to Alex Vance achievements
  const resolvedAchievements = alexVanceProfile.careerHistory
    .flatMap((role) =>
      role.achievements.map((ach) => ({
        ...ach,
        company: role.company,
        roleTitle: role.title,
      }))
    )
    .filter((ach) => uniqueCitationIds.includes(ach.citationId));

  const handleStageChange = (newStage: PipelineStage) => {
    updateOpportunityStage(opportunity.id, newStage);
    setOpportunity({ ...opportunity, stage: newStage });
  };

  const handleDelete = () => {
    deleteOpportunity(opportunity.id);
    router.push('/opportunities');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Navigation Breadcrumb & Actions */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/opportunities" className="hover:text-slate-900 font-medium">
            Opportunities
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{opportunity.title}</span>
        </div>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="text-slate-400 hover:text-rose-600 flex items-center gap-1.5 transition-colors"
        >
          <IconTrash className="w-4 h-4" />
          <span>Delete Role</span>
        </button>
      </div>

      {/* Fallback Notice if Custom Analysis */}
      {analysis.isFallbackAnalysis && (
        <FallbackAnalysisNotice text={analysis.analysisNotice} />
      )}

      {/* Executive Header Banner */}
      <Card padding="lg" className="border-t-4 border-t-slate-900">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {opportunity.company}
              </span>
              {opportunity.location && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500">{opportunity.location}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {opportunity.title}
            </h1>
            {opportunity.compensation && (
              <p className="text-xs font-semibold text-emerald-800">
                Compensation: {opportunity.compensation}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Overall Fit
                </span>
                <span className="text-3xl font-extrabold text-slate-900">
                  {analysis.overallFitScore}%
                </span>
              </div>
              <RecommendationBadge recommendation={analysis.recommendation} />
            </div>

            {/* Stage Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Pipeline Stage:</span>
              <select
                value={opportunity.stage}
                onChange={(e) => handleStageChange(e.target.value as PipelineStage)}
                className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('qualifications')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'qualifications'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Qualifications & Gaps ({analysis.qualifications.length})
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'evidence'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Evidence & Objections ({resolvedAchievements.length})
        </button>
        <button
          onClick={() => setActiveTab('prep')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'prep'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Interview Preparation
        </button>
        <button
          onClick={() => setActiveTab('next')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'next'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Next Actions ({analysis.nextActions.length})
        </button>
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Executive Summary" />
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {analysis.executiveSummary}
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="lg" className="space-y-3">
              <CardHeader title="Likely Role Mandate" />
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {analysis.likelyMandate}
              </p>
            </Card>

            <Card padding="lg" className="space-y-3">
              <CardHeader title="Fit Score & Rationale" />
              <p className="text-sm text-slate-700 leading-relaxed">
                {analysis.scoreExplanation}
              </p>
            </Card>
          </div>

          <Card padding="lg" className="space-y-4">
            <CardHeader title="Top Key Requirements" />
            <ul className="space-y-2">
              {analysis.keyRequirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg" className="space-y-4">
            <CardHeader title="Positioning Narrative" />
            <blockquote className="p-4 bg-slate-50 border-l-4 border-slate-900 text-sm italic text-slate-800 rounded-r-lg leading-relaxed">
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
              subtitle="Line-item breakdown matching Alex Vance evidence against role specifications"
              className="p-6 pb-4 mb-0"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Category</th>
                    <th className="py-3 px-6">Qualification Specification</th>
                    <th className="py-3 px-6">Match Status</th>
                    <th className="py-3 px-6">Evidence & Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.qualifications.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            q.category === 'Required'
                              ? 'bg-slate-900 text-white font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {q.category} (x{q.category === 'Required' ? 2 : 1})
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900 max-w-xs">
                        {q.qualification}
                      </td>
                      <td className="py-3.5 px-6">
                        <MatchTypeBadge matchType={q.matchType} />
                      </td>
                      <td className="py-3.5 px-6 max-w-md text-slate-600 leading-relaxed">
                        {q.explanation}
                        {q.supportingEvidenceCitationIds.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {q.supportingEvidenceCitationIds.map((cid) => (
                              <span
                                key={cid}
                                className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-200"
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
            <CardHeader
              title="Strongest Matches"
              subtitle="UI-derived view: Direct, evidence-backed alignment"
            />
            {strongMatches.length === 0 ? (
              <p className="text-xs text-slate-500">No strong matches identified.</p>
            ) : (
              <div className="space-y-3">
                {strongMatches.map((m) => (
                  <div key={m.id} className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-emerald-950">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-emerald-900 mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Partial Matches */}
          <Card padding="lg" className="space-y-4">
            <CardHeader
              title="Partial Matches"
              subtitle="UI-derived view: Adjacent or partial experience fit"
            />
            {partialMatches.length === 0 ? (
              <p className="text-xs text-slate-500">No partial matches identified.</p>
            ) : (
              <div className="space-y-3">
                {partialMatches.map((m) => (
                  <div key={m.id} className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-amber-950">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-amber-900 mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Material Gaps */}
          <Card padding="lg" className="space-y-4">
            <CardHeader
              title="Material Gaps"
              subtitle="UI-derived view: Critical missing operational requirements representing hiring risks"
            />
            {materialGaps.length === 0 ? (
              <p className="text-xs text-slate-500">Zero material gaps identified for this role.</p>
            ) : (
              <div className="space-y-3">
                {materialGaps.map((m) => (
                  <div key={m.id} className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-rose-950">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-rose-900 mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Unverified Qualifications */}
          <Card padding="lg" className="space-y-4">
            <CardHeader
              title="Unverified Qualifications"
              subtitle="UI-derived view: Requirements lacking sufficient evidence in profile to confirm or deny"
            />
            {unverifiedQualifications.length === 0 ? (
              <p className="text-xs text-slate-500">No unverified qualifications.</p>
            ) : (
              <div className="space-y-3">
                {unverifiedQualifications.map((m) => (
                  <div key={m.id} className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">{m.qualification}</h4>
                      <MatchTypeBadge matchType={m.matchType} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{m.explanation}</p>
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
          {/* Supporting Candidate Evidence */}
          <Card padding="lg" className="space-y-4">
            <CardHeader
              title="Supporting Candidate Evidence"
              subtitle="UI-derived view: Verifiable achievements from Alex Vance profile cited in analysis"
            />
            {resolvedAchievements.length === 0 ? (
              <p className="text-xs text-slate-500">No specific evidence achievements cited for positive matches.</p>
            ) : (
              <div className="space-y-3">
                {resolvedAchievements.map((ach) => (
                  <div key={ach.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono font-bold">
                        {ach.citationId}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Metric: {ach.metric}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-2">{ach.description}</p>
                    <p className="text-xs text-slate-500">
                      Context: {ach.roleTitle} at {ach.company}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Likely Hiring Objections */}
          <Card padding="lg" className="space-y-4">
            <CardHeader
              title="Likely Hiring Manager Objections"
              subtitle="Anticipated reservations alongside evidence-backed counter-positioning responses"
            />
            {analysis.objections.length === 0 ? (
              <p className="text-xs text-slate-500">No specific objections identified.</p>
            ) : (
              <div className="space-y-4">
                {analysis.objections.map((obj) => (
                  <div key={obj.id} className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2">
                    <div className="flex items-start gap-2">
                      <IconAlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <h4 className="text-sm font-semibold text-amber-950">
                        Objection: &ldquo;{obj.objection}&rdquo;
                      </h4>
                    </div>
                    <div className="pl-6 border-l-2 border-amber-300">
                      <p className="text-xs font-semibold text-slate-900">Counter-Positioning Strategy:</p>
                      <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
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
          {/* Recruiter-Screen Questions */}
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Recruiter-Screen Questions" />
            <ul className="space-y-3">
              {analysis.recruiterQuestions.map((q, idx) => (
                <li key={idx} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 text-sm text-slate-800 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Hiring-Manager Questions */}
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Hiring-Manager Questions" />
            {analysis.hiringManagerQuestions.length === 0 ? (
              <p className="text-xs text-slate-500">No hiring-manager questions generated for this report.</p>
            ) : (
              <ul className="space-y-3">
                {analysis.hiringManagerQuestions.map((q, idx) => (
                  <li key={idx} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 text-sm text-slate-800 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Tailored STAR Stories */}
          <Card padding="lg" className="space-y-4">
            <CardHeader title="Tailored STAR Stories" />
            {analysis.recommendedStarStories.length === 0 ? (
              <p className="text-xs text-slate-500">No STAR stories generated.</p>
            ) : (
              <div className="space-y-6">
                {analysis.recommendedStarStories.map((star) => (
                  <div key={star.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-base font-bold text-slate-900">{star.title}</h4>
                      <div className="flex items-center gap-1">
                        {star.citationIds.map((cid) => (
                          <span key={cid} className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-mono">
                            {cid}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">Situation:</span>
                        <p className="text-slate-600 mt-0.5">{star.situation}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Task:</span>
                        <p className="text-slate-600 mt-0.5">{star.task}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Action:</span>
                        <p className="text-slate-600 mt-0.5">{star.action}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Result:</span>
                        <p className="text-emerald-800 font-semibold mt-0.5">{star.result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 5: Recommended Next Actions */}
      {activeTab === 'next' && (
        <Card padding="lg" className="space-y-4">
          <CardHeader
            title="Recommended Next Actions"
            subtitle="Actionable steps for managing this opportunity in your pipeline"
          />
          <ul className="space-y-3">
            {analysis.nextActions.map((act, idx) => (
              <li key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3 text-sm text-slate-800 font-medium">
                <IconCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Confirmation Modal for Delete */}
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
