'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import {
  RecommendationBadge,
  PriorityBadge,
  FollowUpStatusBadge,
} from '@/components/ui/Badge';
import { AnalysisFreshnessBadge } from '@/components/ui/AnalysisFreshnessBadge';
import { useCandidateProfile } from '@/lib/useCandidate';
import { getAnalysisFreshness } from '@/lib/candidateAdapter';
import { Modal } from '@/components/ui/Modal';
import {
  IconSearch,
  IconRefresh,
  IconTrash,
  IconArrowRight,
  IconAnalyze,
  IconSortAsc,
  IconSortDesc,
  IconSortNeutral,
  IconExternalLink,
} from '@/components/icons';
import {
  JobOpportunity,
  PipelineStage,
  SortField,
  SortDirection,
  FollowUpStatus,
} from '@/types/opportunity';
import {
  updateOpportunityStage,
  deleteOpportunity,
  archiveOpportunity,
  updateOpportunityFollowUpDate,
  updateOpportunityNotes,
  resetDemoData,
  getUISettings,
  saveUISettings,
} from '@/lib/storage';
import { useOpportunities } from '@/lib/useOpportunities';
import { classifyFollowUpDate, validateUrl } from '@/lib/dateUtils';

const RECOMMENDATION_ORDER: Record<string, number> = {
  Apply: 0,
  'Network First': 1,
  Monitor: 2,
  Deprioritize: 3,
};

const PRIORITY_ORDER: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const STAGE_ORDER: Record<string, number> = {
  Interviewing: 0,
  Offer: 1,
  Screening: 2,
  Applied: 3,
  Identified: 4,
  Archived: 5,
};

function sortOpportunities(
  opps: JobOpportunity[],
  field: SortField,
  dir: SortDirection
): JobOpportunity[] {
  const sorted = [...opps].sort((a, b) => {
    let cmp = 0;

    switch (field) {
      case 'company':
        cmp = a.company.localeCompare(b.company);
        break;
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'fitScore':
        cmp = a.analysis.overallFitScore - b.analysis.overallFitScore;
        break;
      case 'recommendation':
        cmp =
          (RECOMMENDATION_ORDER[a.analysis.recommendation] ?? 99) -
          (RECOMMENDATION_ORDER[b.analysis.recommendation] ?? 99);
        break;
      case 'priority':
        cmp =
          (PRIORITY_ORDER[a.priority] ?? 99) -
          (PRIORITY_ORDER[b.priority] ?? 99);
        break;
      case 'stage':
        cmp =
          (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99);
        break;
      case 'followUpDate':
        cmp =
          (a.followUpDate ?? '9999-99-99').localeCompare(
            b.followUpDate ?? '9999-99-99'
          );
        break;
      case 'createdAt':
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
    }

    return dir === 'asc' ? cmp : -cmp;
  });

  return sorted;
}

