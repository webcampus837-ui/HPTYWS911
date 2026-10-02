import { useMemo, useState } from 'react';
import type { ExperiencePhoto } from '@/types';
import type { ThemeCategory, ThemeConfig } from '@/types/theme';
import {
  THEME_CATEGORIES,
  THEME_COUNT,
  THEMES,
  categoryLabel,
  getTheme,
} from '@/themes/registry';
import { ThemeCard } from './ThemeCard';
import { ThemePreviewModal } from './ThemePreviewModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

export interface ThemePickerProps {
  /** Currently chosen theme id. */
  value: string;
  onChange: (themeId: string) => void;
  /** Real content handed to the preview modal so it shows this birthday, not a sample. */
  personName?: string;
  message?: string;
  photos?: ExperiencePhoto[];
  className?: string;
}

type CategoryFilter = ThemeCategory | 'all';

/** Normalise a search term the same way the theme text is compared. */
const normalise = (text: string) => text.toLowerCase().trim();

/**
 * The theme chooser.
 *
 * Category tabs + a search box over a scrollable grid of live swatches. Every
 * swatch is rendered by the real theme engine, so the admin is picking an
 * actual look rather than a colour chip, and "Preview" opens the full four-step
 * experience before anything is saved.
 */
export function ThemePicker({
  value,
  onChange,
  personName,
  message,
  photos,
  className,
}: ThemePickerProps) {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<ThemeConfig | null>(null);

  const selected = getTheme(value);

  const counts = useMemo(() => {
    const map = new Map<ThemeCategory, number>();
    for (const theme of THEMES) {
      map.set(theme.category, (map.get(theme.category) ?? 0) + 1);
    }
    return map;
  }, []);

  const visible = useMemo(() => {
    const needle = normalise(query);
    return THEMES.filter((theme) => {
      if (category !== 'all' && theme.category !== category) return false;
      if (!needle) return true;
      return (
        normalise(theme.name).includes(needle) ||
        normalise(theme.description).includes(needle) ||
        normalise(categoryLabel(theme.category)).includes(needle)
      );
    });
  }, [category, query]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Selected summary ------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-400/30 bg-brand-500/[0.08] p-3">
        <span
          aria-hidden="true"
          className="h-10 w-10 shrink-0 rounded-xl border border-white/20 shadow-inner"
          style={{
            background: `linear-gradient(135deg, ${selected.colors.bg1}, ${selected.colors.accent}, ${selected.colors.accent2})`,
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.95rem] font-semibold text-white">
            {selected.name}
            <span className="ml-2 align-middle text-[0.68rem] font-medium uppercase tracking-[0.08em] text-brand-200">
              Selected
            </span>
          </span>
          <span className="mt-0.5 block text-[0.78rem] leading-snug text-slate-300">
            {selected.description}
          </span>
        </span>
        <button
          type="button"
          className="btn btn--ghost btn--sm shrink-0"
          onClick={() => setPreview(selected)}
        >
          Preview full page
        </button>
      </div>

      {/* Category tabs + search ------------------------------------------ */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter themes by category">
          <CategoryTab
            active={category === 'all'}
            label="All"
            count={THEME_COUNT}
            onClick={() => setCategory('all')}
          />
          {THEME_CATEGORIES.map((entry) => (
            <CategoryTab
              key={entry.id}
              active={category === entry.id}
              label={entry.label}
              count={counts.get(entry.id) ?? 0}
              onClick={() => setCategory(entry.id)}
            />
          ))}
        </div>

        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-60">
            🔍
          </span>
          <input
            type="search"
            className="input pl-9"
            placeholder={`Search ${THEME_COUNT} themes — try “neon”, “elegant”, “space”…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search themes"
          />
        </div>
      </div>

      {/* Grid ------------------------------------------------------------ */}
      <div
        className="max-h-[30rem] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3"
        role="group"
        aria-label={`${visible.length} themes available`}
      >
        {visible.length === 0 ? (
          <EmptyState
            icon="🎨"
            title="No themes match that search"
            description="Try a shorter word, or switch back to the All category."
            className="py-8"
            action={
              <button
                type="button"
                className="btn btn--quiet btn--sm"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                }}
              >
                Clear search
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={theme.id === selected.id}
                onSelect={(picked) => onChange(picked.id)}
                onPreview={(picked) => setPreview(picked)}
              />
            ))}
          </div>
        )}
      </div>

      <ThemePreviewModal
        open={preview !== null}
        theme={preview}
        name={personName}
        message={message}
        photos={photos}
        selected={preview?.id === selected.id}
        onSelect={(picked) => onChange(picked.id)}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

function CategoryTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-[0.76rem] font-semibold transition-colors',
        active
          ? 'border-brand-400/60 bg-brand-500/20 text-white'
          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white',
      )}
    >
      {label}
      <span className={cn('ml-1.5 tabular-nums', active ? 'text-brand-100' : 'text-slate-500')}>
        {count}
      </span>
    </button>
  );
}
