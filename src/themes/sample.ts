import type { ExperienceData, ExperiencePhoto } from '@/types';

/**
 * Small, dependency-free sample artwork used to preview themes inside the
 * admin panel and in development. All artwork is original and generated
 * inline as SVG data URIs so it works offline and adds no network requests.
 */

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function scene(inner: string, from: string, to: string): string {
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="800" height="600" fill="url(#g)"/>` +
      inner +
      `</svg>`,
  );
}

const SAMPLE_URI_1 = scene(
  `<circle cx="620" cy="150" r="70" fill="#fff3" />
   <path d="M0 430 Q200 330 400 410 T800 380 V600 H0 Z" fill="#0002" />
   <path d="M0 480 Q240 400 480 470 T800 440 V600 H0 Z" fill="#0003" />`,
  '#7fd8ff',
  '#4f79c9',
);

const SAMPLE_URI_2 = scene(
  `<circle cx="240" cy="200" r="90" fill="#fff5" />
   <circle cx="400" cy="160" r="110" fill="#fff3" />
   <circle cx="560" cy="220" r="80" fill="#fff4" />
   <path d="M400 300 L400 560" stroke="#fff6" stroke-width="10" />`,
  '#ffb3d9',
  '#e91e8c',
);

const SAMPLE_URI_3 = scene(
  `<rect x="330" y="330" width="140" height="120" rx="16" fill="#fff6" />
   <path d="M330 350 Q400 260 470 350 Z" fill="#ffffff88" />
   <circle cx="400" cy="260" r="18" fill="#ffdf6b" />`,
  '#ffe9b3',
  '#ff9e6b',
);

const SAMPLE_URI_4 = scene(
  `<circle cx="600" cy="150" r="60" fill="#fdf6d8" />
   <circle cx="620" cy="135" r="52" fill="#1b1b3a" />
   <circle cx="180" cy="420" r="4" fill="#fff9" /><circle cx="260" cy="180" r="3" fill="#fff8" />
   <circle cx="420" cy="320" r="3" fill="#fff7" /><circle cx="520" cy="460" r="4" fill="#fff8" />
   <circle cx="120" cy="260" r="3" fill="#fff7" /><circle cx="680" cy="380" r="3" fill="#fff8" />`,
  '#2a2658',
  '#0e0e28',
);

const SAMPLE_URI_5 = scene(
  `<circle cx="640" cy="140" r="70" fill="#ffe9a8" />
   <path d="M0 470 Q400 380 800 470 V600 H0 Z" fill="#38b6ff66" />
   <path d="M360 470 Q340 360 300 330 Q380 350 400 420 Q420 340 500 320 Q450 400 440 470 Z" fill="#166534" />`,
  '#a8ecff',
  '#4aa8ff',
);

const SAMPLE_URI_6 = scene(
  `<path d="M400 220 C360 160 260 170 260 260 C260 340 400 430 400 430 C400 430 540 340 540 260 C540 170 440 160 400 220 Z" fill="#ffffff88" />
   <circle cx="180" cy="140" r="26" fill="#fff5" />
   <circle cx="640" cy="450" r="34" fill="#fff4" />`,
  '#ff8fab',
  '#d75d7d',
);

/** Six ready-to-use sample photos for theme previews. */
export const SAMPLE_PHOTO_URIS: string[] = [
  SAMPLE_URI_1,
  SAMPLE_URI_2,
  SAMPLE_URI_3,
  SAMPLE_URI_4,
  SAMPLE_URI_5,
  SAMPLE_URI_6,
];

export function samplePhotos(count = 6): ExperiencePhoto[] {
  return SAMPLE_PHOTO_URIS.slice(0, count).map((url, index) => ({
    url,
    alt: `Sample memory ${index + 1}`,
  }));
}

/** A complete, realistic experience payload for theme previews. */
export const SAMPLE_EXPERIENCE: ExperienceData = {
  name: 'Maya',
  themeId: 'confetti-party',
  message:
    'Happy Birthday, Maya! 🎉 Today is all about celebrating the joy you bring to everyone around you. May this year be filled with laughter, adventures, and everything you have been wishing for. Enjoy every single moment of your special day!',
  photos: samplePhotos(6),
  songUrl: null,
};
