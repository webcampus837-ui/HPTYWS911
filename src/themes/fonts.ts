import type { FontKey } from '@/types/theme';

/**
 * Every font used by the theme system. All families are loaded once in
 * index.html (with display=swap); the browser only downloads the ones a
 * page actually renders.
 */
const STACKS: Record<FontKey, string> = {
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  poppins: "'Poppins', 'Inter', sans-serif",
  montserrat: "'Montserrat', 'Inter', sans-serif",
  quicksand: "'Quicksand', 'Inter', sans-serif",
  space: "'Space Grotesk', 'Inter', sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  cormorant: "'Cormorant Garamond', Georgia, serif",
  marcellus: "'Marcellus', Georgia, serif",
  cinzel: "'Cinzel', Georgia, serif",
  dancing: "'Dancing Script', cursive",
  greatvibes: "'Great Vibes', cursive",
  pacifico: "'Pacifico', cursive",
  lobster: "'Lobster', cursive",
  caveat: "'Caveat', cursive",
  orbitron: "'Orbitron', sans-serif",
  pixel: "'Press Start 2P', monospace",
  bebas: "'Bebas Neue', Impact, sans-serif",
  amiri: "'Amiri', Georgia, serif",
};

export function fontStack(key: FontKey): string {
  return STACKS[key] ?? STACKS.inter;
}
