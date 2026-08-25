import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from './config';

let clientInstance: SupabaseClient | null = null;

/**
 * Returns browser-safe Supabase client.
 * Returns null if Supabase environment variables are unconfigured (graceful local-first fallback).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    const url = getSupabaseUrl()!;
    const anonKey = getSupabaseAnonKey()!;
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
}
