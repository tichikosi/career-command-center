'use client';

import { useState, useEffect, useCallback } from 'react';
import { OpportunityActivity } from '@/types/interview';
import { getActivityRepository } from '@/lib/storage/repositoryManager';
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
  const [activities, setActivities] = useState<OpportunityActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const repo = getActivityRepository();
      if (!repo) {
        setActivities([]);
        return;
      }

      const list = opportunityId
        ? await repo.getActivities(opportunityId, user?.id)
        : await repo.getAllActivities(user?.id);

      setActivities(list || []);
    } catch (err) {
      console.warn('[useActivities] Error loading activities:', err);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId, user?.id]);

  useEffect(() => {
    refreshActivities();
  }, [refreshActivities]);

  const addActivity = useCallback(
    async (activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const repo = getActivityRepository();
        if (!repo) return null;
        const created = await repo.recordActivity(activity, user?.id);
        setActivities((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.error('[useActivities] Error recording activity:', err);
        return null;
      }
    },
    [user?.id]
  );

  const editActivity = useCallback(
    async (id: string, updates: Partial<OpportunityActivity>) => {
      try {
        const repo = getActivityRepository();
        if (!repo) return null;
        const updated = await repo.updateActivity(id, updates, user?.id);
        if (updated) {
          setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
        }
        return updated;
      } catch (err) {
        console.error('[useActivities] Error updating activity:', err);
        return null;
      }
    },
    [user?.id]
  );

  const removeActivity = useCallback(
    async (id: string) => {
      try {
        const repo = getActivityRepository();
        if (!repo) return;
        await repo.deleteActivity(id, user?.id);
        setActivities((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        console.error('[useActivities] Error deleting activity:', err);
      }
    },
    [user?.id]
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
