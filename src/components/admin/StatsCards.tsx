import type { BirthdayListItem } from '@/types';
import { cn } from '@/utils/cn';

export interface DashboardStats {
  total: number;
  active: number;
  inactive: number;
  photos: number;
}

/** Roll the birthday list up into the four dashboard numbers. */
export function computeStats(items: BirthdayListItem[]): DashboardStats {
  return items.reduce<DashboardStats>(
    (acc, item) => {
      acc.total += 1;
      if (item.status === 'active') acc.active += 1;
      else acc.inactive += 1;
      acc.photos += item.photo_count ?? 0;
      return acc;
    },
    { total: 0, active: 0, inactive: 0, photos: 0 },
  );
}

interface CardDef {
  key: keyof DashboardStats;
  label: string;
  icon: string;
  ring: string;
}

const CARDS: CardDef[] = [
  { key: 'total', label: 'Total Birthdays', icon: '🎂', ring: 'from-brand-500/25 to-purple-500/10' },
  { key: 'active', label: 'Active Birthdays', icon: '🟢', ring: 'from-emerald-500/25 to-teal-500/10' },
  { key: 'inactive', label: 'Inactive Birthdays', icon: '💤', ring: 'from-slate-400/20 to-slate-600/10' },
  { key: 'photos', label: 'Total Photos', icon: '📸', ring: 'from-sky-500/25 to-indigo-500/10' },
];

export function StatsCards({
  stats,
  loading = false,
  className,
}: {
  stats: DashboardStats;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4', className)}
      role="group"
      aria-label="Dashboard statistics"
    >
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={cn(
            'panel relative overflow-hidden p-4 md:p-5 bg-gradient-to-br',
            card.ring,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[0.72rem] uppercase tracking-[0.09em] font-semibold text-slate-300/80">
              {card.label}
            </span>
            <span aria-hidden="true" className="text-lg leading-none">
              {card.icon}
            </span>
          </div>
          {loading ? (
            <div className="skeleton h-9 w-16 mt-3" aria-hidden="true" />
          ) : (
            <p className="mt-2 text-3xl md:text-[2.1rem] font-semibold text-white tabular-nums leading-none">
              {stats[card.key]}
            </p>
          )}
          <span className="sr-only">
            {card.label}: {loading ? 'loading' : stats[card.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
