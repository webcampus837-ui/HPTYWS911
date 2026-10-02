import { requireSupabase } from '@/lib/supabase';
import type { PreparedImage } from '@/lib/images';
import type { BirthdayPhoto } from '@/types';

export const PHOTOS_BUCKET = 'birthday-photos';

/** Upload one prepared image under the birthday's folder and record it. */
export async function uploadBirthdayPhoto(
  birthdayId: string,
  image: PreparedImage,
  displayOrder: number,
): Promise<BirthdayPhoto> {
  const sb = requireSupabase();
  const path = `${birthdayId}/${crypto.randomUUID()}.${image.extension}`;

  const { error: uploadError } = await sb.storage.from(PHOTOS_BUCKET).upload(path, image.blob, {
    contentType: image.contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: urlData } = sb.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  const { data, error } = await sb
    .from('birthday_photos')
    .insert({
      birthday_id: birthdayId,
      storage_path: path,
      public_url: urlData.publicUrl,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) {
    // Don't leave the file orphaned in storage when the row insert fails.
    await sb.storage.from(PHOTOS_BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }
  return data as BirthdayPhoto;
}

/**
 * Delete a photo: storage object first, then the database row.
 * Returns whether the storage object was removed successfully.
 */
export async function deleteBirthdayPhoto(photo: BirthdayPhoto): Promise<{ storageRemoved: boolean }> {
  const sb = requireSupabase();
  let storageRemoved = true;
  try {
    const { error } = await sb.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
    if (error) storageRemoved = false;
  } catch {
    storageRemoved = false;
  }
  const { error } = await sb.from('birthday_photos').delete().eq('id', photo.id);
  if (error) throw error;
  return { storageRemoved };
}

/**
 * Persist a new display order.
 *
 * One request: the caller already holds the full rows (from `getBirthday`), so
 * they are upserted with fresh `display_order` values. Every row is matched on
 * its own id *and* the birthday id, so a stale client can never rewrite another
 * birthday's photos.
 */
export async function reorderBirthdayPhotos(
  birthdayId: string,
  ordered: BirthdayPhoto[],
): Promise<void> {
  if (ordered.length === 0) return;
  const sb = requireSupabase();
  const rows = ordered
    .filter((photo) => photo.birthday_id === birthdayId)
    .map((photo, index) => ({ ...photo, display_order: index }));
  if (rows.length === 0) return;
  const { error } = await sb.from('birthday_photos').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}
