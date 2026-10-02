import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { TeaserResult } from '@/types';
import { getBirthdayTeaser } from '@/services/public';
import { MissingConfigError } from '@/lib/supabase';
import { DEFAULT_THEME_ID, getTheme } from '@/themes/registry';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ThemedStage } from '@/components/theme/ThemedStage';
import { BirthdayExperience, BlockNotice } from '@/components/experience/BirthdayExperience';
import type { BlockReason } from '@/components/experience/BirthdayExperience';

/** Varies the ambient particle scatter so no two birthday pages look identical. */
function slugSalt(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) % 100003;
  }
  return 1 + (hash % 89);
}

type TeaserState =
  | { phase: 'loading' }
  | { phase: 'ready'; result: TeaserResult }
  | { phase: 'error'; reason: BlockReason };

function LoadingScreen() {
  return (
    <div className="exp">
      <div className="exp-loader" role="status" aria-live="polite">
        <span className="exp-loader__ring" />
        <span className="exp-loader__text">Finding your surprise…</span>
      </div>
    </div>
  );
}

/**
 * Public birthday page — `/:slug`.
 *
 * This route is completely separate from the admin app: there is no navigation,
 * no branding link and no admin control anywhere in the tree. Before anything
 * is shown we ask the server for a *teaser* (first name + theme only). The date
 * of birth, the message and the photos are only ever returned by the unlock
 * RPC after a correct guess.
 */
export default function BirthdayPage() {
  const params = useParams<{ slug: string }>();
  const slug = (params.slug ?? '').toLowerCase();

  const [state, setState] = useState<TeaserState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setState({ phase: 'loading' });
    try {
      const result = await getBirthdayTeaser(slug);
      setState({ phase: 'ready', result });
    } catch (error) {
      // Never surface a raw database error on a page a friend will see.
      if (error instanceof MissingConfigError) {
        setState({ phase: 'error', reason: 'setup' });
        return;
      }
      const code = (error as { code?: string } | null)?.code;
      const message = error instanceof Error ? error.message : String(error ?? '');
      const notInstalled =
        code === '42P01' || code === '42883' || /does not exist/i.test(message);
      setState({ phase: 'error', reason: notInstalled ? 'setup' : 'network' });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  const teaser =
    state.phase === 'ready' && state.result.status === 'active' ? state.result : null;

  const theme = useMemo(() => getTheme(teaser?.theme_id ?? DEFAULT_THEME_ID), [teaser]);
  const salt = useMemo(() => slugSalt(slug), [slug]);
  const personName = teaser?.first_name?.trim() || 'you';

  useDocumentMeta({
    // The title reveals a first name at most — never the date of birth, which
    // is the access code for the page.
    title: teaser ? `A Special Surprise for ${personName} 🎁` : 'A Special Surprise 🎁',
    description: 'Someone made this page just for you. Open it to see what they have been hiding.',
    themeColor: theme.colors.bg2,
    bodyBackground: theme.colors.bg1,
    bodyColor: theme.colors.text,
    robots: 'noindex, nofollow',
    publicSurface: true,
  });

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  let body: ReactNode;
  if (state.phase === 'loading') {
    body = <LoadingScreen />;
  } else if (state.phase === 'error') {
    body = <BlockNotice theme={theme} reason={state.reason} onRetry={retry} />;
  } else if (!teaser) {
    body = (
      <BlockNotice
        theme={theme}
        reason={state.result.status === 'inactive' ? 'inactive' : 'not_found'}
      />
    );
  } else {
    body = (
      <BirthdayExperience
        key={slug}
        slug={slug}
        theme={theme}
        firstName={personName}
      />
    );
  }

  return (
    <ThemedStage theme={theme} mode="viewport" salt={salt}>
      {body}
    </ThemedStage>
  );
}
