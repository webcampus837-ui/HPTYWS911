import type { CSSProperties } from 'react';
import type { ThemeConfig } from '@/types/theme';
import { fontStack } from './fonts';

/** Normalise any hex color (#rgb or #rrggbb) to a 6-digit hex without '#'. */
function normalizeHex(hex: string): string {
  const cleaned = (hex ?? '').replace('#', '').trim();
  return cleaned.length === 3
    ? cleaned
        .split('')
        .map((ch) => ch + ch)
        .join('')
    : cleaned.padEnd(6, '0').slice(0, 6);
}

function parseHex(hex: string): [number, number, number] {
  const full = normalizeHex(hex);
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Relative luminance (0..1) of a hex color. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** True when the color reads as light. */
export function isLightColor(hex: string): boolean {
  return luminance(hex) > 0.62;
}

/** Readable foreground for a given background (used on accent buttons). */
export function onColor(hex: string): string {
  return isLightColor(hex) ? '#221527' : '#ffffff';
}

/** True when a theme's overall palette is dark (drives overlays + vignettes). */
export function isDarkTheme(theme: ThemeConfig): boolean {
  return luminance(theme.colors.bg1) < 0.42 && luminance(theme.colors.bg2) < 0.45;
}

/** CSS custom properties that skin every themed component. */
export function themeVars(theme: ThemeConfig): CSSProperties {
  const c = theme.colors;
  const dark = isDarkTheme(theme);
  const confetti =
    theme.confetti.length >= 4
      ? theme.confetti
      : [...theme.confetti, c.accent, c.accent2, '#ffffff'].slice(0, 4);
  return {
    '--c-bg1': c.bg1,
    '--c-bg2': c.bg2,
    '--c-surface': c.surface,
    '--c-text': c.text,
    '--c-muted': c.muted,
    '--c-accent': c.accent,
    '--c-accent2': c.accent2,
    '--c-border': c.border,
    '--c-on-accent': onColor(c.accent),
    '--c-on-accent2': onColor(c.accent2),
    '--c-accent-soft': hexToRgba(c.accent, 0.16),
    '--c-accent-mid': hexToRgba(c.accent, 0.42),
    '--c-accent-strong': hexToRgba(c.accent, 0.78),
    '--c-accent-glow': hexToRgba(c.accent, 0.4),
    '--c-accent2-soft': hexToRgba(c.accent2, 0.2),
    '--c-accent2-mid': hexToRgba(c.accent2, 0.45),
    '--c-accent2-strong': hexToRgba(c.accent2, 0.8),
    '--c-hairline': dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,10,25,0.1)',
    '--c-panel': dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)',
    '--c-panel-strong': dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.86)',
    '--c-vignette': dark ? 'rgba(0,0,0,0.45)' : hexToRgba(c.text, 0.1),
    '--c-shadow': dark ? 'rgba(0,0,0,0.5)' : 'rgba(40,20,60,0.28)',
    '--f-heading': fontStack(theme.headingFont),
    '--f-body': fontStack(theme.bodyFont),
    '--confetti-1': confetti[0],
    '--confetti-2': confetti[1],
    '--confetti-3': confetti[2],
    '--confetti-4': confetti[3],
  } as CSSProperties;
}
