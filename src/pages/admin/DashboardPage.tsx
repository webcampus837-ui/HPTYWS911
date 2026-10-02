import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { BirthdayListItem, BirthdayStatus, CreatedBirthdayNavState } from '@/types';
import { deleteBirthday, listBirthdays, setBirthdayStatus } from '@/services/birthdays';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/hooks/useToast';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { StatsCards, computeStats } from '@/components/admin/StatsCards';
import {
  BirthdayFilters,
  DEFAULT_FILTERS,
  filterBirthdays,
} from '@/components/admin/BirthdayFilters';
import type { BirthdayFilterState } from '@/components/admin/BirthdayFilters';
import { BirthdayTable } from '@/components/admin/BirthdayTable';
import { CopyLinkModal } from '@/components/admin/CopyLinkModal';
import { DeleteBirthdayModal } from '@/components/admin/DeleteBirthdayModal';
import { EmptyState } from '@/components/ui/EmptyState';

interface DeleteTarget {
  item: BirthdayListItem;
  busy: boolean;
}

function isCreatedState(value: unknown): value is CreatedBirthdayNavState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CreatedBirthdayNavState>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.slug === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive') &&
    typeof candidate.photosUploaded === 'number' &&
    typeof candidate.photosFailed === 'number'
  );
}

/**
 * The dashboard: headline stats, the searchable/filterable birthday list, and
 * the copy-link / delete dialogs for each row.
 */
export default function DashboardPage() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useDocumentMeta({ title: 'Dashboard · HBTYWS911' });

  const [items, setItems] = useState<BirthdayListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<BirthdayFilterState>(DEFAULT_FILTERS);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<CreatedBirthdayNavState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const list = await listBirthdays();
      setItems(list);
    } catch (error) {
      setLoadError(true);
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // The create form lands here with the fresh birthday — open the share modal.
  const created = (location.state as { created?: unknown } | null)?.created;
  useEffect(() => {
    if (!isCreatedState(created)) return;
    setCopyTarget(created);
    if (created.photosFailed > 0) {
      toast.error(
        `${created.photosFailed} ${created.photosFailed === 1 ? 'photo could' : 'photos could'} not be uploaded. Open the birthday, go to Edit, and add ${created.photosFailed === 1 ? 'it' : 'them'} again.`,
      );
    }
    // Consume the state so a refresh doesn't reopen the modal.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created, navigate]);

  const stats = useMemo(() => computeStats(items), [items]);
  const visible = useMemo(() => filterBirthdays(items, filters), [items, filters]);

  const handleToggleStatus = useCallback(
    async (item: BirthdayListItem, next: BirthdayStatus) => {
      if (statusBusyId) return;
      setStatusBusyId(item.id);
      const previous = items;
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, status: next } : entry)),
      );
      try {
        await setBirthdayStatus(item.id, next);
        toast.success(
          next === 'active'
            ? `${item.name}'s page is live again.`
            : `${item.name}'s page is now paused.`,
        );
      } catch (error) {
        setItems(previous);
        toast.error(friendlyError(error));
      } finally {
        setStatusBusyId(null);
      }
    },
    [items, statusBusyId, toast],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteTarget.busy) return;
    setDeleteTarget({ item: deleteTarget.item, busy: true });
    try {
      const { storageFailures } = await deleteBirthday(deleteTarget.item.id);
      setItems((current) => current.filter((entry) => entry.id !== deleteTarget.item.id));
      setDeleteTarget(null);
      toast.success(`${deleteTarget.item.name}'s birthday was deleted.`);
      if (storageFailures > 0) {
        toast.error(
          `${storageFailures} photo ${storageFailures === 1 ? 'file' : 'files'} could not be removed from storage — check the “birthday-photos” bucket in Supabase.`,
        );
      }
    } catch (error) {
      setDeleteTarget({ item: deleteTarget.item, busy: false });
      toast.error(friendlyError(error));
    }
  }, [deleteTarget, toast]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">Birthdays</h1>
          <p className="text-[0.86rem] text-slate-400 mt-1">
            Every surprise page you have created, in one place.
          </p>
        </div>
        <Link to="/admin/birthdays/new" className="btn btn--primary">
          ＋ Add birthday
        </Link>
      </div>

      <StatsCards stats={stats} loading={loading} />

      <section className="panel" aria-label="Birthday list">
        <div className="panel__head">
          <h2 className="panel__title">All birthdays</h2>
        </div>
        <div className="panel__body flex flex-col gap-4">
          <BirthdayFilters
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            total={items.length}
            shown={visible.length}
          />

          {loadError && !loading ? (
            <EmptyState
              icon="📡"
              title="The list could not be loaded"
              description="Check your connection, then try again. If Supabase was just set up, make sure supabase/schema.sql has been run."
              action={
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => void load()}>
                  Try again
                </button>
              }
            />
          ) : (
            <BirthdayTable
              items={visible}
              loading={loading}
              busyId={statusBusyId}
              filtered={filters.query.trim() !== '' || filters.status !== 'all'}
              onCopyLink={(item) =>
                setCopyTarget({
                  name: item.name,
                  slug: item.slug,
                  status: item.status,
                  photosUploaded: 0,
                  photosFailed: 0,
                })
              }
              onDelete={(item) => setDeleteTarget({ item, busy: false })}
              onToggleStatus={handleToggleStatus}
              emptyAction={
                <Link to="/admin/birthdays/new" className="btn btn--primary btn--sm">
                  Add birthday
                </Link>
              }
            />
          )}
        </div>
      </section>

      <CopyLinkModal
        open={copyTarget !== null}
        name={copyTarget?.name ?? ''}
        slug={copyTarget?.slug ?? ''}
        justCreated={copyTarget !== null && copyTarget.photosUploaded + copyTarget.photosFailed > 0}
        inactive={copyTarget?.status === 'inactive'}
        onClose={() => setCopyTarget(null)}
      />

      <DeleteBirthdayModal
        open={deleteTarget !== null}
        name={deleteTarget?.item.name ?? ''}
        slug={deleteTarget?.item.slug}
        photoCount={deleteTarget?.item.photo_count ?? 0}
        busy={deleteTarget?.busy ?? false}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
