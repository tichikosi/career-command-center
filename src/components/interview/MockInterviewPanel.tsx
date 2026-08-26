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
  MockDeliveryScore,
  MockVoiceCoaching,
  VoiceDeliveryMetrics,
  InterviewPreparation,
  OpportunityActivity,
  InterviewerPersona,
  AnswerMode,
  TranscriptSource,
} from '@/types/interview';
import {
  IconMicrophone,
  IconMicrophone as Mic,
  IconSparkles,
  IconArrowRight,
  IconTrash,
  IconClock,
  IconActivity as Activity,
  IconVolume as Volume2,
  IconTrendingUp as TrendingUp,
} from '@/components/icons';
import { formatShortDate } from '@/lib/dateUtils';
import { VoiceAnswerCapture } from './VoiceAnswerCapture';
import { InterviewAnalyticsView } from './InterviewAnalyticsView';

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

const FORMAT_CONFIG: Record<'practice' | 'timed' | 'full' | 'live', { label: string; desc: string }> = {
  practice: {
    label: 'Practice Mode',
    desc: 'Untimed. Test structured answers, review transcripts, try playback, and refine coaching.',
  },
  timed: {
    label: 'Timed Screen',
    desc: '90s countdown timer per question. Simulates high-velocity recruiter and screening interviews.',
  },
  full: {
    label: 'Full Loop',
    desc: 'Multi-round simulation: Recruiter Screen, Hiring Manager, Leadership, and Executive Strategy.',
  },
  live: {
    label: 'Live Simulation (Preview)',
    desc: 'Spoken conversational turn-taking with dynamic interviewer follow-ups and probes.',
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

const PERSONA_CONFIG: Record<InterviewerPersona, { label: string; desc: string }> = {
  recruiter: {
    label: 'Recruiter',
    desc: 'Focus on career transitions, motivations, compensation alignment, and high-level fit.',
  },
  hiring_manager: {
    label: 'Hiring Manager',
    desc: 'Functional excellence, operating model design, team execution, and architectural decisions.',
  },
  executive: {
    label: 'Executive / VP',
    desc: 'Strategic altitude, capital allocation, cross-functional friction, and executive trade-offs.',
  },
  behavioral: {
    label: 'Behavioral Interviewer',
    desc: 'Specific personal ownership, STAR evidence rigor, handling failure, and leadership culture.',
  },
  peer: {
    label: 'Peer / Tech Lead',
    desc: 'Collaborative rigor, system architecture trade-offs, and technical depth.',
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
  const [mode, setMode] = useState<'practice' | 'timed' | 'full' | 'live'>('practice');
  const [difficulty, setDifficulty] = useState<MockDifficulty>('standard');
  const [persona, setPersona] = useState<InterviewerPersona>('hiring_manager');
  const [answerMode, setAnswerMode] = useState<AnswerMode>('text');

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

  // Current session exchanges & evaluation
  const [exchanges, setExchanges] = useState<MockInterviewExchange[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<{
    score: MockAnswerScore;
    deliveryScore?: MockDeliveryScore;
    overallResponseScore: number;
    contentWeight: number;
    deliveryWeight: number;
    coaching: { strengths: string[]; improvements: string[]; improvedAnswer?: string };
    voiceCoaching?: MockVoiceCoaching;
    evidenceCitations: string[];
    executionMode: 'gemini' | 'deterministic';
    actualModel: string;
    metrics?: VoiceDeliveryMetrics;
    transcriptSource?: TranscriptSource;
  } | null>(null);

  // Completed Session Modal & Review View
  const [completedSession, setCompletedSession] = useState<InterviewSession | null>(null);
  const [viewingPastSession, setViewingPastSession] = useState<InterviewSession | null>(null);
  const [expandedReviewQuestions, setExpandedReviewQuestions] = useState<Record<number, boolean>>({});
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Timer effect for tracking answer duration across all modes, and countdown in Timed Screen
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (sessionActive && !currentEvaluation && !isEvaluating && answerMode === 'text') {
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
  }, [sessionActive, mode, currentEvaluation, isEvaluating, answerMode]);

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
          persona,
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

  // Submit Answer via Text
  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || isEvaluating) return;
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    await executeEvaluation(currentAnswer.trim(), 'text', undefined, 'text_typed');
  };

  // Submit Spoken Answer from Voice Capture
  const handleVoiceTranscriptReady = async (
    transcript: string,
    metrics: VoiceDeliveryMetrics,
    source: TranscriptSource
  ) => {
    setCurrentAnswer(transcript);
    await executeEvaluation(transcript, 'voice', metrics, source);
  };

  // Core Evaluation Handler
  const executeEvaluation = async (
    answerText: string,
    evalAnswerMode: AnswerMode,
    deliveryMetrics?: VoiceDeliveryMetrics,
    transcriptSource?: TranscriptSource
  ) => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    const finalDuration = deliveryMetrics?.durationSeconds ?? answerDuration;
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
          candidateAnswer: answerText,
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            company: opportunity.company,
            rawJobDescription: opportunity.rawJobDescription,
          },
          candidateSnapshot: candidate,
          difficulty,
          answerMode: evalAnswerMode,
          transcriptSource,
          deliveryMetrics,
          persona,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        const evalResult = data.evaluation;
        setCurrentEvaluation({
          ...evalResult,
          metrics: deliveryMetrics,
          transcriptSource,
        });

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
          candidateAnswer: answerText,
          score: evalResult.score,
          deliveryScore: evalResult.deliveryScore,
          overallResponseScore: evalResult.overallResponseScore,
          contentWeight: evalResult.contentWeight,
          deliveryWeight: evalResult.deliveryWeight,
          coaching: evalResult.coaching,
          voiceCoaching: evalResult.voiceCoaching,
          evidenceCitations: evalResult.evidenceCitations || [],
          answeredAt: new Date().toISOString(),
          durationSeconds: finalDuration,
          answerMode: evalAnswerMode,
          transcriptSource,
          deliveryMetrics,
          persona,
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
    // Calculate aggregate score
    const totalScore = allExchanges.reduce((sum, e) => {
      if (typeof e.overallResponseScore === 'number') {
        return sum + e.overallResponseScore;
      }
      const s = e.score;
      const rawPct = Math.round(
        ((s.relevance + s.evidenceSpecificity + s.strategicDepth + s.executiveCommunication + s.structure + s.concision) / 30) * 100
      );
      return sum + rawPct;
    }, 0);

    const overallScore = Math.round(totalScore / (allExchanges.length || 1));

    // Calculate voice delivery aggregates
    const voiceExchanges = allExchanges.filter((e) => e.deliveryMetrics);
    let averageWordsPerMinute: number | undefined;
    let averageFillerRate: number | undefined;
    let averageContentScore: number | undefined;
    let averageDeliveryScore: number | undefined;

    if (voiceExchanges.length > 0) {
      const totalWpm = voiceExchanges.reduce((acc, e) => acc + (e.deliveryMetrics?.wordsPerMinute || 0), 0);
      const totalFillers = voiceExchanges.reduce((acc, e) => acc + (e.deliveryMetrics?.fillerRatePerMinute || 0), 0);
      averageWordsPerMinute = Math.round(totalWpm / voiceExchanges.length);
      averageFillerRate = Math.round((totalFillers / voiceExchanges.length) * 10) / 10;

      const totalContent = allExchanges.reduce((acc, e) => {
        const sum = e.score.relevance + e.score.evidenceSpecificity + e.score.strategicDepth + e.score.executiveCommunication + e.score.structure + e.score.concision;
        return acc + Math.round((sum / 30) * 100);
      }, 0);
      averageContentScore = Math.round(totalContent / allExchanges.length);

      const totalDelivery = voiceExchanges.reduce((acc, e) => {
        if (!e.deliveryScore) return acc;
        const sum = e.deliveryScore.pace + e.deliveryScore.verbalConcision + e.deliveryScore.fillerControl + e.deliveryScore.pausing + e.deliveryScore.clarity + e.deliveryScore.executiveDelivery;
        return acc + Math.round((sum / 30) * 100);
      }, 0);
      averageDeliveryScore = Math.round(totalDelivery / voiceExchanges.length);
    }

    const timedExchanges = allExchanges.filter((e) => typeof e.durationSeconds === 'number');
    const averageDurationSeconds = timedExchanges.length > 0
      ? Math.round(timedExchanges.reduce((acc, e) => acc + (e.durationSeconds || 0), 0) / timedExchanges.length)
      : undefined;

    const hasVoice = voiceExchanges.length > 0;
    const hasText = allExchanges.some((e) => e.answerMode === 'text');
    const sessionAnswerMode = hasVoice && hasText ? 'hybrid' : hasVoice ? 'voice' : 'text';

    const sessionObj: InterviewSession = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: opportunity.id,
      prepId: activePrep?.id,
      mode,
      difficulty,
      interviewerPersona: persona,
      answerMode: sessionAnswerMode,
      exchanges: allExchanges,
      overallScore,
      averageDurationSeconds,
      averageWordsPerMinute,
      averageFillerRate,
      averageContentScore,
      averageDeliveryScore,
      roundsCompleted: mode === 'full' ? 4 : undefined,
      totalRounds: mode === 'full' ? 4 : undefined,
      summary: `Completed ${allExchanges.length} questions with an overall score of ${overallScore}%. ${
        averageWordsPerMinute ? `Average speaking pace: ${averageWordsPerMinute} WPM.` : ''
      }`,
      strengths: ['Evidence grounding', 'Structured delivery'],
      improvementAreas: ['Continue to sharpen quantified trade-offs'],
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
        metadata: { overallScore, difficulty, mode, averageDurationSeconds, answerMode: sessionAnswerMode },
      });
    }

    setCompletedSession(sessionObj);
    setSessionActive(false);
  };

  const currentQ = questions[currentIndex];

  const formatTimerDisplay = (seconds: number) => {
    const isNegative = seconds < 0;
    const absSec = Math.abs(seconds);
    const mins = Math.floor(absSec / 60);
    const secs = absSec % 60;
    return `${isNegative ? '+' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentRoundNum = mode === 'full' ? Math.min(4, Math.floor(currentIndex / 2) + 1) : 1;
  const roundTitles = ['Recruiter Screen', 'Hiring Manager Functional', 'Leadership & Behavioral', 'Executive Strategy'];
  const currentRoundTitle = mode === 'full' ? roundTitles[currentRoundNum - 1] || 'Executive Strategy' : undefined;

  return (
    <div className="space-y-6">
      {/* Header & Configuration Bar */}
      <div className="bg-gradient-to-r from-violet-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/10 rounded-lg">
                <IconMicrophone className="w-5 h-5 text-violet-300" />
              </span>
              <h3 className="text-lg font-bold">Voice Interview Intelligence & Simulator</h3>
            </div>
            <p className="text-xs text-violet-200 max-w-xl">
              Rehearse executive answers via speech or text. Evaluated across 6 content dimensions, 6 delivery metrics (WPM, fillers, pace), and tailored interviewer personas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {sessions.length > 0 && !sessionActive && (
              <button
                type="button"
                onClick={() => setShowAnalyticsModal(true)}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-white/20"
              >
                <Activity className="w-4 h-4 text-indigo-300" />
                <span>Analytics & Trends</span>
              </button>
            )}

            {!sessionActive && (
              <button
                onClick={handleStartSession}
                disabled={isGeneratingQuestions}
                className="px-5 py-2.5 bg-white text-violet-950 font-bold rounded-xl text-xs hover:bg-violet-50 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <IconSparkles className="w-4 h-4 text-violet-600" />
                <span>{isGeneratingQuestions ? 'Preparing Mock Session...' : 'Start Mock Session'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Configuration Bars (When session not active) */}
        {!sessionActive && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Format */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                Format
              </span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'practice' | 'timed' | 'full' | 'live')}
                className="w-full bg-slate-900 text-white border border-white/20 rounded-lg p-1.5 text-xs focus:outline-none"
              >
                <option value="practice">Practice Mode</option>
                <option value="timed">Timed Screen (90s)</option>
                <option value="full">Full Loop (4 Rounds)</option>
                <option value="live">Live Simulation (Preview)</option>
              </select>
              <p className="text-[10px] text-violet-200 truncate">{FORMAT_CONFIG[mode]?.desc}</p>
            </div>

            {/* 2. Difficulty */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                Interviewer Bar
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as MockDifficulty)}
                className="w-full bg-slate-900 text-white border border-white/20 rounded-lg p-1.5 text-xs focus:outline-none"
              >
                <option value="standard">Standard Bar</option>
                <option value="rigorous">Rigorous (VP Level)</option>
                <option value="stress_test">Stress Test</option>
              </select>
              <p className="text-[10px] text-violet-200 truncate">
                {DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG]?.desc}
              </p>
            </div>

            {/* 3. Persona */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                Persona
              </span>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as InterviewerPersona)}
                className="w-full bg-slate-900 text-white border border-white/20 rounded-lg p-1.5 text-xs focus:outline-none"
              >
                <option value="hiring_manager">Hiring Manager</option>
                <option value="executive">Executive / VP</option>
                <option value="recruiter">Recruiter</option>
                <option value="behavioral">Behavioral Coach</option>
                <option value="peer">Peer / Tech Lead</option>
              </select>
              <p className="text-[10px] text-violet-200 truncate">{PERSONA_CONFIG[persona]?.desc}</p>
            </div>

            {/* 4. Preferred Answer Mode Toggle */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                Answer Mode
              </span>
              <div className="flex items-center rounded-lg bg-slate-900 p-1 border border-white/20">
                <button
                  type="button"
                  onClick={() => setAnswerMode('text')}
                  className={`flex-1 py-1 text-xs font-semibold rounded text-center transition-all ${
                    answerMode === 'text'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Type
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerMode('voice')}
                  className={`flex-1 py-1 text-xs font-semibold rounded text-center transition-all flex items-center justify-center gap-1 ${
                    answerMode === 'voice'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mic className="h-3 w-3" />
                  <span>Speak</span>
                </button>
              </div>
              <p className="text-[10px] text-violet-200 truncate">
                {answerMode === 'voice' ? 'In-browser mic & WPM scoring' : 'Typed text responses'}
              </p>
            </div>
          </div>
        )}

        {/* Start Error Banner */}
        {startError && (
          <div className="p-3 bg-rose-500/20 border border-rose-400 text-white text-xs rounded-xl flex items-center justify-between">
            <span>{startError}</span>
            <button onClick={() => setStartError(null)} className="underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Latency Threshold Banner */}
        {isGeneratingQuestions && generationElapsed >= 4 && (
          <div className="text-[11px] text-violet-300 bg-white/10 p-2.5 rounded-lg flex items-center gap-2">
            <IconClock className="w-3.5 h-3.5 animate-spin text-violet-400" />
            <span>Generating role-specific questions and persona criteria... ({generationElapsed}s)</span>
          </div>
        )}
      </div>

      {/* Active Mock Session UI */}
      {sessionActive && currentQ && (
        <Card padding="lg" className="space-y-6 border-2 border-indigo-500/40">
          {/* Header Strip with Badges & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                {FORMAT_CONFIG[mode]?.label}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300">
                {DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || difficulty}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {PERSONA_CONFIG[persona]?.label}
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

            {/* Answer Mode Toggle During Active Practice */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setAnswerMode('text')}
                  className={`px-2.5 py-1 font-semibold rounded ${
                    answerMode === 'text'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Type
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerMode('voice')}
                  className={`px-2.5 py-1 font-semibold rounded flex items-center gap-1 ${
                    answerMode === 'voice'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  <Mic className="h-3 w-3" />
                  <span>Speak</span>
                </button>
              </div>

              {/* Timed Screen Countdown Display */}
              {mode === 'timed' && (
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
                    {timeRemaining <= 0 ? 'Overtime: ' : 'Time: '}
                    {formatTimerDisplay(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="capitalize font-bold text-slate-700 dark:text-slate-300">
                {currentQ.category} Dimension
              </span>
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
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {PERSONA_CONFIG[persona]?.label} Framing
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {currentQ.question}
            </h4>
          </div>

          {/* Answer Input: Voice Capture vs Textarea */}
          {!currentEvaluation ? (
            <div className="space-y-4">
              {answerMode === 'voice' ? (
                <VoiceAnswerCapture
                  onTranscriptReady={handleVoiceTranscriptReady}
                  disabled={isEvaluating}
                  timeLimitSeconds={mode === 'timed' ? TIMED_SCREEN_LIMIT_SECONDS : undefined}
                  isTimedMode={mode === 'timed'}
                  persona={persona}
                  onCancel={() => setAnswerMode('text')}
                  initialTranscript={currentAnswer}
                />
              ) : (
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
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
                </div>
              )}

              {isEvaluating && generationElapsed >= 4 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-xs rounded-xl flex items-center gap-2 animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Evaluating answer across Content & Delivery dimensions... ({generationElapsed}s)</span>
                </div>
              )}
            </div>
          ) : (
            /* Comprehensive Scorecard Display (Content + Delivery) */
            <div className="space-y-6 animate-in fade-in duration-200">
              {currentEvaluation.executionMode === 'deterministic' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-xl">
                  <strong>Simplified Interview Coaching</strong> — live Gemini API was unreachable; evaluated using deterministic rubric.
                </div>
              )}

              {/* Overall Response Score with Explicit Question-Aware Weighting */}
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-black text-indigo-400">
                    {currentEvaluation.overallResponseScore}%
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-100">Overall Response Score</h5>
                    <p className="text-[11px] text-slate-400">
                      {currentEvaluation.deliveryScore
                        ? `Weighting: ${Math.round(currentEvaluation.contentWeight * 100)}% Content + ${Math.round(
                            currentEvaluation.deliveryWeight * 100
                          )}% Delivery`
                        : '100% Content Evaluation (Text Mode)'}
                    </p>
                  </div>
                </div>

                {currentEvaluation.metrics && (
                  <div className="flex items-center space-x-3 text-xs">
                    {currentEvaluation.metrics.deliveryMetricsStatus === 'invalid_transcript_or_timing' ? (
                      <div className="rounded bg-amber-950/80 border border-amber-800 px-2.5 py-1 text-[11px] text-amber-300 font-mono">
                        Metrics Uncalibrated
                      </div>
                    ) : (
                      <>
                        <div className="rounded bg-slate-800 px-2.5 py-1 font-mono text-slate-300">
                          {currentEvaluation.metrics.wordsPerMinute} <span className="text-slate-500">WPM</span>
                        </div>
                        <div className="rounded bg-slate-800 px-2.5 py-1 font-mono text-slate-300">
                          {currentEvaluation.metrics.fillerRatePerMinute} <span className="text-slate-500">fillers/m</span>
                        </div>
                      </>
                    )}
                    <div className="rounded bg-slate-800 px-2.5 py-1 font-mono text-slate-300">
                      {currentEvaluation.metrics.durationSeconds}s
                    </div>
                  </div>
                )}
              </div>

              {/* 1. Content Scorecard (6 dimensions) */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                  <span>Content Performance (1-5 Scale)</span>
                  <span className="text-[11px] font-normal text-slate-400">STAR, Evidence & Strategy</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.entries(currentEvaluation.score).map(([dim, val]) => {
                    const dimLabel: Record<string, string> = {
                      relevance: 'Relevance',
                      evidenceSpecificity: 'Evidence Spec',
                      strategicDepth: 'Strategic Depth',
                      executiveCommunication: 'Exec Comms',
                      structure: 'Structure',
                      concision: 'Concision',
                    };
                    return (
                      <div
                        key={dim}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs border border-slate-200 dark:border-slate-700/60 text-center"
                      >
                        <span className="font-semibold text-slate-600 dark:text-slate-400 block text-[11px] truncate">
                          {dimLabel[dim] || dim}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{val}/5</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Voice Delivery Scorecard (6 dimensions) if voice mode */}
              {currentEvaluation.deliveryScore && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mic className="h-3.5 w-3.5" />
                      <span>Speaking Delivery Performance (1-5 Scale)</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">Observable Verbal Proxies</span>
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {Object.entries(currentEvaluation.deliveryScore).map(([dim, val]) => {
                      const dimLabel: Record<string, string> = {
                        pace: 'Pace (WPM)',
                        verbalConcision: 'Verbal Concision',
                        fillerControl: 'Filler Control',
                        pausing: 'Pausing Cadence',
                        clarity: 'Clarity & Flow',
                        executiveDelivery: 'Exec Presence',
                      };
                      return (
                        <div
                          key={dim}
                          className="p-2.5 bg-indigo-950/20 border border-indigo-800/30 rounded-xl text-xs text-center"
                        >
                          <span className="font-semibold text-indigo-300 block text-[11px] truncate">
                            {dimLabel[dim] || dim}
                          </span>
                          <span className="font-bold text-slate-100 text-sm">{val}/5</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dual Coaching: Content + Speaking Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Content Strengths & Improvements */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Content & Evidence Coaching
                  </span>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Strengths
                      </span>
                      <ul className="mt-1 space-y-0.5 text-slate-700 dark:text-slate-300">
                        {currentEvaluation.coaching.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Refinements
                      </span>
                      <ul className="mt-1 space-y-0.5 text-slate-700 dark:text-slate-300">
                        {currentEvaluation.coaching.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Speaking Delivery Coaching */}
                {currentEvaluation.voiceCoaching ? (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-800/30 rounded-xl space-y-2.5 text-slate-300">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-indigo-400" />
                      <span>Speaking Delivery Coaching</span>
                    </span>

                    {currentEvaluation.voiceCoaching.speakingPaceCoaching && (
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-slate-200">Pace: </strong>
                        {currentEvaluation.voiceCoaching.speakingPaceCoaching}
                      </p>
                    )}

                    {currentEvaluation.voiceCoaching.fillerWordCoaching && (
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-slate-200">Fillers: </strong>
                        {currentEvaluation.voiceCoaching.fillerWordCoaching}
                      </p>
                    )}

                    {currentEvaluation.voiceCoaching.deliveryRefinements &&
                      currentEvaluation.voiceCoaching.deliveryRefinements.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-[11px]">
                          {currentEvaluation.voiceCoaching.deliveryRefinements.map((ref, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span>{ref}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 italic text-center">
                    Switch to &quot;Speak&quot; answer mode on the next question to receive live pacing, filler word, and delivery coaching.
                  </div>
                )}
              </div>

              {/* Improved Grounded Model Answer */}
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

              {/* Next Question / Finish Button */}
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

      {/* Saved Sessions History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Saved Mock Interview Sessions ({sessions.length})
          </h4>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAnalyticsModal(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>View Performance Trends</span>
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <Card padding="md" className="text-center py-6 text-xs text-slate-500">
            No mock interview sessions recorded yet. Click &quot;Start Mock Session&quot; to practice.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map((sess) => {
              const formatLabel = FORMAT_CONFIG[sess.mode]?.label || sess.mode;
              const diffLabel = DIFFICULTY_CONFIG[sess.difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || sess.difficulty;
              const isVoice = sess.answerMode === 'voice' || sess.averageWordsPerMinute;

              return (
                <Card
                  key={sess.id}
                  padding="md"
                  className="space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
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
                        {isVoice && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40 flex items-center gap-1">
                            <Mic className="h-2.5 w-2.5" /> Voice
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {formatShortDate(sess.createdAt)} • {sess.exchanges?.length || 0} questions
                        {typeof sess.averageWordsPerMinute === 'number' && ` • ${sess.averageWordsPerMinute} WPM`}
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

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{sess.summary}</p>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal for Past Session (max-w-4xl) */}
      {viewingPastSession && (
        <Modal
          isOpen={Boolean(viewingPastSession)}
          onClose={() => setViewingPastSession(null)}
          title={`Mock Session Review · ${viewingPastSession.overallScore}% Score`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Top Summary Card */}
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
                  {viewingPastSession.answerMode === 'voice' && (
                    <span className="px-2.5 py-1 rounded-md bg-indigo-950 text-indigo-300 font-bold text-[10px] uppercase border border-indigo-800/40">
                      Voice Practice
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Conducted: {formatShortDate(viewingPastSession.createdAt)}</span>
                  {typeof viewingPastSession.averageWordsPerMinute === 'number' && (
                    <span> • {viewingPastSession.averageWordsPerMinute} WPM</span>
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
                const scoreAvg = ex.overallResponseScore ?? (ex.score
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
                  : undefined);

                return (
                  <div
                    key={i}
                    className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-all"
                  >
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
                        {ex.deliveryMetrics && (
                          <span className="text-[10px] text-indigo-400 font-medium hidden sm:inline">
                            {ex.deliveryMetrics.wordsPerMinute} WPM
                          </span>
                        )}
                        <span className="text-slate-400 text-xs font-mono">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Candidate Transcript {ex.answerMode === 'voice' && '(Spoken)'}
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                            {ex.candidateAnswer}
                          </p>
                        </div>

                        {/* Content & Delivery score grids */}
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

                        {/* Coaching */}
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
                                Refinements
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Completion Modal */}
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

      {/* Performance Analytics Modal */}
      {showAnalyticsModal && (
        <Modal
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
          title="Interview Performance Analytics & Comparison"
          maxWidth="max-w-4xl"
        >
          <div className="max-h-[80vh] overflow-y-auto pr-1">
            <InterviewAnalyticsView
              sessions={sessions}
              prepCompletenessScore={activePrep ? 92 : 75}
              opportunityTitle={opportunity.title}
              opportunityCompany={opportunity.company}
              onClose={() => setShowAnalyticsModal(false)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
