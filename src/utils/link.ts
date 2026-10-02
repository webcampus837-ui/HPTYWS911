/** Absolute public URL for a birthday slug, using the current domain. */
export function publicUrlFor(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, '');
  const origin =
    typeof window === 'undefined' ? 'https://hbtyws911.vercel.app' : window.location.origin;
  return `${origin.replace(/\/+$/, '')}/${encodeURIComponent(clean)}`;
}

/**
 * Copy text to the clipboard.
 *
 * Uses the async Clipboard API where available and falls back to a hidden
 * textarea + `execCommand` so the button also works on older mobile browsers
 * and in non-secure contexts.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
