import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseUrl,
  getSupabasePublicKey,
  getSupabaseServiceRoleKey,
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from './config';

/**
 * Returns elevated Supabase client for server-side background tasks (Cron discovery, batch maintenance).
 * Never exposed to browser bundle.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseServiceConfigured()) {
    return null;
  }

  const url = getSupabaseUrl()!;
  const serviceKey = getSupabaseServiceRoleKey()!;
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Returns standard server-side Supabase client.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrl()!;
  const publicKey = getSupabasePublicKey()!;
  return createClient(url, publicKey, {
    auth: {
      persistSession: false,
    },
  });
}
