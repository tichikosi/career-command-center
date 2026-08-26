'use client';

import { useState, useEffect, useCallback } from 'react';
import { OpportunityActivity } from '@/types/interview';
import { getActivityRepository } from '@/lib/storage/repositoryManager';
import { defaultLocalStorageAdapter } from '@/lib/storage/localStorageAdapter';
import { useAuth } from '@/context/AuthContext';

export interface UseActivitiesReturn {
  activities: OpportunityActivity[];
  isLoading: boolean;
  addActivity: (activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OpportunityActivity | null>;
  editActivity: (id: string, updates: Partial<OpportunityActivity>) => Promise<OpportunityActivity | null>;
  removeActivity: (id: string) => Promise<void>;
  refreshActivities: () => Promise<void>;
}

export function useActivities(opportunityId?: string): UseActivitiesReturn {
  const { user } = useAuth();
  const userId = user?.id;
  const [activities, setActivities] = useState<OpportunityActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getRepo = useCallback(() => {
    return userId ? getActivityRepository() : defaultLocalStorageAdapter.activities;
  }, [userId]);

  const refreshActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const repo = getRepo();
      if (!repo) {
        setActivities([]);
        return;
      }

      const list = opportunityId
        ? await repo.getActivities(opportunityId, userId)
        : await repo.getAllActivities(userId);

      setActivities(list || []);
    } catch (err) {
      console.warn('[useActivities] Error loading activities:', err);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId, userId, getRepo]);

  useEffect(() => {
    let active = true;
    const fetchInitial = async () => {
      try {
        const repo = getRepo();
        if (!repo) {
          if (active) {
            setActivities([]);
            setIsLoading(false);
          }
          return;
        }

        const list = opportunityId
          ? await repo.getActivities(opportunityId, userId)
          : await repo.getAllActivities(userId);

        if (active) {
          setActivities(list || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[useActivities] Initial fetch error:', err);
        if (active) {
          setActivities([]);
          setIsLoading(false);
        }
      }
    };

    fetchInitial();
    return () => {
      active = false;
    };
  }, [opportunityId, userId, getRepo]);

  const addActivity = useCallback(
    async (activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const repo = getRepo();
        if (!repo) return null;
        const created = await repo.recordActivity(activity, userId);
        setActivities((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.error('[useActivities] Error recording activity:', err);
        return null;
      }
    },
    [userId, getRepo]
  );

  const editActivity = useCallback(
    async (id: string, updates: Partial<OpportunityActivity>) => {
      try {
        const repo = getRepo();
        if (!repo) return null;
        const updated = await repo.updateActivity(id, updates, userId);
        if (updated) {
          setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
        }
        return updated;
      } catch (err) {
        console.error('[useActivities] Error updating activity:', err);
        return null;
      }
    },
    [userId, getRepo]
  );

  const removeActivity = useCallback(
    async (id: string) => {
      try {
        const repo = getRepo();
        if (!repo) return;
        await repo.deleteActivity(id, userId);
        setActivities((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        console.error('[useActivities] Error deleting activity:', err);
      }
    },
    [userId, getRepo]
  );

  return {
    activities,
    isLoading,
    addActivity,
    editActivity,
    removeActivity,
    refreshActivities,
  };
}
