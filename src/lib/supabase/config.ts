/**
 * Supabase configuration and runtime environment validation.
 * Supports modern NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and legacy NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function getSupabasePublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
}

// Backwards-compatible alias for existing imports
export const getSupabaseAnonKey = getSupabasePublicKey;

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const publicKey = getSupabasePublicKey();
  return Boolean(
    url &&
      publicKey &&
      !url.includes('placeholder') &&
      !publicKey.includes('placeholder') &&
      url.trim().length > 0 &&
      publicKey.trim().length > 0
  );
}

export function isSupabaseServiceConfigured(): boolean {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  return Boolean(
    url &&
      serviceKey &&
      !url.includes('placeholder') &&
      !serviceKey.includes('placeholder') &&
      url.trim().length > 0 &&
      serviceKey.trim().length > 0
  );
}
