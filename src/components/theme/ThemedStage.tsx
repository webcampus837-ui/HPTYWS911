import type { CSSProperties, ReactNode } from 'react';
import type { ThemeConfig } from '@/types/theme';
import { ThemeBackground } from '@/themes/backgrounds';
import { ThemeDecorations } from '@/themes/decorations';
import { themeVars } from '@/themes/vars';
import { cn } from '@/utils/cn';

export interface ThemedStageProps {
  theme: ThemeConfig;
  children: ReactNode;
  /**
   * `viewport` — the page owns the whole window (public birthday page,
   * full-screen admin preview). Background + decorations become `fixed`.
   * `contained` — the stage is a box inside another layout (theme picker
   * cards, preview panels); background + decorations stay `absolute`.
   */
  mode?: 'viewport' | 'contained';
  /** Render the ambient decoration layer (particles). */
  decorations?: boolean;
  /** Soft vignette behind content to keep text readable. */
  vignette?: boolean;
  /** Varies the particle scatter so two pages never look identical. */
  salt?: number;
  /** Scales the particle count — lower for small preview panels. */
  decorScale?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

/**
 * The single entry point for "paint this subtree with a theme".
 *
 * Every theme in the library is a plain `ThemeConfig` object; this component
 * turns it into CSS custom properties on a root element, and the shared
 * stylesheet (`styles/theme.css`) does all the visual work. Adding a theme
 * therefore never means adding a component.
 */
export function ThemedStage({
  theme,
  children,
  mode = 'viewport',
  decorations = true,
  vignette = true,
  salt = 1,
  decorScale = 1,
  className,
  style,
  id,
}: ThemedStageProps) {
  return (
    <div
      id={id}
      className={cn(
        'theme-root',
        mode === 'viewport' ? 'theme-root--viewport' : 'theme-root--contained',
        className,
      )}
      style={{ ...themeVars(theme), ...style }}
    >
      <ThemeBackground theme={theme} vignette={vignette} />
      {decorations && theme.decorations !== 'none' && (
        <ThemeDecorations
          kind={theme.decorations}
          motion={theme.motion}
          density={theme.decorDensity}
          salt={salt}
          scale={decorScale}
        />
      )}
      {children}
    </div>
  );
}
