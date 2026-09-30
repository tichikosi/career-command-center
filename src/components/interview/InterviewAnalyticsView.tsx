'use client';

import React, { useState } from 'react';
import {
  IconTrendingUp as TrendingUp,
  IconActivity as Activity,
  IconMicrophone as Mic,
  IconFileText as FileText,
  IconLayers as Layers,
  IconAward as Award,
} from '@/components/icons';
import { InterviewSession } from '@/types/interview';

export interface InterviewAnalyticsViewProps {
  sessions: InterviewSession[];
  prepCompletenessScore?: number;
  opportunityTitle?: string;
  opportunityCompany?: string;
  onClose?: () => void;
}

export const InterviewAnalyticsView: React.FC<InterviewAnalyticsViewProps> = ({
  sessions,
  prepCompletenessScore = 85,
  opportunityTitle = 'Target Role',
  opportunityCompany = 'Target Company',
}) => {
  const [filterCount, setFilterCount] = useState<'5' | '10' | 'all'>('5');
  const [compareSessionAId, setCompareSessionAId] = useState<string>(sessions[0]?.id || '');
  const [compareSessionBId, setCompareSessionBId] = useState<string>(sessions[1]?.id || sessions[0]?.id || '');

  // Filtered sessions sorted chronologically (oldest to newest for trend view)
  const filteredSessions = React.useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    if (filterCount === '5') return sorted.slice(-5);
    if (filterCount === '10') return sorted.slice(-10);
    return sorted;
  }, [sessions, filterCount]);

  // Aggregate stats: strictly isolate sessions with valid voice delivery metrics
  const totalSessions = sessions.length;
  const voiceDeliverySessions = sessions.filter(
    (s) => typeof s.averageDeliveryScore === 'number' && s.averageDeliveryScore > 0
  );
  const voicePaceSessions = sessions.filter(
    (s) => typeof s.averageWordsPerMinute === 'number' && s.averageWordsPerMinute > 0
  );

  const avgContentScore = totalSessions > 0
    ? Math.round(
        sessions.reduce((acc, s) => acc + (s.averageContentScore ?? s.overallScore), 0) /
          totalSessions
      )
    : 0;

  const avgDeliveryScore = voiceDeliverySessions.length > 0
    ? Math.round(
        voiceDeliverySessions.reduce((acc, s) => acc + (s.averageDeliveryScore || 0), 0) /
          voiceDeliverySessions.length
      )
    : 0;

  const avgWpm = voicePaceSessions.length > 0
    ? Math.round(
        voicePaceSessions.reduce((acc, s) => acc + (s.averageWordsPerMinute || 0), 0) /
          voicePaceSessions.length
      )
    : 0;

  const avgFillerRate = voicePaceSessions.length > 0
    ? Math.round(
        (voicePaceSessions.reduce((acc, s) => acc + (s.averageFillerRate || 0), 0) /
          voicePaceSessions.length) *
          10
      ) / 10
    : 0;

  // Selected comparison sessions
  const sessionA = sessions.find((s) => s.id === compareSessionAId) || sessions[0];
  const sessionB = sessions.find((s) => s.id === compareSessionBId) || sessions[1] || sessions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Interview Performance & Delivery Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {opportunityTitle} at {opportunityCompany} • {totalSessions} total saved session{totalSessions === 1 ? '' : 's'}
          </p>
        </div>

        {/* Filter scope buttons */}
        <div className="flex items-center space-x-1.5 rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterCount('5')}
            className={`rounded px-2.5 py-1 font-medium transition-all ${
              filterCount === '5'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 5
          </button>
          <button
            type="button"
            onClick={() => setFilterCount('10')}
            className={`rounded px-2.5 py-1 font-medium transition-all ${
              filterCount === '10'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 10
          </button>
          <button
            type="button"
            onClick={() => setFilterCount('all')}
            className={`rounded px-2.5 py-1 font-medium transition-all ${
              filterCount === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Sessions
          </button>
        </div>
      </div>

      {/* Tripartite Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Interview Prep Readiness */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-medium">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>Prep Readiness</span>
            </span>
            <span className="rounded bg-blue-950/60 px-1.5 py-0.5 text-[10px] text-blue-300 border border-blue-800/40">
              Brief
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-100">{prepCompletenessScore}%</span>
            <span className="text-xs text-slate-400">brief completeness</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Strategic alignment across mandate, STAR stories, objections, and company questions.
          </p>
        </div>

        {/* 2. Mock Interview Content Performance */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-medium">
              <Award className="h-3.5 w-3.5 text-emerald-400" />
              <span>Content Performance</span>
            </span>
            <span className="rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] text-emerald-300 border border-emerald-800/40">
              6 Dimensions
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400">{avgContentScore}%</span>
            <span className="text-xs text-slate-400">avg content score</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Relevance, evidence specificity, strategic depth, and executive communication.
          </p>
        </div>

        {/* 3. Voice Delivery Performance */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-medium">
              <Mic className="h-3.5 w-3.5 text-indigo-400" />
              <span>Voice Delivery</span>
            </span>
            <span className="rounded bg-indigo-950/60 px-1.5 py-0.5 text-[10px] text-indigo-300 border border-indigo-800/40">
              Speech
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-indigo-400">
              {avgDeliveryScore > 0 ? `${avgDeliveryScore}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-400">
              {avgWpm > 0 ? `${avgWpm} WPM • ${avgFillerRate} fillers/m` : 'No voice sessions'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Observable pace cadence, verbal concision, filler control, and composure.
          </p>
        </div>
      </div>

      {/* Historical Trend Timeline */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
            <span>Score & Delivery Progression</span>
          </h4>
          <span className="text-[11px] text-slate-500">
            Showing {filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'}
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No completed mock interview sessions yet. Complete your first mock practice to view trends.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session, idx) => {
              const isVoice = session.answerMode === 'voice' || session.averageWordsPerMinute;
              const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-200 capitalize">
                          {session.mode} Mode
                        </span>
                        <span className="text-[10px] text-slate-500">({session.difficulty})</span>
                        {isVoice ? (
                          <span className="inline-flex items-center rounded bg-indigo-950 px-1.5 py-0.2 text-[10px] text-indigo-300 border border-indigo-800/40">
                            <Mic className="mr-1 h-2.5 w-2.5" /> Voice
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400">
                            Text
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Score Badges */}
                    <div className="text-right">
                      <div className="font-bold text-slate-100 text-sm">
                        {session.overallScore}%
                      </div>
                      <div className="text-[10px] text-slate-400">Overall</div>
                    </div>

                    {isVoice && session.averageWordsPerMinute && (
                      <div className="hidden sm:block text-right">
                        <div className="font-mono text-xs text-indigo-300">
                          {session.averageWordsPerMinute} <span className="text-[10px]">WPM</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {session.averageFillerRate ?? 0} fillers/m
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-Session Comparison Tool */}
      {sessions.length >= 2 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Two-Session Side-by-Side Comparison</span>
            </h4>
          </div>

          {/* Session Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Session A (Baseline)</label>
              <select
                value={compareSessionAId}
                onChange={(e) => setCompareSessionAId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {sessions.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    Session #{i + 1} ({s.mode}, {s.overallScore}%) — {new Date(s.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Session B (Comparison)</label>
              <select
                value={compareSessionBId}
                onChange={(e) => setCompareSessionBId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {sessions.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    Session #{i + 1} ({s.mode}, {s.overallScore}%) — {new Date(s.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Delta Table */}
          {sessionA && sessionB && (() => {
            const hasVoiceA = sessionA.answerMode === 'voice' || sessionA.answerMode === 'hybrid' || (typeof sessionA.averageWordsPerMinute === 'number' && sessionA.averageWordsPerMinute > 0);
            const hasVoiceB = sessionB.answerMode === 'voice' || sessionB.answerMode === 'hybrid' || (typeof sessionB.averageWordsPerMinute === 'number' && sessionB.averageWordsPerMinute > 0);

            const personaLabels: Record<string, string> = {
              recruiter: 'Recruiter',
              hiring_manager: 'Hiring Manager',
              executive: 'Executive / VP',
              behavioral: 'Behavioral Coach',
              peer: 'Peer / Tech Lead',
            };

            const formatLabels: Record<string, string> = {
              practice: 'Practice Mode',
              timed: 'Timed Screen',
              full: 'Full Loop',
              live: 'Live Simulation',
            };

            const modalityA = sessionA.answerMode === 'voice' ? 'Voice' : sessionA.answerMode === 'hybrid' ? 'Mixed' : hasVoiceA ? 'Voice' : 'Text';
            const modalityB = sessionB.answerMode === 'voice' ? 'Voice' : sessionB.answerMode === 'hybrid' ? 'Mixed' : hasVoiceB ? 'Voice' : 'Text';

            return (
              <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-slate-900/80 p-2.5 font-semibold text-slate-300 border-b border-slate-800">
                  <div>Metric / Configuration</div>
                  <div className="text-center">Session A</div>
                  <div className="text-center">Session B (Delta)</div>
                </div>

                {/* Format / Mode */}
                <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                  <span className="font-medium text-slate-300">Format</span>
                  <span className="text-center text-slate-400 capitalize">{formatLabels[sessionA.mode] || sessionA.mode}</span>
                  <span className="text-center text-slate-200 capitalize">{formatLabels[sessionB.mode] || sessionB.mode}</span>
                </div>

                {/* Interviewer Persona */}
                <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                  <span className="font-medium text-slate-300">Interviewer Persona</span>
                  <span className="text-center text-slate-400">{sessionA.interviewerPersona ? personaLabels[sessionA.interviewerPersona] || sessionA.interviewerPersona : 'General'}</span>
                  <span className="text-center text-slate-200">{sessionB.interviewerPersona ? personaLabels[sessionB.interviewerPersona] || sessionB.interviewerPersona : 'General'}</span>
                </div>

                {/* Modality */}
                <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                  <span className="font-medium text-slate-300">Modality</span>
                  <span className="text-center text-slate-400">{modalityA}</span>
                  <span className="text-center text-slate-200">{modalityB}</span>
                </div>

                {/* Overall Score */}
                <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                  <span className="font-medium text-slate-300">Overall Score</span>
                  <span className="text-center text-slate-200">{sessionA.overallScore}%</span>
                  <span className="text-center">
                    <span className="font-bold text-slate-100">{sessionB.overallScore}% </span>
                    {sessionB.overallScore !== sessionA.overallScore && (
                      <span
                        className={`text-[11px] font-medium ${
                          sessionB.overallScore > sessionA.overallScore
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        ({sessionB.overallScore > sessionA.overallScore ? '+' : ''}
                        {sessionB.overallScore - sessionA.overallScore}%)
                      </span>
                    )}
                  </span>
                </div>

                {/* Content Score */}
                {(sessionA.averageContentScore || sessionB.averageContentScore) && (
                  <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                    <span className="font-medium text-slate-300">Content Performance</span>
                    <span className="text-center text-slate-400">
                      {sessionA.averageContentScore ? `${sessionA.averageContentScore}%` : 'N/A'}
                    </span>
                    <span className="text-center text-slate-200">
                      {sessionB.averageContentScore ? `${sessionB.averageContentScore}%` : 'N/A'}
                    </span>
                  </div>
                )}

                {/* Voice Delivery Score */}
                <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                  <span className="font-medium text-slate-300">Voice Delivery Score</span>
                  <span className="text-center text-slate-400">
                    {hasVoiceA && typeof sessionA.averageDeliveryScore === 'number'
                      ? `${sessionA.averageDeliveryScore}%`
                      : 'N/A (Text-only)'}
                  </span>
                  <span className="text-center text-slate-200">
                    {hasVoiceB && typeof sessionB.averageDeliveryScore === 'number' ? (
                      <>
                        <span className="font-bold text-slate-100">{sessionB.averageDeliveryScore}% </span>
                        {hasVoiceA && typeof sessionA.averageDeliveryScore === 'number' && sessionB.averageDeliveryScore !== sessionA.averageDeliveryScore && (
                          <span
                            className={`text-[11px] font-medium ${
                              sessionB.averageDeliveryScore > sessionA.averageDeliveryScore
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          >
                            ({sessionB.averageDeliveryScore > sessionA.averageDeliveryScore ? '+' : ''}
                            {sessionB.averageDeliveryScore - sessionA.averageDeliveryScore}%)
                          </span>
                        )}
                      </>
                    ) : (
                      'N/A (Text-only)'
                    )}
                  </span>
                </div>

                {/* Speaking Pace (WPM) */}
                <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                  <span className="font-medium text-slate-300">Speaking Pace</span>
                  <span className="text-center text-slate-400">
                    {hasVoiceA && sessionA.averageWordsPerMinute ? `${sessionA.averageWordsPerMinute} WPM` : 'N/A (Text-only)'}
                  </span>
                  <span className="text-center text-slate-200">
                    {hasVoiceB && sessionB.averageWordsPerMinute ? `${sessionB.averageWordsPerMinute} WPM` : 'N/A (Text-only)'}
                  </span>
                </div>

                {/* Filler Rate */}
                <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60 items-center">
                  <span className="font-medium text-slate-300">Filler Rate</span>
                  <span className="text-center text-slate-400">
                    {hasVoiceA && sessionA.averageFillerRate !== undefined ? `${sessionA.averageFillerRate}/min` : 'N/A (Text-only)'}
                  </span>
                  <span className="text-center text-slate-200">
                    {hasVoiceB && sessionB.averageFillerRate !== undefined ? `${sessionB.averageFillerRate}/min` : 'N/A (Text-only)'}
                  </span>
                </div>

                {/* Questions Answered */}
                <div className="grid grid-cols-3 p-2.5 items-center">
                  <span className="font-medium text-slate-300">Questions Answered</span>
                  <span className="text-center text-slate-400">{sessionA.exchanges.length}</span>
                  <span className="text-center text-slate-200">{sessionB.exchanges.length}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
