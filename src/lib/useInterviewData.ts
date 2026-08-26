'use client';

import { useState, useEffect, useCallback } from 'react';
import { InterviewPreparation, InterviewSession } from '@/types/interview';
import { getInterviewPrepRepository, getInterviewSessionRepository } from '@/lib/storage/repositoryManager';
import { defaultLocalStorageAdapter } from '@/lib/storage/localStorageAdapter';
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
  const userId = user?.id;
  const [activePrep, setActivePrep] = useState<InterviewPreparation | null>(null);
  const [prepHistory, setPrepHistory] = useState<InterviewPreparation[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(opportunityId));

  const getPrepRepo = useCallback(() => {
    return userId ? getInterviewPrepRepository() : defaultLocalStorageAdapter.interviewPrep;
  }, [userId]);

  const getSessionRepo = useCallback(() => {
    return userId ? getInterviewSessionRepository() : defaultLocalStorageAdapter.interviewSessions;
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!opportunityId) return;
    setIsLoading(true);
    try {
      const prepRepo = getPrepRepo();
      const sessionRepo = getSessionRepo();

      const [active, history, sessionList] = await Promise.all([
        prepRepo ? prepRepo.getActivePrep(opportunityId, userId) : Promise.resolve(null),
        prepRepo ? prepRepo.getHistory(opportunityId, userId) : Promise.resolve([]),
        sessionRepo ? sessionRepo.getSessions(opportunityId, userId) : Promise.resolve([]),
      ]);

      setActivePrep(active);
      setPrepHistory(history || []);
      setSessions(sessionList || []);
    } catch (err) {
      console.warn('[useInterviewData] Error loading interview data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId, userId, getPrepRepo, getSessionRepo]);

  useEffect(() => {
    let active = true;
    if (!opportunityId) {
      return;
    }

    const fetchInitial = async () => {
      try {
        const prepRepo = getPrepRepo();
        const sessionRepo = getSessionRepo();

        const [activeP, hist, sess] = await Promise.all([
          prepRepo ? prepRepo.getActivePrep(opportunityId, userId) : Promise.resolve(null),
          prepRepo ? prepRepo.getHistory(opportunityId, userId) : Promise.resolve([]),
          sessionRepo ? sessionRepo.getSessions(opportunityId, userId) : Promise.resolve([]),
        ]);

        if (active) {
          setActivePrep(activeP);
          setPrepHistory(hist || []);
          setSessions(sess || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[useInterviewData] Error loading interview data:', err);
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchInitial();
    return () => {
      active = false;
    };
  }, [opportunityId, userId, getPrepRepo, getSessionRepo]);

  const savePrep = useCallback(
    async (prep: InterviewPreparation) => {
      try {
        const repo = getPrepRepo();
        if (!repo) return null;
        const saved = await repo.savePrep(prep, userId);
        setActivePrep(saved);
        setPrepHistory((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
        return saved;
      } catch (err) {
        console.error('[useInterviewData] Error saving prep:', err);
        return null;
      }
    },
    [userId, getPrepRepo]
  );

  const deletePrep = useCallback(
    async (id: string) => {
      try {
        const repo = getPrepRepo();
        if (!repo) return;
        await repo.deletePrep(id, userId);
        setActivePrep((prev) => (prev?.id === id ? null : prev));
        setPrepHistory((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        console.error('[useInterviewData] Error deleting prep:', err);
      }
    },
    [userId, getPrepRepo]
  );

  const saveSession = useCallback(
    async (session: InterviewSession) => {
      try {
        const repo = getSessionRepo();
        if (!repo) return null;
        const saved = await repo.saveSession(session, userId);
        setSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
        return saved;
      } catch (err) {
        console.error('[useInterviewData] Error saving session:', err);
        return null;
      }
    },
    [userId, getSessionRepo]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        const repo = getSessionRepo();
        if (!repo) return;
        await repo.deleteSession(id, userId);
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        console.error('[useInterviewData] Error deleting session:', err);
      }
    },
    [userId, getSessionRepo]
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
