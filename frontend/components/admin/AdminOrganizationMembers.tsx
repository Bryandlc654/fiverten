'use client';

import { useState, type FormEvent } from 'react';
import {
  ApiError,
  api,
  type Invitation,
  type Member,
} from '../../lib/api';
import { Alert, Field, inputClass } from '../ui';

const ROLES = ['owner', 'admin', 'manager', 'editor', 'viewer'] as const;
const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Responsable',
  editor: 'Editor',
  viewer: 'Consulta',
};

export default function AdminOrganizationMembers({
  organizationId,
  members,
  invitations,
  onChange,
}: {
  organizationId: string;
  members: Member[];
  invitations: Invitation[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');
  const [inviting, setInviting] = useState(false);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setBusy(null);
    }
  }

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await api.adminInviteOrganizationMember(organizationId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la invitación');
    } finally {
      setInviting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-slate-900">Miembros</h2>
      <p className="mt-1 text-xs text-slate-500">
        Gestiona roles, accesos e invitaciones de esta empresa.
      </p>

      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {members.map((member) => (
          <li key={member.membershipId} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {[member.firstName, member.lastName].filter(Boolean).join(' ') ||
                  member.username ||
                  member.email}
                {member.isOwner && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    Propietario
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-slate-500">{member.email}</p>
            </div>
            <select
              value={member.role ?? 'viewer'}
              onChange={(event) =>
                void run(member.membershipId, () =>
                  api.adminUpdateOrganizationMember(organizationId, member.membershipId, {
                    role: event.target.value,
                  }),
                )
              }
              disabled={busy === member.membershipId}
              aria-label={`Rol de ${member.email}`}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                void run(member.membershipId, () =>
                  api.adminUpdateOrganizationMember(organizationId, member.membershipId, {
                    isActive: !member.isActive,
                  }),
                )
              }
              disabled={busy === member.membershipId}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                member.isActive
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {member.isActive ? 'Desactivar' : 'Activar'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`¿Eliminar a ${member.email} de la empresa?`)) return;
                void run(member.membershipId, () =>
                  api.adminRemoveOrganizationMember(organizationId, member.membershipId),
                );
              }}
              disabled={busy === member.membershipId}
              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      {invitations.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Invitaciones pendientes
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap justify-between gap-2">
                <span>{invitation.email}</span>
                <span className="text-xs text-slate-400">
                  {ROLE_LABELS[invitation.role] ?? invitation.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={onInvite} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto_auto]">
        <Field label="Invitar por correo" className="block">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="persona@empresa.com"
            className={inputClass}
          />
        </Field>
        <Field label="Rol" className="block">
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
            className={inputClass}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          disabled={inviting || !inviteEmail.trim()}
          className="self-end rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
        >
          {inviting ? 'Enviando…' : 'Invitar'}
        </button>
      </form>
    </section>
  );
}
