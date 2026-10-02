import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  Birthday,
  BirthdayInput,
  BirthdayPhoto,
  BirthdayStatus,
  BirthdayWithPhotos,
  ExperiencePhoto,
} from '@/types';
import { DEFAULT_THEME_ID } from '@/themes/registry';
import { PRESET_MESSAGES } from '@/data/presetMessages';
import { createBirthday, isSlugTaken, updateBirthday } from '@/services/birthdays';
import { uploadBirthdayPhoto } from '@/services/photos';
import { prepareImageForUpload } from '@/lib/images';
import { friendlyError } from '@/lib/errors';
import { findAvailableSlug, validateSlug } from '@/utils/slug';
import { isValidDateParts, toISODate } from '@/utils/date';
import { publicUrlFor } from '@/utils/link';
import { isSupabaseConfigured } from '@/lib/env';
import { resolveMessage } from '@/utils/message';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { PhotoUploader } from './PhotoUploader';
import type { StagedPhoto } from './PhotoUploader';
import { ThemePicker } from './ThemePicker';
import { SongPicker } from './SongPicker';
import { Modal } from '@/components/ui/Modal';

/** What the parent needs after a successful save. */
export interface SaveResult {
  birthday: Birthday;
  created: boolean;
  photosUploaded: number;
  photosFailed: number;
}

export interface BirthdayFormProps {
  mode: 'create' | 'edit';
  /** Existing record (with photos) when editing. */
  initial?: BirthdayWithPhotos | null;
  onSaved: (result: SaveResult) => void;
  onCancel: () => void;
}

interface FieldErrors {
  name?: string;
  dob?: string;
  slug?: string;
}

type MessageMode = 'preset' | 'custom';

const STATUS_OPTIONS: Array<{
  value: BirthdayStatus;
  title: string;
  body: string;
}> = [
  {
    value: 'active',
    title: 'Active',
    body: 'Anyone with the link can open the surprise with the date of birth.',
  },
  {
    value: 'inactive',
    title: 'Inactive',
    body: 'The page is paused — visitors see “This surprise is currently unavailable.”',
  },
];

const DEFAULT_PRESET_ID = PRESET_MESSAGES[0].id;

function isISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  return isValidDateParts(Number(match[3]), Number(match[2]), Number(match[1]));
}

/**
 * The create / edit form for one birthday.
 *
 * Layout mirrors the public data model: the person (name, date of birth, link),
 * the message, the photos, the theme, and the on/off switch. Everything is
 * validated before a single request is made, and the slug is auto-generated
 * from the name until the admin edits it by hand.
 */
