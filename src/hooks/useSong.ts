import { useCallback, useEffect, useRef, useState } from 'react';

export interface SongHandle {
  /** Whether audio is currently playing. */
  playing: boolean;
  /** Whether the song is muted. */
  muted: boolean;
  /** Toggle mute/unmute. */
  toggleMute: () => void;
  /** Start playback (call after a user gesture). */
  play: () => void;
  /** Stop and reset. */
  stop: () => void;
}

/**
 * Manages an HTML5 Audio element for the birthday song.
 *
 * Browsers block autoplay before a user gesture, so `play()` is called
 * after the DOB unlock tap — the same gesture that enables the chime.
 * The audio loops so the song continues throughout the experience.
 */
export function useSong(url: string | null): SongHandle {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!url) {
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.7;
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [url]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(
      () => setPlaying(true),
      () => { /* autoplay blocked or network error — silent */ },
    );
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setMuted((prev) => {
      const next = !prev;
      audio.muted = next;
      return next;
    });
  }, []);

  return { playing, muted, toggleMute, play, stop };
}
