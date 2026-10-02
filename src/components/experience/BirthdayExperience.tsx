import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ExperienceData, UnlockResult } from '@/types';
import type { ThemeConfig } from '@/types/theme';
import { getTheme } from '@/themes/registry';
import { unlockBirthday } from '@/services/public';
import { MissingConfigError } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { firstName as toFirstName, resolveMessage } from '@/utils/message';
import { useChime } from '@/hooks/useChime';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSong } from '@/hooks/useSong';
import { ConfettiCanvas } from './ConfettiCanvas';
import type { ConfettiHandle } from './ConfettiCanvas';
import {
  ContinueButton,
  FinaleScreen,
  GateScreen,
  MessageScreen,
  Notice,
  PhotosScreen,
  RevealScreen,
  StepDots,
  UnlockingScreen,
} from './screens';
import type { Stage } from './screens';

/* ------------------------------------------------------------------ */
/* Session cache                                                       */
/*                                                                     */
/* Once a visitor has unlocked a page we keep the *unlocked content* in */
/* sessionStorage so that a refresh or a back-navigation does not lock  */
/* them out again. The date of birth is NEVER stored anywhere, and the  */
/* cache is per-tab, expires quickly, and is thrown away the moment the */
/* server says the birthday is inactive or gone.                        */
/* ------------------------------------------------------------------ */

const CACHE_PREFIX = 'hbtyws911:unlocked:';
const CACHE_TTL_MS = 20 * 60 * 1000;

interface CachedExperience {
  savedAt: number;
  data: ExperienceData;
}

function isExperienceData(value: unknown): value is ExperienceData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExperienceData>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.themeId === 'string' &&
    typeof candidate.message === 'string' &&
    Array.isArray(candidate.photos)
  );
}

