import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import type { BirthdayPhoto } from '@/types';
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  prepareImageForUpload,
  validateImageFile,
} from '@/lib/images';
import {
  deleteBirthdayPhoto,
  reorderBirthdayPhotos,
  uploadBirthdayPhoto,
} from '@/services/photos';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

/** Hard ceiling per birthday — keeps public pages fast and storage sane. */
export const MAX_PHOTOS = 24;

export type StagedStatus = 'queued' | 'uploading' | 'error';

/**
 * A file picked locally but not yet stored.
 *
 * Used in two situations: the "Add birthday" form (there is no birthday row to
 * attach a photo to until the form is saved) and the split second between
 * choosing a file and finishing an upload in the edit form.
 */
export interface StagedPhoto {
  key: string;
  file: File;
  previewUrl: string;
  status: StagedStatus;
  error: string | null;
}

function makeKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeStagedPhoto(file: File): StagedPhoto {
  return {
    key: makeKey(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: 'queued',
    error: null,
  };
}

/** Release the object URLs of a staged batch (call after uploading/leaving). */
export function releaseStagedPhotos(items: StagedPhoto[]): void {
  for (const item of items) {
    try {
      URL.revokeObjectURL(item.previewUrl);
    } catch {
      /* nothing to do */
    }
  }
}

export interface PhotoUploaderProps {
  /** `null` while creating a birthday — files are queued and uploaded on save. */
  birthdayId: string | null;
  stored: BirthdayPhoto[];
  onStoredChange: (next: BirthdayPhoto[]) => void;
  staged: StagedPhoto[];
  onStagedChange: (next: StagedPhoto[]) => void;
  /** Used for alt text so the public gallery is meaningful. */
  personName?: string;
  disabled?: boolean;
}

type Tile =
  | { kind: 'stored'; id: string; photo: BirthdayPhoto }
  | { kind: 'staged'; id: string; item: StagedPhoto };

/**
 * Photo manager for the birthday form.
 *
 * Real uploads only — every accepted file is compressed in the browser and
 * pushed to the `birthday-photos` bucket, then recorded in `birthday_photos`.
 * When the insert fails the service removes the storage object again, so a
 * half-finished upload never leaves an orphan behind.
 *
 * While `birthdayId` is null (the create form) files are queued locally with a
 * preview and uploaded by the parent the moment the birthday row exists.
 */
export function PhotoUploader({
  birthdayId,
  stored,
  onStoredChange,
  staged,
  onStagedChange,
  personName,
  disabled = false,
}: PhotoUploaderProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // Mirrors of the props so the sequential upload loop never writes from a
  // stale array (the parent owns the state).
  const stagedRef = useRef(staged);
  const storedRef = useRef(stored);

  const setStaged = useCallback(
    (next: StagedPhoto[]) => {
      stagedRef.current = next;
      onStagedChange(next);
    },
    [onStagedChange],
  );

  const setStored = useCallback(
    (next: BirthdayPhoto[]) => {
      storedRef.current = next;
      onStoredChange(next);
    },
    [onStoredChange],
  );

  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  useEffect(() => {
    storedRef.current = stored;
  }, [stored]);

  // Release previews if the uploader goes away with files still queued.
  useEffect(() => () => releaseStagedPhotos(stagedRef.current), []);

  const patchStaged = useCallback(
    (key: string, patch: Partial<StagedPhoto>) => {
      setStaged(
        stagedRef.current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
      );
    },
    [setStaged],
  );

  const dropStaged = useCallback(
    (key: string) => {
      const target = stagedRef.current.find((item) => item.key === key);
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          /* nothing to do */
        }
      }
      setStaged(stagedRef.current.filter((item) => item.key !== key));
    },
    [setStaged],
  );

  /** Compress + upload a batch in order, starting after the last saved photo. */
  const uploadBatch = useCallback(
    async (id: string, items: StagedPhoto[]) => {
      let order = storedRef.current.length;
      let ok = 0;
      let failed = 0;

      for (const item of items) {
        patchStaged(item.key, { status: 'uploading', error: null });
        try {
          const prepared = await prepareImageForUpload(item.file);
          const photo = await uploadBirthdayPhoto(id, prepared, order);
          order += 1;
          ok += 1;
          try {
            URL.revokeObjectURL(prepared.previewUrl);
          } catch {
            /* nothing to do */
          }
          setStored([...storedRef.current, photo]);
          dropStaged(item.key);
        } catch (error) {
          failed += 1;
          patchStaged(item.key, { status: 'error', error: friendlyError(error) });
        }
      }

      if (failed === 0) {
        toast.success(ok === 1 ? 'Photo uploaded.' : `${ok} photos uploaded.`);
      } else if (ok === 0) {
        toast.error(failed === 1 ? 'The photo could not be uploaded.' : `${failed} photos could not be uploaded.`);
      } else {
        toast.error(`${ok} uploaded, ${failed} failed. You can retry the rest below.`);
      }
      return { ok, failed };
    },
    [dropStaged, patchStaged, setStored, toast],
  );

  const addFiles = useCallback(
    (list: FileList | File[] | null) => {
      const files = list ? Array.from(list) : [];
      if (files.length === 0) return;

      const room = MAX_PHOTOS - (storedRef.current.length + stagedRef.current.length);
      if (room <= 0) {
        toast.error(`A birthday holds up to ${MAX_PHOTOS} photos. Remove one first.`);
        return;
      }

      const accepted: StagedPhoto[] = [];
      const problems: string[] = [];
      for (const file of files) {
        if (accepted.length >= room) {
          problems.push(`Only ${room} more photo${room === 1 ? '' : 's'} fit, so the rest were skipped.`);
          break;
        }
        const problem = validateImageFile(file);
        if (problem) {
          problems.push(problem);
          continue;
        }
        accepted.push(makeStagedPhoto(file));
      }

      if (problems.length > 0) {
        toast.error(problems.length === 1 ? problems[0] : `${problems.length} files were skipped — ${problems[0]}`);
      }
      if (accepted.length === 0) return;

      setStaged([...stagedRef.current, ...accepted]);
      if (birthdayId) void uploadBatch(birthdayId, accepted);
    },
    [birthdayId, setStaged, toast, uploadBatch],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (disabled) return;
      addFiles(event.dataTransfer?.files ?? null);
    },
    [addFiles, disabled],
  );

  const removeStored = useCallback(
    async (photo: BirthdayPhoto) => {
      setConfirmId(null);
      setBusyPhotoId(photo.id);
      try {
        const { storageRemoved } = await deleteBirthdayPhoto(photo);
        setStored(storedRef.current.filter((item) => item.id !== photo.id));
        if (storageRemoved) {
          toast.success('Photo deleted.');
        } else {
          toast.error(
            'The photo was removed from the birthday, but its file could not be deleted from storage. Check the birthday-photos bucket.',
          );
        }
      } catch (error) {
        toast.error(friendlyError(error));
      } finally {
        setBusyPhotoId(null);
      }
    },
    [setStored, toast],
  );

  const move = useCallback(
    async (tile: Tile, delta: -1 | 1) => {
      if (tile.kind === 'staged') {
        const list = [...stagedRef.current];
        const from = list.findIndex((item) => item.key === tile.id);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= list.length) return;
        [list[from], list[to]] = [list[to], list[from]];
        setStaged(list);
        return;
      }

      const list = [...storedRef.current];
      const from = list.findIndex((item) => item.id === tile.id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= list.length) return;
      const previous = storedRef.current;
      [list[from], list[to]] = [list[to], list[from]];
      setStored(list);
      if (!birthdayId) return;

      setReordering(true);
      try {
        await reorderBirthdayPhotos(birthdayId, list);
      } catch (error) {
        setStored(previous);
        toast.error(friendlyError(error));
      } finally {
        setReordering(false);
      }
    },
    [birthdayId, setStaged, setStored, toast],
  );

  const tiles: Tile[] = [
    ...stored.map((photo) => ({ kind: 'stored' as const, id: photo.id, photo })),
    ...staged.map((item) => ({ kind: 'staged' as const, id: item.key, item })),
  ];
  const total = tiles.length;
  const who = personName?.trim() ? personName.trim() : 'the birthday person';
  const uploading = staged.some((item) => item.status === 'uploading');

  return (
    <div className="flex flex-col gap-3">
      {/* Dropzone ------------------------------------------------------- */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-2xl border border-dashed p-4 text-center transition-colors',
          dragging
            ? 'border-brand-400/70 bg-brand-500/10'
            : 'border-white/15 bg-white/[0.02] hover:border-white/25',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_EXTENSIONS}
          multiple
          className="sr-only"
          disabled={disabled || total >= MAX_PHOTOS}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <p className="text-[0.9rem] font-semibold text-slate-100">
          <span aria-hidden="true" className="mr-1.5">
            📸
          </span>
          Drag photos here, or{' '}
          <button
            type="button"
            className="btn btn--ghost btn--sm align-middle"
            disabled={disabled || total >= MAX_PHOTOS}
            onClick={() => inputRef.current?.click()}
          >
            browse your device
          </button>
        </p>
        <p className="mt-1.5 text-[0.76rem] leading-relaxed text-slate-400">
          Optional. JPG, PNG or WEBP, up to {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB each —
          large images are automatically compressed before upload. Up to {MAX_PHOTOS} photos.
        </p>
      </div>

      {/* Counter -------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-slate-400">
        <span className="chip chip--neutral tabular-nums">
          {total} / {MAX_PHOTOS} photos
        </span>
        {uploading ? (
          <span className="inline-flex items-center gap-1.5 text-brand-200">
            <span className="spinner" aria-hidden="true" /> Uploading…
          </span>
        ) : null}
        {reordering ? <span className="text-slate-400">Saving order…</span> : null}
        {!birthdayId && staged.length > 0 ? (
          <span className="text-amber-300/90">
            Queued — these upload as soon as you save the birthday.
          </span>
        ) : null}
      </div>

      {/* Tiles ---------------------------------------------------------- */}
      {total > 0 ? (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {tiles.map((tile, index) => {
            const isFirst = tile.kind === 'stored' ? index === 0 : index === stored.length;
            const isLast =
              tile.kind === 'stored'
                ? index === stored.length - 1
                : index === tiles.length - 1;
            const src = tile.kind === 'stored' ? tile.photo.public_url : tile.item.previewUrl;
            const busy = tile.kind === 'stored' && busyPhotoId === tile.photo.id;
            const alt = `${tile.kind === 'staged' ? 'Queued' : 'Saved'} photo ${index + 1} for ${who}`;
            const shortLabel = `photo ${index + 1}`;

            return (
              <li
                key={tile.id}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl border bg-black/40',
                  tile.kind === 'staged' && tile.item.status === 'error'
                    ? 'border-rose-400/70'
                    : 'border-white/10',
                )}
              >
                <img
                  src={src}
                  alt={alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />

                {tile.kind === 'staged' && tile.item.status === 'uploading' ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/60">
                    <span className="flex flex-col items-center gap-1.5 text-[0.68rem] font-semibold text-white">
                      <span className="spinner" aria-hidden="true" />
                      Uploading…
                    </span>
                  </span>
                ) : null}

                {tile.kind === 'staged' && tile.item.status === 'error' ? (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-rose-950/85 p-2 text-center">
                    <span className="text-[0.68rem] leading-snug text-rose-100">
                      {tile.item.error ?? 'Upload failed.'}
                    </span>
                    <span className="flex gap-1">
                      {birthdayId ? (
                        <button
                          type="button"
                          className="btn btn--quiet btn--sm"
                          onClick={() => {
                            if (birthdayId) void uploadBatch(birthdayId, [tile.item]);
                          }}
                        >
                          Retry
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        onClick={() => dropStaged(tile.item.key)}
                        aria-label={`Remove ${shortLabel} from the queue`}
                      >
                        Remove
                      </button>
                    </span>
                  </span>
                ) : null}

                {tile.kind === 'staged' && tile.item.status === 'queued' && !birthdayId ? (
                  <span className="absolute left-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-200">
                    Queued
                  </span>
                ) : null}

                {confirmId === tile.id && tile.kind === 'stored' ? (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/85 p-2 text-center">
                    <span className="text-[0.7rem] font-semibold text-white">Delete photo?</span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className="btn btn--danger-solid btn--sm"
                        onClick={() => void removeStored(tile.photo)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        onClick={() => setConfirmId(null)}
                      >
                        Keep
                      </button>
                    </span>
                  </span>
                ) : null}

                {!(confirmId === tile.id && tile.kind === 'stored') ? (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-1 pb-1 pt-5">
                    <span className="flex gap-0.5">
                      <TileButton
                        label={`Move ${shortLabel} earlier`}
                        onClick={() => void move(tile, -1)}
                        disabled={isFirst || uploading || reordering}
                      >
                        ←
                      </TileButton>
                      <TileButton
                        label={`Move ${shortLabel} later`}
                        onClick={() => void move(tile, 1)}
                        disabled={isLast || uploading || reordering}
                      >
                        →
                      </TileButton>
                    </span>
                    <TileButton
                      label={busy ? `Deleting ${shortLabel}` : `Delete ${shortLabel}`}
                      tone="danger"
                      disabled={busy || uploading}
                      onClick={() => {
                        if (tile.kind === 'staged') dropStaged(tile.item.key);
                        else setConfirmId(tile.id);
                      }}
                    >
                      {busy ? <span className="spinner" aria-hidden="true" /> : '🗑'}
                    </TileButton>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[0.8rem] text-slate-400">
          No photos yet — the surprise works fine without them, and you can add
          more later.
        </p>
      )}
    </div>
  );
}

function TileButton({
  children,
  label,
  onClick,
  disabled = false,
  tone = 'neutral',
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-6 w-6 place-items-center rounded-md text-[0.7rem] font-bold leading-none transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-35',
        tone === 'danger'
          ? 'bg-rose-500/25 text-rose-100 hover:bg-rose-500/45'
          : 'bg-white/15 text-white hover:bg-white/30',
      )}
    >
      {children}
    </button>
  );
}
