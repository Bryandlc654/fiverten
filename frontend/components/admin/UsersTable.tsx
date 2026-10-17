'use client';

import type { AdminUser } from '../../lib/api';
import { NEUTRAL_TONE } from '../../lib/status-tones';
import { Badge, LoadingRow } from '../ui';

export type UserToggle = 'isActive' | 'isVerified' | 'isSuperAdmin';

export default function UsersTable({
  users,
  loading,
  busyUserId,
  onToggle,
}: {
  users: AdminUser[];
  loading: boolean;
  busyUserId: string | null;
  onToggle: (user: AdminUser, field: UserToggle) => void;
}) {
  if (loading) {
    return <LoadingRow label="Cargando usuarios…" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-t border-slate-100 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="px-5 py-3 font-semibold">Usuario</th>
            <th className="px-5 py-3 font-semibold">Empresa</th>
            <th className="px-5 py-3 font-semibold">Estado</th>
            <th className="px-5 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const busy = busyUserId === user.id;
            const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
            return (
              <tr key={user.id}>
                <td className="px-5 py-3">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    {name}
                    {user.isSuperAdmin && (
                      <span className="material-symbols-outlined text-[15px] text-amber-500">
                        workspace_premium
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="px-5 py-3 text-slate-600">{user.organization?.tradeName ?? '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      label={user.isActive ? 'Activo' : 'Inactivo'}
                      tone={user.isActive ? 'bg-emerald-50 text-emerald-600' : NEUTRAL_TONE}
                    />
                    <Badge
                      label={user.isVerified ? 'Verificado' : 'Sin verificar'}
                      tone={user.isVerified ? 'bg-blue-50 text-blue-600' : NEUTRAL_TONE}
                    />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggle(user, 'isActive')}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-60"
                    >
                      {user.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggle(user, 'isSuperAdmin')}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-60"
                    >
                      {user.isSuperAdmin ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
