'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import LatestReviews from '../../../components/dashboard/LatestReviews';
import PerformanceChart from '../../../components/dashboard/PerformanceChart';
import RatingDistribution from '../../../components/dashboard/RatingDistribution';
import RequestsCard from '../../../components/dashboard/RequestsCard';
import StatsGrid from '../../../components/dashboard/StatsGrid';
import { Alert } from '../../../components/ui';
import { ApiError, api, type OrganizationStats } from '../../../lib/api';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getOrganizationStats(12)
      .then(setStats)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las métricas'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      active="analytics"
      title="Analítica"
      subtitle="Evolución de la reputación, solicitudes y reseñas"
    >
      <div className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}
        {loading && !stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <>
            <StatsGrid stats={stats} />

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <PerformanceChart monthly={stats?.monthly ?? null} />
              <RatingDistribution stats={stats} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <RequestsCard stats={stats} />
              <LatestReviews />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              <h2 className="text-base font-bold text-slate-900">Cómo leer estas métricas</h2>
              <ul className="mt-3 space-y-2">
                <li>La evolución mensual muestra reseñas publicadas y su valoración media.</li>
                <li>La distribución por estrellas incluye todas las reseñas publicadas.</li>
                <li>Las solicitudes miden enlaces enviados, abiertos y completados.</li>
                <li>Puedes filtrar opiniones y responder desde Opiniones.</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
