import { IStorageAdapter } from './interfaces';
import { defaultLocalStorageAdapter } from './localStorageAdapter';
import { createCloudStorageAdapter } from './cloudRepositories';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

let activeCloudAdapter: IStorageAdapter | null = null;

/**
 * Returns the current active storage adapter.
 * Uses Cloud Repositories if Supabase is configured and a client is available.
 * Falls back seamlessly to LocalStorage adapter for offline/development/unauthenticated mode.
 */
export function getActiveStorageAdapter(): IStorageAdapter {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      if (!activeCloudAdapter) {
        activeCloudAdapter = createCloudStorageAdapter(supabase);
      }
      return activeCloudAdapter;
    }
  }

  return defaultLocalStorageAdapter;
}

/**
 * Explicit helper to retrieve candidate repository.
 */
export function getCandidateRepository() {
  return getActiveStorageAdapter().candidates;
}

/**
 * Explicit helper to retrieve opportunity repository.
 */
export function getOpportunityRepository() {
  return getActiveStorageAdapter().opportunities;
}

/**
 * Explicit helper to retrieve network repository.
 */
export function getNetworkRepository() {
  return getActiveStorageAdapter().network;
}

/**
 * Explicit helper to retrieve discovery repository.
 */
export function getDiscoveryRepository() {
  return getActiveStorageAdapter().discovery;
}

/**
 * Explicit helper to retrieve activity repository.
 */
export function getActivityRepository() {
  return getActiveStorageAdapter().activities;
}

/**
 * Explicit helper to retrieve interview prep repository.
 */
export function getInterviewPrepRepository() {
  return getActiveStorageAdapter().interviewPrep;
}

/**
 * Explicit helper to retrieve interview session repository.
 */
export function getInterviewSessionRepository() {
  return getActiveStorageAdapter().interviewSessions;
}
