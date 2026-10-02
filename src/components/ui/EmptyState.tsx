import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  /** Emoji or short glyph shown in the circle above the title. */
  icon?: string;
  title: string;
  description?: ReactNode;
  /** Optional button / link. */
  action?: ReactNode;
  className?: string;
}

/**
 * Friendly placeholder for "nothing here yet" — empty birthday list, no photos
 * uploaded, no search results. Never a dead end: an action can be attached.
 */
export function EmptyState({ icon = '🎈', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center gap-3 py-10 px-4', className)}>
      <span
        aria-hidden="true"
        className="grid place-items-center w-14 h-14 rounded-2xl text-2xl bg-white/[0.06] border border-white/10"
      >
        {icon}
      </span>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {description ? (
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
