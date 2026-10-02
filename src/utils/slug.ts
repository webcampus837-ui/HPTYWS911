export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 60;

/** Slugs that would collide with reserved routes or static files. */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'static',
  'login',
  'logout',
  'signin',
  'signout',
  'auth',
  'index',
  'home',
  'preview',
  'new',
  'edit',
  'settings',
  'health',
  '_next',
  'favicon.ico',
  'favicon.svg',
  'robots.txt',
  'sitemap.xml',
  'og.png',
  'vercel.svg',
]);

/**
 * Turn a person's name into a URL-safe slug.
 * "Muhammed Suhail" → "muhammed-suhail" (admin can trim it to "suhail").
 */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
  return base || 'birthday';
}

/** Returns an error message or null when the slug is valid. */
export function validateSlug(slug: string): string | null {
  const value = slug.trim();
  if (!value) return 'A link name is required.';
  if (value.length < SLUG_MIN_LENGTH) return `Use at least ${SLUG_MIN_LENGTH} characters.`;
  if (value.length > SLUG_MAX_LENGTH) return `Keep it under ${SLUG_MAX_LENGTH} characters.`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return 'Use lowercase letters, numbers and single hyphens only (e.g. "suhail" or "suhail-2").';
  }
  if (RESERVED_SLUGS.has(value)) return 'This link name is reserved. Please choose another one.';
  return null;
}

/**
 * Find a free slug: "suhail", then "suhail-2", "suhail-3", …
 * `isTaken` should query Supabase for existing slugs.
 */
export async function findAvailableSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base).slice(0, SLUG_MAX_LENGTH - 4).replace(/-+$/g, '');
  if (!RESERVED_SLUGS.has(root) && !(await isTaken(root))) return root;
  for (let i = 2; i <= 60; i += 1) {
    const candidate = `${root}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
