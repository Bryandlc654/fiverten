'use client';

import type { Invitation } from '../../lib/api';
import { roleLabel } from '../../lib/roles';

interface PendingInvitationsProps {
  invitations: Invitation[];
  busyId: string | null;
  onRevoke: (invitation: Invitation) => void;
}

/** Invitaciones enviadas que el destinatario aún no ha aceptado. */
export default function PendingInvitations({
  invitations,
  busyId,
  onRevoke,
}: PendingInvitationsProps) {
  if (invitations.length === 0) {
    return null;
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white" data-testid="pending-invitations">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Invitaciones pendientes</h2>
        <span className="text-xs font-semibold text-slate-500">{invitations.length}</span>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{invitation.email}</p>
              <p className="text-xs text-slate-500">
                {roleLabel(invitation.role)} · caduca el{' '}
                {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === invitation.id}
              onClick={() => onRevoke(invitation)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
            >
              Cancelar invitación
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
