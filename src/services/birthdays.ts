import { requireSupabase } from '@/lib/supabase';
import type {
  Birthday,
  BirthdayInput,
  BirthdayListItem,
  BirthdayStatus,
  BirthdayWithPhotos,
} from '@/types';

const BIRTHDAY_COLUMNS =
  'id,name,slug,date_of_birth,theme_id,preset_message_id,custom_message,status,created_at,updated_at';

interface BirthdayRow extends Birthday {
  birthday_photos?: { count: number }[];
}

/** All birthdays with photo counts, newest first. */
export async function listBirthdays(): Promise<BirthdayListItem[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('birthdays')
    .select(`${BIRTHDAY_COLUMNS},birthday_photos(count)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as BirthdayRow[]).map((row) => {
    const { birthday_photos, ...birthday } = row;
    return { ...birthday, photo_count: birthday_photos?.[0]?.count ?? 0 };
  });
}

/** A single birthday with its full photo list. */
export async function getBirthday(id: string): Promise<BirthdayWithPhotos | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('birthdays')
    .select(`${BIRTHDAY_COLUMNS},photos:birthday_photos(*)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { photos, ...birthday } = data as BirthdayWithPhotos & { photos: BirthdayWithPhotos['photos'] };
  const sorted = [...(photos ?? [])].sort(
    (a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at),
  );
  return { ...birthday, photos: sorted };
}

export async function createBirthday(input: BirthdayInput): Promise<Birthday> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('birthdays').insert(input).select(BIRTHDAY_COLUMNS).single();
  if (error) throw error;
  return data as Birthday;
}

export async function updateBirthday(id: string, input: BirthdayInput): Promise<Birthday> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('birthdays')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(BIRTHDAY_COLUMNS)
    .single();
  if (error) throw error;
  return data as Birthday;
}

export async function setBirthdayStatus(id: string, status: BirthdayStatus): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('birthdays')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Permanently delete a birthday: storage photos first (so nothing is
 * orphaned), then the record (photo rows cascade in the database).
 */
export async function deleteBirthday(id: string): Promise<{ storageFailures: number }> {
  const sb = requireSupabase();
  const { data: photos, error: photoError } = await sb
    .from('birthday_photos')
    .select('storage_path')
    .eq('birthday_id', id);
  if (photoError) throw photoError;
  let storageFailures = 0;
  if (photos && photos.length > 0) {
    try {
      const { error } = await sb.storage
        .from('birthday-photos')
        .remove(photos.map((p) => p.storage_path));
      if (error) storageFailures = photos.length;
    } catch {
      storageFailures = photos.length;
    }
  }
  const { error } = await sb.from('birthdays').delete().eq('id', id);
  if (error) throw error;
  return { storageFailures };
}

/** Check whether a slug is already used (optionally excluding one record). */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const sb = requireSupabase();
  let query = sb.from('birthdays').select('id').eq('slug', slug).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).length > 0;
}
