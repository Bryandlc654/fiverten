'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import PerformanceChart from '../../../components/dashboard/PerformanceChart';
import RatingDistribution from '../../../components/dashboard/RatingDistribution';
import StatsGrid from '../../../components/dashboard/StatsGrid';
import TrafficChart from '../../../components/dashboard/TrafficChart';
import { formatNumber } from '../../../components/dashboard/stats-format';
import { Alert } from '../../../components/ui';
import {
  ApiError,
  api,
  type AnalyticsCounters,
  type OrganizationAnalytics,
  type OrganizationStats,
} from '../../../lib/api';

const PERIODS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Directo',
  fiverten: 'FIVERTEN',
  google: 'Google',
  bing: 'Bing',
  yahoo: 'Yahoo',
  duckduckgo: 'DuckDuckGo',
  ecosia: 'Ecosia',
  social: 'Redes sociales',
  referral: 'Otros enlaces',
  qr: 'Código QR',
  widget: 'Widget',
  campaign: 'Campaña',
};

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

function trend(current: number, previous: number): { label: string; positive: boolean | null } {
  if (previous === 0) {
    return current > 0 ? { label: 'Nuevo', positive: true } : { label: 'Sin cambios', positive: null };
  }
  const change = Math.round(((current - previous) / previous) * 100);
  return {
    label: `${change > 0 ? '+' : ''}${change}%`,
    positive: change === 0 ? null : change > 0,
  };
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
  trendValue,
}: {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: string;
  trendValue?: { label: string; positive: boolean | null };
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        {trendValue && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ${
              trendValue.positive === true
                ? 'text-emerald-600'
                : trendValue.positive === false
                  ? 'text-red-500'
                  : 'text-slate-400'
            }`}
          >
            {trendValue.positive !== null && (
              <span className="material-symbols-outlined text-[14px]">
                {trendValue.positive ? 'trending_up' : 'trending_down'}
              </span>
            )}
            {trendValue.label}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-400" title={hint}>
        {hint}
      </p>
    </div>
  );
}

function SourceList({ analytics }: { analytics: OrganizationAnalytics }) {
  const max = Math.max(
    1,
    ...analytics.sources.map((source) => source.visits + source.clicks + source.downloads),
  );

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-slate-900">Fuentes de tráfico</h2>
      <p className="text-xs text-slate-500">De dónde llegan las visitas y las interacciones</p>
      {analytics.sources.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
          Aún no hay fuentes registradas.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {analytics.sources.map((source) => {
            const total = source.visits + source.clicks + source.downloads;
            return (
              <li key={source.source}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-slate-700">
                    {SOURCE_LABELS[source.source] ?? source.source}
                  </span>
                  <span className="shrink-0 text-slate-500">{formatNumber(total)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#2563eb]"
                    style={{ width: `${Math.max(4, (total / max) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {formatNumber(source.visits)} visitas · {formatNumber(source.clicks)} clics ·{' '}
                  {formatNumber(source.downloads)} descargas
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function conversionHint(totals: AnalyticsCounters): string {
  if (totals.sent === 0) return 'Sin solicitudes en el periodo';
  return `${formatNumber(totals.conversions)} de ${formatNumber(totals.sent)} solicitudes`;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]['days']>(30);
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getOrganizationStats(12)
      .then(setStats)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las métricas'),
      );
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getOrganizationAnalytics(days)
      .then((data) => {
        if (active) {
          setAnalytics(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'No se pudo cargar el tráfico');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const totals = analytics?.totals;
  const previous = analytics?.previous;

  return (
    <DashboardShell
      active="analytics"
      title="Analítica"
      subtitle="Visitas, clics, descargas y conversión de tu perfil"
    >
      <div className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Rendimiento del perfil</h2>
            <p className="text-xs text-slate-500">
              Comparado con el periodo anterior de la misma duración.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                onClick={() => setDays(period.days)}
                className={`rounded-md px-3 py-1.5 transition ${
                  days === period.days
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {loading && !analytics ? (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="h-[118px] animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : analytics && totals && previous ? (
          <>
            <section className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-5">
              <Kpi
                label="Visitas al perfil"
                value={formatNumber(totals.visits)}
                hint="Sesiones únicas registradas"
                icon="visibility"
                tone="bg-blue-50 text-blue-600"
                trendValue={trend(totals.visits, previous.visits)}
              />
              <Kpi
                label="Clics de contacto"
                value={formatNumber(totals.clicks)}
                hint="Email, teléfono o web"
                icon="ads_click"
                tone="bg-emerald-50 text-emerald-600"
                trendValue={trend(totals.clicks, previous.clicks)}
              />
              <Kpi
                label="Descargas del sello"
                value={formatNumber(totals.downloads)}
                hint="PNG y SVG desde el panel"
                icon="download"
                tone="bg-amber-50 text-amber-600"
                trendValue={trend(totals.downloads, previous.downloads)}
              />
              <Kpi
                label="Conversiones"
                value={formatNumber(totals.conversions)}
                hint={conversionHint(totals)}
                icon="task_alt"
                tone="bg-violet-50 text-violet-600"
                trendValue={trend(totals.conversions, previous.conversions)}
              />
              <Kpi
                label="Tasa de conversión"
                value={percent(totals.conversionRate)}
                hint={`${formatNumber(totals.sent)} solicitudes enviadas`}
                icon="conversion_path"
                tone="bg-slate-100 text-slate-600"
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <TrafficChart series={analytics.series} />
              </div>
              <SourceList analytics={analytics} />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              <h2 className="text-base font-bold text-slate-900">Cómo leer estas métricas</h2>
              <ul className="mt-3 space-y-2">
                <li>Las visitas cuentan una sesión por navegador y perfil público.</li>
                <li>
                  Los clics incluyen botones de contacto, email, teléfono y enlaces a la web de la
                  empresa.
                </li>
                <li>
                  Las conversiones son solicitudes de reseña completadas. La tasa se calcula sobre
                  las solicitudes enviadas en el periodo.
                </li>
                <li>Las descargas del sello se registran al descargarlo desde tu panel.</li>
              </ul>
            </section>
          </>
        ) : null}

        <section>
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900">Reputación y reseñas</h2>
            <p className="text-xs text-slate-500">
              Valoración, respuesta y evolución de las opiniones publicadas.
            </p>
          </div>
          <StatsGrid stats={stats} />
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <PerformanceChart monthly={stats?.monthly ?? null} />
            <RatingDistribution stats={stats} />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
