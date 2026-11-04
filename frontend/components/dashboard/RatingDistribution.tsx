import Link from 'next/link';
import type { OrganizationStats } from '../../lib/api';
import { formatRating, Stars } from '../reviews/Stars';
import { formatNumber } from './stats-format';

/** Media, distribución por estrellas y reseñas por periodo. */
export default function RatingDistribution({ stats }: { stats: OrganizationStats | null }) {
  if (stats === null) {
    return <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }
  const { rating, periods } = stats;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">Reputación</h3>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-4xl font-bold text-slate-900">
          {rating.average !== null ? formatRating(rating.average) : '—'}
        </span>
        <div className="pb-1">
          <Stars rating={rating.average ?? 0} />
          <p className="text-xs text-slate-500">
            {formatNumber(rating.total)}{' '}
            {rating.total === 1 ? 'reseña publicada' : 'reseñas publicadas'}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = rating.distribution[star] ?? 0;
          const pct = rating.total > 0 ? Math.round((count / rating.total) * 100) : 0;
          return (
            <li key={star}>
              <Link
                href={`/dashboard/reviews?rating=${star}`}
                className="flex items-center gap-2 rounded text-xs text-slate-600 hover:text-slate-900"
              >
                <span className="w-7 shrink-0">{star} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`block h-full rounded-full ${star <= 2 ? 'bg-red-400' : star === 3 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right tabular-nums">
                  {count} <span className="text-slate-400">({pct}%)</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
        {[
          { label: '30 días', value: periods.last30 },
          { label: '90 días', value: periods.last90 },
          { label: '12 meses', value: periods.last365 },
        ].map((period) => (
          <div key={period.label} className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-lg font-bold text-slate-900">{formatNumber(period.value)}</p>
            <p className="text-[11px] text-slate-500">{period.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
