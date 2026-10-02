import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { DecorationKind, DecorDensity, DecorMotion } from '@/types/theme';
import { randBetween } from './random';

const DENSITY_COUNT: Record<DecorDensity, number> = {
  low: 12,
  medium: 20,
  high: 32,
};

const NOTE_GLYPHS = ['\u266A', '\u266B', '\u266C'];

export interface ThemeDecorationsProps {
  kind: DecorationKind;
  motion: DecorMotion;
  density: DecorDensity;
  /** Different salts scatter the particles differently (avoids identical pages). */
  salt?: number;
  /** Scales the particle count — used for small preview panels. */
  scale?: number;
}

/**
 * CSS-only ambient decoration layer (hearts, petals, sparkles, ...).
 * Positions are deterministic so React re-renders never jitter the layout,
 * and everything is skipped when the user prefers reduced motion.
 */
export const ThemeDecorations = memo(function ThemeDecorations({
  kind,
  motion,
  density,
  salt = 1,
  scale = 1,
}: ThemeDecorationsProps) {
  const particles = useMemo(() => {
    if (kind === 'none') return [];
    const count = Math.max(4, Math.round(DENSITY_COUNT[density] * scale));
    return Array.from({ length: count }, (_, index) => ({
      index,
      left: randBetween(index, salt, 0, 100),
      top: randBetween(index, salt + 6, 4, 94),
      size: randBetween(index, salt + 1, 0.55, 1.7),
      duration: randBetween(index, salt + 2, 0.7, 1.45),
      delay: randBetween(index, salt + 3, 0, 1),
      rotation: randBetween(index, salt + 4, -32, 32),
      drift: randBetween(index, salt + 5, -60, 60),
      glyph: NOTE_GLYPHS[index % NOTE_GLYPHS.length],
    }));
  }, [kind, density, salt, scale]);

  if (kind === 'none') return null;

  return (
    <div className={`decor decor--${motion}`} aria-hidden="true">
      {particles.map((particle) => {
        const style = {
          '--x': `${particle.left.toFixed(2)}%`,
          '--y': `${particle.top.toFixed(2)}%`,
          '--size': particle.size.toFixed(3),
          '--dur': particle.duration.toFixed(3),
          '--delay': `${(-particle.delay * particle.duration * 12).toFixed(2)}s`,
          '--rot': `${particle.rotation.toFixed(1)}deg`,
          '--drift': `${particle.drift.toFixed(1)}px`,
        } as CSSProperties;
        return (
          <span key={particle.index} className={`decor__p decor__p--${kind}`} style={style}>
            {kind === 'notes' ? particle.glyph : null}
          </span>
        );
      })}
    </div>
  );
});
