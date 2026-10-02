import type { ThemeConfig } from '@/types/theme';
import { ThemedStage } from '@/components/theme/ThemedStage';
import { categoryLabel } from '@/themes/registry';
import { themeSalt } from '@/themes/random';
import { cn } from '@/utils/cn';

export interface ThemeCardProps {
  theme: ThemeConfig;
  selected?: boolean;
  onSelect: (theme: ThemeConfig) => void;
  onPreview: (theme: ThemeConfig) => void;
}

/**
 * One theme in the picker.
 *
 * The swatch is a real, live miniature of the theme — same background,
 * decorations, card style, button style and fonts the visitor will see — so
 * the admin is choosing a look, not guessing from a name.
 */
export function ThemeCard({ theme, selected = false, onSelect, onPreview }: ThemeCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border p-2.5 transition-colors',
        selected
          ? 'border-brand-400/60 bg-brand-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(theme)}
        aria-pressed={selected}
        aria-label={`Use the ${theme.name} theme`}
        className={cn(
          'relative block w-full overflow-hidden rounded-xl border border-white/10',
          'aspect-[4/3] focus-visible:outline-offset-4',
        )}
      >
        <ThemedStage
          theme={theme}
          mode="contained"
          decorScale={0.5}
          salt={themeSalt(theme.id)}
          className="h-full w-full"
        >
          <span className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center">
            <span aria-hidden="true" className="text-[1.35rem] leading-none">
              🎁
            </span>
            <span
              className={cn('t-card', `t-card--${theme.card}`)}
              style={{ padding: '0.4rem 0.65rem', maxWidth: '100%' }}
            >
              <span
                className="block truncate text-[0.8rem] font-semibold leading-tight"
                style={{ fontFamily: 'var(--f-heading)' }}
              >
                {theme.name}
              </span>
            </span>
            <span
              className={cn('t-btn', `t-btn--${theme.button}`)}
              style={{ fontSize: '0.66rem', padding: '0.28rem 0.6rem' }}
            >
              Open surprise
            </span>
          </span>
        </ThemedStage>

        {selected ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-[0.75rem] font-bold text-white shadow-lg"
          >
            ✓
          </span>
        ) : null}
      </button>

      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.82rem] font-semibold text-slate-100">
            {theme.name}
          </span>
          <span className="block truncate text-[0.7rem] text-slate-500">
            {categoryLabel(theme.category)}
          </span>
        </span>
        <button
          type="button"
          className="btn btn--quiet btn--sm shrink-0"
          onClick={() => onPreview(theme)}
        >
          Preview
        </button>
      </div>
    </div>
  );
}
