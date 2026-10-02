import { MissingConfigError } from './supabase';

const GENERIC = 'Something went wrong. Please try again.';
const NETWORK = "We couldn't reach the server. Please check your connection and try again.";
const RATE_LIMITED = 'Too many attempts. Please wait a moment and try again.';

interface ErrorLike {
  message?: string;
  error_description?: string;
  code?: string;
  status?: number;
  name?: string;
}

function textOf(error: unknown): string {
  if (typeof error === 'string') return error;
  const e = error as ErrorLike | null | undefined;
  return (e?.message ?? e?.error_description ?? '').toString();
}

/**
 * Map any thrown value (Supabase auth/postgrest/storage errors, network
 * failures, our own errors) to a friendly, non-technical message.
 * Raw database errors are never shown to end users.
 */
export function friendlyError(error: unknown): string {
  if (error instanceof MissingConfigError) {
    return 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment (see README).';
  }
  const message = textOf(error);
  const lower = message.toLowerCase();
  const code = (error as ErrorLike | null)?.code;

  // Network / availability
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('fetch failed')
  ) {
    return NETWORK;
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
    return RATE_LIMITED;
  }

  // Auth
  if (lower.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email address first.';
  if (lower.includes('user not found')) return 'Incorrect email or password.';
  if (lower.includes('jwt expired') || lower.includes('token has expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (lower.includes('invalid api key') || lower.includes('no api key')) {
    return 'Supabase credentials look wrong. Double-check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }

  // Postgres / PostgREST
  if (code === '23505' || lower.includes('duplicate key')) {
    return 'This link is already taken. Please choose a different one.';
  }
  if (code === '23503') return 'Related data is missing — please refresh and try again.';
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'You are not allowed to do that. Please sign in again.';
  }

  // PostgREST function errors (our RPCs raise plain messages)
  if (lower.includes('not_found')) return 'This surprise could not be found.';

  // Storage
  if (lower.includes('exceeded the maximum allowed size') || lower.includes('payload too large') || lower.includes('entity too large')) {
    return 'That image is too large. Please use one under 8 MB.';
  }
  if (lower.includes('mime type') && lower.includes('not allowed')) {
    return 'Only JPG, PNG and WEBP images are allowed.';
  }
  if (lower.includes('bucket not found')) {
    return 'The photo storage bucket is missing. Run supabase/schema.sql (see README).';
  }

  // Validation of our own
  if (lower.includes('valid date') || lower.includes('invalid input syntax for type date')) {
    return 'That date looks invalid. Please check it and try again.';
  }

  // Table missing → setup not finished
  if (code === '42P01' || lower.includes('does not exist')) {
    return 'The database is not set up yet. Run supabase/schema.sql in your Supabase project (see README).';
  }

  return GENERIC;
}

/** Log-friendly message for the console (never shown raw to users). */
export function debugMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  const text = textOf(error) || String(error);
  return text;
}
