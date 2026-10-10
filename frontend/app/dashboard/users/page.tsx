'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { ApiError, api, type Member } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { ROLE_OPTIONS, roleAtLeast, roleLabel } from '../../../lib/roles';

interface NewMemberForm {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
}

const EMPTY_FORM: NewMemberForm = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'viewer',
  password: '',
};

export default function UsersPage() {
  const { role } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<NewMemberForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const canManage = roleAtLeast(role, 'manager');
  const canRemove = roleAtLeast(role, 'admin');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMembers();
      setMembers(data.members);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await api.addMember({
        email: form.email.trim(),
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        role: form.role,
        password: form.password || undefined,
      });
      setForm(EMPTY_FORM);
      setNotice('Usuario añadido a la empresa.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo añadir el usuario');
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(member: Member, newRole: string) {
    if (newRole === member.role) return;
    setBusyId(member.membershipId);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateMember(member.membershipId, { role: newRole });
      setMembers((current) =>
        current.map((item) => (item.membershipId === updated.membershipId ? updated : item)),
      );
      setNotice('Rol actualizado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el rol');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(member: Member) {
    setBusyId(member.membershipId);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateMember(member.membershipId, { isActive: !member.isActive });
      setMembers((current) =>
        current.map((item) => (item.membershipId === updated.membershipId ? updated : item)),
      );
      setNotice(updated.isActive ? 'Usuario reactivado.' : 'Usuario desactivado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(member: Member) {
    setBusyId(member.membershipId);
    setError(null);
    setNotice(null);
    try {
      await api.removeMember(member.membershipId);
      setMembers((current) => current.filter((item) => item.membershipId !== member.membershipId));
      setNotice('Usuario eliminado de la empresa.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el usuario');
    } finally {
      setBusyId(null);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500';

  return (
    <DashboardShell
      active="users"
      title="Usuarios"
      subtitle="Gestiona los miembros de tu empresa y sus roles"
    >
      <div className="space-y-6">
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {canManage && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Añadir usuario</h2>
            <p className="text-xs text-slate-500">
              Si el correo no existe, se creará una cuenta nueva con la contraseña indicada.
            </p>
            <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
              <input
                type="email"
                required
                placeholder="correo@empresa.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`sm:col-span-2 ${inputClass}`}
              />
              <input
                placeholder="Nombre"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Apellidos"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inputClass}
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputClass}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="password"
                placeholder="Contraseña (usuarios nuevos)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`sm:col-span-3 ${inputClass}`}
              />
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60 sm:col-span-2"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                {creating ? 'Añadiendo…' : 'Añadir usuario'}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Miembros</h2>
            <span className="text-xs font-semibold text-slate-500">{members.length} en total</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 px-5 pb-6 text-sm text-slate-500">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Cargando usuarios…
            </div>
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
                  {members.map((member) => {
                    const busy = busyId === member.membershipId;
                    const name =
                      [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username;
                    return (
                      <tr key={member.membershipId} className="align-middle">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {name
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
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
                              onChange={(e) => void changeRole(member, e.target.value)}
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
                              member.isActive
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-500'
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
                                onClick={() => void toggleActive(member)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                              >
                                {member.isActive ? 'Desactivar' : 'Activar'}
                              </button>
                            )}
                            {canRemove && !member.isOwner && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void onRemove(member)}
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
