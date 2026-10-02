import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'hbtyws911:sound';

export type ChimeName = 'unlock' | 'reveal' | 'tap' | 'finale';

interface AudioApi {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  play: (name: ChimeName) => void;
  /** Browsers block audio until a gesture — call this from the first tap. */
  unlock: () => void;
}

type Ctor = typeof AudioContext;

function getCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null;
}

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Tiny dependency-free sound effects built from the Web Audio API.
 *
 * Nothing is autoplayed: the context is only created (and resumed) after the
 * visitor taps, so no browser warning is triggered. Sound is on by default and
 * can be muted from the corner toggle; the choice persists per device.
 */
export function useChime(): AudioApi {
  const [muted, setMutedState] = useState<boolean>(() => !readPreference());
  const ctxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const ensureContext = useCallback((): AudioContext | null => {
    const Ctor = getCtor();
    if (!Ctor) return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
    };
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on');
    } catch {
      /* private mode — the preference simply won't persist */
    }
  }, []);

  const toggleMuted = useCallback(() => setMuted(!mutedRef.current), [setMuted]);

  /** One soft sine note with a quick attack and exponential decay. */
  const note = useCallback(
    (ctx: AudioContext, frequency: number, startAt: number, duration: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.05);
    },
    [],
  );

  const play = useCallback(
    (name: ChimeName) => {
      if (mutedRef.current) return;
      const ctx = ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const sequences: Record<ChimeName, { f: number; t: number; d: number; g: number }[]> = {
        tap: [{ f: 880, t: 0, d: 0.12, g: 0.05 }],
        unlock: [
          { f: 523.25, t: 0, d: 0.24, g: 0.07 },
          { f: 659.25, t: 0.11, d: 0.26, g: 0.07 },
          { f: 783.99, t: 0.22, d: 0.34, g: 0.08 },
        ],
        reveal: [
          { f: 659.25, t: 0, d: 0.2, g: 0.07 },
          { f: 880, t: 0.09, d: 0.22, g: 0.07 },
          { f: 1046.5, t: 0.18, d: 0.42, g: 0.08 },
          { f: 1318.5, t: 0.3, d: 0.5, g: 0.06 },
        ],
        finale: [
          { f: 783.99, t: 0, d: 0.3, g: 0.07 },
          { f: 987.77, t: 0.12, d: 0.32, g: 0.07 },
          { f: 1174.7, t: 0.24, d: 0.5, g: 0.08 },
        ],
      };
      try {
        for (const step of sequences[name]) {
          note(ctx, step.f, now + step.t, step.d, step.g);
        }
      } catch {
        /* audio is a nicety — never let it break the experience */
      }
    },
    [ensureContext, note],
  );

  const unlock = useCallback(() => {
    ensureContext();
  }, [ensureContext]);

  return useMemo(
    () => ({ muted, setMuted, toggleMuted, play, unlock }),
    [muted, setMuted, toggleMuted, play, unlock],
  );
}
