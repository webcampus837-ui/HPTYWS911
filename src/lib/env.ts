const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const SUPABASE_URL = rawUrl;
export const SUPABASE_ANON_KEY = rawAnonKey;

/** True when both environment variables look filled in. */
export const isSupabaseConfigured = Boolean(
  rawUrl.startsWith('http') &&
    rawAnonKey.length > 20 &&
    !rawUrl.includes('your-project-ref'),
);
