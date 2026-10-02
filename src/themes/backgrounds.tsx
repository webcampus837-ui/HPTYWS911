import { memo } from 'react';
import type { ThemeConfig } from '@/types/theme';

export interface ThemeBackgroundProps {
  theme: ThemeConfig;
  /** Adds a soft vignette so foreground content stays readable. */
  vignette?: boolean;
}

/**
 * Renders the themed background stack. Every visual variant is expressed as a
 * CSS layer (see styles/theme.css) driven by the theme's CSS custom
 * properties, so the component itself stays tiny and cheap to render.
 */
export const ThemeBackground = memo(function ThemeBackground({
  theme,
  vignette = true,
}: ThemeBackgroundProps) {
  return (
    <div className="theme-bg" aria-hidden="true">
      <div className="theme-bg__base" />
      <div className={`theme-bg__kind theme-bg__kind--${theme.background}`} />
      {vignette && <div className="theme-bg__vignette" />}
    </div>
  );
});
