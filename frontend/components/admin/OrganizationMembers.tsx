import type { Invitation, Member } from '../../lib/api';
import { roleLabel } from '../../lib/roles';

/** Miembros e invitaciones pendientes de una empresa (vista del super admin). */
export default function OrganizationMembers({
  members,
  invitations,
}: {
  members: Member[];
  invitations: Invitation[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Miembros ({members.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="block w-full md:table md:min-w-[600px] border-t border-slate-100 text-left text-sm">
          <thead className="hidden md:table-header-group">
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Usuario</th>
              <th className="px-5 py-3 font-semibold">Rol</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="block divide-y divide-slate-100 md:table-row-group">
            {members.map((member) => (
              <tr key={member.membershipId} className="block py-2 md:table-row md:py-0">
                <td className="block px-5 py-1 md:table-cell md:py-3">
                  <p className="font-semibold text-slate-900">
                    {[member.firstName, member.lastName].filter(Boolean).join(' ') ||
                      member.username}
                  </p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </td>
                <td className="block px-5 py-1 md:table-cell md:py-3 text-slate-600">
                  {member.roleName}
                  {member.isOwner ? ' · propietario' : ''}
                </td>
                <td className="block px-5 py-1 md:table-cell md:py-3 text-slate-600">
                  {member.isActive ? 'Activo' : 'Inactivo'}
                </td>
              </tr>
            ))}
            {invitations.map((invitation) => (
              <tr key={invitation.id} className="block py-2 md:table-row md:py-0 bg-slate-50/60">
                <td className="block px-5 py-1 md:table-cell md:py-3">
                  <p className="font-semibold text-slate-900">{invitation.email}</p>
                  <p className="text-xs text-slate-500">Invitación enviada</p>
                </td>
                <td className="block px-5 py-1 md:table-cell md:py-3 text-slate-600">
                  {roleLabel(invitation.role)}
                </td>
                <td className="block px-5 py-1 md:table-cell md:py-3 text-amber-600">
                  Pendiente hasta el {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
