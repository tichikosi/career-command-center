'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { JobOpportunity, FitAnalysisReport } from '@/types/opportunity';
import { CandidateProfile, EvidenceItem } from '@/types/candidate';
import { InterviewPreparation, InterviewQuestion, StoryBankEntry, GapBridge } from '@/types/interview';
import {
  IconBrain,
  IconSparkles,
  IconAlertTriangle,
  IconCheckCircle,
  IconUsers,
  IconFileText,
  IconRefresh,
  IconExternalLink,
  IconAward,
  IconTarget,
} from '@/components/icons';
import { formatShortDate } from '@/lib/dateUtils';

interface InterviewWarRoomProps {
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  analysisReport?: FitAnalysisReport;
  activePrep: InterviewPreparation | null;
  prepHistory: InterviewPreparation[];
  onGeneratePrep: () => Promise<void>;
  onSelectHistoricalPrep?: (prep: InterviewPreparation) => void;
  isGenerating?: boolean;
}

export function InterviewWarRoom({
  opportunity,
  candidate,
  analysisReport,
  activePrep,
  prepHistory,
  onGeneratePrep,
  onSelectHistoricalPrep,
  isGenerating = false,
}: InterviewWarRoomProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'strategy' | 'questions' | 'stories' | 'gaps' | 'company' | 'compensation'
  >('strategy');

  const evidenceMap = new Map<string, EvidenceItem>(
    (candidate.evidenceItems || []).map((e) => [e.id, e])
  );

  // Stale detection
  const isStale =
    activePrep &&
    ((activePrep.candidateUpdatedAt &&
      candidate.updatedAt &&
      new Date(candidate.updatedAt).getTime() > new Date(activePrep.candidateUpdatedAt).getTime() + 1000) ||
      (activePrep.opportunityUpdatedAt &&
        opportunity.updatedAt &&
        new Date(opportunity.updatedAt).getTime() > new Date(activePrep.opportunityUpdatedAt).getTime() + 1000) ||
      activePrep.isPotentiallyStale);

  return (
    <div className="space-y-6">
      {/* Top Banner & Generation Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white dark:bg-slate-900/80 dark:border dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
              <IconBrain className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold tracking-tight">Interview War Room</h3>
            {activePrep?.executionMode === 'deterministic' && (
              <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                Simplified Coaching Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Strategic executive briefing, candidate positioning, question bank, and grounded STAR story bank tailored to{' '}
            <strong className="text-white">{opportunity.title}</strong> at{' '}
            <strong className="text-white">{opportunity.company}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {prepHistory.length > 1 && (
            <select
              aria-label="Preparation history"
              value={activePrep?.id || ''}
              onChange={(e) => {
                const selected = prepHistory.find((p) => p.id === e.target.value);
                if (selected && onSelectHistoricalPrep) onSelectHistoricalPrep(selected);
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-2 focus:outline-none"
            >
              {prepHistory.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  {idx === 0 ? 'Active Version' : `Version ${formatShortDate(p.generatedAt)}`} (
                  {p.executionMode === 'gemini' ? p.actualModel || 'AI' : 'Heuristic'})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onGeneratePrep}
            disabled={isGenerating}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <IconSparkles className="w-4 h-4" />
            <span>
              {isGenerating
                ? 'Synthesizing War Room...'
                : activePrep
                ? 'Regenerate Brief'
                : 'Generate Interview Brief'}
            </span>
          </button>
        </div>
      </div>

      {/* Staleness Warning */}
      {isStale && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-4 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              Interview Preparation May Be Outdated
            </span>
            <p className="text-amber-800 dark:text-amber-300">
              Candidate profile evidence or opportunity details have changed since this briefing was generated on{' '}
              {formatShortDate(activePrep.generatedAt)}. Click Regenerate to incorporate new achievements.
            </p>
          </div>
          <button
            onClick={onGeneratePrep}
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-amber-900 dark:bg-amber-100 text-white dark:text-amber-900 font-semibold rounded-lg text-xs shrink-0 w-fit hover:opacity-90 transition-opacity"
          >
            Regenerate Now
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!activePrep ? (
        <Card padding="lg" className="text-center py-16 border-dashed">
          <IconBrain className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">War Room Briefing Not Yet Generated</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Generate an evidence-grounded briefing covering executive positioning, anticipated questions, story selection, and gap mitigation.
          </p>
          <button
            onClick={onGeneratePrep}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm inline-flex items-center gap-2"
          >
            <IconSparkles className="w-4 h-4" />
            <span>{isGenerating ? 'Synthesizing War Room...' : 'Generate Interview War Room'}</span>
          </button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Readiness Score Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <Card padding="md" className="sm:col-span-3 lg:col-span-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-1">
                Interview Readiness Index
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {activePrep.readinessScore.overall}%
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {activePrep.readinessScore.overall >= 75
                    ? 'Well Prepared'
                    : activePrep.readinessScore.overall >= 50
                    ? 'Moderate Readiness'
                    : 'Requires Preparation'}
                </span>
              </div>
            </Card>

            {Object.entries(activePrep.readinessScore.dimensions).map(([dim, score]) => {
              const labelMap: Record<string, string> = {
                roleUnderstanding: 'Role Mandate',
                candidatePositioning: 'Positioning',
                storyPreparation: 'Story Bank',
                gapMitigation: 'Gap Defense',
                companyKnowledge: 'Company Intel',
                questionReadiness: 'Q&A Prep',
              };
              return (
                <Card key={dim} padding="sm" className="flex flex-col justify-between">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {labelMap[dim] || dim}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{score}%</span>
                    <div className="w-10 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs pb-2">
            {[
              { key: 'strategy', label: 'Executive Strategy & Positioning' },
              { key: 'questions', label: `Anticipated Questions (${activePrep.questions.length})` },
              { key: 'stories', label: `Grounded Story Bank (${activePrep.storyBank.length})` },
              { key: 'gaps', label: `Gap Mitigation (${activePrep.materialGaps.length})` },
              { key: 'company', label: 'Company Intelligence' },
              { key: 'compensation', label: 'Compensation & Negotiation' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveSubTab(t.key as typeof activeSubTab)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeSubTab === t.key
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Strategy & Positioning */}
          {activeSubTab === 'strategy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <Card padding="lg">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                  Executive Role Brief
                </h4>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {activePrep.executiveRoleBrief}
                </p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card padding="md">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Candidate Positioning Narrative
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {activePrep.candidatePositioning}
                  </p>
                </Card>

                <Card padding="md">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Strongest Fit Themes
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {activePrep.strongestFitThemes.map((theme, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{theme}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* The Big Three Questions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="md" className="border-t-2 border-t-indigo-500">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                    Why This Company?
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{activePrep.whyThisCompany}</p>
                </Card>

                <Card padding="md" className="border-t-2 border-t-indigo-500">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                    Why This Role?
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{activePrep.whyThisRole}</p>
                </Card>

                <Card padding="md" className="border-t-2 border-t-indigo-500">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                    Why You? (The Value Proposition)
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{activePrep.whyYou}</p>
                </Card>
              </div>

              {/* Questions to Ask & First 90 Days */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card padding="md">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Strategic Questions to Ask Interviewers
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {activePrep.questionsToAsk.map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">Q{i + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card padding="md">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    First 90 Days Discussion Points
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {activePrep.first90DaysPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-bold text-slate-400 shrink-0">{i + 1}.</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {/* Tab 2: Anticipated Questions */}
          {activeSubTab === 'questions' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {activePrep.questions.map((q, i) => (
                <Card key={q.id || i} padding="md" className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {q.category}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Question {i + 1}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{q.question}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                        What Interviewer is Probing:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300">{q.expectedFocus}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                        Recommended Answer Approach:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300">{q.suggestedApproach}</p>
                    </div>
                  </div>

                  {q.relevantEvidenceIds && q.relevantEvidenceIds.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-indigo-600 dark:text-indigo-400 flex-wrap">
                      <span className="font-semibold text-slate-400">Cited Evidence:</span>
                      {q.relevantEvidenceIds.map((eid) => {
                        const ev = evidenceMap.get(eid);
                        return (
                          <span
                            key={eid}
                            className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-medium"
                            title={ev?.description || eid}
                          >
                            {ev?.title || eid}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Tab 3: Grounded Story Bank */}
          {activeSubTab === 'stories' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {activePrep.storyBank.map((story, i) => (
                <Card key={story.id || i} padding="lg" className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <IconAward className="w-4 h-4 text-amber-500" />
                      <span>{story.title}</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">STAR Story #{i + 1}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <strong className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                        Situation
                      </strong>
                      <p className="text-slate-700 dark:text-slate-300">{story.situation}</p>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <strong className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                        Task
                      </strong>
                      <p className="text-slate-700 dark:text-slate-300">{story.task}</p>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <strong className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                        Action
                      </strong>
                      <p className="text-slate-700 dark:text-slate-300">{story.action}</p>
                    </div>

                    <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg">
                      <strong className="text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px] block mb-1">
                        Result / Impact
                      </strong>
                      <p className="text-emerald-900 dark:text-emerald-200 font-medium">{story.result}</p>
                    </div>
                  </div>

                  {story.evidenceIds && story.evidenceIds.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-400">Grounded Evidence ID:</span>
                      {story.evidenceIds.map((eid) => (
                        <span
                          key={eid}
                          className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300"
                        >
                          {eid}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Tab 4: Gap Mitigation */}
          {activeSubTab === 'gaps' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {activePrep.materialGaps.length === 0 ? (
                <Card padding="md" className="text-center py-8">
                  <IconCheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Material Gaps Identified</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Candidate profile demonstrates solid direct alignment with all core required competencies.
                  </p>
                </Card>
              ) : (
                activePrep.materialGaps.map((gap, i) => (
                  <Card key={i} padding="md" className="space-y-2 border-l-4 border-l-amber-500">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Potential Gap: {gap.gap}</span>
                      </h4>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs space-y-1">
                      <strong className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                        Recommended Bridge Strategy
                      </strong>
                      <p className="text-slate-800 dark:text-slate-200">{gap.bridgeStrategy}</p>
                    </div>

                    {gap.supportingEvidenceIds && gap.supportingEvidenceIds.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 pt-1">
                        <span className="text-slate-400">Transferable Evidence:</span>
                        {gap.supportingEvidenceIds.map((eid) => (
                          <span key={eid} className="bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded text-[10px]">
                            {eid}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Tab 5: Company Intelligence */}
          {activeSubTab === 'company' && (
            <Card padding="lg" className="space-y-4 animate-in fade-in duration-150">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <IconBrain className="w-4 h-4 text-indigo-500" />
                <span>Company Intelligence: {opportunity.company}</span>
              </h4>

              {activePrep.companyIntelligence?.available ? (
                <div className="space-y-3 text-xs">
                  {activePrep.companyIntelligence.keyFacts && (
                    <div>
                      <strong className="text-slate-500 block mb-1">Key Organization Facts:</strong>
                      <ul className="list-disc pl-5 space-y-1">
                        {activePrep.companyIntelligence.keyFacts.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Live company intelligence unavailable
                  </p>
                  <p>
                    Grounding search was not performed or external live research was not reachable. Core JD/candidate interview preparation remains fully operational.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Tab 6: Compensation Research */}
          {activeSubTab === 'compensation' && (
            <Card padding="lg" className="space-y-4 animate-in fade-in duration-150">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <IconAward className="w-4 h-4 text-emerald-500" />
                <span>Compensation & Negotiation Strategy</span>
              </h4>

              {activePrep.compensationResearch?.available ? (
                <div className="space-y-3 text-xs">
                  {activePrep.compensationResearch.fromJobDescription && (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <strong className="text-emerald-800 dark:text-emerald-300 block mb-0.5">
                        Posted Compensation (from Job Description):
                      </strong>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activePrep.compensationResearch.fromJobDescription}
                      </span>
                    </div>
                  )}

                  {activePrep.compensationResearch.negotiationCoaching && (
                    <div>
                      <strong className="text-slate-500 block mb-1">Negotiation Guidelines:</strong>
                      <ul className="space-y-1.5">
                        {activePrep.compensationResearch.negotiationCoaching.map((c, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-bold text-emerald-600">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Compensation Research Unavailable
                  </p>
                  <p>
                    No salary or compensation range was specified in the job description or candidate profile preferences. Compensation ranges are not fabricated.
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