function readCache(slug: string): ExperienceData | null {
  const key = CACHE_PREFIX + slug;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedExperience;
    if (typeof parsed?.savedAt !== 'number' || !isExperienceData(parsed.data)) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(slug: string, data: ExperienceData): void {
  try {
    const payload: CachedExperience = { savedAt: Date.now(), data };
    window.sessionStorage.setItem(CACHE_PREFIX + slug, JSON.stringify(payload));
  } catch {
    /* private mode / quota — the experience still works, it just re-locks on refresh */
  }
}

function clearCache(slug: string): void {
  try {
    window.sessionStorage.removeItem(CACHE_PREFIX + slug);
  } catch {
    /* nothing to do */
  }
}

/* ------------------------------------------------------------------ */
/* Blocked states                                                      */
/* ------------------------------------------------------------------ */

export type BlockReason = 'not_found' | 'inactive' | 'network' | 'setup';

const BLOCK_COPY: Record<BlockReason, { icon: string; title: string; body: string }> = {
  not_found: {
    icon: '🎈',
    title: 'This surprise isn’t here',
    body: 'The link may have a typo, or the page has been removed. Nothing else to see here — but we hope your day is a lovely one.',
  },
  inactive: {
    icon: '💤',
    title: 'This surprise is currently unavailable.',
    body: 'It has been tucked away for now. Please check back a little later.',
  },
  network: {
    icon: '📡',
    title: 'We couldn’t reach the surprise',
    body: 'Your connection dropped for a moment. Have another go — it usually works the second time.',
  },
  setup: {
    icon: '🛠️',
    title: 'This site is still being set up',
    body: 'The birthday database has not been connected yet, so surprises cannot be opened. Add your Supabase credentials and run supabase/schema.sql (see the README).',
  },
};

/** Polite, information-free screen shown when a page cannot be revealed. */
export function BlockNotice({
  theme,
  reason,
  onRetry,
}: {
  theme: ThemeConfig;
  reason: BlockReason;
  onRetry?: () => void;
}) {
  const copy = BLOCK_COPY[reason];
  return (
    <Notice
      theme={theme}
      icon={copy.icon}
      title={copy.title}
      action={
        onRetry ? (
          <div className="fade-up fade-up-3">
            <ContinueButton theme={theme} onClick={onRetry}>
              Try again
            </ContinueButton>
          </div>
        ) : undefined
      }
    >
      {copy.body}
    </Notice>
  );
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

/** Deliberately generic — it never hints at how close a guess was. */
const WRONG_DOB = "Hmm... that's not it 😄 Try again!";
const TOO_MANY_TRIES = "That's a lot of guesses! 😅 Give it a minute and try again.";
const UNLOCK_MS = 1500;

type UnlockedResult = Extract<UnlockResult, { status: 'unlocked' }>;

function toExperience(result: UnlockedResult): ExperienceData {
  const shortName = toFirstName(result.name);
  const photos = [...result.photos]
    .sort((a, b) => a.order - b.order)
    .map((photo, index) => ({
      url: photo.url,
      alt: `${shortName} — memory ${index + 1}`,
    }));

  return {
    name: result.name,
    themeId: result.theme_id,
    message: resolveMessage(result.preset_message_id, result.custom_message, result.name),
    photos,
    songUrl: result.song_url ?? null,
  };
}

function unlockLabelFor(progress: number): string {
  if (progress < 40) return 'Unlocking your surprise…';
  if (progress < 78) return 'Unwrapping the gift…';
  return 'Almost there…';
}

/* ------------------------------------------------------------------ */
/* The experience                                                      */
/* ------------------------------------------------------------------ */

export interface BirthdayExperienceProps {
  /** Public slug, e.g. `suhail`. */
  slug: string;
  /** Theme from the teaser RPC — used for the locked landing page. */
  theme: ThemeConfig;
  /** First name only. The full name is never exposed before unlocking. */
  firstName: string;
  /** Admin preview: full content is already loaded, so the gate is skipped. */
  previewData?: ExperienceData | null;
}

/**
 * The whole visitor-facing flow:
 * gate → unlock animation → reveal → message → photos → finale.
 *
 * Everything is rendered inside one route, so the browser Back button simply
 * leaves the page (it never lands on an admin screen).
 */
export function BirthdayExperience({
  slug,
  theme,
  firstName,
  previewData = null,
}: BirthdayExperienceProps) {
  const reducedMotion = useReducedMotion();
  const chime = useChime();
  const confetti = useRef<ConfettiHandle | null>(null);

  const initial = useMemo(() => {
    if (previewData) return { stage: 'reveal' as Stage, data: previewData as ExperienceData | null };
    const cached = readCache(slug);
    return cached
      ? { stage: 'reveal' as Stage, data: cached as ExperienceData | null }
      : { stage: 'gate' as Stage, data: null as ExperienceData | null };
  }, [previewData, slug]);

  const [stage, setStage] = useState<Stage>(initial.stage);
  const [data, setData] = useState<ExperienceData | null>(initial.data);
  const song = useSong(data?.songUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [block, setBlock] = useState<BlockReason | null>(null);

  const busyRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((entry) => entry !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  // Cancel any in-flight animation/timers if the visitor navigates away.
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    },
    [],
  );

  const activeTheme = useMemo(() => (data ? getTheme(data.themeId) : theme), [data, theme]);
  const hasPhotos = (data?.photos.length ?? 0) > 0;

  /* --------------------------- transitions --------------------------- */

  const arrive = useCallback(() => {
    setStage('reveal');
    confetti.current?.celebrate({ count: 110, duration: 1.8 });
    chime.play('reveal');
    song.play();
  }, [chime, song]);

  const runUnlock = useCallback(
    (payload: ExperienceData) => {
      setData(payload);
      setStage('unlocking');
      setProgress(0);
      chime.play('unlock');

      if (reducedMotion) {
        setProgress(100);
        later(arrive, 240);
        return;
      }

      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / UNLOCK_MS);
        setProgress(Math.round((1 - Math.pow(1 - t, 3)) * 100));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          later(arrive, 320);
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [arrive, chime, later, reducedMotion],
  );

  const rejectWith = useCallback((message: string) => {
    setError(message);
    setErrorKey((current) => current + 1);
  }, []);

  const handleVerify = useCallback(
    async (dobISO: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setBlock(null);
      chime.unlock(); // the submit tap is the gesture that enables audio

      try {
        const result = await unlockBirthday(slug, dobISO);

        if (result.status === 'unlocked') {
          const payload = toExperience(result);
          writeCache(slug, payload);
          runUnlock(payload);
          return;
        }

        if (result.status === 'invalid') {
          rejectWith(WRONG_DOB);
          return;
        }

        if (result.status === 'rate_limited') {
          rejectWith(TOO_MANY_TRIES);
          return;
        }

        // The page was disabled or deleted while the visitor was on the gate.
        clearCache(slug);
        setData(null);
        setStage('gate');
        setBlock(result.status === 'inactive' ? 'inactive' : 'not_found');
      } catch (err) {
        if (err instanceof MissingConfigError) {
          setBlock('setup');
        } else {
          rejectWith(friendlyError(err));
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [chime, rejectWith, runUnlock, slug],
  );

  const go = useCallback(
    (next: Stage) => {
      setStage(next);
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      if (next === 'message') {
        chime.play('tap');
        confetti.current?.burst({ count: 55, origin: { x: 0.5, y: 0.32 }, spread: 150, speed: 10 });
      } else if (next === 'photos') {
        chime.play('tap');
      } else if (next === 'finale') {
        chime.play('finale');
        confetti.current?.celebrate({ count: 90, duration: 1.5 });
      }
    },
    [chime, reducedMotion],
  );

  const replay = useCallback(() => {
    confetti.current?.stop();
    go('reveal');
    later(() => confetti.current?.celebrate({ count: 100, duration: 1.6 }), 120);
  }, [go, later]);

  const heartTap = useCallback(() => {
    chime.unlock();
    chime.play('tap');
    confetti.current?.burst({ count: 34, origin: { x: 0.5, y: 0.52 }, spread: 360, speed: 8 });
  }, [chime]);

  const toggleSound = useCallback(() => {
    if (chime.muted) {
      chime.setMuted(false);
      chime.unlock();
      chime.play('tap');
      if (song.muted) song.toggleMute();
    } else {
      chime.setMuted(true);
      if (!song.muted) song.toggleMute();
    }
  }, [chime, song]);

  const retry = useCallback(() => {
    setBlock(null);
    setError(null);
    setStage('gate');
  }, []);

  /* ------------------------------ render ------------------------------ */

  let screen: ReactNode;
  if (block) {
    screen = <BlockNotice theme={activeTheme} reason={block} onRetry={retry} />;
  } else if (stage === 'gate' || !data) {
    screen = (
      <GateScreen
        theme={activeTheme}
        firstName={firstName}
        busy={busy}
        error={error}
        errorKey={errorKey}
        onVerify={handleVerify}
      />
    );
  } else if (stage === 'unlocking') {
    screen = <UnlockingScreen progress={progress} label={unlockLabelFor(progress)} />;
  } else if (stage === 'reveal') {
    screen = <RevealScreen theme={activeTheme} name={data.name} onNext={() => go('message')} />;
  } else if (stage === 'message') {
    screen = (
      <MessageScreen
        theme={activeTheme}
        name={data.name}
        message={data.message}
        nextLabel={hasPhotos ? 'See your photos 📸' : 'One last thing ✨'}
        onNext={() => go(hasPhotos ? 'photos' : 'finale')}
      />
    );
  } else if (stage === 'photos') {
    screen = (
      <PhotosScreen
        theme={activeTheme}
        photos={data.photos}
        reducedMotion={reducedMotion}
        onNext={() => go('finale')}
      />
    );
  } else {
    screen = (
      <FinaleScreen
        theme={activeTheme}
        name={data.name}
        reducedMotion={reducedMotion}
        onReplay={replay}
        onHeartTap={heartTap}
      />
    );
  }

  return (
    <>
      <ConfettiCanvas ref={confetti} colors={activeTheme.confetti} disabled={reducedMotion} />

      <button
        type="button"
        className="exp__sound"
        onClick={toggleSound}
        aria-pressed={!chime.muted}
        aria-label={chime.muted ? 'Turn sound on' : 'Turn sound off'}
        title={chime.muted ? 'Sound off' : 'Sound on'}
      >
        <span aria-hidden="true">{chime.muted ? '🔇' : '🔊'}</span>
      </button>

      {screen}

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.55rem',
          paddingBottom: '0.85rem',
          pointerEvents: 'none',
        }}
      >
        {!block && <StepDots stage={stage} />}
        <span className="exp__footer" style={{ marginTop: 0, paddingTop: 0 }}>
          HBTYWS911
        </span>
      </div>
    </>
  );
}
