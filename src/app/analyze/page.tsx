'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { FallbackAnalysisNotice } from '@/components/ui/Notice';
import { IconAnalyze, IconAlertTriangle, IconRefresh } from '@/components/icons';
import { alexVanceProfile } from '@/data/candidate';
import { initialOpportunities } from '@/data/opportunities';
import { DeterministicSyntheticEngine } from '@/lib/engine';
import { saveOpportunity } from '@/lib/storage';
import { JobOpportunity } from '@/types/opportunity';

export default function AnalyzePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'sample' | 'custom'>('sample');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('opp-role-1-ai-strategy');

  // Custom Form Fields
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [compensation, setCompensation] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Validation & Processing State
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeSample = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const sampleOpp = initialOpportunities.find((o) => o.id === selectedSampleId);
      if (!sampleOpp) {
        throw new Error('Selected sample role not found.');
      }

      const engine = new DeterministicSyntheticEngine();
      const report = await engine.analyzeRole(
        {
          jobTitle: sampleOpp.title,
          company: sampleOpp.company,
          jobDescription: sampleOpp.rawJobDescription,
          sampleRoleId: sampleOpp.id,
        },
        alexVanceProfile
      );

      const newOpportunity: JobOpportunity = {
        id: `opp-${Date.now()}`,
        title: sampleOpp.title,
        company: sampleOpp.company,
        location: sampleOpp.location,
        compensation: sampleOpp.compensation,
        sourceUrl: sampleOpp.sourceUrl,
        rawJobDescription: sampleOpp.rawJobDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: 'Identified',
        analysis: report,
      };

      // Simulate engine processing delay
      await new Promise((r) => setTimeout(r, 600));

      saveOpportunity(newOpportunity);
      router.push(`/analysis/${newOpportunity.id}`);
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
      const engine = new DeterministicSyntheticEngine();
      const report = await engine.analyzeRole(
        {
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          jobDescription: jobDescription.trim(),
          location: location.trim() || undefined,
          compensation: compensation.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
        },
        alexVanceProfile
      );

      const newOpportunity: JobOpportunity = {
        id: `opp-custom-${Date.now()}`,
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analyze a Role</h1>
        <p className="text-sm text-slate-600 mt-1">
          Evaluate job descriptions against Alex Vance’s synthetic candidate profile to generate evidence-backed fit reports.
        </p>
      </div>

      {/* Candidate Context Read-Only Chip */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Active Candidate Context
          </span>
          <h2 className="text-base font-semibold tracking-tight text-white mt-0.5">
            Alex Vance — Director of AI Strategy & GTM Ops
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            12+ years experience | 16 verified synthetic evidence citations
          </p>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-emerald-300 border border-slate-700">
            100% Synthetic Persona
          </span>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('sample')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'sample'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Select Pre-Loaded Sample Role
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'custom'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Paste Custom Job Description
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <IconAlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Pre-Loaded Sample Roles */}
      {activeTab === 'sample' && (
        <Card padding="lg" className="space-y-6">
          <CardHeader
            title="Choose a Synthetic Benchmark Role"
            subtitle="Pre-configured sample positions exercising all recommendation and match types"
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
                      ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {opp.company}
                      </span>
                      <h4 className="font-semibold text-slate-900 mt-0.5">{opp.title}</h4>
                    </div>
                    <input
                      type="radio"
                      name="sampleRole"
                      checked={isSelected}
                      onChange={() => setSelectedSampleId(opp.id)}
                      className="mt-1 accent-slate-900"
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {opp.rawJobDescription}
                  </p>
                  <div className="mt-3 text-[11px] text-slate-500 font-medium">
                    Expected Fit: {opp.analysis.overallFitScore}% ({opp.analysis.recommendation})
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={handleAnalyzeSample}
              disabled={isAnalyzing}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <IconRefresh className="w-4 h-4 animate-spin text-white" />
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Director of RevOps"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Apex Enterprise"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA (Hybrid)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Compensation Range (Optional)
                </label>
                <input
                  type="text"
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                  placeholder="e.g. $220,000 - $250,000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Job Description Text * (Min 50 words, Max 15,000 chars)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                placeholder="Paste the full job description text here..."
                required
                className="w-full p-3.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-xs leading-relaxed"
              />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                <span>
                  Words:{' '}
                  {jobDescription.trim().split(/\s+/).filter((w) => w.length > 0).length} / 50 min
                </span>
                <span>Chars: {jobDescription.length} / 15,000 max</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-xs text-slate-600 space-y-1">
              <span className="font-semibold text-slate-900 block">
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
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="px-6 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <IconRefresh className="w-4 h-4 animate-spin text-white" />
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
