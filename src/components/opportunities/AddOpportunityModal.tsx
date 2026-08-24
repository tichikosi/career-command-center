'use client';

import React, { useState } from 'react';
import { JobOpportunity, PipelineStage, OpportunityPriority } from '@/types/opportunity';
import { createOpportunity } from '@/lib/storage';
import { getCandidateProfile } from '@/lib/storage';
import { getAnalysisEngine } from '@/lib/engine';
import {
  IconUpload,
  IconCheckCircle,
} from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (opp: JobOpportunity) => void;
}

export function AddOpportunityModal({ isOpen, onClose, onCreated }: Props) {
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [compensation, setCompensation] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [priority, setPriority] = useState<OpportunityPriority>('Medium');
  const [stage, setStage] = useState<PipelineStage>('Identified');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rawJobDescription, setRawJobDescription] = useState('');

  // UI state
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [urlFetchMessage, setUrlFetchMessage] = useState('');

  if (!isOpen) return null;

  const handleFetchUrl = async () => {
    if (!applicationUrl.trim()) {
      setUrlFetchMessage('Please enter a valid job URL first.');
      return;
    }

    setIsFetchingUrl(true);
    setUrlFetchMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/opportunity/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: applicationUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch JD from URL');
      }

      if (data.text) {
        setRawJobDescription(data.text);
        setUrlFetchMessage('Job description extracted successfully.');
        if (data.detectedTitle && !title) {
          setTitle(data.detectedTitle.slice(0, 80));
        }
      } else {
        setUrlFetchMessage('No plain text content could be extracted.');
      }
    } catch (err: unknown) {
      setUrlFetchMessage(err instanceof Error ? err.message : 'Failed to fetch URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const validate = (): boolean => {
    if (!company.trim()) {
      setErrorMessage('Company name is required.');
      return false;
    }
    if (!title.trim()) {
      setErrorMessage('Job title is required.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleSaveWithoutAnalysis = () => {
    if (!validate()) return;

    try {
      const newOpp = createOpportunity({
        company: company.trim(),
        title: title.trim(),
        location: location.trim() || undefined,
        compensation: compensation.trim() || undefined,
        applicationUrl: applicationUrl.trim() || undefined,
        priority,
        stage,
        followUpDate: followUpDate || undefined,
        notes: notes.trim(),
        rawJobDescription: rawJobDescription.trim(),
      });

      onCreated(newOpp);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save opportunity.');
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!validate()) return;

    setIsAnalyzing(true);
    setErrorMessage('');

    try {
      const candidateProfile = getCandidateProfile();
      const engine = getAnalysisEngine();

      const jdToAnalyze = rawJobDescription.trim() || `${title} at ${company}. Location: ${location || 'Not specified'}.`;

      const analysisReport = await engine.analyzeRole(
        {
          jobTitle: title.trim(),
          company: company.trim(),
          jobDescription: jdToAnalyze,
          location: location.trim() || undefined,
          compensation: compensation.trim() || undefined,
          sourceUrl: applicationUrl.trim() || undefined,
        },
        candidateProfile
      );

      const newOpp = createOpportunity({
        company: company.trim(),
        title: title.trim(),
        location: location.trim() || undefined,
        compensation: compensation.trim() || undefined,
        applicationUrl: applicationUrl.trim() || undefined,
        priority,
        stage,
        followUpDate: followUpDate || undefined,
        notes: notes.trim(),
        rawJobDescription: jdToAnalyze,
        analysis: analysisReport,
      });

      onCreated(newOpp);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Fit analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wide">
              Pipeline Workspace (V2.1)
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Add Target Opportunity
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Form Grid */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, Anthropic, Scale AI"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Role Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Director, AI Strategy & Operations"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA (Hybrid) or Remote"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Compensation
              </label>
              <input
                type="text"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                placeholder="e.g. $220k - $270k + Equity"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as PipelineStage)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Identified">Identified</option>
                <option value="Applied">Applied</option>
                <option value="Screening">Screening</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Strategic Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as OpportunityPriority)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Next Follow-Up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Job URL / Application Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                placeholder="https://boards.greenhouse.io/..."
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                disabled={isFetchingUrl || !applicationUrl.trim()}
                onClick={handleFetchUrl}
                className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shrink-0 flex items-center gap-1.5"
              >
                {isFetchingUrl ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <IconUpload className="w-3.5 h-3.5" />
                )}
                <span>Fetch JD</span>
              </button>
            </div>
            {urlFetchMessage && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                {urlFetchMessage}
              </p>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Job Description (Pasted or Fetched)
            </label>
            <textarea
              rows={5}
              value={rawJobDescription}
              onChange={(e) => setRawJobDescription(e.target.value)}
              placeholder="Paste job posting text, qualifications, and mandate here for AI candidate fit scoring..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Initial Strategy Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Internal referral from executive contact; target 90-day AI roadmap."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleSaveWithoutAnalysis}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors"
            >
              Save Opportunity
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleAnalyzeAndSave}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Scoring Fit...</span>
                </>
              ) : (
                <>
                  <IconCheckCircle className="w-4 h-4" />
                  <span>Analyze & Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
