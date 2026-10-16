'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell';
import OrganizationsTable from '../../components/admin/OrganizationsTable';
import Pagination from '../../components/admin/Pagination';
import PlatformStatCards from '../../components/admin/PlatformStatCards';
import UsersTable, { type UserToggle } from '../../components/admin/UsersTable';
import { Alert } from '../../components/ui';
import {
  ApiError,
  api,
  type AdminOrganizationSummary,
  type AdminUser,
  type PlatformStats,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

type Tab = 'organizations' | 'users';

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

  async function toggleUser(user: AdminUser, field: UserToggle) {
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
        {error && <Alert tone="error">{error}</Alert>}

        <PlatformStatCards stats={stats} />

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
            <OrganizationsTable organizations={orgs} loading={orgLoading} />
          ) : (
            <UsersTable
              users={users}
              loading={userLoading}
              busyUserId={busyUserId}
              onToggle={(user, field) => void toggleUser(user, field)}
            />
          )}

          {tab === 'organizations' ? (
            <Pagination
              summary={`${orgTotal} empresas`}
              page={orgPage}
              pages={orgPages}
              onPage={setOrgPage}
            />
          ) : (
            <Pagination
              summary={`${userTotal} usuarios`}
              page={userPage}
              pages={userPages}
              onPage={setUserPage}
            />
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
