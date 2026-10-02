import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BirthdayForm } from '@/components/admin/BirthdayForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { RouteFallback } from '@/components/ui/RouteFallback';
import { getBirthday } from '@/services/birthdays';
import type { BirthdayWithPhotos } from '@/types';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/hooks/useToast';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'missing' }
  | { kind: 'ready'; birthday: BirthdayWithPhotos };

/**
 * "Edit birthday" — loads the record (with photos) by :id and hands it to the
 * shared form in edit mode. A Preview shortcut opens the real four-step
 * experience for this birthday.
 */
export default function BirthdayEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!id) {
      setState({ kind: 'missing' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const birthday = await getBirthday(id);
      setState(birthday ? { kind: 'ready', birthday } : { kind: 'missing' });
    } catch (error) {
      setState({ kind: 'error', message: friendlyError(error) });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') return <RouteFallback />;

  if (state.kind === 'error') {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon="⚠️"
          title="Couldn't load this birthday"
          description={state.message}
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void load()}>
              Try again
            </button>
          }
        />
      </div>
    );
  }

  if (state.kind === 'missing') {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon="🎈"
          title="This birthday no longer exists"
          description="It may have been deleted. Head back to the dashboard to see the current list."
          action={
            <Link to="/admin" className="btn btn--primary btn--sm">
              Back to dashboard
            </Link>
          }
        />
      </div>
    );
  }

  const { birthday } = state;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-brand-300">
            Admin
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
            Edit birthday
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Updating these details changes the public page straight away.
          </p>
        </div>
        <Link
          to={`/admin/preview/${birthday.id}`}
          className="btn btn--ghost btn--sm"
          title="See the real birthday experience for this person"
        >
          Preview
        </Link>
      </header>

      <BirthdayForm
        mode="edit"
        initial={birthday}
        onSaved={() => {
          toast.success('Birthday updated.');
          navigate('/admin');
        }}
        onCancel={() => navigate('/admin')}
      />
    </div>
  );
}
