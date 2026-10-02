import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  toasts: ToastItem[];
  /** Show a toast and return its id. */
  push: (message: string, kind?: ToastKind) => number;
  success: (message: string) => number;
  error: (message: string) => number;
  info: (message: string) => number;
  dismiss: (id: number) => void;
}

const ICONS: Record<ToastKind, string> = {
  success: '✅',
  error: '⚠️',
  info: '💡',
};

function lifetimeOf(kind: ToastKind): number {
  return kind === 'error' ? 7000 : 4500;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * App-wide toasts.
 *
 * One provider at the root, `useToast()` anywhere below it. Toasts render in a
 * portal so they are never clipped or re-stacked by an admin panel container.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-3), { id, kind, message }]);
      const timer = window.setTimeout(() => dismiss(id), lifetimeOf(kind));
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => window.clearTimeout(timer));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toasts,
      push,
      dismiss,
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
      info: (message: string) => push(message, 'info'),
    }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className="toast-stack" role="region" aria-label="Notifications">
            {toasts.map((toast) => (
              <div key={toast.id} className={cn('toast', `toast--${toast.kind}`)} role="status">
                <span className="toast__icon" aria-hidden="true">
                  {ICONS[toast.kind]}
                </span>
                <span className="toast__msg">{toast.message}</span>
                <button
                  type="button"
                  className="toast__close"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
