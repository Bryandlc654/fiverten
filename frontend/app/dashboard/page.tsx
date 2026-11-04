'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PlatformDashboard from '../../components/PlatformDashboard';
import LatestReviews from '../../components/dashboard/LatestReviews';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import RatingDistribution from '../../components/dashboard/RatingDistribution';
import RecentActivity from '../../components/dashboard/RecentActivity';
import RequestsCard from '../../components/dashboard/RequestsCard';
import SealCard from '../../components/dashboard/SealCard';
import StatsGrid from '../../components/dashboard/StatsGrid';
import TasksCard from '../../components/dashboard/TasksCard';
import TenantHeader from '../../components/dashboard/TenantHeader';
import TenantSidebar from '../../components/dashboard/TenantSidebar';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner';
import { ApiError, api, type OrganizationDetail, type OrganizationStats } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { roleLabel } from '../../lib/roles';

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    organization,
    role,
    isAuthenticated,
    isLoading,
    isSuperAdmin,
    isSupportAgent,
    logout,
  } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrganizationDetail | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
    if (!isLoading && isSupportAgent && !isSuperAdmin) {
      router.replace('/admin/soporte');
    }
  }, [isLoading, isAuthenticated, isSupportAgent, isSuperAdmin, router]);

  // Una sola petición para todas las cifras del resumen (las del super admin van aparte).
  const hasOrganization = Boolean(organization);
  useEffect(() => {
    if (isLoading || !isAuthenticated || isSuperAdmin || !hasOrganization) return;
    api
      .getOrganizationStats(12)
      .then(setStats)
      .catch(() => setStatsError(true));
    api
      .getMyOrganization()
      .then(setOrgDetail)
      .catch(() => undefined);
  }, [isLoading, isAuthenticated, isSuperAdmin, hasOrganization]);

  function toggleSidebar() {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopCollapsed((value) => !value);
    } else {
      setMobileOpen((value) => !value);
    }
  }

  async function onLogout() {
    setSigningOut(true);
    await logout();
    router.replace('/login');
  }

  async function onResendVerification() {
    setSendingVerification(true);
    setNotice(null);
    try {
      const result = await api.requestEmailVerification();
      setNotice(
        result.alreadyVerified
          ? 'Tu correo ya estaba verificado.'
          : 'Te hemos enviado un nuevo enlace de verificación.',
      );
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'No se pudo enviar el enlace');
    } finally {
      setSendingVerification(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">Cargando panel…</div>
      </div>
    );
  }

  if (isSuperAdmin) {
    return <PlatformDashboard />;
  }

  if (isSupportAgent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          Abriendo panel de soporte…
        </div>
      </div>
    );
  }

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email;
  const initials = (
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('') || user.email[0]
  ).toUpperCase();
  const roleText = roleLabel(role);
  const company = organization?.tradeName ?? 'Sin organización';
  const isVerified = organization?.verificationStatus === 'verified';
  const publicUrl = organization?.slug
    ? `https://fiverten.com/${organization.slug}`
    : 'https://fiverten.com/mi-empresa';

  return (
    <div className="flex-1 flex min-h-screen bg-slate-50 text-slate-900">
      <TenantSidebar
        initials={initials}
        company={company}
        publicId={organization?.publicId}
        isVerified={isVerified}
        mobileOpen={mobileOpen}
        desktopCollapsed={desktopCollapsed}
        signingOut={signingOut}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={() => void onLogout()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TenantHeader
          company={company}
          slug={organization?.slug}
          isVerified={isVerified}
          roleText={roleText}
          initials={initials}
          fullName={fullName}
          email={user.email}
          signingOut={signingOut}
          onToggleSidebar={toggleSidebar}
          onLogout={() => void onLogout()}
        />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {notice && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {notice}
            </div>
          )}

          {!user.isVerified && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
                Tu correo aún no está verificado.
              </span>
              <button
                type="button"
                onClick={onResendVerification}
                disabled={sendingVerification}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
              >
                {sendingVerification ? 'Enviando…' : 'Reenviar verificación'}
              </button>
            </div>
          )}

          <WelcomeBanner
            firstName={user.firstName}
            isVerified={isVerified}
            publicId={organization?.publicId}
            slug={organization?.slug}
          />

          {statsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              No se pudieron cargar las estadísticas. Recarga la página para intentarlo de nuevo.
            </div>
          )}

          <StatsGrid stats={stats} />

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <PerformanceChart monthly={stats?.monthly ?? null} />
            <RatingDistribution stats={stats} />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <RequestsCard stats={stats} />
            <LatestReviews />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <TasksCard org={orgDetail} stats={stats} />
            <RecentActivity />
            <SealCard publicUrl={publicUrl} publicId={organization?.publicId} />
          </section>
        </main>
      </div>
    </div>
  );
}
