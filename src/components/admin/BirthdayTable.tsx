import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { BirthdayListItem, BirthdayStatus } from '@/types';
import { categoryLabel, getTheme } from '@/themes/registry';
import { formatDateDMY, formatDateShort } from '@/utils/date';
import { cn } from '@/utils/cn';
import { EmptyState } from '@/components/ui/EmptyState';

export interface BirthdayTableProps {
  items: BirthdayListItem[];
  loading?: boolean;
  /** Id of the row whose status switch is mid-request. */
  busyId?: string | null;
  onCopyLink: (item: BirthdayListItem) => void;
  onDelete: (item: BirthdayListItem) => void;
  onToggleStatus: (item: BirthdayListItem, next: BirthdayStatus) => void;
  /** Rendered inside the empty state (usually the "Add birthday" button). */
  emptyAction?: ReactNode;
  /** True when the list is empty because of filters rather than no data. */
  filtered?: boolean;
}

function PersonCell({ item }: { item: BirthdayListItem }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-50 truncate">{item.name}</p>
      <p className="text-[0.76rem] text-slate-500 font-mono truncate">/{item.slug}</p>
    </div>
  );
}

function ThemeCell({ item }: { item: BirthdayListItem }) {
  const theme = getTheme(item.theme_id);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-lg shrink-0 border border-white/15"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.bg1}, ${theme.colors.accent})`,
        }}
      />
      <span className="min-w-0">
        <span className="block text-[0.84rem] text-slate-200 truncate">{theme.name}</span>
        <span className="block text-[0.72rem] text-slate-500 truncate">
          {categoryLabel(theme.category)}
        </span>
      </span>
    </div>
  );
}

function StatusSwitch({
  status,
  busy,
  personName,
  onChange,
}: {
  status: BirthdayStatus;
  busy: boolean;
  personName: string;
  onChange: () => void;
}) {
  const active = status === 'active';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${active ? 'Disable' : 'Enable'} ${personName}'s birthday page`}
      onClick={onChange}
      disabled={busy}
      className={cn('inline-flex items-center gap-2 group', busy && 'opacity-60 cursor-wait')}
      title={active ? 'Disable this birthday page' : 'Enable this birthday page'}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          active ? 'bg-emerald-500/70' : 'bg-slate-600/70',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
            active ? 'left-[1.15rem]' : 'left-0.5',
          )}
        />
      </span>
      <span className={cn('chip', active ? 'chip--active' : 'chip--inactive')}>
        {busy ? 'Saving…' : active ? 'Active' : 'Inactive'}
      </span>
    </button>
  );
}

function RowActions({
  item,
  onCopyLink,
  onDelete,
}: {
  item: BirthdayListItem;
  onCopyLink: (item: BirthdayListItem) => void;
  onDelete: (item: BirthdayListItem) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link to={`/admin/birthdays/${item.id}/edit`} className="btn btn--ghost btn--sm">
        Edit
      </Link>
      <Link to={`/admin/preview/${item.id}`} className="btn btn--ghost btn--sm">
        Preview
      </Link>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onCopyLink(item)}>
        Copy link
      </button>
      <button type="button" className="btn btn--danger btn--sm" onClick={() => onDelete(item)}>
        Delete
      </button>
    </div>
  );
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-t border-white/[0.06]">
          {Array.from({ length: 7 }).map((__, cell) => (
            <td key={cell} className="px-4 py-3.5">
              <div className="skeleton h-4 w-full max-w-[7rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * The birthday list.
 *
 * A real table on desktop (one row per person, sortable columns of data) that
 * turns into stacked cards below `lg`, where a seven-column table would be
 * unreadable.
 */
export function BirthdayTable({
  items,
  loading = false,
  busyId = null,
  onCopyLink,
  onDelete,
  onToggleStatus,
  emptyAction,
  filtered = false,
}: BirthdayTableProps) {
  if (!loading && items.length === 0) {
    return (
      <EmptyState
        icon={filtered ? '🔍' : '🎂'}
        title={filtered ? 'No birthdays match those filters' : 'No birthdays yet'}
        description={
          filtered
            ? 'Try a different name, link or status filter.'
            : 'Create your first surprise page — it takes about a minute.'
        }
        action={emptyAction}
      />
    );
  }

  return (
    <>
      {/* ------------------------------ Desktop ------------------------------ */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <caption className="sr-only">
            All birthday pages with their theme, status, photo count and actions
          </caption>
          <thead>
            <tr className="text-[0.72rem] uppercase tracking-[0.08em] text-slate-400">
              <th scope="col" className="px-4 py-3 font-semibold">Person</th>
              <th scope="col" className="px-4 py-3 font-semibold">Date of birth</th>
              <th scope="col" className="px-4 py-3 font-semibold">Theme</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 font-semibold text-center">Photos</th>
              <th scope="col" className="px-4 py-3 font-semibold">Created</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={4} />
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.035]"
                >
                  <td className="px-4 py-3.5 max-w-[16rem]">
                    <PersonCell item={item} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-300 tabular-nums whitespace-nowrap">
                    {formatDateDMY(item.date_of_birth)}
                  </td>
                  <td className="px-4 py-3.5 max-w-[14rem]">
                    <ThemeCell item={item} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusSwitch
                      status={item.status}
                      busy={busyId === item.id}
                      personName={item.name}
                      onChange={() =>
                        onToggleStatus(item, item.status === 'active' ? 'inactive' : 'active')
                      }
                    />
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-300 tabular-nums">
                    {item.photo_count}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                    {formatDateShort(item.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end">
                      <RowActions item={item} onCopyLink={onCopyLink} onDelete={onDelete} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------- Mobile ------------------------------ */}
      <ul className="lg:hidden flex flex-col gap-3 p-3">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="panel p-4 flex flex-col gap-3">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-9 w-full" />
              </li>
            ))
          : items.map((item) => (
              <li key={item.id} className="panel p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <PersonCell item={item} />
                  <StatusSwitch
                    status={item.status}
                    busy={busyId === item.id}
                    personName={item.name}
                    onChange={() =>
                      onToggleStatus(item, item.status === 'active' ? 'inactive' : 'active')
                    }
                  />
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.82rem]">
                  <div>
                    <dt className="text-slate-500 text-[0.7rem] uppercase tracking-wide">
                      Date of birth
                    </dt>
                    <dd className="text-slate-200 tabular-nums">
                      {formatDateDMY(item.date_of_birth)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-[0.7rem] uppercase tracking-wide">Photos</dt>
                    <dd className="text-slate-200 tabular-nums">{item.photo_count}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500 text-[0.7rem] uppercase tracking-wide">Theme</dt>
                    <dd className="mt-1">
                      <ThemeCell item={item} />
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500 text-[0.7rem] uppercase tracking-wide">Created</dt>
                    <dd className="text-slate-300">{formatDateShort(item.created_at)}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.07]">
                  <Link to={`/admin/birthdays/${item.id}/edit`} className="btn btn--ghost btn--sm">
                    Edit
                  </Link>
                  <Link to={`/admin/preview/${item.id}`} className="btn btn--ghost btn--sm">
                    Preview
                  </Link>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onCopyLink(item)}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm ml-auto"
                    onClick={() => onDelete(item)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
      </ul>
    </>
  );
}
