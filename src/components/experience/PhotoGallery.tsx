import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ExperiencePhoto } from '@/types';
import type { PhotoStyle } from '@/types/theme';
import { cn } from '@/utils/cn';

export interface PhotoGalleryProps {
  photos: ExperiencePhoto[];
  style: PhotoStyle;
  title?: string;
  /** Slideshow auto-advance interval in milliseconds. */
  autoPlayMs?: number;
  reducedMotion?: boolean;
}

/**
 * Renders the memory section using the layout the theme asked for.
 *
 * One component covers all seven `PhotoStyle` values: five are pure CSS
 * layouts (carousel / polaroid / filmstrip / wall / timeline) and two are
 * interactive (slideshow with arrows + dots, and a tappable shuffled stack).
 */
export function PhotoGallery({
  photos,
  style,
  title = 'Your Memories',
  autoPlayMs = 4200,
  reducedMotion = false,
}: PhotoGalleryProps) {
  const total = photos.length;

  if (total === 0) return null;

  const count = `${total} ${total === 1 ? 'memory' : 'memories'}`;

  if (style === 'slideshow') {
    return (
      <Slideshow
        photos={photos}
        title={title}
        count={count}
        autoPlayMs={autoPlayMs}
        reducedMotion={reducedMotion}
      />
    );
  }

  if (style === 'stack') {
    return <Stack photos={photos} title={title} count={count} reducedMotion={reducedMotion} />;
  }

  return (
    <div className={cn('gal', `gal--${style}`)}>
      <div className="gal__head">
        <h2 className="gal__title">{title}</h2>
        <span className="gal__count">{count}</span>
      </div>
      <div className="gal__track">
        {photos.map((photo, index) => (
          <figure className="gal__item" key={`${photo.url}-${index}`}>
            <div className="gal__frame">
              <img
                className="gal__img"
                src={photo.url}
                alt={photo.alt}
                loading={index < 2 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
            </div>
            {photo.alt && <figcaption className="gal__cap">Memory {index + 1}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Slideshow ------------------------------ */

interface SlideshowProps {
  photos: ExperiencePhoto[];
  title: string;
  count: string;
  autoPlayMs: number;
  reducedMotion: boolean;
}

function Slideshow({ photos, title, count, autoPlayMs, reducedMotion }: SlideshowProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = photos.length;

  const go = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total],
  );

  useEffect(() => {
    if (reducedMotion || paused || total < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [autoPlayMs, paused, reducedMotion, total]);

  const active = photos[Math.min(index, total - 1)];

  return (
    <div
      className="gal gal--slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="gal__head">
        <h2 className="gal__title">{title}</h2>
        <span className="gal__count">
          {index + 1} / {total} · {count}
        </span>
      </div>

      <div className="gal__stage" role="group" aria-roledescription="carousel" aria-label={title}>
        {photos.map((photo, i) => (
          <div
            className={cn('gal__slide', i === index && 'gal__slide--active')}
            key={`${photo.url}-${i}`}
            aria-hidden={i !== index}
          >
            <img
              className="gal__img"
              src={photo.url}
              alt={photo.alt}
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {active?.alt && <p className="gal__cap">{active.alt}</p>}

      {total > 1 && (
        <div className="gal__nav">
          <button
            type="button"
            className="gal__arrow"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <div className="gal__dots" role="tablist" aria-label="Choose photo">
            {photos.map((photo, i) => (
              <button
                type="button"
                role="tab"
                key={`dot-${photo.url}-${i}`}
                className={cn('gal__dot', i === index && 'gal__dot--active')}
                aria-selected={i === index}
                aria-label={`Photo ${i + 1} of ${total}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="gal__arrow"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Stack -------------------------------- */

interface StackProps {
  photos: ExperiencePhoto[];
  title: string;
  count: string;
  reducedMotion: boolean;
}

function Stack({ photos, title, count, reducedMotion }: StackProps) {
  const total = photos.length;
  const [top, setTop] = useState(0);
  const rotations = useMemo(
    () => photos.map((_, i) => ((i * 37) % 9) - 4),
    [photos],
  );

  const advance = useCallback(() => setTop((current) => (current + 1) % total), [total]);

  return (
    <div className="gal gal--stack">
      <div className="gal__head" style={{ width: '100%' }}>
        <h2 className="gal__title">{title}</h2>
        <span className="gal__count">
          {top + 1} / {total} · {count}
        </span>
      </div>

      <div className="gal__deck">
        {photos.map((photo, i) => {
          const offset = (i - top + total) % total;
          const visible = offset < 4;
          const cardStyle: CSSProperties = {
            transform: `translate3d(0, ${offset * -10}px, 0) scale(${1 - offset * 0.045}) rotate(${
              offset === 0 ? 0 : rotations[i] ?? 0
            }deg)`,
            zIndex: total - offset,
            opacity: visible ? 1 : 0,
            transition: reducedMotion ? 'none' : undefined,
            pointerEvents: offset === 0 ? 'auto' : 'none',
          };
          return (
            <button
              type="button"
              className="gal__card"
              key={`${photo.url}-${i}`}
              style={cardStyle}
              onClick={advance}
              aria-label={
                offset === 0 ? `Show next memory (${(top + 1) % total + 1} of ${total})` : undefined
              }
              tabIndex={offset === 0 ? 0 : -1}
            >
              <span className="gal__frame">
                <img
                  className="gal__img"
                  src={photo.url}
                  alt={photo.alt}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                />
              </span>
            </button>
          );
        })}
      </div>

      <p className="gal__hint">Tap the photo for the next memory</p>
    </div>
  );
}

/** Small helper used by the admin preview to label gallery variants. */
export function photoStyleLabel(style: PhotoStyle): string {
  const labels: Record<PhotoStyle, string> = {
    carousel: 'Swipe carousel',
    polaroid: 'Polaroid grid',
    filmstrip: 'Film strip',
    wall: 'Photo wall',
    timeline: 'Memory timeline',
    slideshow: 'Auto slideshow',
    stack: 'Shuffled stack',
  };
  return labels[style];
}
