'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardShell from './DashboardShell';
import { ApiError, api, type AdminOrganizationSummary, type PlatformStats } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { organizationStatusLabel, verificationStatusLabel } from '../lib/roles';
import { NEUTRAL_TONE, STATUS_TONE, VERIFICATION_TONE } from '../lib/status-tones';
import { Badge, StatCard } from './ui';

export default function PlatformDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<AdminOrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.adminStats(), api.adminListOrganizations({ pageSize: 5 })])
      .then(([platformStats, organizations]) => {
        if (!active) return;
        setStats(platformStats);
        setOrgs(organizations.items);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudieron cargar los datos de la plataforma',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const adminName = user?.firstName ?? user?.username ?? '';

  return (
    <DashboardShell
      active="overview"
      title="Panel general"
      subtitle="Vista general de la plataforma"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden rounded-2xl bg-[#0b101b] px-6 py-7 text-white">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#2563eb]/30 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-lg">
              <p className="text-sm text-slate-400">Hola{adminName ? `, ${adminName}` : ''} 👋</p>
              <h2 className="mt-1 text-2xl font-bold">Administración de la plataforma</h2>
              <p className="mt-2 text-sm text-slate-400">
                Gestiona las empresas y los usuarios de FIVERTEN desde un mismo lugar.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/organizations/new')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                Nueva empresa
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin?tab=users')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-[18px]">group</span>
                Ver usuarios
              </button>
            </div>
          </div>
        </section>

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
            hint="Acceso general"
            icon="admin_panel_settings"
            tone="bg-amber-50 text-amber-600"
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Empresas recientes</h3>
              <p className="text-xs text-slate-500">
                Últimas empresas registradas en la plataforma
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/admin?tab=organizations')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todas
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-500">
              Cargando empresas…
            </div>
          ) : orgs.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              Todavía no hay empresas registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
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
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">{org.tradeName}</p>
                        <p className="text-xs text-slate-500">{org.publicId}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          label={organizationStatusLabel(org.status)}
                          tone={STATUS_TONE[org.status] ?? NEUTRAL_TONE}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          label={verificationStatusLabel(org.verificationStatus)}
                          tone={VERIFICATION_TONE[org.verificationStatus] ?? NEUTRAL_TONE}
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
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            icon="gavel"
            title="Moderar reseñas"
            description={
              stats
                ? `${stats.reviews.underReview} en revisión · ${stats.reviews.reported} reportadas`
                : 'Reseñas en revisión y reportadas'
            }
            onClick={() => router.push('/admin/reviews')}
          />
          <QuickAction
            icon="storefront"
            title="Empresas"
            description="Ver y gestionar todas las empresas"
            onClick={() => router.push('/admin?tab=organizations')}
          />
          <QuickAction
            icon="group"
            title="Usuarios"
            description="Administrar usuarios de la plataforma"
            onClick={() => router.push('/admin?tab=users')}
          />
          <QuickAction
            icon="add_business"
            title="Nueva empresa"
            description="Dar de alta una empresa"
            onClick={() => router.push('/admin/organizations/new')}
          />
        </section>
      </div>
    </DashboardShell>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </button>
  );
}
