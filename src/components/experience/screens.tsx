import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ExperienceData } from '@/types';
import type { ThemeConfig } from '@/types/theme';
import { firstName as toFirstName } from '@/utils/message';
import { cn } from '@/utils/cn';
import { GiftBox } from './GiftBox';
import { DobGate } from './DobGate';
import { PhotoGallery } from './PhotoGallery';

export type Stage = 'gate' | 'unlocking' | 'reveal' | 'message' | 'photos' | 'finale';

/** Ordered stages that show progress dots at the bottom of the page. */
export const STAGE_ORDER: Stage[] = ['gate', 'reveal', 'message', 'photos', 'finale'];

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

interface ScreenProps {
  children: ReactNode;
  wide?: boolean;
  top?: boolean;
  className?: string;
}

/** Centred stage wrapper — every screen is one of these. */
export function Screen({ children, wide = false, top = false, className }: ScreenProps) {
  return (
    <div className={cn('exp', top && 'exp--top')}>
      <div className={cn('stage stage-enter', 'exp__panel', wide && 'exp__panel--wide', className)}>
        {children}
      </div>
    </div>
  );
}

/** A themed card used for errors, "unavailable" states and empty galleries. */
export function Notice({
  theme,
  icon,
  title,
  children,
  action,
}: {
  theme: ThemeConfig;
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="exp">
      <div className={`t-card t-card--${theme.card} notice stage stage-enter`}>
        <div className="notice__icon" aria-hidden="true">
          {icon}
        </div>
        <h1 className="notice__title">{title}</h1>
        {children && <p className="notice__body">{children}</p>}
        {action}
      </div>
    </div>
  );
}

/** Small progress dots so the visitor knows the experience has more steps. */
export function StepDots({ stage }: { stage: Stage }) {
  const mapped = stage === 'unlocking' ? 'gate' : stage;
  const activeIndex = STAGE_ORDER.indexOf(mapped);
  if (activeIndex < 0) return null;
  return (
    <div className="steps" aria-hidden="true">
      {STAGE_ORDER.map((item, index) => (
        <span
          key={item}
          className={cn('steps__dot', index <= activeIndex && 'steps__dot--active')}
        />
      ))}
    </div>
  );
}

