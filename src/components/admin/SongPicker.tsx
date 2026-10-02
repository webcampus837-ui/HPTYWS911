import { useCallback, useEffect, useRef, useState } from 'react';
import type { Song } from '@/types';
import { listSongs, uploadSong, deleteSong } from '@/services/songs';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

export interface SongPickerProps {
  value: string | null;
  onChange: (songId: string | null) => void;
  className?: string;
}

/**
 * Song library picker + manager.
 * Shows available songs as a radio list, lets the admin upload new ones
 * and delete existing ones. The selected song plays on the birthday page.
 */
export function SongPicker({ value, onChange, className }: SongPickerProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSongs(await listSongs());
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled';
    setUploading(true);
    try {
      const song = await uploadSong(name, file);
      setSongs((prev) => [song, ...prev]);
      toast.success(`"${song.name}" added to library.`);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (song: Song) => {
    setDeletingId(song.id);
    try {
      await deleteSong(song);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      if (value === song.id) onChange(null);
      toast.success(`"${song.name}" removed.`);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* No-song option */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="song"
          checked={value === null}
          onChange={() => onChange(null)}
          className="accent-brand-500"
        />
        <span className="text-sm text-slate-300">No music</span>
      </label>

      {/* Song list */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading songs…</p>
      ) : songs.length === 0 ? (
        <p className="text-sm text-slate-400">
          No songs yet. Upload one below to build your library.
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {songs.map((song) => (
            <li key={song.id} className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                <input
                  type="radio"
                  name="song"
                  checked={value === song.id}
                  onChange={() => onChange(song.id)}
                  className="accent-brand-500 shrink-0"
                />
                <span className="text-sm text-slate-200 truncate">{song.name}</span>
              </label>
              <button
                type="button"
                onClick={() => void handleDelete(song)}
                disabled={deletingId === song.id}
                className="btn btn--danger btn--sm shrink-0"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                title={`Delete "${song.name}"`}
              >
                {deletingId === song.id ? '…' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Upload button */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac"
          onChange={(e) => void handleUpload(e)}
          className="sr-only"
          id="song-upload-input"
        />
        <label
          htmlFor="song-upload-input"
          className={cn(
            'btn btn--ghost btn--sm cursor-pointer',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? 'Uploading…' : '+ Add a song'}
        </label>
        {songs.length > 0 && (
          <span className="ml-2 text-xs text-slate-500">
            {songs.length} song{songs.length !== 1 ? 's' : ''} in library
          </span>
        )}
      </div>
    </div>
  );
}
