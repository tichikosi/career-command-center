'use client';

import { useState, useEffect, useCallback } from 'react';
import { InterviewPreparation, InterviewSession } from '@/types/interview';
import { getInterviewPrepRepository, getInterviewSessionRepository } from '@/lib/storage/repositoryManager';
import { useAuth } from '@/context/AuthContext';

export interface UseInterviewDataReturn {
  activePrep: InterviewPreparation | null;
  prepHistory: InterviewPreparation[];
  sessions: InterviewSession[];
  isLoading: boolean;
  savePrep: (prep: InterviewPreparation) => Promise<InterviewPreparation | null>;
  deletePrep: (id: string) => Promise<void>;
  saveSession: (session: InterviewSession) => Promise<InterviewSession | null>;
  deleteSession: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useInterviewData(opportunityId: string): UseInterviewDataReturn {
  const { user } = useAuth();
  const [activePrep, setActivePrep] = useState<InterviewPreparation | null>(null);
  const [prepHistory, setPrepHistory] = useState<InterviewPreparation[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!opportunityId) return;
    setIsLoading(true);
    try {
      const prepRepo = getInterviewPrepRepository();
      const sessionRepo = getInterviewSessionRepository();

      const [active, history, sessionList] = await Promise.all([
        prepRepo ? prepRepo.getActivePrep(opportunityId, user?.id) : Promise.resolve(null),
        prepRepo ? prepRepo.getHistory(opportunityId, user?.id) : Promise.resolve([]),
        sessionRepo ? sessionRepo.getSessions(opportunityId, user?.id) : Promise.resolve([]),
      ]);

      setActivePrep(active);
      setPrepHistory(history || []);
      setSessions(sessionList || []);
    } catch (err) {
      console.warn('[useInterviewData] Error loading interview data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savePrep = useCallback(
    async (prep: InterviewPreparation) => {
      try {
        const repo = getInterviewPrepRepository();
        if (!repo) return null;
        const saved = await repo.savePrep(prep, user?.id);
        setActivePrep(saved);
        setPrepHistory((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
        return saved;
      } catch (err) {
        console.error('[useInterviewData] Error saving prep:', err);
        return null;
      }
    },
    [user?.id]
  );

  const deletePrep = useCallback(
    async (id: string) => {
      try {
        const repo = getInterviewPrepRepository();
        if (!repo) return;
        await repo.deletePrep(id, user?.id);
        if (activePrep?.id === id) setActivePrep(null);
        setPrepHistory((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        console.error('[useInterviewData] Error deleting prep:', err);
      }
    },
    [activePrep?.id, user?.id]
  );

  const saveSession = useCallback(
    async (session: InterviewSession) => {
      try {
        const repo = getInterviewSessionRepository();
        if (!repo) return null;
        const saved = await repo.saveSession(session, user?.id);
        setSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
        return saved;
      } catch (err) {
        console.error('[useInterviewData] Error saving session:', err);
        return null;
      }
    },
    [user?.id]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        const repo = getInterviewSessionRepository();
        if (!repo) return;
        await repo.deleteSession(id, user?.id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        console.error('[useInterviewData] Error deleting session:', err);
      }
    },
    [user?.id]
  );

  return {
    activePrep,
    prepHistory,
    sessions,
    isLoading,
    savePrep,
    deletePrep,
    saveSession,
    deleteSession,
    refresh,
  };
}
