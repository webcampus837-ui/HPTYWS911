import { Modal } from '@/components/ui/Modal';

export interface DeleteBirthdayModalProps {
  open: boolean;
  /** Person's name, shown so the admin can be sure which record this is. */
  name: string;
  slug?: string;
  photoCount?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive-action confirmation.
 *
 * Deletion removes the database record, the photo files in Supabase Storage
 * and therefore the public page — so the dialog says exactly that, in plain
 * words, and requires an explicit second click.
 */
export function DeleteBirthdayModal({
  open,
  name,
  slug,
  photoCount = 0,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteBirthdayModalProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      closeOnBackdrop={!busy}
      title="Delete this birthday?"
      subtitle={name ? `You are about to delete ${name}'s surprise page.` : undefined}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger-solid"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <p className="text-sm font-semibold text-slate-100">{name || 'This birthday'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.78rem] text-slate-400">
            {slug ? <span className="chip chip--neutral">/{slug}</span> : null}
            <span className="chip chip--neutral">
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm text-slate-300">This will permanently delete:</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-rose-300">
                •
              </span>
              Birthday details
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-rose-300">
                •
              </span>
              Photos
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-rose-300">
                •
              </span>
              Public page
            </li>
          </ul>
        </div>

        <p className="text-sm font-medium text-rose-200">This action cannot be undone.</p>
      </div>
    </Modal>
  );
}
