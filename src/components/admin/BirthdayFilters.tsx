import type { BirthdayListItem, BirthdayStatus } from '@/types';
import { getTheme } from '@/themes/registry';
import { formatDateDMY } from '@/utils/date';

export type StatusFilter = 'all' | BirthdayStatus;
export type SortOrder = 'newest' | 'oldest' | 'name' | 'photos';

export interface BirthdayFilterState {
  query: string;
  status: StatusFilter;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: BirthdayFilterState = {
  query: '',
  status: 'all',
  sort: 'newest',
};

export function isFiltering(state: BirthdayFilterState): boolean {
  return (
    state.query.trim() !== '' || state.status !== DEFAULT_FILTERS.status || state.sort !== DEFAULT_FILTERS.sort
  );
}

function haystack(item: BirthdayListItem): string {
  return [
    item.name,
    item.slug,
    item.date_of_birth,
    formatDateDMY(item.date_of_birth),
    getTheme(item.theme_id).name,
  ]
    .join(' ')
    .toLowerCase();
}

/** Pure search + filter + sort used by the dashboard list. */
export function filterBirthdays(
  items: BirthdayListItem[],
  filters: BirthdayFilterState,
): BirthdayListItem[] {
  const query = filters.query.trim().toLowerCase();
  const result = items.filter((item) => {
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (!query) return true;
    return query
      .split(/\s+/)
      .every((token) => haystack(item).includes(token));
  });

  const sorted = [...result];
  switch (filters.sort) {
    case 'oldest':
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      break;
    case 'photos':
      sorted.sort((a, b) => b.photo_count - a.photo_count);
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
  }
  return sorted;
}

export interface BirthdayFiltersProps {
  value: BirthdayFilterState;
  onChange: (next: BirthdayFilterState) => void;
  onReset: () => void;
  total: number;
  shown: number;
}

/** Search box + status filter + sort, with a live result count. */
export function BirthdayFilters({
  value,
  onChange,
  onReset,
  total,
  shown,
}: BirthdayFiltersProps) {
  const patch = (next: Partial<BirthdayFilterState>) => onChange({ ...value, ...next });
  const active = isFiltering(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <label className="field flex-1">
          <span className="sr-only">Search birthdays</span>
          <span className="relative flex items-center">
            <span aria-hidden="true" className="absolute left-3 text-slate-500 pointer-events-none">
              🔍
            </span>
            <input
              className="input pl-9"
              type="search"
              value={value.query}
              placeholder="Search by name, link, date of birth or theme…"
              onChange={(event) => patch({ query: event.target.value })}
            />
          </span>
        </label>

        <label className="field sm:w-44">
          <span className="sr-only">Filter by status</span>
          <select
            className="input"
            value={value.status}
            onChange={(event) => patch({ status: event.target.value as StatusFilter })}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="field sm:w-44">
          <span className="sr-only">Sort birthdays</span>
          <select
            className="input"
            value={value.sort}
            onChange={(event) => patch({ sort: event.target.value as SortOrder })}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="photos">Most photos</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 text-[0.8rem] text-slate-400">
        <span aria-live="polite">
          Showing <strong className="text-slate-200">{shown}</strong> of{' '}
          <strong className="text-slate-200">{total}</strong>{' '}
          {total === 1 ? 'birthday' : 'birthdays'}
        </span>
        {active ? (
          <button type="button" className="btn btn--quiet btn--sm" onClick={onReset}>
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
