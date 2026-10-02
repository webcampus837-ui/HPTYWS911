import { useCallback, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Brand } from '@/components/ui/Brand';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/birthdays', label: 'Birthdays', end: true },
  { to: '/admin/birthdays/new', label: 'Add birthday', end: true },
];

/**
 * Chrome shared by every signed-in admin screen: brand, navigation, the
 * signed-in identity, sign-out, and an <Outlet/> for the page itself.
 *
 * Deliberately nothing here is reachable from a public birthday page.
 */
export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      setMenuOpen(false);
      navigate('/admin/login', { replace: true });
      toast.success('Signed out. See you soon!');
    } catch {
      toast.error('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }, [navigate, signOut, signingOut, toast]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1020]/85 backdrop-blur-xl">
        <div className="app-container flex items-center gap-3 py-3">
          <NavLink to="/admin" className="shrink-0" aria-label="HBTYWS911 dashboard">
            <Brand size={2.1} tagline="Birthday surprise studio" />
          </NavLink>

          <nav aria-label="Admin" className="hidden md:flex items-center gap-1 ml-6">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-500/18 text-brand-200 border border-brand-400/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.07] border border-transparent',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:flex flex-col items-end leading-tight max-w-[14rem]">
              <span className="text-[0.8rem] font-medium text-slate-200 truncate w-full text-right">
                {user?.email ?? 'Signed in'}
              </span>
              <span className="text-[0.7rem] text-slate-500">Administrator</span>
            </span>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn btn--ghost btn--sm"
            >
              {signingOut ? <span className="spinner" aria-hidden="true" /> : null}
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>

            <button
              type="button"
              className="btn btn--ghost btn--sm md:hidden"
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id="admin-mobile-nav"
            aria-label="Admin (mobile)"
            className="md:hidden border-t border-white/10 bg-[#0d1426]/95"
          >
            <div className="app-container flex flex-col gap-1 py-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'px-3 py-2.5 rounded-xl text-sm font-medium',
                      isActive
                        ? 'bg-brand-500/18 text-brand-200'
                        : 'text-slate-300 hover:bg-white/[0.07]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main id="main" className="flex-1">
        <div className="app-container py-6 md:py-9">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="app-container py-5 flex flex-wrap items-center justify-between gap-2 text-[0.78rem] text-slate-500">
          <span>
            HBTYWS911 — private by design. Birthday pages are reachable only with the date of birth
            you set.
          </span>
          <span>Admin panel</span>
        </div>
      </footer>
    </div>
  );
}
