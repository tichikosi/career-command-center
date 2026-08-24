'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { FallbackAnalysisNotice } from '@/components/ui/Notice';
import { IconAnalyze, IconAlertTriangle, IconRefresh } from '@/components/icons';
import { useCandidateProfile } from '@/lib/useCandidate';
import { toAnalysisCandidate } from '@/lib/candidateAdapter';
import { initialOpportunities } from '@/data/opportunities';
import { getAnalysisEngine } from '@/lib/engine';
import { saveOpportunity, getOpportunityById } from '@/lib/storage';
import { buildStageActions, buildRoleActions, mergeActionsForStage } from '@/lib/stageActions';
import { JobOpportunity } from '@/types/opportunity';

export default function AnalyzePage() {
  const router = useRouter();
  const { profile, isSynthetic, mounted } = useCandidateProfile();
  const isProfileEmpty = profile.dataMode === 'user' && !profile.name && profile.careerHistory.length === 0;
  const [activeTab, setActiveTab] = useState<'sample' | 'custom'>('sample');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('opp-role-1-ai-strategy');

  // Custom Form Fields
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [compensation, setCompensation] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeSample = async () => {
    if (!mounted) return;
    setError(null);
    const sampleOpp = initialOpportunities.find((o) => o.id === selectedSampleId);
    if (!sampleOpp) {
      setError('Selected sample role not found.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const engine = getAnalysisEngine('gemini');
      const report = await engine.analyzeRole(
        {
          jobTitle: sampleOpp.title,
          company: sampleOpp.company,
          jobDescription: sampleOpp.rawJobDescription,
          location: sampleOpp.location,
          compensation: sampleOpp.compensation,
          sourceUrl: sampleOpp.sourceUrl,
          sampleRoleId: sampleOpp.id,
        },
        toAnalysisCandidate(profile)
      );

      const targetId = sampleOpp.id; // Reuse canonical fixture ID!
      const existingOpp = getOpportunityById(targetId);

      let opportunityToSave: JobOpportunity;

      if (existingOpp) {
        // Re-analyzing existing sample: refresh analysis & role actions while preserving user workflow history
        const updatedActions = mergeActionsForStage(
          targetId,
          existingOpp.stage,
          report.nextActions,
          existingOpp.actions
        );

        opportunityToSave = {
          ...existingOpp,
          title: sampleOpp.title,
          company: sampleOpp.company,
          location: sampleOpp.location ?? existingOpp.location,
          compensation: sampleOpp.compensation ?? existingOpp.compensation,
          sourceUrl: sampleOpp.sourceUrl ?? existingOpp.sourceUrl,
          rawJobDescription: sampleOpp.rawJobDescription,
          analysis: report,
          actions: updatedActions,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // First time saving this sample opportunity
        const stage = sampleOpp.stage || 'Identified';
        const priority = sampleOpp.priority || (report.overallFitScore >= 85 ? 'High' : report.overallFitScore >= 50 ? 'Medium' : 'Low');

        opportunityToSave = {
          id: targetId,
          title: sampleOpp.title,
          company: sampleOpp.company,
          location: sampleOpp.location,
          compensation: sampleOpp.compensation,
          sourceUrl: sampleOpp.sourceUrl,
          companyWebsiteUrl: sampleOpp.companyWebsiteUrl,
          applicationUrl: sampleOpp.applicationUrl,
          rawJobDescription: sampleOpp.rawJobDescription,
          createdAt: sampleOpp.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stage,
          analysis: report,
          priority,
          notes: sampleOpp.notes || '',
          followUpDate: sampleOpp.followUpDate,
          archivedReason: sampleOpp.archivedReason,
          actions: [
            ...buildStageActions(stage),
            ...buildRoleActions(targetId, report.nextActions),
          ],
        };
      }

      saveOpportunity(opportunityToSave);
      router.push(`/analysis/${opportunityToSave.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis.');
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!jobTitle.trim()) {
      setError('Job title is required.');
      return;
    }
    if (!company.trim()) {
      setError('Company name is required.');
      return;
    }

    const words = jobDescription.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 50) {
      setError(`Job description must contain at least 50 words (currently ${words.length} words).`);
      return;
    }

    setIsAnalyzing(true);

    try {
      const engine = getAnalysisEngine('gemini');
      const report = await engine.analyzeRole(
        {
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          jobDescription: jobDescription.trim(),
          location: location.trim() || undefined,
          compensation: compensation.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
        },
        toAnalysisCandidate(profile)
      );

      const newOppId = `opp-custom-${Date.now()}`;
      const newOpportunity: JobOpportunity = {
        id: newOppId,
        title: jobTitle.trim(),
        company: company.trim(),
        location: location.trim() || undefined,
        compensation: compensation.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        rawJobDescription: jobDescription.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: 'Identified',
        analysis: report,
        priority: report.overallFitScore >= 85 ? 'High' : report.overallFitScore >= 50 ? 'Medium' : 'Low',
        notes: '',
        actions: [
          ...buildStageActions('Identified'),
          ...buildRoleActions(newOppId, report.nextActions),
        ],
      };

      // Simulate engine processing delay
      await new Promise((r) => setTimeout(r, 800));

      saveOpportunity(newOpportunity);
      router.push(`/analysis/${newOpportunity.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Analyze a Role</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Evaluate job descriptions against active candidate profile evidence to generate evidence-backed fit reports.
        </p>
      </div>

      {/* Candidate Context Read-Only Chip */}
      {!mounted ? (
        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-4 rounded-xl flex items-center justify-between shadow-xs animate-pulse">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Active Candidate Context
            </span>
            <h2 className="text-base font-semibold tracking-tight text-white mt-0.5">
              Loading candidate context...
            </h2>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Active Candidate Context
            </span>
            <h2 className="text-base font-semibold tracking-tight text-white mt-0.5">
              {profile.name || 'Empty Candidate Profile'} {profile.headline ? `— ${profile.headline}` : ''}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {profile.careerHistory.length} Career Roles | {profile.evidenceItems.length} Evidence Records
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-emerald-300 border border-slate-700">
              {isSynthetic ? '100% Synthetic Persona' : 'User Evidence Profile'}
            </span>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('sample')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'sample'
              ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Try a Sample Role
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'custom'
              ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Paste Custom Job Description
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-xl text-xs flex items-center gap-2">
          <IconAlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Pre-Loaded Sample Roles */}
      {activeTab === 'sample' && (
        <Card padding="lg" className="space-y-6">
          <CardHeader
            title="Choose a Sample Opportunity"
            subtitle="Use a pre-loaded role to test fit analysis against your active candidate profile."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialOpportunities.map((opp) => {
              const isSelected = selectedSampleId === opp.id;

              return (
                <div
                  key={opp.id}
                  onClick={() => setSelectedSampleId(opp.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-slate-900 dark:border-slate-100 bg-slate-50/80 dark:bg-slate-800/80 ring-1 ring-slate-900 dark:ring-slate-100 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {opp.company}
                      </span>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{opp.title}</h4>
                    </div>
                    <input
                      type="radio"
                      name="sampleRole"
                      checked={isSelected}
                      onChange={() => setSelectedSampleId(opp.id)}
                      className="mt-1 accent-slate-900 dark:accent-slate-100"
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {opp.rawJobDescription}
                  </p>
                  <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                      SAMPLE ROLE
                    </span>
                    <span>
                      {opp.location || 'Executive Track'} {opp.compensation ? `• ${opp.compensation}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {mounted && isProfileEmpty && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 p-4 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold block text-sm">Add Candidate Evidence to Calculate Fit</span>
                <span className="text-slate-700 dark:text-slate-300 mt-0.5 block">
                  Your active candidate profile is currently empty. Add work experience or restore demo data to evaluate roles.
                </span>
              </div>
              <Link
                href="/profile"
                className="px-3 py-1.5 bg-amber-900 dark:bg-amber-100 text-white dark:text-amber-900 font-semibold rounded-lg text-xs shrink-0 w-fit"
              >
                Go to Profile
              </Link>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={handleAnalyzeSample}
              disabled={isAnalyzing || !mounted || isProfileEmpty}
              className="px-6 py-2.5 text-sm font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <IconRefresh className="w-4 h-4 animate-spin text-white dark:text-slate-900" />
                  <span>Evaluating Synthetic Engine...</span>
                </>
              ) : (
                <>
                  <IconAnalyze className="w-4 h-4" />
                  <span>Analyze Selected Role</span>
                </>
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Mode 2: Custom Job Description Form */}
      {activeTab === 'custom' && (
        <form onSubmit={handleAnalyzeCustom} className="space-y-6">
          <FallbackAnalysisNotice />

          <Card padding="lg" className="space-y-6">
            <CardHeader
              title="Job Posting Metadata"
              subtitle="Basic title, company, and compensation details"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Director of RevOps"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Apex Enterprise"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA (Hybrid)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Compensation Range (Optional)
                </label>
                <input
                  type="text"
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                  placeholder="e.g. $220,000 - $250,000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Job Description Text * (Min 50 words, Max 15,000 chars)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                placeholder="Paste the full job description text here..."
                required
                className="w-full p-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 font-mono text-xs leading-relaxed"
              />
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                <span>
                  Words:{' '}
                  {jobDescription.trim().split(/\s+/).filter((w) => w.length > 0).length} / 50 min
                </span>
                <span>Chars: {jobDescription.length} / 15,000 max</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                Privacy & Data Notice:
              </span>
              <p>
                In Version 1, custom-pasted text is processed exclusively in your browser using
                deterministic keyword signal matching. It is stored locally in `localStorage` and
                never transmitted to external servers. Avoid pasting confidential or proprietary
                company text.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setJobTitle('');
                  setCompany('');
                  setLocation('');
                  setCompensation('');
                  setSourceUrl('');
                  setJobDescription('');
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isAnalyzing || !mounted || isProfileEmpty}
                className="px-6 py-2 text-sm font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <IconRefresh className="w-4 h-4 animate-spin text-white dark:text-slate-900" />
                    <span>Processing Analysis...</span>
                  </>
                ) : (
                  <>
                    <IconAnalyze className="w-4 h-4" />
                    <span>Run Custom Analysis</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
