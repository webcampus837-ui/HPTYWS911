import { Link } from 'react-router-dom';
import { Brand } from '@/components/ui/Brand';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

/**
 * Public landing (`/`).
 *
 * Most visitors arrive straight on a birthday link (`/suhail`), but anyone who
 * trims the URL down to the root gets a warm explanation instead of a login
 * screen — this page deliberately does not look like an admin page.
 */
export default function HomePage() {
  useDocumentMeta({
    title: 'HBTYWS911 — Birthday Surprises',
    description:
      'Someone made you a birthday surprise. Open your personal link to unlock it with the date of birth it was set up with.',
  });

  return (
    <div className="app-shell">
      <main className="flex-1">
        <div className="app-container min-h-[100dvh] flex flex-col items-center justify-center gap-6 py-12 text-center">
          <Brand size={3.4} tagline="Birthday surprise studio" />

          <div className="max-w-md flex flex-col gap-3">
            <h1 className="text-2xl md:text-[1.7rem] font-semibold text-slate-50 leading-snug">
              Someone may have made you a birthday surprise 🎁
            </h1>
            <p className="text-[0.95rem] text-slate-400 leading-relaxed">
              HBTYWS911 pages are personal: each one lives behind its own link and opens with the
              date of birth it was set up with. If a friend sent you a link like{' '}
              <span className="text-slate-200 font-mono text-[0.85rem]">/suhail</span>, open it and
              enter your date of birth to unlock the surprise.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="chip chip--neutral">🔒 No account needed</span>
            <span className="chip chip--neutral">🎂 One link per person</span>
            <span className="chip chip--neutral">📸 Photos, music &amp; confetti</span>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="app-container py-5 flex items-center justify-between gap-2 text-[0.78rem] text-slate-500">
          <span>HBTYWS911 — private by design.</span>
          <Link to="/admin/login" className="hover:text-slate-300 transition-colors">
            Admin sign in →
          </Link>
        </div>
      </footer>
    </div>
  );
}
