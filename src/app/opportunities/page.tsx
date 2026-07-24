'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { RecommendationBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  IconSearch,
  IconRefresh,
  IconTrash,
  IconArrowRight,
  IconAnalyze,
} from '@/components/icons';
import { JobOpportunity, PipelineStage } from '@/types/opportunity';
import {
  getOpportunities,
  updateOpportunityStage,
  deleteOpportunity,
  archiveOpportunity,
  resetDemoData,
  subscribeToStorage,
} from '@/lib/storage';

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const initialStageFilter = searchParams ? searchParams.get('stage') || 'All' : 'All';

  const [opportunities, setOpportunities] = useState<JobOpportunity[]>(() => getOpportunities());
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter);
  const [recommendationFilter, setRecommendationFilter] = useState<string>('All');

  // Deletion Modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      setOpportunities(getOpportunities());
    };
    return subscribeToStorage(handleStorage);
  }, []);

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'All' || opp.stage === stageFilter;
    const matchesRecommendation =
      recommendationFilter === 'All' || opp.analysis.recommendation === recommendationFilter;

    return matchesSearch && matchesStage && matchesRecommendation;
  });

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
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Opportunities Pipeline
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage active recruiting conversations, update stages, and review fit reports.
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

      {/* Filter & Search Toolbar */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <IconSearch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title or company..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Stage:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="All">All Stages</option>
                <option value="Identified">Identified</option>
                <option value="Applied">Applied</option>
                <option value="Screening">Screening</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Recommendation:</span>
              <select
                value={recommendationFilter}
                onChange={(e) => setRecommendationFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="All">All Recommendations</option>
                <option value="Apply">Apply (&ge;85%)</option>
                <option value="Network First">Network First (70-84%)</option>
                <option value="Monitor">Monitor (50-69%)</option>
                <option value="Deprioritize">Deprioritize (&lt;50%)</option>
              </select>
            </div>

            {(searchTerm || stageFilter !== 'All' || recommendationFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStageFilter('All');
                  setRecommendationFilter('All');
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Opportunities Data Table (Professional Table View Only) */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Company & Title</th>
                <th className="py-3.5 px-6">Fit Score</th>
                <th className="py-3.5 px-6">Recommendation</th>
                <th className="py-3.5 px-6">Pipeline Stage</th>
                <th className="py-3.5 px-6">Date Analyzed</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-900">No opportunities match filters</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try adjusting your search term or clearing filter selections.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900 text-sm">{opp.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{opp.company}</div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {opp.analysis.overallFitScore}%
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <RecommendationBadge recommendation={opp.analysis.recommendation} />
                    </td>

                    <td className="py-4 px-6">
                      <select
                        value={opp.stage}
                        onChange={(e) => handleStageChange(opp.id, e.target.value as PipelineStage)}
                        className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="Identified">Identified</option>
                        <option value="Applied">Applied</option>
                        <option value="Screening">Screening</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Offer">Offer</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </td>

                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {new Date(opp.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/analysis/${opp.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 flex items-center gap-1"
                        >
                          <span>Report</span>
                          <IconArrowRight className="w-3 h-3" />
                        </Link>
                        {opp.stage !== 'Archived' && (
                          <button
                            onClick={() => archiveOpportunity(opp.id)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Archive Opportunity"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingId(opp.id)}
                          className="text-slate-400 hover:text-rose-600"
                          title="Delete Opportunity"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal for Delete */}
      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Opportunity"
        description="Are you sure you want to delete this opportunity? This record will be removed from your local storage."
        confirmText="Delete Role"
        isDanger={true}
      />

      {/* Confirmation Modal for Reset */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => resetDemoData()}
        title="Reset Demo Data"
        description="Are you sure you want to clear all locally stored opportunities and restore the default 5 synthetic benchmark roles?"
        confirmText="Reset All Data"
        isDanger={true}
      />
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading pipeline...</div>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