export function BirthdayForm({ mode, initial = null, onSaved, onCancel }: BirthdayFormProps) {
  const toast = useToast();

  const [name, setName] = useState(initial?.name ?? '');
  const [slugDraft, setSlugDraft] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [dob, setDob] = useState(initial?.date_of_birth ?? '');
  const [themeId, setThemeId] = useState(initial?.theme_id ?? DEFAULT_THEME_ID);
  const [messageMode, setMessageMode] = useState<MessageMode>(
    initial?.custom_message?.trim() ? 'custom' : 'preset',
  );
  const [presetMessageId, setPresetMessageId] = useState(
    initial?.preset_message_id ?? DEFAULT_PRESET_ID,
  );
  const [customMessage, setCustomMessage] = useState(initial?.custom_message ?? '');
  const [songId, setSongId] = useState<string | null>(initial?.song_id ?? null);
  const [status, setStatus] = useState<BirthdayStatus>(initial?.status ?? 'active');
  const [stored, setStored] = useState<BirthdayPhoto[]>(initial?.photos ?? []);
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const dobRef = useRef<HTMLInputElement | null>(null);
  const slugRef = useRef<HTMLInputElement | null>(null);
  /** Bumps monotonically so a stale async slug answer can never win. */
  const slugRequestRef = useRef(0);

  const excludeId = initial?.id ?? undefined;
  const birthdayId = mode === 'edit' && initial ? initial.id : null;
  const trimmedName = name.trim();
  const todayISO = useMemo(() => {
    const now = new Date();
    return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  /* ------------------------- slug auto-generation ------------------------ */

  const suggestSlug = useCallback(
    async (base: string) => {
      if (slugTouched) return;
      const clean = base.trim();
      if (!clean) {
        setSlugDraft('');
        setSlugError(null);
        return;
      }
      if (!isSupabaseConfigured) return;
      const request = (slugRequestRef.current += 1);
      try {
        const available = await findAvailableSlug(clean, (slug) => isSlugTaken(slug, excludeId));
        if (slugRequestRef.current === request) {
          setSlugDraft(available);
          setSlugError(null);
        }
      } catch {
        // The submit-time check reports the real problem; stay silent here.
      }
    },
    [excludeId, slugTouched],
  );

  useEffect(() => {
    if (slugTouched) return;
    const timer = window.setTimeout(() => void suggestSlug(name), 450);
    return () => window.clearTimeout(timer);
  }, [name, slugTouched, suggestSlug]);

  /* --------------------- slug availability (manual edit) ------------------ */

  useEffect(() => {
    if (!slugTouched) return;
    const problem = validateSlug(slugDraft);
    if (problem) {
      setSlugError(problem);
      setSlugChecking(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setSlugError(null);
      setSlugChecking(false);
      return;
    }
    const request = (slugRequestRef.current += 1);
    setSlugChecking(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const taken = await isSlugTaken(slugDraft, excludeId);
          if (slugRequestRef.current !== request) return;
          setSlugError(taken ? 'This link is already taken. Please choose a different one.' : null);
        } catch {
          if (slugRequestRef.current === request) setSlugError(null);
        } finally {
          if (slugRequestRef.current === request) setSlugChecking(false);
        }
      })();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [slugDraft, slugTouched, excludeId]);

  /* ------------------------------ save flow ------------------------------ */

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (saving) return;

      const errors: FieldErrors = {};
      if (!trimmedName) {
        errors.name = 'A name is required — this is who the surprise is for.';
      } else if (trimmedName.length > 80) {
        errors.name = 'Keep the name under 80 characters.';
      }
      if (!dob) {
        errors.dob = 'A date of birth is required — it is also the access code.';
      } else if (!isISODate(dob)) {
        errors.dob = 'That date looks invalid. Please check it.';
      }
      const slugProblem = validateSlug(slugDraft);
      if (slugProblem) errors.slug = slugProblem;

      if (Object.values(errors).some(Boolean)) {
        setFieldErrors(errors);
        (errors.name ? nameRef : errors.dob ? dobRef : slugRef).current?.focus();
        return;
      }

      setFieldErrors({});
      setSaving(true);
      try {
        // Final authority on uniqueness — the live check may lag typing.
        if (isSupabaseConfigured && (await isSlugTaken(slugDraft, excludeId))) {
          setFieldErrors({ slug: 'This link is already taken. Please choose a different one.' });
          slugRef.current?.focus();
          return;
        }

        const values: BirthdayInput = {
          name: trimmedName,
          slug: slugDraft,
          date_of_birth: dob,
          theme_id: themeId,
          preset_message_id: presetMessageId,
          custom_message: messageMode === 'custom' ? customMessage.trim() || null : null,
          song_id: songId,
          status,
        };

        const birthday =
          mode === 'edit' && initial ? await updateBirthday(initial.id, values) : await createBirthday(values);

        // In create mode the photos were queued locally (no row existed yet).
        let photosUploaded = 0;
        let photosFailed = 0;
        if (mode === 'create' && staged.length > 0) {
          let order = 0;
          for (const item of staged) {
            let preparedPreview: string | null = null;
            try {
              const prepared = await prepareImageForUpload(item.file);
              preparedPreview = prepared.previewUrl;
              await uploadBirthdayPhoto(birthday.id, prepared, order);
              order += 1;
              photosUploaded += 1;
            } catch {
              photosFailed += 1;
            } finally {
              if (preparedPreview) URL.revokeObjectURL(preparedPreview);
            }
          }
        }

        onSaved({ birthday, created: mode === 'create', photosUploaded, photosFailed });
      } catch (error) {
        toast.error(friendlyError(error));
      } finally {
        setSaving(false);
      }
    },
    [
      saving,
      trimmedName,
      dob,
      slugDraft,
      excludeId,
      themeId,
      presetMessageId,
      messageMode,
      customMessage,
      status,
      mode,
      initial,
      staged,
      onSaved,
      toast,
    ],
  );

  /* ------------------------------ derived data --------------------------- */

  const previewMessage = useMemo(
    () =>
      resolveMessage(
        messageMode === 'preset' ? presetMessageId : null,
        messageMode === 'custom' ? customMessage : null,
        trimmedName || 'Maya',
      ),
    [messageMode, presetMessageId, customMessage, trimmedName],
  );

  const previewPhotos = useMemo<ExperiencePhoto[]>(() => {
    const storedPhotos = stored.map((photo, index) => ({
      url: photo.public_url,
      alt: `${trimmedName || 'Birthday'} photo ${index + 1}`,
    }));
    const stagedPhotos = staged.map((item, index) => ({
      url: item.previewUrl,
      alt: `Queued photo ${index + 1}`,
    }));
    return [...storedPhotos, ...stagedPhotos];
  }, [stored, staged, trimmedName]);

  const previewSlug = validateSlug(slugDraft) ? null : slugDraft;
  const linkPreview = previewSlug ? publicUrlFor(previewSlug) : null;
  const isDirty = useMemo(() => {
    if (staged.length > 0) return true;
    if (!initial) return trimmedName !== '' || dob !== '' || customMessage.trim() !== '' || songId !== null;
    return (
      name !== initial.name ||
      slugDraft !== initial.slug ||
      dob !== initial.date_of_birth ||
      themeId !== initial.theme_id ||
      presetMessageId !== (initial.preset_message_id ?? DEFAULT_PRESET_ID) ||
      customMessage !== (initial.custom_message ?? '') ||
      songId !== (initial.song_id ?? null) ||
      status !== initial.status
    );
  }, [staged.length, initial, name, slugDraft, dob, themeId, presetMessageId, customMessage, songId, status, trimmedName]);

  const handleCancel = useCallback(() => {
    if (isDirty) setConfirmLeave(true);
    else onCancel();
  }, [isDirty, onCancel]);

  const showSlugError = fieldErrors.slug ?? slugError;

  /* -------------------------------- render ------------------------------- */

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-busy={saving}>
      {/* ------------------------------- Person ------------------------------ */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">The person</h2>
            <p className="text-[0.8rem] text-slate-400 mt-0.5">
              Who this surprise is for — and the date that unlocks it.
            </p>
          </div>
        </div>
        <div className="panel__body grid gap-5">
          <div className="field">
            <label className="field__label field__label--required" htmlFor="bf-name">
              Person name
            </label>
            <input
              ref={nameRef}
              id="bf-name"
              className={cn('input', fieldErrors.name && 'input--error')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Muhammed Suhail"
              maxLength={80}
              autoComplete="off"
              disabled={saving}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'bf-name-error' : undefined}
            />
            {fieldErrors.name ? (
              <span className="field__error" id="bf-name-error" role="alert">
                {fieldErrors.name}
              </span>
            ) : (
              <span className="field__hint">Shown on the surprise page as “Hey, Suhail! 🎁”.</span>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="field">
              <label className="field__label field__label--required" htmlFor="bf-dob">
                Date of birth
              </label>
              <input
                ref={dobRef}
                id="bf-dob"
                type="date"
                className={cn('input', fieldErrors.dob && 'input--error')}
                value={dob}
                min="1900-01-01"
                max={todayISO}
                onChange={(event) => setDob(event.target.value)}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.dob)}
                aria-describedby={fieldErrors.dob ? 'bf-dob-error' : 'bf-dob-hint'}
              />
              {fieldErrors.dob ? (
                <span className="field__error" id="bf-dob-error" role="alert">
                  {fieldErrors.dob}
                </span>
              ) : (
                <span className="field__hint" id="bf-dob-hint">
                  This date <strong>is</strong> the access code — the birthday person enters it to
                  unlock the surprise. Keep it to yourself.
                </span>
              )}
            </div>

            <div className="field">
              <label className="field__label field__label--required" htmlFor="bf-slug">
                Public link
              </label>
              <div className="relative flex items-center">
                <span
                  aria-hidden="true"
                  className="absolute left-3 text-slate-500 text-sm pointer-events-none"
                >
                  /
                </span>
                <input
                  ref={slugRef}
                  id="bf-slug"
                  className={cn('input pl-7 font-mono text-[0.88rem]', showSlugError && 'input--error')}
                  value={slugDraft}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlugDraft(event.target.value);
                  }}
                  placeholder="suhail"
                  maxLength={60}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={saving}
                  aria-invalid={Boolean(showSlugError)}
                  aria-describedby="bf-slug-hint"
                />
              </div>
              {showSlugError ? (
                <span className="field__error" role="alert">
                  {showSlugError}
                </span>
              ) : (
                <span className="field__hint" id="bf-slug-hint">
                  Generated from the name — edit it if you like (lowercase letters, numbers and
                  hyphens).
                </span>
              )}
              <span className="field__hint" aria-live="polite">
                {linkPreview ? (
                  <>
                    {slugChecking ? 'Checking availability…' : 'Public link: '}
                    {!slugChecking && <span className="text-slate-300 font-mono">{linkPreview}</span>}
                  </>
                ) : null}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Message ----------------------------- */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Birthday message</h2>
            <p className="text-[0.8rem] text-slate-400 mt-0.5">
              Pick a preset, or write something personal. A custom message always wins.
            </p>
          </div>
        </div>
        <div className="panel__body grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Message source">
            {(
              [
                { value: 'preset', title: 'Use a preset', body: 'One of the ready-made messages.' },
                { value: 'custom', title: 'Write my own', body: 'A personal message, in your words.' },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  'relative flex flex-col gap-1 rounded-2xl border p-3.5 cursor-pointer transition-colors',
                  messageMode === option.value
                    ? 'border-brand-400/60 bg-brand-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/25',
                )}
              >
                <input
                  type="radio"
                  name="message-mode"
                  className="sr-only peer"
                  checked={messageMode === option.value}
                  onChange={() => setMessageMode(option.value)}
                  disabled={saving}
                />
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'w-2 h-2 rounded-full',
                      messageMode === option.value ? 'bg-brand-400' : 'bg-slate-600',
                    )}
                  />
                  {option.title}
                </span>
                <span className="text-[0.78rem] text-slate-400">{option.body}</span>
              </label>
            ))}
          </div>

          {messageMode === 'preset' ? (
            <div className="field">
              <label className="field__label" htmlFor="bf-preset">
                Preset message
              </label>
              <select
                id="bf-preset"
                className="input"
                value={presetMessageId}
                onChange={(event) => setPresetMessageId(event.target.value)}
                disabled={saving}
              >
                {PRESET_MESSAGES.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <span className="field__hint">
                Presets live in the code (<code className="text-slate-300">src/data/presetMessages.ts</code>)
                — edit one there and every birthday using it updates.
              </span>
            </div>
          ) : (
            <div className="field">
              <label className="field__label" htmlFor="bf-custom">
                Custom message
              </label>
              <textarea
                id="bf-custom"
                className="input"
                value={customMessage}
                onChange={(event) => setCustomMessage(event.target.value)}
                placeholder="Dear Suhail, …"
                maxLength={1200}
                disabled={saving}
              />
              <span className="field__hint">
                Optional — write <code className="text-slate-300">{'{name}'}</code> to insert their
                first name. Leave it empty to fall back to the preset.
              </span>
            </div>
          )}

          <figure className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <figcaption className="text-[0.7rem] uppercase tracking-[0.1em] text-slate-500 mb-2">
              Preview
            </figcaption>
            <blockquote className="text-[0.92rem] leading-relaxed text-slate-200 whitespace-pre-wrap">
              {previewMessage}
            </blockquote>
          </figure>
        </div>
      </section>

      {/* -------------------------------- Photos ------------------------------ */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Photos</h2>
            <p className="text-[0.8rem] text-slate-400 mt-0.5">
              Optional — memories that appear on the page after the message.
            </p>
          </div>
        </div>
        <div className="panel__body">
          <PhotoUploader
            birthdayId={birthdayId}
            stored={stored}
            onStoredChange={setStored}
            staged={staged}
            onStagedChange={setStaged}
            personName={trimmedName}
            disabled={saving}
          />
        </div>
      </section>

      {/* -------------------------------- Theme ------------------------------- */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Theme</h2>
            <p className="text-[0.8rem] text-slate-400 mt-0.5">
              The whole look of the surprise page — colours, decorations, fonts and animations.
            </p>
          </div>
        </div>
        <div className="panel__body">
          <ThemePicker
            value={themeId}
            onChange={setThemeId}
            personName={trimmedName || undefined}
            message={previewMessage}
            photos={previewPhotos}
          />
        </div>
      </section>

      {/* ------------------------------- Music -------------------------------- */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Music</h2>
            <p className="text-[0.8rem] text-slate-400 mt-0.5">
              A song that plays when the birthday person opens their surprise.
            </p>
          </div>
        </div>
        <div className="panel__body">
          <SongPicker value={songId} onChange={setSongId} />
        </div>
      </section>

      {/* ------------------------------ Status ------------------------------- */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Status</h2>
            <p className="text-[0.8rem] text-slate-400 mt-0.5">
              Turn the page off without deleting anything.
            </p>
          </div>
        </div>
        <div className="panel__body">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Birthday status">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'relative flex flex-col gap-1 rounded-2xl border p-3.5 cursor-pointer transition-colors',
                  status === option.value
                    ? option.value === 'active'
                      ? 'border-emerald-400/50 bg-emerald-500/10'
                      : 'border-amber-400/50 bg-amber-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/25',
                )}
              >
                <input
                  type="radio"
                  name="birthday-status"
                  className="sr-only peer"
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  disabled={saving}
                />
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'w-2 h-2 rounded-full',
                      status === option.value
                        ? option.value === 'active'
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                        : 'bg-slate-600',
                    )}
                  />
                  {option.title}
                </span>
                <span className="text-[0.78rem] text-slate-400">{option.body}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- Actions ----------------------------- */}
      <div className="panel--solid panel p-4 flex flex-wrap items-center gap-3">
        <p className="text-[0.8rem] text-slate-400 mr-auto min-w-[12rem]">
          {mode === 'create'
            ? 'The birthday page is public the moment you create it — share the link only with people who should see it.'
            : 'Saving updates the public page immediately.'}
        </p>
        <button type="button" className="btn btn--ghost" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? <span className="spinner" aria-hidden="true" /> : null}
          {saving
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create birthday'
              : 'Save changes'}
        </button>
      </div>

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave without saving?"
        subtitle="Your changes will be lost."
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmLeave(false)}>
              Keep editing
            </button>
            <button
              type="button"
              className="btn btn--danger-solid"
              onClick={() => {
                setConfirmLeave(false);
                onCancel();
              }}
            >
              Leave without saving
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          {staged.length > 0
            ? `The ${staged.length} queued ${staged.length === 1 ? 'photo has' : 'photos have'} not been uploaded yet and will be discarded.`
            : 'The details you entered on this form will be discarded.'}
        </p>
      </Modal>
    </form>
  );
}
