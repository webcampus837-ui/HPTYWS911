import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BirthdayExperience } from '@/components/experience/BirthdayExperience';
import { ThemedStage } from '@/components/theme/ThemedStage';
import { EmptyState } from '@/components/ui/EmptyState';
import { getBirthday } from '@/services/birthdays';
import { getTheme } from '@/themes/registry';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { firstName, resolveMessage } from '@/utils/message';
import type { BirthdayWithPhotos, ExperienceData } from '@/types';
import { friendlyError } from '@/lib/errors';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'missing' }
  | { kind: 'ready'; birthday: BirthdayWithPhotos };

/** Varies the ambient particle scatter so no two pages look identical. */
function idSalt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100003;
  }
  return 1 + (hash % 89);
}

/**
 * Admin preview of a real birthday — the actual four-step experience, not a
 * mock. The route sits behind RequireAuth, so this never weakens the public
 * gate: by default the admin still types the date of birth to unlock it
 * exactly like a visitor would. "Skip date check" passes the loaded content
 * straight into the experience, which is what §28 allows because the
 * authenticated admin explicitly asked for a preview.
 */
export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [skipGate, setSkipGate] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setState({ kind: 'missing' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const birthday = await getBirthday(id);
      setState(birthday ? { kind: 'ready', birthday } : { kind: 'missing' });
    } catch (error) {
      setState({ kind: 'error', message: friendlyError(error) });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const birthday = state.kind === 'ready' ? state.birthday : null;
  const theme = useMemo(() => getTheme(birthday?.theme_id), [birthday]);
  const person = birthday ? firstName(birthday.name) : 'friend';
  const salt = useMemo(() => idSalt(id ?? 'preview'), [id]);

  useDocumentMeta({
    title: birthday ? `Preview · ${person}'s birthday 🎁` : 'Preview · HBTYWS911',
    description: 'Admin preview of a birthday surprise page.',
    themeColor: theme.colors.bg2,
    bodyBackground: theme.colors.bg1,
    bodyColor: theme.colors.text,
    robots: 'noindex, nofollow',
    publicSurface: true,
  });

  // Full content for the skip-gate toggle. Resolved with the exact same rules
  // as the public unlock RPC, so this preview is faithful to what a visitor
  // sees after entering the correct date.
  const previewData: ExperienceData | null = useMemo(() => {
    if (!birthday) return null;
    return {
      name: birthday.name,
      themeId: birthday.theme_id,
      message: resolveMessage(birthday.preset_message_id, birthday.custom_message, birthday.name),
      photos: [...birthday.photos]
        .sort((a, b) => a.display_order - b.display_order)
        .map((photo) => ({
          url: photo.public_url,
          alt: `A birthday memory for ${firstName(birthday.name)}`,
        })),
      songUrl: birthday.song?.public_url ?? null,
    };
  }, [birthday]);

  let body: ReactNode;
  if (state.kind === 'loading') {
    body = (
      <div className="exp">
        <div className="exp-loader" role="status" aria-live="polite">
          <span className="exp-loader__ring" />
          <span className="exp-loader__text">Preparing the preview…</span>
        </div>
      </div>
    );
  } else if (state.kind === 'error') {
    body = (
      <div className="app-shell">
        <div className="app-container" style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <EmptyState
            icon="⚠️"
            title="Couldn't load this preview"
            description={state.message}
            action={
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void load()}>
                Try again
              </button>
            }
          />
        </div>
      </div>
    );
  } else if (state.kind === 'missing' || !birthday) {
    body = (
      <div className="app-shell">
        <div className="app-container" style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <EmptyState
            icon="🎈"
            title="This birthday no longer exists"
            description="It may have been deleted while you were previewing it."
            action={
              <Link to="/admin" className="btn btn--primary btn--sm">
                Back to dashboard
              </Link>
            }
          />
        </div>
      </div>
    );
  } else {
    body = (
      <BirthdayExperience
        key={`${birthday.id}:${skipGate ? 'skip' : 'gate'}`}
        slug={birthday.slug}
        theme={theme}
        firstName={person}
        previewData={skipGate ? previewData : null}
      />
    );
  }

  return (
    <ThemedStage theme={theme} mode="viewport" salt={salt}>
      {body}

      {birthday ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3">
          <div
            className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-white/15 bg-slate-950/80 py-2 pl-4 pr-2 text-xs text-slate-200 shadow-xl backdrop-blur"
            role="region"
            aria-label="Admin preview controls"
          >
            <span className="font-semibold text-white">
              👀 Previewing {person}'s page
            </span>
            <span className="hidden text-slate-400 sm:inline">
              {skipGate
                ? 'Date check skipped — this is the unlocked view.'
                : 'Visitors must enter the date of birth to unlock this.'}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-pressed={skipGate}
              onClick={() => setSkipGate((value) => !value)}
            >
              {skipGate ? 'Restore date check' : 'Skip date check'}
            </button>
            <Link to={`/admin/birthdays/${birthday.id}/edit`} className="btn btn--primary btn--sm">
              Back to editing
            </Link>
          </div>
        </div>
      ) : null}
    </ThemedStage>
  );
}
