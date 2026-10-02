import { Link } from 'react-router-dom';
import { Brand } from '@/components/ui/Brand';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

/** Friendly 404 — never a redirect to the admin login. */
export default function NotFoundPage() {
  useDocumentMeta({ title: 'Page not found · HBTYWS911' });

  return (
    <div className="app-shell">
      <main className="flex-1">
        <div className="app-container min-h-[70dvh] flex flex-col items-center justify-center gap-5 py-12 text-center">
          <Brand size={2.6} />
          <div className="flex flex-col gap-2 max-w-sm">
            <h1 className="text-xl font-semibold text-slate-100">This page isn’t here</h1>
            <p className="text-[0.9rem] text-slate-400 leading-relaxed">
              The address may have a typo, or the page may have been moved. If you were sent an
              HBTYWS911 birthday link, double-check it with the person who shared it.
            </p>
          </div>
          <Link to="/" className="btn btn--ghost">
            Back to the start
          </Link>
        </div>
      </main>
    </div>
  );
}
