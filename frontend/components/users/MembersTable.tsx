'use client';

import type { Member } from '../../lib/api';
import { ROLE_OPTIONS, roleLabel } from '../../lib/roles';
import { LoadingRow, initialsOf } from '../ui';

interface MembersTableProps {
  members: Member[];
  loading: boolean;
  busyId: string | null;
  canManage: boolean;
  canRemove: boolean;
  onChangeRole: (member: Member, role: string) => void;
  onToggleActive: (member: Member) => void;
  onRemove: (member: Member) => void;
}

export default function MembersTable({
  members,
  loading,
  busyId,
  canManage,
  canRemove,
  onChangeRole,
  onToggleActive,
  onRemove,
}: MembersTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Miembros</h2>
        <span className="text-xs font-semibold text-slate-500">{members.length} en total</span>
      </div>

      {loading ? (
        <LoadingRow label="Cargando usuarios…" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-t border-slate-100 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-semibold">Usuario</th>
                <th className="px-5 py-3 font-semibold">Rol</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Alta</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <MemberRow
                  key={member.membershipId}
                  member={member}
                  busy={busyId === member.membershipId}
                  canManage={canManage}
                  canRemove={canRemove}
                  onChangeRole={onChangeRole}
                  onToggleActive={onToggleActive}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MemberRow({
  member,
  busy,
  canManage,
  canRemove,
  onChangeRole,
  onToggleActive,
  onRemove,
}: Omit<MembersTableProps, 'members' | 'loading' | 'busyId'> & { member: Member; busy: boolean }) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username;
  return (
    <tr className="align-middle">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold text-slate-900">
              {name}
              {member.isOwner && (
                <span className="material-symbols-outlined text-[15px] text-amber-500">
                  workspace_premium
                </span>
              )}
            </p>
            <p className="truncate text-xs text-slate-500">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        {canManage && !member.isOwner ? (
          <select
            value={member.role ?? 'viewer'}
            disabled={busy}
            onChange={(e) => onChangeRole(member, e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {roleLabel(member.role)}
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            member.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {member.isActive ? 'Activo' : 'Inactivo'}
        </span>
        {!member.isVerified && (
          <span className="ml-2 text-[11px] text-amber-500">sin verificar</span>
        )}
      </td>
      <td className="px-5 py-3 text-xs text-slate-500">
        {new Date(member.joinedAt).toLocaleDateString('es-ES')}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-2">
          {canManage && !member.isOwner && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggleActive(member)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
            >
              {member.isActive ? 'Desactivar' : 'Activar'}
            </button>
          )}
          {canRemove && !member.isOwner && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(member)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Eliminar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
