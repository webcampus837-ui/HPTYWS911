import { requireSupabase } from '@/lib/supabase';
import type { Song } from '@/types';

export const SONGS_BUCKET = 'birthday-songs';

/** List all songs in the admin's library, newest first. */
export async function listSongs(): Promise<Song[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Song[];
}

/** Upload a song file and record it in the library. */
export async function uploadSong(name: string, file: File): Promise<Song> {
  const sb = requireSupabase();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await sb.storage.from(SONGS_BUCKET).upload(path, file, {
    contentType: file.type || 'audio/mpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: urlData } = sb.storage.from(SONGS_BUCKET).getPublicUrl(path);
  const { data, error } = await sb
    .from('songs')
    .insert({ name: name.trim(), storage_path: path, public_url: urlData.publicUrl })
    .select()
    .single();

  if (error) {
    await sb.storage.from(SONGS_BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }
  return data as Song;
}

/** Delete a song from the library (storage object + DB row). */
export async function deleteSong(song: Song): Promise<void> {
  const sb = requireSupabase();
  // Remove from storage first so nothing is orphaned.
  try {
    const { error } = await sb.storage.from(SONGS_BUCKET).remove([song.storage_path]);
    if (error) throw error;
  } catch {
    // If storage delete fails, still remove the DB row (the URL is dead anyway).
  }
  const { error } = await sb.from('songs').delete().eq('id', song.id);
  if (error) throw error;
}
