/**
 * Deterministic pseudo-random helper so scattered decorations keep the same
 * positions between renders (no jitter when React re-renders).
 */
export function rand(index: number, salt = 0): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** Deterministic item between min and max. */
export function randBetween(index: number, salt: number, min: number, max: number): number {
  return min + rand(index, salt) * (max - min);
}

/**
 * A stable scatter value derived from a theme id.
 *
 * The same theme always renders its particles in the same places (so previews
 * and picker swatches match the live page and never jitter between renders),
 * while different themes get visibly different scatter.
 */
export function themeSalt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 9973;
  return 1 + (hash % 40);
}