/** Themed "continue" button shared by every stage. */
export function ContinueButton({
  theme,
  onClick,
  children,
}: {
  theme: ThemeConfig;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`t-btn t-btn--${theme.button} t-btn--lg`} onClick={onClick}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · Gate — the surprise landing + date-of-birth code                */
/* ------------------------------------------------------------------ */

export interface GateScreenProps {
  theme: ThemeConfig;
  firstName: string;
  busy: boolean;
  error: string | null;
  errorKey: number;
  onVerify: (dobISO: string) => void;
}

export function GateScreen({
  theme,
  firstName,
  busy,
  error,
  errorKey,
  onVerify,
}: GateScreenProps) {
  return (
    <Screen>
      <GiftBox state="idle" />
      <p className="exp__eyebrow fade-up fade-up-1">Someone made this for you</p>
      <h1 className="exp__title fade-up fade-up-2">
        You&rsquo;ve got a surprise, {firstName}! 🎁
      </h1>
      <p className="exp__lead fade-up fade-up-3">
        It&rsquo;s locked with one secret code — and only you know it.
      </p>
      <div className="fade-up fade-up-4" style={{ width: '100%', maxWidth: '26rem' }}>
        <DobGate
          firstName={firstName}
          busy={busy}
          error={error}
          errorKey={errorKey}
          onSubmit={onVerify}
        />
      </div>
      <span className="sr-only">
        This page is a birthday surprise. Enter the date of birth to continue.
      </span>
      <span className="t-chip" aria-hidden="true" style={{ opacity: 0.75 }}>
        {theme.name}
      </span>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Unlocking — lid flies off, progress bar fills                   */
/* ------------------------------------------------------------------ */

export function UnlockingScreen({
  progress,
  label,
}: {
  progress: number;
  label: string;
}) {
  return (
    <Screen>
      <div className="unlock">
        <div style={{ position: 'relative' }}>
          <span className="unlock__ring" />
          <span className="unlock__ring unlock__ring--2" />
          <GiftBox state="opening" />
        </div>
        <p className="unlock__label">{label}</p>
        <div
          className="unlock__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Unlocking your surprise"
        >
          <div className="unlock__bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · Reveal — "Happy Birthday, {name}! 🎉"                           */
/* ------------------------------------------------------------------ */

export function RevealScreen({
  theme,
  name,
  onNext,
}: {
  theme: ThemeConfig;
  name: string;
  onNext: () => void;
}) {
  const shortName = toFirstName(name);
  return (
    <Screen>
      <div className="reveal">
        <span className="reveal__badge pop-in">🎉</span>
        <h1 className="reveal__title">Happy Birthday, {shortName}!</h1>
        <p className="reveal__sub fade-up fade-up-2">
          Today the whole world gets to celebrate you.
        </p>
        <div className="fade-up fade-up-3">
          <ContinueButton theme={theme} onClick={onNext}>
            Read your message 💌
          </ContinueButton>
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · Message                                                         */
/* ------------------------------------------------------------------ */

export function MessageScreen({
  theme,
  name,
  message,
  onNext,
  nextLabel,
}: {
  theme: ThemeConfig;
  name: string;
  message: string;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <Screen>
      <div className="message">
        <div className={`message__card t-card t-card--${theme.card} fade-up`}>
          <span className="message__quote" aria-hidden="true">
            &ldquo;
          </span>
          <p className="message__text">{message}</p>
          <p className="message__sign">— with love, just for {toFirstName(name)}</p>
        </div>
        <div className="fade-up fade-up-2">
          <ContinueButton theme={theme} onClick={onNext}>
            {nextLabel}
          </ContinueButton>
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 5 · Photos                                                          */
/* ------------------------------------------------------------------ */

export function PhotosScreen({
  theme,
  photos,
  onNext,
  reducedMotion,
}: {
  theme: ThemeConfig;
  photos: ExperienceData['photos'];
  onNext: () => void;
  reducedMotion: boolean;
}) {
  return (
    <Screen wide top>
      <div style={{ width: '100%' }} className="fade-up">
        <PhotoGallery
          photos={photos}
          style={theme.photo}
          title="Your Memories"
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="fade-up fade-up-3">
        <ContinueButton theme={theme} onClick={onNext}>
          One last thing ✨
        </ContinueButton>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 6 · Finale                                                          */
/* ------------------------------------------------------------------ */

export function FinaleScreen({
  theme,
  name,
  onReplay,
  onHeartTap,
  reducedMotion,
}: {
  theme: ThemeConfig;
  name: string;
  onReplay: () => void;
  onHeartTap: () => void;
  reducedMotion: boolean;
}) {
  const [bursts, setBursts] = useState<number[]>([]);
  const counter = useRef(0);

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const angle = (360 / 16) * index + (index % 2 === 0 ? 6 : -4);
        const distance = 62 + ((index * 13) % 46);
        return { angle, distance } as const;
      }),
    [],
  );

  const tap = useCallback(() => {
    counter.current += 1;
    const id = counter.current;
    setBursts((current) => [...current, id]);
    onHeartTap();
    window.setTimeout(() => {
      setBursts((current) => current.filter((entry) => entry !== id));
    }, 900);
  }, [onHeartTap]);

  const shortName = toFirstName(name);

  return (
    <Screen>
      <div className="finale">
        <button
          type="button"
          className="finale__heart"
          onClick={tap}
          aria-label="Tap to send a birthday heart"
        >
          <span className="finale__heart-shape" />
          {bursts.map((id) => (
            <span className="burst" key={id}>
              {particles.map((particle) => {
                const style = {
                  '--a': `${particle.angle}deg`,
                  '--d': `${particle.distance}px`,
                  animation: reducedMotion ? 'none' : undefined,
                } as CSSProperties;
                return <span className="burst__p" style={style} key={particle.angle} />;
              })}
            </span>
          ))}
        </button>

        <h1 className="exp__title fade-up" style={{ fontSize: 'clamp(1.7rem, 6.5vw, 2.6rem)' }}>
          Make a wish, {shortName} 🌠
        </h1>
        <p className="exp__lead fade-up fade-up-2">
          Wherever this year takes you, may it be kinder, brighter and even more
          wonderful than you imagine. Happy Birthday!
        </p>

        <div className="fade-up fade-up-3" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <ContinueButton theme={theme} onClick={onReplay}>
            Replay the surprise 🔁
          </ContinueButton>
        </div>
      </div>
    </Screen>
  );
}
