import { requireSupabase } from '@/lib/supabase';
import type { TeaserResult, UnlockResult } from '@/types';

/**
 * Public access goes exclusively through two RPCs so that:
 *  - the date of birth is never exposed by any public query,
 *  - birthday data is only returned after a successful DOB match,
 *  - the server can throttle repeated wrong guesses.
 */

/** Minimal info needed to render the surprise landing: first name + theme. */
export async function getBirthdayTeaser(slug: string): Promise<TeaserResult> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('get_birthday_teaser', { p_slug: slug });
  if (error) throw error;
  return data as TeaserResult;
}

/** Verify the DOB and return the full experience only when it matches. */
export async function unlockBirthday(slug: string, dobISO: string): Promise<UnlockResult> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('unlock_birthday', { p_slug: slug, p_dob: dobISO });
  if (error) throw error;
  return data as UnlockResult;
}
