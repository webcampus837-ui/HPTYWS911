import { useId } from 'react';
import { cn } from '@/utils/cn';

export interface BrandProps {
  /** Height of the logo tile in rem. */
  size?: number;
  /** Show the "HBTYWS911" wordmark next to the tile. */
  showText?: boolean;
  /** Small line of copy under the wordmark. */
  tagline?: string;
  className?: string;
}

/**
 * The HBTYWS911 identity mark.
 *
 * Original inline SVG (a cake with a lit candle on a gradient tile) so the
 * brand ships with the bundle — no image files, no third-party artwork.
 */
export function Brand({ size = 2.25, showText = true, tagline, className }: BrandProps) {
  const gradientId = useId();

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={`${size}rem`}
        height={`${size}rem`}
        viewBox="0 0 48 48"
        role="img"
        aria-label="HBTYWS911"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ec4899" />
            <stop offset="0.55" stopColor="#a855f7" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
        <rect
          x="0.75"
          y="0.75"
          width="46.5"
          height="46.5"
          rx="13.25"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />
        {/* cake body */}
        <path d="M13 30h22a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" fill="#ffffff" />
        {/* frosting */}
        <path
          d="M11 30c2.6 0 2.6 2.4 5.2 2.4S18.8 30 21.4 30s2.6 2.4 5.2 2.4S29.2 30 31.8 30 34.4 32.4 37 32.4V30H11Z"
          fill="#fbcfe8"
        />
        {/* candle */}
        <rect x="22.6" y="18" width="2.8" height="9" rx="1.4" fill="#ffffff" fillOpacity="0.92" />
        {/* flame */}
        <path
          d="M24 10c2.4 2.1 3.4 3.6 3.4 5.1A3.4 3.4 0 0 1 24 18.5a3.4 3.4 0 0 1-3.4-3.4C20.6 13.6 21.6 12.1 24 10Z"
          fill="#ffd166"
        />
        <path d="M24 13.2c1 1 1.4 1.7 1.4 2.4a1.4 1.4 0 1 1-2.8 0c0-.7.4-1.4 1.4-2.4Z" fill="#ff9f1c" />
      </svg>

      {showText ? (
        <span className="flex flex-col leading-none">
          <span className="font-semibold tracking-tight text-slate-50 text-[1.02rem]">
            HBTYWS<span className="text-brand-400">911</span>
          </span>
          {tagline ? (
            <span className="text-[0.7rem] text-slate-400 mt-1 tracking-wide">{tagline}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
