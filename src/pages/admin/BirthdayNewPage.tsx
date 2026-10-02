import { useNavigate } from 'react-router-dom';
import { BirthdayForm } from '@/components/admin/BirthdayForm';
import type { CreatedBirthdayNavState } from '@/types';

/**
 * "Add birthday" — a create-mode form. On success the dashboard opens the
 * copy-link modal via router state; on cancel we return to the dashboard.
 */
export default function BirthdayNewPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-brand-300">
          Admin
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
          Add birthday
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Fill in the details — the public link is created automatically.
        </p>
      </header>

      <BirthdayForm
        mode="create"
        onSaved={(result) => {
          const created: CreatedBirthdayNavState = {
            name: result.birthday.name,
            slug: result.birthday.slug,
            status: result.birthday.status,
            photosUploaded: result.photosUploaded,
            photosFailed: result.photosFailed,
          };
          navigate('/admin', { state: { created } });
        }}
        onCancel={() => navigate('/admin')}
      />
    </div>
  );
}
