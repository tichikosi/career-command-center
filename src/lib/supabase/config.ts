/**
 * Supabase configuration and runtime environment validation.
 */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  return Boolean(url && anonKey && !url.includes('placeholder') && !anonKey.includes('placeholder'));
}

export function isSupabaseServiceConfigured(): boolean {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  return Boolean(url && serviceKey && !url.includes('placeholder') && !serviceKey.includes('placeholder'));
}