function SortableHeader({
  field,
  label,
  currentField,
  currentDir,
  onSort,
  className = '',
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDir: SortDirection;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <th className={`py-3.5 px-4 ${className}`}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:outline-none focus-visible:underline"
        aria-label={`Sort by ${label}`}
      >
        <span className="text-xs">{label}</span>
        <span className="text-slate-400 dark:text-slate-500">
          {isActive ? (
            currentDir === 'asc' ? (
              <IconSortAsc className="w-3 h-3 text-slate-900 dark:text-slate-100" />
            ) : (
              <IconSortDesc className="w-3 h-3 text-slate-900 dark:text-slate-100" />
            )
          ) : (
            <IconSortNeutral className="w-3 h-3" />
          )}
        </span>
      </button>
    </th>
  );
}

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const initialStageFilter = searchParams ? searchParams.get('stage') || 'All' : 'All';

  const opportunities = useOpportunities();
  const { profile, mounted } = useCandidateProfile();
  const [settings] = useState(() => getUISettings());

  const [searchTerm, setSearchTerm] = useState(settings.searchTerm ?? '');
  const [stageFilter, setStageFilter] = useState<string>(
    initialStageFilter !== 'All' ? initialStageFilter : (settings.stageFilter ?? 'All')
  );
  const [recommendationFilter, setRecommendationFilter] = useState<string>(
    settings.recommendationFilter ?? 'All'
  );
  const [priorityFilter, setPriorityFilter] = useState<string>(
    settings.priorityFilter ?? 'All'
  );
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpStatus | 'All'>(
    settings.followUpFilter ?? 'All'
  );

  const [sortField, setSortField] = useState<SortField>(settings.sortField ?? 'createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>(settings.sortDirection ?? 'desc');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingNotesOpp, setEditingNotesOpp] = useState<JobOpportunity | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    saveUISettings({
      sortField,
      sortDirection,
      stageFilter,
      recommendationFilter,
      priorityFilter,
      followUpFilter,
      searchTerm,
    });
  }, [sortField, sortDirection, stageFilter, recommendationFilter, priorityFilter, followUpFilter, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStageFilter('All');
    setRecommendationFilter('All');
    setPriorityFilter('All');
    setFollowUpFilter('All');
  };

  const hasActiveFilters =
    searchTerm ||
    stageFilter !== 'All' ||
    recommendationFilter !== 'All' ||
    priorityFilter !== 'All' ||
    followUpFilter !== 'All';

  const filteredOpportunities = sortOpportunities(
    opportunities.filter((opp) => {
      const matchesSearch =
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.company.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = stageFilter === 'All' || opp.stage === stageFilter;
      const matchesRec =
        recommendationFilter === 'All' || opp.analysis.recommendation === recommendationFilter;
      const matchesPriority = priorityFilter === 'All' || opp.priority === priorityFilter;
      const followUpStatus = classifyFollowUpDate(opp.followUpDate);
      const matchesFollowUp = followUpFilter === 'All' || followUpStatus === followUpFilter;

      return matchesSearch && matchesStage && matchesRec && matchesPriority && matchesFollowUp;
    }),
    sortField,
    sortDirection
  );

  const handleStageChange = (id: string, newStage: PipelineStage) => {
    updateOpportunityStage(id, newStage);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteOpportunity(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Opportunities Pipeline</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage recruiting conversations, update stages, and review fit reports.
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

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-72">
              <IconSearch className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title or company..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                aria-label="Filter by stage"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                <option value="All">All Stages</option>
                <option value="Identified">Identified</option>
                <option value="Applied">Applied</option>
                <option value="Screening">Screening</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Archived">Archived</option>
              </select>

              <select
                value={recommendationFilter}
                onChange={(e) => setRecommendationFilter(e.target.value)}
                aria-label="Filter by recommendation"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                <option value="All">All Recommendations</option>
                <option value="Apply">Apply (≥85%)</option>
                <option value="Network First">Network First</option>
                <option value="Monitor">Monitor</option>
                <option value="Deprioritize">Deprioritize</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Filter by priority"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                <option value="All">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>

              <select
                value={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.value as FollowUpStatus | 'All')}
                aria-label="Filter by follow-up status"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                <option value="All">All Follow-ups</option>
                <option value="Overdue">Overdue</option>
                <option value="Due Today">Due Today</option>
                <option value="Upcoming">Upcoming</option>
                <option value="No Date">No Date</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredOpportunities.length} of {opportunities.length} opportunit{opportunities.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
      </Card>

      {/* Table Container */}
      <Card padding="none" className="overflow-hidden">
        {/* Mobile Horizontal Scroll Cue */}
        <div className="sm:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
          <span>Scroll horizontally to view all columns</span>
          <span aria-hidden="true">&rarr;</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[900px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {/* Sticky Left Column for Mobile Context */}
                <SortableHeader
                  field="company"
                  label="Company & Title"
                  currentField={sortField}
                  currentDir={sortDirection}
                  onSort={handleSort}
                  className="sticky left-0 bg-slate-50 dark:bg-slate-900 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-6"
                />
                <SortableHeader field="fitScore" label="Fit" currentField={sortField} currentDir={sortDirection} onSort={handleSort} />
                <SortableHeader field="recommendation" label="Recommendation" currentField={sortField} currentDir={sortDirection} onSort={handleSort} />
                <SortableHeader field="priority" label="Priority" currentField={sortField} currentDir={sortDirection} onSort={handleSort} />
                <SortableHeader field="stage" label="Stage" currentField={sortField} currentDir={sortDirection} onSort={handleSort} />
                <SortableHeader field="followUpDate" label="Follow-up" currentField={sortField} currentDir={sortDirection} onSort={handleSort} />
                <SortableHeader field="createdAt" label="Analyzed" currentField={sortField} currentDir={sortDirection} onSort={handleSort} />
                <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No opportunities match current filters</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {hasActiveFilters ? 'Try adjusting your filters or clearing them.' : 'Add your first opportunity using Analyze New Role.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => {
                  const followUpStatus = classifyFollowUpDate(opp.followUpDate);
                  const companyUrl = validateUrl(opp.companyWebsiteUrl ?? '');
                  const appUrl = validateUrl(opp.applicationUrl ?? '');

                  return (
                    <tr key={opp.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Sticky First Column */}
                      <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] py-3.5 pl-6 pr-4 transition-colors">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{opp.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{opp.company}</span>
                          {companyUrl && (
                            <a
                              href={companyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                              aria-label={`Visit ${opp.company} website`}
                              title="Visit Company Website"
                            >
                              <IconExternalLink className="w-3 h-3 inline" />
                            </a>
                          )}
                          {appUrl && (
                            <a
                              href={appUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              aria-label={`Open job application for ${opp.title}`}
                              title="Open Job Application"
                            >
                              <span className="text-[10px] font-medium">Apply →</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Fit Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                            {opp.analysis.overallFitScore}%
                          </span>
                          <AnalysisFreshnessBadge freshness={mounted ? getAnalysisFreshness(opp.analysis, profile) : 'current'} compact />
                        </div>
                      </td>

                      {/* Recommendation */}
                      <td className="py-3.5 px-4">
                        <RecommendationBadge recommendation={opp.analysis.recommendation} />
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={opp.priority} />
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4">
                        <select
                          value={opp.stage}
                          onChange={(e) => handleStageChange(opp.id, e.target.value as PipelineStage)}
                          aria-label={`Pipeline stage for ${opp.title}`}
                          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                        >
                          <option value="Identified">Identified</option>
                          <option value="Applied">Applied</option>
                          <option value="Screening">Screening</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer">Offer</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </td>

                      {/* Follow-up Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <input
                            type="date"
                            value={opp.followUpDate ?? ''}
                            onChange={(e) => updateOpportunityFollowUpDate(opp.id, e.target.value)}
                            aria-label={`Follow-up date for ${opp.title}`}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                          />
                          {followUpStatus !== 'No Date' && (
                            <FollowUpStatusBadge status={followUpStatus} />
                          )}
                        </div>
                      </td>

                      {/* Date Analyzed */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(opp.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => {
                              setEditingNotesOpp(opp);
                              setNotesDraft(opp.notes ?? '');
                            }}
                            className={`text-xs flex items-center gap-1 font-medium transition-colors ${
                              opp.notes
                                ? 'text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                            title={opp.notes ? 'View/Edit Notes' : 'Add Notes'}
                            aria-label={`Edit notes for ${opp.title}`}
                          >
                            <span>Notes</span>
                            {opp.notes && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                            )}
                          </button>
                          <Link
                            href={`/analysis/${opp.id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                          >
                            <span>Report</span>
                            <IconArrowRight className="w-3 h-3" />
                          </Link>
                          {opp.stage !== 'Archived' && (
                            <button
                              onClick={() => archiveOpportunity(opp.id)}
                              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              title="Archive Opportunity"
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingId(opp.id)}
                            className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Delete Opportunity"
                            aria-label={`Delete ${opp.title}`}
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Opportunity"
        description="Are you sure you want to delete this opportunity? This record will be permanently removed from your local storage."
        confirmText="Delete Role"
        isDanger={true}
      />
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => { resetDemoData(); setIsResetModalOpen(false); }}
        title="Restore demo opportunities?"
        description="Restore demo opportunities? Opportunity stages, workflow actions, notes, and follow-ups will be reset. Candidate data will not be changed."
        confirmText="Restore Opportunities"
        isDanger={true}
      />
      {editingNotesOpp && (
        <Modal
          isOpen={Boolean(editingNotesOpp)}
          onClose={() => setEditingNotesOpp(null)}
          onConfirm={() => {
            updateOpportunityNotes(editingNotesOpp.id, notesDraft);
            setEditingNotesOpp(null);
          }}
          title={`Opportunity Notes — ${editingNotesOpp.company}`}
          description={`Edit notes for ${editingNotesOpp.title}`}
          confirmText="Save Notes"
          isDanger={false}
        >
          <div className="space-y-3 pt-2">
            <textarea
              rows={5}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Enter interview notes, recruiter contacts, or reminders..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">Loading pipeline...</div>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
