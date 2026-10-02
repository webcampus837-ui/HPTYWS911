import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RouteFallback } from '@/components/ui/RouteFallback';
import { useAuth } from '@/hooks/useAuth';

/**
 * Gate for every `/admin/*` route.
 *
 * Unauthenticated visitors are redirected to the admin login (never to a
 * public page), and the path they wanted is remembered so a successful sign-in
 * drops them straight back where they were headed.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <RouteFallback />;

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}
