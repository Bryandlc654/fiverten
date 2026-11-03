'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type AppNotification } from '../lib/api';

const PAGE_SIZE = 8;
const POLL_MS = 60_000;

/** "Hace 5 min", "Hace 3 h", "Hace 2 días" o la fecha. */
export function timeAgo(value: string): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  return new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function notificationIcon(notification: AppNotification): string {
  return notification.type === 'negative_review' ? 'warning' : 'reviews';
}

/** Campana del header: contador de no leídas y centro de notificaciones. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    api
      .unreadNotifications()
      .then((data) => setUnread(data.unread))
      .catch(() => undefined);
  }, []);

  // Contador: al montar, cada minuto y al volver a la pestaña.
  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, POLL_MS);
    window.addEventListener('focus', refreshCount);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshCount);
    };
  }, [refreshCount]);

  const load = useCallback(
    (nextPage: number) => {
      setError(false);
      api
        .listNotifications({ page: nextPage, pageSize: PAGE_SIZE, unread: onlyUnread })
        .then((data) => {
          setItems((current) =>
            nextPage === 1 || !current ? data.items : [...current, ...data.items],
          );
          setTotal(data.total);
          setUnread(data.unread);
          setPage(nextPage);
        })
        .catch(() => setError(true));
    },
    [onlyUnread],
  );

  useEffect(() => {
    if (open) load(1);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function openNotification(notification: AppNotification) {
    if (!notification.read) {
      setItems(
        (current) =>
          current?.map((n) => (n.id === notification.id ? { ...n, read: true } : n)) ?? null,
      );
      setUnread((value) => Math.max(0, value - 1));
      await api.markNotificationRead(notification.id).catch(() => undefined);
    }
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  }

  async function markAll() {
    await api.markAllNotificationsRead().catch(() => undefined);
    setUnread(0);
    setItems((current) =>
      onlyUnread ? [] : (current?.map((n) => ({ ...n, read: true })) ?? null),
    );
    if (onlyUnread) setTotal(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed inset-x-3 top-[72px] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Notificaciones</p>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={unread === 0}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300"
            >
              Marcar todas como leídas
            </button>
          </div>
          <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
            {[
              { value: false, label: 'Todas' },
              { value: true, label: `No leídas${unread > 0 ? ` (${unread})` : ''}` },
            ].map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setItems(null);
                  setOnlyUnread(tab.value);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  onlyUnread === tab.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto sm:max-h-96">
            {error ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">
                No se pudieron cargar las notificaciones.
              </p>
            ) : items === null ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Cargando…</p>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-slate-300">
                  notifications_off
                </span>
                <p className="mt-1 text-sm text-slate-500">
                  {onlyUnread
                    ? 'No tienes notificaciones sin leer.'
                    : 'Aún no tienes notificaciones.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((notification) => {
                  const negative = notification.type === 'negative_review';
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                          notification.read ? '' : negative ? 'bg-red-50/60' : 'bg-blue-50/50'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            negative ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {notificationIcon(notification)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span
                              className={`text-sm ${
                                notification.read
                                  ? 'text-slate-700'
                                  : 'font-semibold text-slate-900'
                              }`}
                            >
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                                aria-label="Sin leer"
                              />
                            )}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                            {notification.body}
                          </span>
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {items && items.length < total && (
              <button
                type="button"
                onClick={() => load(page + 1)}
                className="w-full border-t border-slate-100 px-4 py-3 text-xs font-semibold text-blue-600 hover:bg-slate-50"
              >
                Cargar más
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
