'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert } from '../../../components/ui';
import InviteMemberModal from '../../../components/users/InviteMemberModal';
import MembersTable from '../../../components/users/MembersTable';
import PendingInvitations from '../../../components/users/PendingInvitations';
import { ApiError, api, type Invitation, type Member } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { roleAtLeast } from '../../../lib/roles';

export default function UsersPage() {
  const { role } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const canManage = roleAtLeast(role, 'manager');
  const canRemove = roleAtLeast(role, 'admin');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memberData, invitationData] = await Promise.all([
        api.listMembers(),
        canManage ? api.listInvitations() : Promise.resolve({ invitations: [] }),
      ]);
      setMembers(memberData.members);
      setInvitations(invitationData.invitations);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Ejecuta una acción sobre una fila mostrando su estado y el resultado. */
  async function run(id: string, action: () => Promise<string>, failure: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusyId(null);
    }
  }

  function replaceMember(updated: Member) {
    setMembers((current) =>
      current.map((item) => (item.membershipId === updated.membershipId ? updated : item)),
    );
  }

  function changeRole(member: Member, newRole: string) {
    if (newRole === member.role) return;
    void run(
      member.membershipId,
      async () => {
        replaceMember(await api.updateMember(member.membershipId, { role: newRole }));
        return 'Rol actualizado.';
      },
      'No se pudo actualizar el rol',
    );
  }

  function toggleActive(member: Member) {
    void run(
      member.membershipId,
      async () => {
        const updated = await api.updateMember(member.membershipId, { isActive: !member.isActive });
        replaceMember(updated);
        return updated.isActive ? 'Usuario reactivado.' : 'Usuario desactivado.';
      },
      'No se pudo cambiar el estado',
    );
  }

  function removeMember(member: Member) {
    void run(
      member.membershipId,
      async () => {
        await api.removeMember(member.membershipId);
        setMembers((current) =>
          current.filter((item) => item.membershipId !== member.membershipId),
        );
        return 'Usuario eliminado de la empresa.';
      },
      'No se pudo eliminar el usuario',
    );
  }

  function revokeInvitation(invitation: Invitation) {
    void run(
      invitation.id,
      async () => {
        await api.revokeInvitation(invitation.id);
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));
        return 'Invitación cancelada.';
      },
      'No se pudo cancelar la invitación',
    );
  }

  async function onInvited(email: string) {
    setShowInvite(false);
    setNotice(`Invitación enviada a ${email}. Entrará en la empresa cuando la acepte.`);
    await load();
  }

  return (
    <DashboardShell
      active="users"
      title="Usuarios"
      subtitle="Gestiona los miembros de tu empresa y sus roles"
    >
      <div className="space-y-6">
        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {canManage && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Invitar usuario
            </button>
          </div>
        )}

        <MembersTable
          members={members}
          loading={loading}
          busyId={busyId}
          canManage={canManage}
          canRemove={canRemove}
          onChangeRole={changeRole}
          onToggleActive={toggleActive}
          onRemove={removeMember}
        />

        {canManage && (
          <PendingInvitations
            invitations={invitations}
            busyId={busyId}
            onRevoke={revokeInvitation}
          />
        )}
      </div>

      {showInvite && (
        <InviteMemberModal onClose={() => setShowInvite(false)} onInvited={onInvited} />
      )}
    </DashboardShell>
  );
}
