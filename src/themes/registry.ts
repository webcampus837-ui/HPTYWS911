import type { ThemeCategory, ThemeCategoryInfo, ThemeConfig } from '@/types/theme';
import { PART1_THEMES } from './definitions/part1';
import { PART2_THEMES } from './definitions/part2';
import { PART3_THEMES } from './definitions/part3';

/** Every theme in the library, in presentation order. */
export const THEMES: ThemeConfig[] = [...PART1_THEMES, ...PART2_THEMES, ...PART3_THEMES];

export const THEME_CATEGORIES: ThemeCategoryInfo[] = [
  { id: 'cute', label: 'Cute' },
  { id: 'girls', label: 'Girls · Fashion' },
  { id: 'boys', label: 'Boys' },
  { id: 'cars', label: 'Cars' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'space', label: 'Space' },
  { id: 'nature', label: 'Nature' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'friendship', label: 'Friendship' },
  { id: 'special', label: 'Special' },
];

/** The theme applied when a birthday has no theme (or an unknown id). */
export const DEFAULT_THEME_ID = 'confetti-party';

const BY_ID = new Map<string, ThemeConfig>(THEMES.map((theme) => [theme.id, theme]));

/** Look up a theme by id; falls back to the default theme for unknown ids. */
export function getTheme(id: string | null | undefined): ThemeConfig {
  if (id) {
    const found = BY_ID.get(id);
    if (found) return found;
  }
  return BY_ID.get(DEFAULT_THEME_ID) as ThemeConfig;
}

export function themeExists(id: string): boolean {
  return BY_ID.has(id);
}

export function themesInCategory(category: ThemeCategory): ThemeConfig[] {
  return THEMES.filter((theme) => theme.category === category);
}

export function categoryLabel(category: ThemeCategory): string {
  return THEME_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

/** The number of themes shipped — used in copy like "64 handcrafted themes". */
export const THEME_COUNT = THEMES.length;
