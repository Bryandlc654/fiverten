import type { OrganizationStats } from '../../lib/api';
import { formatRating } from '../reviews/Stars';
import { formatHours, formatNumber, formatPercent, TONE_STYLES } from './stats-format';

interface Stat {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: string;
  delta?: number;
}

function buildStats(stats: OrganizationStats): Stat[] {
  const { rating, periods, responses, requests } = stats;
  const pending = requests.pendingConfirmation + requests.underReview;
  return [
    {
      label: 'Valoración media',
      value: rating.average !== null ? formatRating(rating.average) : '—',
      hint: `${formatNumber(rating.total)} ${rating.total === 1 ? 'reseña' : 'reseñas'}`,
      icon: 'star',
      tone: 'amber',
    },
    {
      label: 'Reseñas publicadas',
      value: formatNumber(rating.total),
      hint: `${formatNumber(periods.last30)} en los últimos 30 días`,
      icon: 'reviews',
      tone: 'emerald',
      delta: periods.last30 - periods.previous30,
    },
    {
      label: 'Tasa de respuesta',
      value: formatPercent(responses.rate),
      hint: `${formatNumber(responses.answered)} de ${formatNumber(responses.published)} respondidas`,
      icon: 'forum',
      tone: 'blue',
    },
    {
      label: 'Tiempo medio de respuesta',
      value: formatHours(responses.averageHours),
      hint: 'Desde que se publica la reseña',
      icon: 'schedule',
      tone: 'slate',
    },
    {
      label: 'Reseñas en curso',
      value: formatNumber(pending),
      hint: `${requests.pendingConfirmation} por confirmar · ${requests.underReview} en revisión`,
      icon: 'pending_actions',
      tone: 'violet',
    },
  ];
}

export default function StatsGrid({ stats }: { stats: OrganizationStats | null }) {
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-5">
      {stats === null
        ? Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="h-[118px] animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))
        : buildStats(stats).map((stat) => (
            <div
              key={stat.label}
              className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_STYLES[stat.tone]}`}
                >
                  <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
                </span>
                {stat.delta !== undefined && stat.delta !== 0 && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold ${
                      stat.delta > 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                    title="Frente a los 30 días anteriores"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {stat.delta > 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {stat.delta > 0 ? `+${stat.delta}` : stat.delta}
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs font-medium text-slate-600">{stat.label}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400" title={stat.hint}>
                {stat.hint}
              </p>
            </div>
          ))}
    </section>
  );
}
