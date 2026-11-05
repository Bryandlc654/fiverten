'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell';
import PlatformDashboard from '../../components/PlatformDashboard';
import LatestReviews from '../../components/dashboard/LatestReviews';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import RatingDistribution from '../../components/dashboard/RatingDistribution';
import RecentActivity from '../../components/dashboard/RecentActivity';
import RequestsCard from '../../components/dashboard/RequestsCard';
import SealCard from '../../components/dashboard/SealCard';
import StatsGrid from '../../components/dashboard/StatsGrid';
import TasksCard from '../../components/dashboard/TasksCard';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner';
import {
  ApiError,
  api,
  type OrganizationAnalytics,
  type OrganizationDetail,
  type OrganizationStats,
  type VerificationStatusResponse,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { roleLabel } from '../../lib/roles';

const PROFILE_FIELDS = [
  'tradeName',
  'legalName',
  'taxId',
  'description',
  'logoUrl',
  'coverUrl',
  'website',
  'email',
  'phone',
  'sectorId',
  'countryId',
] as const;

function completionOf(org: OrganizationDetail | null): number {
  if (!org) return 0;
  const done = PROFILE_FIELDS.filter((field) => Boolean(org[field])).length;
  return Math.round((done / PROFILE_FIELDS.length) * 100);
}

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
  } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrganizationDetail | null>(null);
  const [verification, setVerification] = useState<VerificationStatusResponse | null>(null);
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [origin, setOrigin] = useState('https://fiverten.com');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
    api
      .myVerification()
      .then(setVerification)
      .catch(() => undefined);
    api
      .getOrganizationAnalytics(30)
      .then(setAnalytics)
      .catch(() => undefined);
  }, [isLoading, isAuthenticated, isSuperAdmin, hasOrganization]);

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

  const roleText = roleLabel(role);
  const company = organization?.tradeName ?? 'Sin organización';
  const isVerified = organization?.verificationStatus === 'verified';
  const publicUrl = organization?.slug
    ? `${origin}/empresa/${organization.slug}`
    : `${origin}/mi-empresa`;
  const documents = verification?.request?.documents ?? [];
  const requiredDocuments = verification?.requirements.requiredDocuments ?? [];
  const pendingDocuments = requiredDocuments.filter(
    (category) => !documents.some((document) => document.category === category),
  ).length;
  const profileCompletion = completionOf(orgDetail);

  return (
    <DashboardShell
      active="overview"
      title={company}
      subtitle={`Panel de gestión · ${roleText}`}
    >
      <div>
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
            profileCompletion={profileCompletion}
            pendingDocuments={pendingDocuments}
            visits={analytics?.totals.visits ?? 0}
            reviews={stats?.rating.total ?? 0}
          />

          {statsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              No se pudieron cargar las estadísticas. Recarga la página para intentarlo de nuevo.
            </div>
          )}

          <StatsGrid stats={stats} />

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <PerformanceChart monthly={stats?.monthly ?? null} />
            </div>
            <SealCard
              publicUrl={publicUrl}
              publicId={organization?.publicId}
              embedToken={verification?.badge?.embedToken}
            />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <TasksCard org={orgDetail} stats={stats} />
            <div className="min-w-0 xl:col-span-2">
              <LatestReviews />
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <RequestsCard stats={stats} />
            <RatingDistribution stats={stats} />
            <RecentActivity />
          </section>
      </div>
    </DashboardShell>
  );
}
