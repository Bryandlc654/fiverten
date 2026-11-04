'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type AppNotification } from '../../lib/api';
import { notificationIcon, timeAgo } from '../NotificationBell';

/** Últimos avisos del centro de notificaciones. */
export default function RecentActivity() {
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    api
      .listNotifications({ pageSize: 5 })
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">Actividad reciente</h3>
      {items === null ? (
        <p className="mt-4 text-sm text-slate-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aquí aparecerán los avisos de nuevas reseñas. Puedes elegir cuáles recibir en{' '}
          <Link href="/dashboard/company" className="font-semibold text-blue-600 hover:underline">
            Empresa
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item) => {
            const negative = item.type === 'negative_review';
            return (
              <li key={item.id} className="flex items-start gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    negative ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {notificationIcon(item)}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{item.title}</p>
                  <p className="text-xs text-slate-400">{timeAgo(item.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
