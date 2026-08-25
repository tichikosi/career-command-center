'use client';

import React, { useState } from 'react';
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

export function MockInterviewPanel({
  opportunity,
  candidate,
  activePrep,
  sessions,
  onSaveSession,
  onDeleteSession,
  onRecordActivity,
}: MockInterviewPanelProps) {
  // Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [mode, setMode] = useState<'practice' | 'timed' | 'full'>('practice');
  const [difficulty, setDifficulty] = useState<MockDifficulty>('standard');
  const [questions, setQuestions] = useState<Array<{ id: string; question: string; category: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

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

  // Start Session
  const handleStartSession = async () => {
    setIsGeneratingQuestions(true);
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
        setSessionActive(true);
      } else {
        throw new Error(data.error || 'Failed to generate questions');
      }
    } catch (err) {
      console.error('[MockInterviewPanel] Start error:', err);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Submit Answer for AI Evaluation
  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || isEvaluating) return;
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    setIsEvaluating(true);
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

        const newExchange: MockInterviewExchange = {
          questionId: activeQ.id,
          question: activeQ.question,
          questionCategory: activeQ.category,
          candidateAnswer: currentAnswer.trim(),
          score: evalResult.score,
          coaching: evalResult.coaching,
          evidenceCitations: evalResult.evidenceCitations || [],
          answeredAt: new Date().toISOString(),
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
    } else {
      // Finish session
      await finalizeSession(exchanges);
    }
  };

  const finalizeSession = async (allExchanges: MockInterviewExchange[]) => {
    // Calculate aggregate score
    const totalDimScore = allExchanges.reduce((sum, e) => {
      const s = e.score;
      const avg = (s.relevance + s.evidenceSpecificity + s.strategicDepth + s.executiveCommunication + s.structure + s.concision) / 6;
      return sum + avg;
    }, 0);

    const overallScore = Math.round((totalDimScore / (allExchanges.length || 1)) * 20);

    const sessionObj: InterviewSession = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: opportunity.id,
      prepId: activePrep?.id,
      mode,
      difficulty,
      exchanges: allExchanges,
      overallScore,
      summary: `Completed ${allExchanges.length} questions across behavioral and strategic dimensions with an overall rating of ${overallScore}%.`,
      strengths: ['Clear delivery', 'Relevant background cited'],
      improvementAreas: ['Add more quantifiable outcome metrics'],
      requestedModel: 'gemini-3.7-flash',
      actualModel: currentEvaluation?.actualModel || 'gemini-3.7-flash',
      executionMode: currentEvaluation?.executionMode || 'gemini',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await onSaveSession(sessionObj);

    if (onRecordActivity) {
      await onRecordActivity({
        opportunityId: opportunity.id,
        activityType: 'mock_session_completed',
        title: `Mock Interview Session Completed (${overallScore}%)`,
        notes: `Practiced ${allExchanges.length} questions on ${difficulty} difficulty. Score: ${overallScore}/100.`,
        occurredAt: new Date().toISOString(),
        source: 'user',
        metadata: { overallScore, difficulty, mode },
      });
    }

    setCompletedSession(sessionObj);
    setSessionActive(false);
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-900 to-indigo-900 text-white p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/10 rounded-lg">
              <IconMicrophone className="w-5 h-5 text-violet-300" />
            </span>
            <h3 className="text-lg font-bold">Interactive Mock Interview War Room</h3>
          </div>
          <p className="text-xs text-violet-200 max-w-xl">
            Simulate real interview questions evaluated by Gemini on 6 dimensions with evidence verification.
          </p>
        </div>

        {!sessionActive && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'practice' | 'timed' | 'full')}
              className="bg-white/10 border border-white/20 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:bg-slate-900"
            >
              <option value="practice" className="bg-slate-900 text-white">Practice Mode</option>
              <option value="timed" className="bg-slate-900 text-white">Timed Screen</option>
              <option value="full" className="bg-slate-900 text-white">Full Loop</option>
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as MockDifficulty)}
              className="bg-white/10 border border-white/20 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:bg-slate-900"
            >
              <option value="standard" className="bg-slate-900 text-white">Standard</option>
              <option value="rigorous" className="bg-slate-900 text-white">Rigorous (VP Level)</option>
              <option value="adversarial" className="bg-slate-900 text-white">Stress Test</option>
            </select>
            <button
              onClick={handleStartSession}
              disabled={isGeneratingQuestions}
              className="px-5 py-2 bg-white text-violet-950 font-bold rounded-xl text-xs hover:bg-violet-50 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              <IconSparkles className="w-4 h-4 text-violet-600" />
              <span>{isGeneratingQuestions ? 'Generating...' : 'Start Mock Session'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Mock Session UI */}
      {sessionActive && currentQ && (
        <Card padding="lg" className="space-y-6 border-2 border-indigo-500/40">
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="capitalize text-indigo-600 dark:text-indigo-400 font-bold">
              {currentQ.category} Round • {difficulty} Mode
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interviewer Question:</span>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{currentQ.question}</h4>
          </div>

          {/* Answer Input or Evaluated Feedback */}
          {!currentEvaluation ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Answer (speak aloud or type in STAR format):
              </label>
              <textarea
                rows={6}
                placeholder="Structure your answer with Situation, Task, Action, and quantifiable Result..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
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
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <IconSparkles className="w-3.5 h-3.5" />
                    <span>{isEvaluating ? 'Evaluating Answer...' : 'Submit Answer for AI Score'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Evaluation Results */
            <div className="space-y-6 animate-in fade-in duration-200">
              {currentEvaluation.executionMode === 'deterministic' && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-lg">
                  <strong>Simplified Interview Coaching</strong> — live Gemini API was unreachable; evaluated using heuristic structural rubric.
                </div>
              )}

              {/* 6 Dimension Score Bars */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Score Dimensions (1-5 Scale)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(currentEvaluation.score).map(([dim, val]) => {
                    const dimLabel: Record<string, string> = {
                      relevance: 'Relevance',
                      evidenceSpecificity: 'Evidence Specificity',
                      strategicDepth: 'Strategic Depth',
                      executiveCommunication: 'Executive Comms',
                      structure: 'STAR Structure',
                      concision: 'Concision',
                    };
                    return (
                      <div key={dim} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
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

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                  <strong className="text-emerald-800 dark:text-emerald-300 block font-bold">Strengths</strong>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    {currentEvaluation.coaching.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5">
                  <strong className="text-amber-800 dark:text-amber-300 block font-bold">Refinements</strong>
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
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl text-xs space-y-1">
                  <strong className="text-indigo-800 dark:text-indigo-300 font-bold block">
                    Improved Answer Framing (Grounded in Your Background):
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
                  className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
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
            No mock interview sessions recorded yet. Click &quot;Start New Mock Session&quot; to practice.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map((sess) => (
              <Card key={sess.id} padding="md" className="space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Score: {sess.overallScore}%
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        {sess.difficulty} Mode
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {formatShortDate(sess.createdAt)} • {sess.exchanges?.length || 0} questions answered
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingPastSession(sess)}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
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
            ))}
          </div>
        )}
      </div>

      {/* Review Modal for Past Session */}
      {viewingPastSession && (
        <Modal
          isOpen={Boolean(viewingPastSession)}
          onClose={() => setViewingPastSession(null)}
          title={`Mock Session Review (${viewingPastSession.overallScore}%)`}
        >
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-slate-600 dark:text-slate-400">{viewingPastSession.summary}</p>

            <div className="space-y-4">
              {viewingPastSession.exchanges.map((ex, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-slate-100">Q{i + 1}: {ex.question}</strong>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                    {ex.candidateAnswer}
                  </p>
                  {ex.coaching?.improvedAnswer && (
                    <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40 p-2 rounded">
                      <strong>Framing Suggestion:</strong> {ex.coaching.improvedAnswer}
                    </div>
                  )}
                </div>
              ))}
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
