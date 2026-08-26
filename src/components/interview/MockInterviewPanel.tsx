'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { JobOpportunity } from '@/types/opportunity';
import { CandidateProfile } from '@/types/candidate';
import {
  InterviewSession,
  MockInterviewExchange,
  MockDifficulty,
  MockAnswerScore,
  InterviewPreparation,
  OpportunityActivity,
} from '@/types/interview';
import {
  IconMicrophone,
  IconSparkles,
  IconArrowRight,
  IconTrash,
  IconClock,
  IconCheckCircle,
  IconAlertTriangle,
} from '@/components/icons';
import { formatShortDate } from '@/lib/dateUtils';

interface MockInterviewPanelProps {
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  activePrep?: InterviewPreparation | null;
  sessions: InterviewSession[];
  onSaveSession: (session: InterviewSession) => Promise<InterviewSession | null>;
  onDeleteSession: (id: string) => Promise<void>;
  onRecordActivity?: (activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OpportunityActivity | null>;
}

const TIMED_SCREEN_LIMIT_SECONDS = 90;

const FORMAT_CONFIG: Record<'practice' | 'timed' | 'full', { label: string; desc: string }> = {
  practice: {
    label: 'Practice Mode',
    desc: 'No timer. Best for developing STAR structure, testing proof points, and refining coaching.',
  },
  timed: {
    label: 'Timed Screen',
    desc: '90s countdown timer per question. Simulates high-velocity recruiter and screening interviews.',
  },
  full: {
    label: 'Full Loop',
    desc: 'Multi-round simulation: Recruiter Screen, Hiring Manager, Leadership, and Executive Strategy.',
  },
};

const DIFFICULTY_CONFIG: Record<'standard' | 'rigorous' | 'stress_test', { label: string; desc: string }> = {
  standard: {
    label: 'Standard Bar',
    desc: 'Normal interview bar with balanced evaluation of relevance, structure, and evidence.',
  },
  rigorous: {
    label: 'Rigorous / VP Level',
    desc: 'VP/Executive bar requiring strategic altitude, quantified metrics, and trade-off articulation.',
  },
  stress_test: {
    label: 'Stress Test',
    desc: 'High-rigor simulation with probing follow-ups, scrutiny of vague statements, and strict scoring.',
  },
};

function getQuestionPlaceholder(category: string, qText: string, mode: string) {
  if (mode === 'timed') {
    return 'Type your concise answer or bulleted speaking points under time pressure...';
  }
  const lower = qText.toLowerCase();
  if (category === 'behavioral' || lower.includes('tell me about') || lower.includes('describe a time') || lower.includes('led a')) {
    return 'Answer in STAR format (Situation, Task, Action, Result) with concrete metrics and verifiable outcomes...';
  }
  if (category === 'strategic' || lower.includes('strategy') || lower.includes('trade-off') || lower.includes('prioritize') || lower.includes('30-60-90')) {
    return 'Lead with your executive recommendation, then support with 2–3 structured proof points and trade-offs...';
  }
  if (category === 'culture' || lower.includes('why') || lower.includes('pitch') || lower.includes('compensation') || lower.includes('transition')) {
    return 'Connect your executive trajectory, leadership model, and specific strategic motivation for this opportunity...';
  }
  return 'State your bottom-line conclusion first, followed by concrete evidence and operational logic...';
}

function getQuestionGuidanceLabel(category: string, qText: string, mode: string) {
  if (mode === 'timed') {
    return 'Your Answer (Concise speaking points or executive summary):';
  }
  const lower = qText.toLowerCase();
  if (category === 'behavioral' || lower.includes('tell me about') || lower.includes('describe a time')) {
    return 'Your Answer (STAR format recommended):';
  }
  if (category === 'strategic' || lower.includes('strategy') || lower.includes('trade-off')) {
    return 'Your Answer (Recommendation & strategic trade-offs):';
  }
  if (category === 'culture' || lower.includes('why') || lower.includes('pitch')) {
    return 'Your Answer (Executive positioning & alignment):';
  }
  return 'Your Answer (Bottom-line first delivery):';
}

export function MockInterviewPanel({
  opportunity,
  candidate,
  activePrep,
  sessions,
  onSaveSession,
  onDeleteSession,
  onRecordActivity,
}: MockInterviewPanelProps) {
  // Session Configuration State
  const [sessionActive, setSessionActive] = useState(false);
  const [mode, setMode] = useState<'practice' | 'timed' | 'full'>('practice');
  const [difficulty, setDifficulty] = useState<MockDifficulty>('standard');
  const [questions, setQuestions] = useState<Array<{ id: string; question: string; category: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);

  // Timed Screen Timer State
  const [timeRemaining, setTimeRemaining] = useState(TIMED_SCREEN_LIMIT_SECONDS);
  const [answerDuration, setAnswerDuration] = useState(0);

  // Current session exchanges
  const [exchanges, setExchanges] = useState<MockInterviewExchange[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<{
    score: MockAnswerScore;
    coaching: { strengths: string[]; improvements: string[]; improvedAnswer?: string };
    evidenceCitations: string[];
    executionMode: 'gemini' | 'deterministic';
    actualModel: string;
  } | null>(null);

  // Completed Session Modal or View
  const [completedSession, setCompletedSession] = useState<InterviewSession | null>(null);
  const [viewingPastSession, setViewingPastSession] = useState<InterviewSession | null>(null);
  const [expandedReviewQuestions, setExpandedReviewQuestions] = useState<Record<number, boolean>>({});

  // Timer effect for tracking answer duration across all modes, and countdown in Timed Screen
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (sessionActive && !currentEvaluation && !isEvaluating) {
      timer = setInterval(() => {
        if (mode === 'timed') {
          setTimeRemaining((prev) => prev - 1);
        }
        setAnswerDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sessionActive, mode, currentEvaluation, isEvaluating]);

  // Elapsed timer during AI operations for latency feedback
  useEffect(() => {
    let elapsedTimer: NodeJS.Timeout | null = null;
    if (isGeneratingQuestions || isEvaluating) {
      elapsedTimer = setInterval(() => {
        setGenerationElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (elapsedTimer) clearInterval(elapsedTimer);
    };
  }, [isGeneratingQuestions, isEvaluating]);

  // Start Session
  const handleStartSession = async () => {
    setIsGeneratingQuestions(true);
    setGenerationElapsed(0);
    setStartError(null);
    try {
      const res = await fetch('/api/interview/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_questions',
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            company: opportunity.company,
            rawJobDescription: opportunity.rawJobDescription,
          },
          candidateSnapshot: candidate,
          difficulty,
          mode,
        }),
      });

      const data = await res.json();
      if (data.success && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setExchanges([]);
        setCurrentAnswer('');
        setCurrentEvaluation(null);
        setTimeRemaining(TIMED_SCREEN_LIMIT_SECONDS);
        setAnswerDuration(0);
        setSessionActive(true);
      } else {
        throw new Error(data.error || 'Failed to generate mock interview questions.');
      }
    } catch (err: unknown) {
      console.error('[MockInterviewPanel] Start error:', err);
      setStartError(err instanceof Error ? err.message : 'Failed to initiate mock interview session.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Submit Answer for AI Evaluation
  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || isEvaluating) return;
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    const finalDuration = answerDuration;
    setIsEvaluating(true);
    setGenerationElapsed(0);
    try {
      const res = await fetch('/api/interview/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          question: activeQ.question,
          questionCategory: activeQ.category,
          candidateAnswer: currentAnswer.trim(),
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            company: opportunity.company,
            rawJobDescription: opportunity.rawJobDescription,
          },
          candidateSnapshot: candidate,
          difficulty,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        const evalResult = data.evaluation;
        setCurrentEvaluation(evalResult);

        // Derive round details for Full Loop mode
        let roundName = 'Practice';
        let roundNumber = 1;
        if (mode === 'full') {
          roundNumber = Math.min(4, Math.floor(currentIndex / 2) + 1);
          const roundNames = ['Recruiter Screen', 'Hiring Manager', 'Leadership', 'Executive Strategy'];
          roundName = roundNames[roundNumber - 1] || 'Executive Strategy';
        }

        const newExchange: MockInterviewExchange = {
          questionId: activeQ.id,
          question: activeQ.question,
          questionCategory: activeQ.category,
          candidateAnswer: currentAnswer.trim(),
          score: evalResult.score,
          coaching: evalResult.coaching,
          evidenceCitations: evalResult.evidenceCitations || [],
          answeredAt: new Date().toISOString(),
          durationSeconds: finalDuration,
          isOvertime: mode === 'timed' ? finalDuration > TIMED_SCREEN_LIMIT_SECONDS : undefined,
          roundName: mode === 'full' ? roundName : undefined,
          roundNumber: mode === 'full' ? roundNumber : undefined,
          totalRounds: mode === 'full' ? 4 : undefined,
        };

        setExchanges((prev) => [...prev, newExchange]);
      }
    } catch (err) {
      console.error('[MockInterviewPanel] Evaluate error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Next Question or Finish Session
  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentAnswer('');
      setCurrentEvaluation(null);
      setTimeRemaining(TIMED_SCREEN_LIMIT_SECONDS);
      setAnswerDuration(0);
    } else {
      // Finish session
      await finalizeSession(exchanges);
    }
  };

  const finalizeSession = async (allExchanges: MockInterviewExchange[]) => {
    const totalDimScore = allExchanges.reduce((sum, e) => {
      const s = e.score;
      const avg = (s.relevance + s.evidenceSpecificity + s.strategicDepth + s.executiveCommunication + s.structure + s.concision) / 6;
      return sum + avg;
    }, 0);

    const overallScore = Math.round((totalDimScore / (allExchanges.length || 1)) * 20);

    // Calculate average answer time for timed screen
    const timedExchanges = allExchanges.filter((e) => typeof e.durationSeconds === 'number');
    const averageDurationSeconds = timedExchanges.length > 0
      ? Math.round(timedExchanges.reduce((acc, e) => acc + (e.durationSeconds || 0), 0) / timedExchanges.length)
      : undefined;

    const sessionObj: InterviewSession = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: opportunity.id,
      prepId: activePrep?.id,
      mode,
      difficulty,
      exchanges: allExchanges,
      overallScore,
      averageDurationSeconds,
      roundsCompleted: mode === 'full' ? 4 : undefined,
      totalRounds: mode === 'full' ? 4 : undefined,
      summary: `Completed ${allExchanges.length} questions across behavioral and strategic dimensions with an overall rating of ${overallScore}%.`,
      strengths: ['Evidence grounding', 'Clear STAR delivery'],
      improvementAreas: ['Continue to sharpen quantified impact'],
      requestedModel: 'gemini-3.7-flash',
      actualModel: currentEvaluation?.actualModel || 'gemini-3.7-flash',
      executionMode: currentEvaluation?.executionMode || 'gemini',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await onSaveSession(sessionObj);

    if (onRecordActivity) {
      const formatLabel = FORMAT_CONFIG[mode]?.label || mode;
      const diffLabel = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || difficulty;
      await onRecordActivity({
        opportunityId: opportunity.id,
        activityType: 'mock_session_completed',
        title: `Mock Interview Completed (${overallScore}%) • ${formatLabel}`,
        notes: `Simulated ${allExchanges.length} questions on ${diffLabel} (${formatLabel}). Overall score: ${overallScore}/100.`,
        occurredAt: new Date().toISOString(),
        source: 'user',
        metadata: { overallScore, difficulty, mode, averageDurationSeconds },
      });
    }

    setCompletedSession(sessionObj);
    setSessionActive(false);
  };

  const currentQ = questions[currentIndex];

  // Helper formatting for seconds to MM:SS
  const formatTimerDisplay = (seconds: number) => {
    const isNegative = seconds < 0;
    const absSec = Math.abs(seconds);
    const mins = Math.floor(absSec / 60);
    const secs = absSec % 60;
    return `${isNegative ? '+' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentRoundNum = mode === 'full' ? Math.min(4, Math.floor(currentIndex / 2) + 1) : 1;
  const roundTitles = ['Recruiter Screen', 'Hiring Manager Functional', 'Leadership & Behavioral', 'Executive Strategy'];
  const currentRoundTitle = mode === 'full' ? roundNames(currentRoundNum) : undefined;

  function roundNames(num: number): string {
    return roundTitles[num - 1] || 'Executive Strategy';
  }

  return (
    <div className="space-y-6">
      {/* Header & Two-Axis Configuration */}
      <div className="bg-gradient-to-r from-violet-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/10 rounded-lg">
                <IconMicrophone className="w-5 h-5 text-violet-300" />
              </span>
              <h3 className="text-lg font-bold">Interactive Mock Interview Simulator</h3>
            </div>
            <p className="text-xs text-violet-200 max-w-xl">
              Real-time executive interview practice evaluated across 6 dimensions with evidence verification and grounded STAR coaching.
            </p>
          </div>

          {!sessionActive && (
            <button
              onClick={handleStartSession}
              disabled={isGeneratingQuestions}
              className="px-5 py-2.5 bg-white text-violet-950 font-bold rounded-xl text-xs hover:bg-violet-50 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              <IconSparkles className="w-4 h-4 text-violet-600" />
              <span>{isGeneratingQuestions ? 'Preparing Mock Session...' : 'Start Mock Session'}</span>
            </button>
          )}
        </div>

        {/* Two-Axis Configuration Bar (When session not active) */}
        {!sessionActive && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Axis 1: Session Format */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
                  Axis 1: Session Format
                </span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'practice' | 'timed' | 'full')}
                  className="bg-slate-900 text-white border border-white/20 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                >
                  <option value="practice">Practice Mode</option>
                  <option value="timed">Timed Screen (90s)</option>
                  <option value="full">Full Loop (4 Rounds)</option>
                </select>
              </div>
              <p className="text-[11px] text-violet-200 leading-snug">
                {FORMAT_CONFIG[mode]?.desc}
              </p>
            </div>

            {/* Axis 2: Difficulty / Interviewer Bar */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
                  Axis 2: Difficulty / Interviewer Bar
                </span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as MockDifficulty)}
                  className="bg-slate-900 text-white border border-white/20 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                >
                  <option value="standard">Standard Bar</option>
                  <option value="rigorous">Rigorous (VP Level)</option>
                  <option value="stress_test">Stress Test</option>
                </select>
              </div>
              <p className="text-[11px] text-violet-200 leading-snug">
                {DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG]?.desc || DIFFICULTY_CONFIG.standard.desc}
              </p>
            </div>
          </div>
        )}

        {/* Start Error Banner */}
        {startError && (
          <div className="p-3 bg-rose-500/20 border border-rose-400 text-white text-xs rounded-xl flex items-center justify-between">
            <span>{startError}</span>
            <button onClick={() => setStartError(null)} className="underline text-[11px]">Dismiss</button>
          </div>
        )}

        {/* Latency Threshold Banner */}
        {isGeneratingQuestions && generationElapsed >= 4 && (
          <div className="text-[11px] text-violet-300 bg-white/10 p-2.5 rounded-lg flex items-center gap-2">
            <IconClock className="w-3.5 h-3.5 animate-spin text-violet-400" />
            <span>Generating role-specific questions and executive coaching criteria... ({generationElapsed}s)</span>
          </div>
        )}
      </div>

      {/* Active Mock Session UI */}
      {sessionActive && currentQ && (
        <Card padding="lg" className="space-y-6 border-2 border-indigo-500/40">
          {/* Header Strip with Accurate Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                {FORMAT_CONFIG[mode]?.label}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300">
                {DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || difficulty}
              </span>
              {mode === 'full' && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    Round {currentRoundNum} of 4: {currentRoundTitle}
                  </span>
                </>
              )}
            </div>

            {/* Timed Screen Countdown Display */}
            {mode === 'timed' && (
              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs transition-colors ${
                    timeRemaining <= 0
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 animate-pulse'
                      : timeRemaining < 15
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-200 border border-rose-300 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <IconClock className="w-3.5 h-3.5" />
                  <span>
                    {timeRemaining <= 0 ? 'Overtime: ' : 'Time Remaining: '}
                    {formatTimerDisplay(timeRemaining)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="capitalize font-bold text-slate-700 dark:text-slate-300">{currentQ.category} Dimension</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Display */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Interviewer Question ({currentIndex + 1}/{questions.length})</span>
              {mode === 'practice' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Low-Pressure Practice</span>
              )}
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">{currentQ.question}</h4>
          </div>

          {/* Answer Input or Evaluated Feedback */}
          {!currentEvaluation ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {getQuestionGuidanceLabel(currentQ.category, currentQ.question, mode)}
                </label>
                {mode === 'timed' && timeRemaining <= 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Time expired — finalize your thought and submit.
                  </span>
                )}
              </div>

              <textarea
                rows={6}
                placeholder={getQuestionPlaceholder(currentQ.category, currentQ.question, mode)}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                  {mode !== 'timed' && ` • Elapsed: ${answerDuration}s`}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionActive(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancel Session
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim() || isEvaluating}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <IconSparkles className="w-3.5 h-3.5" />
                    <span>{isEvaluating ? 'Evaluating Answer...' : 'Submit Answer for AI Score'}</span>
                  </button>
                </div>
              </div>

              {isEvaluating && generationElapsed >= 4 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-xs rounded-xl flex items-center gap-2 animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Evaluating answer across 6 dimensions & matching candidate evidence... ({generationElapsed}s)</span>
                </div>
              )}
            </div>
          ) : (
            /* Evaluation Results */
            <div className="space-y-6 animate-in fade-in duration-200">
              {currentEvaluation.executionMode === 'deterministic' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-xl">
                  <strong>Simplified Interview Coaching</strong> — live Gemini API was unreachable; evaluated using heuristic structural rubric.
                </div>
              )}

              {/* 6 Dimension Score Bars */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Score Dimensions (1-5 Scale) • {DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || difficulty}
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(currentEvaluation.score).map(([dim, val]) => {
                    const dimLabel: Record<string, string> = {
                      relevance: 'Relevance',
                      evidenceSpecificity: 'Evidence Specificity',
                      strategicDepth: 'Strategic Depth',
                      executiveCommunication: 'Executive Comms',
                      structure: 'STAR / Structure',
                      concision: 'Concision',
                    };
                    return (
                      <div key={dim} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {dimLabel[dim] || dim}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{val}/5</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              val >= 4 ? 'bg-emerald-500' : val === 3 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${(val / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stress Test Pressure Probe */}
              {difficulty === 'stress_test' && (
                <div className="p-3.5 bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-violet-900 dark:text-violet-200 uppercase text-[10px] tracking-wider">
                    <IconAlertTriangle className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Stress Test Pressure Probe (Executive Follow-Up)</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    &ldquo;What was the single greatest downside risk or operational vulnerability in that decision, and what would you do differently if budget was cut in half?&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    In executive loops, interviewers test whether your claims hold up when cross-examined on accountability and macro factors.
                  </p>
                </div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <IconCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Strengths Identified</span>
                  </span>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    {currentEvaluation.coaching.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                  <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Areas for Executive Refinement</span>
                  </span>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    {currentEvaluation.coaching.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Improved Answer Framing */}
              {currentEvaluation.coaching.improvedAnswer && (
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl text-xs space-y-1.5">
                  <strong className="text-indigo-800 dark:text-indigo-300 font-bold block">
                    Suggested Grounded Answer Framework:
                  </strong>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {currentEvaluation.coaching.improvedAnswer}
                  </p>
                </div>
              )}

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                >
                  <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Mock Session'}</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Session History */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Saved Mock Interview Sessions ({sessions.length})
        </h4>

        {sessions.length === 0 ? (
          <Card padding="md" className="text-center py-6 text-xs text-slate-500">
            No mock interview sessions recorded yet. Click &quot;Start Mock Session&quot; to practice.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map((sess) => {
              const formatLabel = FORMAT_CONFIG[sess.mode]?.label || sess.mode;
              const diffLabel = DIFFICULTY_CONFIG[sess.difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || sess.difficulty;

              return (
                <Card key={sess.id} padding="md" className="space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Score: {sess.overallScore}%
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {formatLabel}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          {diffLabel}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {formatShortDate(sess.createdAt)} • {sess.exchanges?.length || 0} questions
                        {typeof sess.averageDurationSeconds === 'number' && ` • Avg ${sess.averageDurationSeconds}s/ans`}
                        {sess.mode === 'full' && ` • 4 Rounds`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setExpandedReviewQuestions({ 0: true });
                          setViewingPastSession(sess);
                        }}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => onDeleteSession(sess.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Session"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {sess.summary}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal for Past Session */}
      {viewingPastSession && (
        <Modal
          isOpen={Boolean(viewingPastSession)}
          onClose={() => setViewingPastSession(null)}
          title={`Mock Session Review · ${viewingPastSession.overallScore}% Session Score`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Top Session Score & Config Summary Strip */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold text-sm">
                    {viewingPastSession.overallScore}% Overall Score
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase">
                    {FORMAT_CONFIG[viewingPastSession.mode]?.label || viewingPastSession.mode}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold text-[10px] uppercase">
                    {DIFFICULTY_CONFIG[viewingPastSession.difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || viewingPastSession.difficulty}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Conducted: {formatShortDate(viewingPastSession.createdAt)}</span>
                  {typeof viewingPastSession.averageDurationSeconds === 'number' && (
                    <span> • Avg Response: {viewingPastSession.averageDurationSeconds}s</span>
                  )}
                </div>
              </div>

              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {viewingPastSession.summary}
              </p>
            </div>

            {/* Questions Transcript Accordion */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  Question Transcripts & Evaluations ({viewingPastSession.exchanges.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const allExpanded = viewingPastSession.exchanges.every((_, idx) => expandedReviewQuestions[idx]);
                    if (allExpanded) {
                      setExpandedReviewQuestions({});
                    } else {
                      const next: Record<number, boolean> = {};
                      viewingPastSession.exchanges.forEach((_, idx) => {
                        next[idx] = true;
                      });
                      setExpandedReviewQuestions(next);
                    }
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {viewingPastSession.exchanges.every((_, idx) => expandedReviewQuestions[idx]) ? 'Collapse All' : 'Expand All'}
                </button>
              </div>

              {viewingPastSession.exchanges.map((ex, i) => {
                const isExpanded = expandedReviewQuestions[i] ?? false;
                const scoreAvg = ex.score
                  ? Math.round(
                      ((ex.score.relevance +
                        ex.score.evidenceSpecificity +
                        ex.score.strategicDepth +
                        ex.score.executiveCommunication +
                        ex.score.structure +
                        ex.score.concision) /
                        30) *
                        100
                    )
                  : undefined;

                return (
                  <div
                    key={i}
                    className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-all"
                  >
                    {/* Collapsible Header */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedReviewQuestions((prev) => ({ ...prev, [i]: !prev[i] }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedReviewQuestions((prev) => ({ ...prev, [i]: !prev[i] }));
                        }
                      }}
                      className="p-3.5 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded text-[10px] shrink-0">
                          Q{i + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                          {ex.question}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {scoreAvg !== undefined && (
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              scoreAvg >= 75
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : scoreAvg >= 50
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {scoreAvg}% Score
                          </span>
                        )}
                        {typeof ex.durationSeconds === 'number' && (
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                            {ex.durationSeconds}s
                          </span>
                        )}
                        <span className="text-slate-400 text-xs font-mono">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Content Body */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                        {/* Candidate Answer */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Candidate Transcript
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                            {ex.candidateAnswer}
                          </p>
                        </div>

                        {/* Dimension Score Strip */}
                        {ex.score && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                            {Object.entries(ex.score).map(([dim, scoreVal]) => (
                              <div key={dim} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700/60 text-center">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block capitalize truncate">
                                  {dim.replace(/([A-Z])/g, ' $1')}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {scoreVal}/5
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Strengths & Improvements */}
                        {ex.coaching && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg space-y-1">
                              <span className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px] block">
                                Strengths
                              </span>
                              <ul className="space-y-0.5 text-slate-700 dark:text-slate-300 text-[11px]">
                                {ex.coaching.strengths.map((s, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-emerald-600 font-bold">•</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-lg space-y-1">
                              <span className="font-bold text-amber-900 dark:text-amber-300 text-[11px] block">
                                Areas for Executive Refinement
                              </span>
                              <ul className="space-y-0.5 text-slate-700 dark:text-slate-300 text-[11px]">
                                {ex.coaching.improvements.map((imp, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-amber-600 font-bold">•</span>
                                    <span>{imp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Improved Grounded Answer */}
                        {ex.coaching?.improvedAnswer && (
                          <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg space-y-1">
                            <strong className="text-indigo-800 dark:text-indigo-300 text-[11px] block">
                              Suggested Grounded Answer Framework:
                            </strong>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                              {ex.coaching.improvedAnswer}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Completion Modal for Current Session */}
      {completedSession && (
        <Modal
          isOpen={Boolean(completedSession)}
          onClose={() => setCompletedSession(null)}
          title={`Mock Session Completed — Score: ${completedSession.overallScore}%`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
              <strong className="text-emerald-900 dark:text-emerald-200 font-bold">Session Successfully Recorded!</strong>
              <p className="text-emerald-700 dark:text-emerald-300">{completedSession.summary}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setExpandedReviewQuestions({ 0: true });
                  setViewingPastSession(completedSession);
                  setCompletedSession(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                Review Full Transcript & Coaching
              </button>
              <button
                onClick={() => setCompletedSession(null)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
