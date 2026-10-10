'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell';
import {
  ApiError,
  api,
  type AdminOrganizationSummary,
  type AdminUser,
  type PlatformStats,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { organizationStatusLabel, verificationStatusLabel } from '../../lib/roles';

type Tab = 'organizations' | 'users';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  suspended: 'bg-red-50 text-red-600',
  inactive: 'bg-slate-100 text-slate-500',
};

const VERIFICATION_TONE: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-blue-50 text-blue-600',
  not_verified: 'bg-slate-100 text-slate-500',
  rejected: 'bg-red-50 text-red-600',
};

const PAGE_SIZE = 20;

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando panel…
          </div>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSuperAdmin, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('organizations');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<AdminOrganizationSummary[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgPage, setOrgPage] = useState(1);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgLoading, setOrgLoading] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userLoading, setUserLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    setTab(searchParams.get('tab') === 'users' ? 'users' : 'organizations');
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .adminStats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los datos'));
  }, [isSuperAdmin]);

  const loadOrgs = useCallback(() => {
    setOrgLoading(true);
    api
      .adminListOrganizations({ page: orgPage, pageSize: PAGE_SIZE, search: orgSearch || undefined })
      .then((data) => {
        setOrgs(data.items);
        setOrgTotal(data.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar empresas'))
      .finally(() => setOrgLoading(false));
  }, [orgPage, orgSearch]);

  const loadUsers = useCallback(() => {
    setUserLoading(true);
    api
      .adminListUsers({ page: userPage, pageSize: PAGE_SIZE, search: userSearch || undefined })
      .then((data) => {
        setUsers(data.items);
        setUserTotal(data.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar usuarios'))
      .finally(() => setUserLoading(false));
  }, [userPage, userSearch]);

  useEffect(() => {
    if (isSuperAdmin && tab === 'organizations') loadOrgs();
  }, [isSuperAdmin, tab, loadOrgs]);

  useEffect(() => {
    if (isSuperAdmin && tab === 'users') loadUsers();
  }, [isSuperAdmin, tab, loadUsers]);

  async function toggleUser(user: AdminUser, field: 'isActive' | 'isVerified' | 'isSuperAdmin') {
    setBusyUserId(user.id);
    setError(null);
    try {
      const updated = await api.adminUpdateUser(user.id, { [field]: !user[field] });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setBusyUserId(null);
    }
  }

  const orgPages = Math.max(1, Math.ceil(orgTotal / PAGE_SIZE));
  const userPages = Math.max(1, Math.ceil(userTotal / PAGE_SIZE));

  return (
    <DashboardShell
      active={tab === 'users' ? 'adminUsers' : 'adminOrgs'}
      title="Panel general"
      subtitle="Administración de empresas y usuarios de la plataforma"
      userInitials="FG"
      userName="Administrador general"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Empresas"
            value={stats?.organizations.total}
            hint={`${stats?.organizations.active ?? 0} activas`}
            icon="storefront"
            tone="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Verificadas"
            value={stats?.organizations.verified}
            hint={`${stats?.organizations.pending ?? 0} en revisión`}
            icon="verified"
            tone="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Usuarios"
            value={stats?.users.total}
            hint={`${stats?.users.active ?? 0} activos`}
            icon="group"
            tone="bg-violet-50 text-violet-600"
          />
          <StatCard
            label="Administradores"
            value={stats?.users.admins}
            hint="Super administradores"
            icon="admin_panel_settings"
            tone="bg-amber-50 text-amber-600"
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setTab('organizations')}
                className={`rounded-md px-4 py-1.5 transition ${
                  tab === 'organizations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Empresas
              </button>
              <button
                type="button"
                onClick={() => setTab('users')}
                className={`rounded-md px-4 py-1.5 transition ${
                  tab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Usuarios
              </button>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  search
                </span>
                <input
                  value={tab === 'organizations' ? orgSearch : userSearch}
                  onChange={(e) => {
                    if (tab === 'organizations') {
                      setOrgSearch(e.target.value);
                      setOrgPage(1);
                    } else {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }
                  }}
                  placeholder="Buscar…"
                  className="w-56 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
              {tab === 'organizations' && (
                <button
                  type="button"
                  onClick={() => router.push('/admin/organizations/new')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  <span className="material-symbols-outlined text-[18px]">add_business</span>
                  Nueva empresa
                </button>
              )}
            </div>
          </div>

          {tab === 'organizations' ? (
            <div className="overflow-x-auto">
              {orgLoading ? (
                <LoadingRow label="Cargando empresas…" />
              ) : orgs.length === 0 ? (
                <EmptyRow label="No hay empresas que coincidan." />
              ) : (
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-semibold">Empresa</th>
                      <th className="px-5 py-3 font-semibold">Estado</th>
                      <th className="px-5 py-3 font-semibold">Verificación</th>
                      <th className="px-5 py-3 font-semibold">Miembros</th>
                      <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orgs.map((org) => (
                      <tr key={org.id} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-5 py-3" onClick={() => router.push(`/admin/organizations/${org.id}`)}>
                          <p className="font-semibold text-slate-900">{org.tradeName}</p>
                          <p className="text-xs text-slate-500">{org.publicId}</p>
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            label={organizationStatusLabel(org.status)}
                            tone={STATUS_TONE[org.status] ?? 'bg-slate-100 text-slate-500'}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            label={verificationStatusLabel(org.verificationStatus)}
                            tone={VERIFICATION_TONE[org.verificationStatus] ?? 'bg-slate-100 text-slate-500'}
                          />
                        </td>
                        <td className="px-5 py-3 text-slate-600">{org.members}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/organizations/${org.id}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {userLoading ? (
                <LoadingRow label="Cargando usuarios…" />
              ) : (
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
                      const name =
                        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
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
                          <td className="px-5 py-3 text-slate-600">
                            {user.organization?.tradeName ?? '—'}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                label={user.isActive ? 'Activo' : 'Inactivo'}
                                tone={user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}
                              />
                              <Badge
                                label={user.isVerified ? 'Verificado' : 'Sin verificar'}
                                tone={user.isVerified ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void toggleUser(user, 'isActive')}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-60"
                              >
                                {user.isActive ? 'Desactivar' : 'Activar'}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void toggleUser(user, 'isSuperAdmin')}
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
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
            <span>
              {tab === 'organizations'
                ? `${orgTotal} empresas`
                : `${userTotal} usuarios`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={tab === 'organizations' ? orgPage <= 1 : userPage <= 1}
                onClick={() =>
                  tab === 'organizations' ? setOrgPage((p) => p - 1) : setUserPage((p) => p - 1)
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                {tab === 'organizations' ? `${orgPage}/${orgPages}` : `${userPage}/${userPages}`}
              </span>
              <button
                type="button"
                disabled={
                  tab === 'organizations' ? orgPage >= orgPages : userPage >= userPages
                }
                onClick={() =>
                  tab === 'organizations' ? setOrgPage((p) => p + 1) : setUserPage((p) => p + 1)
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number | undefined;
  hint: string;
  icon: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <span className="text-xs text-slate-400">{hint}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-500">
      <span className="material-symbols-outlined animate-spin">progress_activity</span>
      {label}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="px-5 py-8 text-sm text-slate-500">{label}</div>;
}
