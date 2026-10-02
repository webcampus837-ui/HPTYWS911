import { useEffect } from 'react';

export interface DocumentMeta {
  title?: string;
  description?: string;
  /** Browser chrome colour (address bar on mobile). */
  themeColor?: string;
  /** Body background used for the overscroll / rubber-band area. */
  bodyBackground?: string;
  /** Body text colour paired with `bodyBackground`. */
  bodyColor?: string;
  /**
   * Value for `<meta name="robots">`. Birthday pages are private and personal,
   * so they ask search engines to stay away (`noindex, nofollow`).
   */
  robots?: string;
  /**
   * Marks the document as a public birthday page. Public pages get a neutral
   * light/dark base instead of the admin shell's dark gradient.
   */
  publicSurface?: boolean;
}

const DEFAULT_TITLE = 'HBTYWS911 — Birthday Surprises';
const DEFAULT_DESCRIPTION =
  'HBTYWS911 — create and share personalized birthday surprise pages.';
const DEFAULT_THEME_COLOR = '#0f172a';

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute('content') ?? null;
  el.setAttribute('content', content);
  return previous;
}

/**
 * Keep <title> / meta description / theme-color in sync with the current page.
 *
 * Public birthday pages deliberately expose only the person's first name —
 * never the date of birth, the slug's meaning, or anything administrative.
 * Previous values are restored on unmount so client-side navigation between a
 * birthday page and the admin panel never leaks one title into the other.
 */
export function useDocumentMeta(meta: DocumentMeta): void {
  const {
    title,
    description,
    themeColor,
    bodyBackground,
    bodyColor,
    robots,
    publicSurface = false,
  } = meta;

  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.getAttribute('content');
    const previousThemeColor = document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.getAttribute('content');
    const previousOgTitle = document
      .querySelector<HTMLMetaElement>('meta[property="og:title"]')
      ?.getAttribute('content');
    const existingRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const hadRobots = Boolean(existingRobots);
    const previousRobots = existingRobots?.getAttribute('content') ?? null;

    document.title = title ?? DEFAULT_TITLE;
    upsertMeta('meta[name="description"]', 'name', 'description', description ?? DEFAULT_DESCRIPTION);
    upsertMeta('meta[name="theme-color"]', 'name', 'theme-color', themeColor ?? DEFAULT_THEME_COLOR);

    // og:title mirrors the visible title; if the page didn't ship one, remove it
    // again on cleanup rather than leaving a stale name behind.
    if (title) {
      upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    }
    if (robots) {
      upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (previousDescription !== undefined && previousDescription !== null) {
        upsertMeta('meta[name="description"]', 'name', 'description', previousDescription);
      }
      if (previousThemeColor !== undefined && previousThemeColor !== null) {
        upsertMeta('meta[name="theme-color"]', 'name', 'theme-color', previousThemeColor);
      }
      const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
      if (ogTitle) {
        if (previousOgTitle === null || previousOgTitle === undefined) {
          ogTitle.remove();
        } else {
          ogTitle.setAttribute('content', previousOgTitle);
        }
      }
      const robotsTag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (robotsTag) {
        if (!hadRobots) {
          robotsTag.remove();
        } else if (previousRobots !== null) {
          robotsTag.setAttribute('content', previousRobots);
        }
      }
    };
  }, [title, description, themeColor, robots]);

  useEffect(() => {
    const { body } = document;
    const hadSurface = body.dataset.surface;
    const previousBg = body.style.getPropertyValue('--public-bg');
    const previousText = body.style.getPropertyValue('--public-text');

    if (publicSurface) {
      body.dataset.surface = 'public';
      if (bodyBackground) body.style.setProperty('--public-bg', bodyBackground);
      if (bodyColor) body.style.setProperty('--public-text', bodyColor);
    } else {
      delete body.dataset.surface;
      body.style.removeProperty('--public-bg');
      body.style.removeProperty('--public-text');
    }

    return () => {
      if (hadSurface === undefined) delete body.dataset.surface;
      else body.dataset.surface = hadSurface;
      if (previousBg) body.style.setProperty('--public-bg', previousBg);
      else body.style.removeProperty('--public-bg');
      if (previousText) body.style.setProperty('--public-text', previousText);
      else body.style.removeProperty('--public-text');
    };
  }, [publicSurface, bodyBackground, bodyColor]);
}
