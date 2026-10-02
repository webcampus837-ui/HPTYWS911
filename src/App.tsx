import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/admin/RequireAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RouteFallback } from '@/components/ui/RouteFallback';

// The public experience is the heart of the app, so it ships in the main
// bundle and paints immediately. Everything admin-only is code-split away,
// which means a visitor never downloads dashboard code — and the dashboard
// never loads confetti.
import BirthdayPage from '@/pages/BirthdayPage';

const HomePage = lazy(() => import('@/pages/HomePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const BirthdayNewPage = lazy(() => import('@/pages/admin/BirthdayNewPage'));
const BirthdayEditPage = lazy(() => import('@/pages/admin/BirthdayEditPage'));
const PreviewPage = lazy(() => import('@/pages/admin/PreviewPage'));

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* ------------------------------ Admin ------------------------------ */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            {/* `/admin` and `/admin/birthdays` are the same dashboard. */}
            <Route path="birthdays" element={<DashboardPage />} />
            <Route path="birthdays/new" element={<BirthdayNewPage />} />
            <Route path="birthdays/:id/edit" element={<BirthdayEditPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>

          {/* Preview renders the real four-step experience full-bleed (no admin
              chrome), but stays behind RequireAuth — only the admin can open it. */}
          <Route
            path="/admin/preview/:id"
            element={
              <RequireAuth>
                <PreviewPage />
              </RequireAuth>
            }
          />

          {/* --------------------------- Public pages -------------------------- */}
          {/* Any single-segment path is treated as a birthday slug. Unknown slugs
              are answered by the page itself with a polite "not here" screen —
              a visitor is never redirected to the admin login. */}
          <Route path="/:slug" element={<BirthdayPage />} />

          {/* Multi-segment paths that match nothing. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
