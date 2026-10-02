import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * Supabase browser client.
 * Only the public anon key is ever used here — never the service-role key.
 * Null when the environment variables are not configured yet.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export class MissingConfigError extends Error {
  constructor() {
    super('Supabase is not configured');
    this.name = 'MissingConfigError';
  }
}

/** Returns the client or throws a typed error the UI can translate. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new MissingConfigError();
  return supabase;
}
