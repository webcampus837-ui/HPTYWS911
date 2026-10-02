import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '@/components/ui/Brand';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { isSupabaseConfigured } from '@/lib/env';
import { friendlyError } from '@/lib/errors';
import { cn } from '@/utils/cn';

/**
 * The only door into the admin panel — Supabase email + password.
 *
 * There is deliberately no registration page: accounts exist only when someone
 * with Supabase access creates them, so the dashboard stays private.
 */
export default function LoginPage() {
  const { user, initializing, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useDocumentMeta({ title: 'Admin sign in · HBTYWS911' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Where the admin was headed before RequireAuth bounced them here.
  const state = location.state as { from?: unknown } | null;
  const from = typeof state?.from === 'string' && state.from.startsWith('/admin') ? state.from : '/admin';

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy) return;
      setError(null);

      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError('Enter your email address and password.');
        return;
      }

      setBusy(true);
      try {
        await signIn(trimmedEmail, password);
        navigate(from, { replace: true });
      } catch (signInError) {
        // Generic, non-technical message — never raw Supabase errors.
        setError(friendlyError(signInError));
      } finally {
        setBusy(false);
      }
    },
    [busy, email, password, from, navigate, signIn],
  );

  if (initializing) {
    return (
      <div className="app-shell">
        <div className="flex-1 grid place-items-center" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <span className="spinner spinner--lg" />
            <span className="text-[0.72rem] tracking-[0.18em] uppercase text-slate-500">
              Checking your session
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Already signed in → straight to where they were going.
  if (user) return <Navigate to={from} replace />;

  return (
    <div className="app-shell">
      <main className="flex-1">
        <div className="app-container min-h-[100dvh] grid place-items-center py-10">
          <div className="w-full max-w-md flex flex-col gap-6 animate-fade-up">
            <div className="flex flex-col items-center gap-2 text-center">
              <Brand size={3} tagline="Birthday surprise studio" />
              <h1 className="mt-2 text-xl font-semibold text-slate-50">Admin sign in</h1>
              <p className="text-[0.86rem] text-slate-400 leading-relaxed max-w-[22rem]">
                Sign in with the administrator account to create and manage birthday surprises.
              </p>
            </div>

            {!isSupabaseConfigured ? (
              <div className="panel panel--solid p-5 flex flex-col gap-3" role="alert">
                <h2 className="text-sm font-semibold text-slate-100">Supabase isn’t connected yet</h2>
                <p className="text-[0.84rem] text-slate-400 leading-relaxed">
                  Add <code className="text-slate-200">VITE_SUPABASE_URL</code> and{' '}
                  <code className="text-slate-200">VITE_SUPABASE_ANON_KEY</code> to a{' '}
                  <code className="text-slate-200">.env</code> file (copy{' '}
                  <code className="text-slate-200">.env.example</code>), run{' '}
                  <code className="text-slate-200">supabase/schema.sql</code> in your project, then
                  restart the dev server. The README walks through it step by step.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="panel p-5 flex flex-col gap-4">
                <div className="field">
                  <label className="field__label" htmlFor="login-email">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={busy}
                  />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="login-password">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-16"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                      disabled={busy}
                      aria-describedby={error ? 'login-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((show) => !show)}
                      className={cn(
                        'absolute right-2 px-2 py-1 rounded-lg text-[0.74rem] font-medium',
                        'text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors',
                      )}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p
                    id="login-error"
                    role="alert"
                    className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-[0.84rem] text-rose-100"
                  >
                    {error}
                  </p>
                ) : null}

                <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                  {busy ? <span className="spinner" aria-hidden="true" /> : null}
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>

                <p className="text-center text-[0.76rem] text-slate-500 leading-relaxed">
                  Access is limited to this site’s administrator account. New accounts can only be
                  created from Supabase — there is no public sign-up.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
