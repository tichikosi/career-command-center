'use client';

import React, { useState, useEffect, useRef } from 'react';
import { IconUpload, IconFileText, IconCheckCircle, IconAlertTriangle, IconRefresh, IconClock } from '@/components/icons';
import { CandidateProfile } from '@/types/candidate';
import { ResumeExtractionResult } from '@/lib/server/schemas';
import {
  mergeResumeExtractionIntoProfile,
  replaceProfileWithResumeExtraction,
  classifyResumeIdentity,
  ResumeReconciliationSummary,
} from '@/lib/candidateAdapter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: CandidateProfile;
  onSaveProfile: (profile: CandidateProfile) => void;
}

const PROGRESS_STEPS = [
  { threshold: 0, text: 'Reading résumé document...' },
  { threshold: 3, text: 'Extracting source text & parsing document layout...' },
  { threshold: 8, text: 'Structuring career history & achievements with Gemini...' },
  { threshold: 20, text: 'AI model busy. Engaging resilient backup model...' },
  { threshold: 45, text: 'Finalizing structured extraction & verifying evidence...' },
];

export function ResumeImportModal({ isOpen, onClose, currentProfile, onSaveProfile }: Props) {
  const isDemoCandidate =
    currentProfile.dataMode === 'synthetic' ||
    currentProfile.name === 'Alex Vance' ||
    currentProfile.id === 'cand-synthetic-alex-vance';

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseSecondsElapsed, setParseSecondsElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ResumeExtractionResult | null>(null);
  const [reconciliationSummary, setReconciliationSummary] = useState<ResumeReconciliationSummary | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>(isDemoCandidate ? 'replace' : 'merge');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isParsing) {
      timerRef.current = setInterval(() => {
        setParseSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isParsing]);

  if (!isOpen) return null;

  const currentProgressStep =
    PROGRESS_STEPS.slice()
      .reverse()
      .find((step) => parseSecondsElapsed >= step.threshold)?.text || PROGRESS_STEPS[0].text;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleParse = async () => {
    setError(null);
    setParseSecondsElapsed(0);
    setIsParsing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s bounded client ceiling

    try {
      let response: Response;

      if (activeTab === 'upload') {
        if (!file) {
          setError('Please select a PDF, DOCX, or TXT file to upload.');
          setIsParsing(false);
          clearTimeout(timeoutId);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);

        response = await fetch('/api/resume/parse', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } else {
        if (!pastedText.trim() || pastedText.trim().split(/\s+/).length < 20) {
          setError('Please paste a substantial portion of your résumé (at least 20 words).');
          setIsParsing(false);
          clearTimeout(timeoutId);
          return;
        }

        response = await fetch('/api/resume/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to parse résumé. Please verify file format or try pasting text.');
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Quality check: disallow synthetic placeholder strings
        const candidateName = result.data.name || '';
        const hasPlaceholderName = /candidate name/i.test(candidateName);
        const hasRoles = Array.isArray(result.data.careerHistory) && result.data.careerHistory.length > 0;
        const hasPlaceholderRoles = result.data.careerHistory?.some(
          (r: { company?: string; title?: string }) =>
            r.company === 'Primary Enterprise Experience' || r.title === 'Executive Professional'
        );

        if (hasPlaceholderName || !hasRoles || hasPlaceholderRoles) {
          throw new Error(
            'Unable to extract verified candidate identity from the document. Please verify document formatting or paste résumé text.'
          );
        }

        setExtractedData(result.data);

        // Classify identity relationship
        const summary = classifyResumeIdentity(currentProfile, result.data);
        setReconciliationSummary(summary);

        if (summary.classification === 'demo-candidate') {
          setImportMode('replace');
        } else if (summary.classification === 'same-person') {
          setImportMode('merge'); // Reconcile updates
        } else if (summary.classification === 'different-person') {
          setImportMode('replace');
        } else {
          setImportMode('merge');
        }
      } else {
        throw new Error(result.error || result.message || 'Unable to extract structured candidate details.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Résumé parsing timed out after 90 seconds. Please try pasting résumé text or retry the upload.');
      } else {
        setError(err instanceof Error ? err.message : 'Résumé parsing failed.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitImport = () => {
    if (!extractedData) return;

    let updated: CandidateProfile;
    if (importMode === 'replace') {
      updated = replaceProfileWithResumeExtraction(currentProfile, extractedData);
    } else {
      updated = mergeResumeExtractionIntoProfile(currentProfile, extractedData);
    }

    onSaveProfile(updated);
    onClose();
  };

  // Preview Save Gate Validation
  const isCandidateNameValid = Boolean(
    extractedData?.name && extractedData.name.trim().length >= 2 && !/candidate name/i.test(extractedData.name)
  );
  const isRolesValid = Boolean(
    Array.isArray(extractedData?.careerHistory) &&
      extractedData.careerHistory.length > 0 &&
      extractedData.careerHistory.some((r) => r.company && !/primary enterprise/i.test(r.company))
  );
  const isExtractionValid = Boolean(extractedData && isCandidateNameValid && isRolesValid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <IconUpload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Import Résumé (AI-Powered Extraction)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Extract real career history, accomplishments, and skills into your candidate evidence profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {!extractedData ? (
            <>
              {/* Privacy Disclaimer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
                <IconCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy Notice:</strong> Your résumé is processed transiently for structured extraction. Raw files are not permanently stored in any database; structured data is saved only in your browser storage upon your explicit confirmation.
                </span>
              </div>

              {/* Demo Candidate Notice */}
              {isDemoCandidate && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Demo Candidate Detected (Alex Vance)</strong>
                    Importing your résumé will replace the demo profile with your real identity, career history, and evidence library.
                  </div>
                </div>
              )}

              {/* Source Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === 'upload'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Upload File (PDF, DOCX, TXT)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === 'paste'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Paste Résumé Text
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Select Résumé File
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-file-upload"
                    />
                    <label htmlFor="resume-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <IconFileText className="w-8 h-8 text-slate-400" />
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {file ? file.name : 'Click to select a file or drag & drop here'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Supports PDF, DOCX, and TXT (Max 10MB)
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Paste Raw Résumé Text
                  </label>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste full text of your résumé here (experience, skills, achievements)..."
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Latency Progress Feedback Panel */}
              {isParsing && (
                <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <IconRefresh className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                      <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                        {currentProgressStep}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400">
                      {parseSecondsElapsed}s elapsed
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-400 h-1.5 transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(95, Math.max(10, parseSecondsElapsed * 4))}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Structured parsing extracts career chronology, employers, metrics, and skills directly from source text.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            /* Review Extracted Data Preview */
            <div className="space-y-4">
              {/* Identity Relationship & Classification Card */}
              {reconciliationSummary?.classification === 'same-person' && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <IconCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Existing Profile Recognized ({currentProfile.name})
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtractedData(null)}
                      className="text-[11px] font-semibold underline text-emerald-800 dark:text-emerald-300"
                    >
                      Re-parse
                    </button>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-300">
                    This résumé appears to belong to your active candidate profile. Reconciling will update existing roles and add new achievements without deleting any of your historical evidence or strategy preferences.
                  </p>
                </div>
              )}

              {reconciliationSummary?.classification === 'different-person' && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Different Candidate Identity Detected
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtractedData(null)}
                      className="text-[11px] font-semibold underline text-amber-800 dark:text-amber-300"
                    >
                      Re-parse
                    </button>
                  </div>
                  <p className="text-amber-800 dark:text-amber-300">
                    This résumé appears to belong to <strong>{extractedData.name}</strong>, which is different from your active profile (<strong>{currentProfile.name}</strong>). Replacing will overwrite your active profile.
                  </p>
                </div>
              )}

              {reconciliationSummary?.classification === 'ambiguous' && (
                <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <IconClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Review Profile Update
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtractedData(null)}
                      className="text-[11px] font-semibold underline text-indigo-800 dark:text-indigo-300"
                    >
                      Re-parse
                    </button>
                  </div>
                  <p className="text-indigo-800 dark:text-indigo-300">
                    Review extracted records below and choose whether to update your existing profile or replace it.
                  </p>
                </div>
              )}

              {/* Extraction Preview Cards */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Candidate Name:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {extractedData.name || 'Not detected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Headline:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {extractedData.headline || 'Not detected'}
                    </span>
                  </div>
                </div>

                {extractedData.summary && (
                  <div className="text-xs">
                    <span className="text-slate-400 block font-medium">Executive Summary:</span>
                    <p className="text-slate-700 dark:text-slate-300 text-xs mt-0.5 line-clamp-2">
                      {extractedData.summary}
                    </p>
                  </div>
                )}

                {extractedData.coreCompetencies && extractedData.coreCompetencies.length > 0 && (
                  <div className="text-xs">
                    <span className="text-slate-400 block font-medium">Core Competencies:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {extractedData.coreCompetencies.slice(0, 6).map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-[11px]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs">
                  <span className="text-slate-400 block font-medium">
                    Extracted Roles ({extractedData.careerHistory?.length || 0}):
                  </span>
                  <ul className="mt-1.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {extractedData.careerHistory?.map((role, idx) => (
                      <li
                        key={idx}
                        className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">{role.title}</strong>
                          <span className="text-slate-500 dark:text-slate-400"> at {role.company}</span>
                          {role.accomplishments && role.accomplishments.length > 0 && (
                            <span className="ml-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                              ({role.accomplishments.length} achievements)
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[10px] shrink-0">
                          {role.startDate} – {role.endDate}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {extractedData.education && extractedData.education.length > 0 && (
                  <div className="text-xs">
                    <span className="text-slate-400 block font-medium">Education:</span>
                    <ul className="mt-1 space-y-0.5 text-slate-700 dark:text-slate-300 text-xs">
                      {extractedData.education.map((edu, idx) => (
                        <li key={idx}>
                          <strong>{edu.institution}</strong> {edu.degree && `— ${edu.degree}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {!isExtractionValid && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Extraction Quality Check: Unable to verify candidate identity or career roles. Saving is disabled to protect your profile.
                  </span>
                </div>
              )}

              {/* Import Options */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Import Action Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {isDemoCandidate ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          importMode === 'replace'
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-bold block text-emerald-700 dark:text-emerald-400">
                          Replace Demo Candidate (Recommended)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Replaces the Alex Vance demo profile completely with your real career history and verified achievements.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          importMode === 'merge'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-bold block">Merge alongside Demo</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Adds your imported roles alongside Alex Vance demo records (not recommended).
                        </span>
                      </button>
                    </>
                  ) : reconciliationSummary?.classification === 'same-person' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          importMode === 'merge'
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-bold block text-emerald-700 dark:text-emerald-400">
                          Update Profile (Recommended)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Intelligently reconciles existing roles and adds new evidence without deleting historical achievements or strategy settings.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          importMode === 'replace'
                            ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-bold block text-amber-700 dark:text-amber-400">
                          Replace Entire Profile
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Overwrites all existing roles and evidence with only the content on this résumé.
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          importMode === 'replace'
                            ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-bold block text-amber-700 dark:text-amber-400">
                          Replace Candidate Profile
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Replace active profile with the newly extracted candidate ({extractedData.name}).
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          importMode === 'merge'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-bold block">Merge into Active Profile</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Append roles & evidence into active profile ({currentProfile.name}).
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Cancel
          </button>
          {!extractedData ? (
            <button
              type="button"
              onClick={handleParse}
              disabled={isParsing}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {isParsing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{currentProgressStep}</span>
                </>
              ) : (
                'Extract Candidate Details'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={!isExtractionValid}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconCheckCircle className="w-4 h-4" />
              <span>
                {isDemoCandidate && importMode === 'replace'
                  ? 'Replace Demo Candidate'
                  : reconciliationSummary?.classification === 'same-person' && importMode === 'merge'
                  ? 'Apply Profile Updates'
                  : importMode === 'replace'
                  ? 'Replace Candidate Profile'
                  : 'Confirm & Save to Profile'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
