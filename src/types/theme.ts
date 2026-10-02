export type ThemeCategory =
  | 'cute'
  | 'girls'
  | 'boys'
  | 'cars'
  | 'gaming'
  | 'space'
  | 'nature'
  | 'celebration'
  | 'elegant'
  | 'friendship'
  | 'special';

export type FontKey =
  | 'inter'
  | 'poppins'
  | 'montserrat'
  | 'quicksand'
  | 'space'
  | 'playfair'
  | 'cormorant'
  | 'marcellus'
  | 'cinzel'
  | 'dancing'
  | 'greatvibes'
  | 'pacifico'
  | 'lobster'
  | 'caveat'
  | 'orbitron'
  | 'pixel'
  | 'bebas'
  | 'amiri';

export type BackgroundKind =
  | 'soft-glow'
  | 'dream-gradient'
  | 'stars'
  | 'night-sky'
  | 'nebula'
  | 'aurora'
  | 'moon'
  | 'bokeh'
  | 'neon-grid'
  | 'circuit'
  | 'dots'
  | 'checkers'
  | 'stripes-diag'
  | 'candy-stripes'
  | 'scanlines'
  | 'waves'
  | 'mountains'
  | 'sunset'
  | 'clouds'
  | 'paper'
  | 'geometric'
  | 'film'
  | 'newsprint'
  | 'confetti-flat'
  | 'fireworks'
  | 'sun-rays'
  | 'disco'
  | 'speed'
  | 'floral'
  | 'pixel-grid'
  | 'metal'
  | 'spotlight'
  | 'velvet'
  | 'notepaper'
  | 'kraft'
  | 'clean';

export type DecorationKind =
  | 'none'
  | 'hearts'
  | 'stars'
  | 'sparkles'
  | 'bubbles'
  | 'balloons'
  | 'petals'
  | 'confetti'
  | 'embers'
  | 'notes'
  | 'clouds'
  | 'leaves';

export type DecorMotion = 'float' | 'fall' | 'rise' | 'sparkle' | 'drift' | 'sway';

export type DecorDensity = 'low' | 'medium' | 'high';

export type CardStyle =
  | 'glass'
  | 'solid'
  | 'polaroid'
  | 'neon'
  | 'pixel'
  | 'minimal'
  | 'paper'
  | 'ornate';

export type ButtonStyle =
  | 'pill'
  | 'neon'
  | 'gradient'
  | 'outline'
  | 'gold'
  | 'pixel'
  | 'glossy'
  | 'minimal';

export type PhotoStyle =
  | 'carousel'
  | 'polaroid'
  | 'filmstrip'
  | 'wall'
  | 'timeline'
  | 'slideshow'
  | 'stack';

export interface ThemeColors {
  /** Background gradient stop 1 (usually the lighter / top color). */
  bg1: string;
  /** Background gradient stop 2. */
  bg2: string;
  /** Card surface color — may be translucent. */
  surface: string;
  /** Primary text color. */
  text: string;
  /** Secondary / muted text color. */
  muted: string;
  /** Main accent (buttons, highlights). */
  accent: string;
  /** Secondary accent (gradients, confetti). */
  accent2: string;
  /** Border color used on cards / inputs. */
  border: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  category: ThemeCategory;
  /** Short human description shown in the theme picker. */
  description: string;
  colors: ThemeColors;
  headingFont: FontKey;
  bodyFont: FontKey;
  background: BackgroundKind;
  decorations: DecorationKind;
  decorDensity: DecorDensity;
  motion: DecorMotion;
  card: CardStyle;
  button: ButtonStyle;
  photo: PhotoStyle;
  /** Confetti particle colors. */
  confetti: string[];
}

export interface ThemeCategoryInfo {
  id: ThemeCategory;
  label: string;
}
