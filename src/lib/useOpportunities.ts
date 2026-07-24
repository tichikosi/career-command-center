'use client';

import { useSyncExternalStore, useMemo } from 'react';
import { JobOpportunity } from '@/types/opportunity';
import {
  getOpportunities,
  getInitialOpportunitiesServerSnapshot,
  subscribeToStorage,
} from '@/lib/storage';

/**
 * React hook that subscribes to local opportunity storage.
 * Uses useSyncExternalStore with a stable module-level server snapshot
 * and a cached client snapshot to ensure 100% hydration safety and zero warnings.
 */
export function useOpportunities(): JobOpportunity[] {
  return useSyncExternalStore(
    subscribeToStorage,
    getOpportunities,
    getInitialOpportunitiesServerSnapshot
  );
}

/**
 * React hook to retrieve a single opportunity reactively by ID.
 * Returns stable references and updates automatically on storage changes.
 */
export function useOpportunity(
  id: string | null | undefined
): JobOpportunity | undefined {
  const opportunities = useOpportunities();
  return useMemo(() => {
    if (!id) return undefined;
    return opportunities.find((o) => o.id === id);
  }, [opportunities, id]);
}
