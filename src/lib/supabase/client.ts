import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabasePublicKey, isSupabaseConfigured } from './config';

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
    const publicKey = getSupabasePublicKey()!;
    clientInstance = createClient(url, publicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
}
