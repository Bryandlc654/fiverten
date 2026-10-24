'use client';

import type { RatingSummary } from '../../lib/api';
import { LOW_RATING_MAX } from '../../lib/review-filters';
import { formatRating, Stars } from './Stars';

/**
 * Media, total y distribución por estrellas; cada barra filtra el listado.
 * Si la empresa oculta las reseñas bajas, sus barras se ven pero no filtran.
 */
export default function RatingBreakdown({
  rating,
  selected,
  onSelect,
  lowRatingsHidden = false,
}: {
  rating: RatingSummary;
  selected: number | null;
  onSelect: (rating: number | null) => void;
  lowRatingsHidden?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-slate-900">
          {rating.average !== null ? formatRating(rating.average) : '—'}
        </span>
        <div className="pb-1">
          <Stars rating={rating.average ?? 0} />
          <p className="text-xs text-slate-500">
            {rating.total} {rating.total === 1 ? 'reseña' : 'reseñas'}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = rating.distribution[String(stars)] ?? 0;
          const percent = rating.total > 0 ? Math.round((count / rating.total) * 100) : 0;
          const active = selected === stars;
          const hidden = lowRatingsHidden && stars <= LOW_RATING_MAX;
          return (
            <li key={stars}>
              <button
                type="button"
                onClick={() => onSelect(active ? null : stars)}
                aria-pressed={active}
                disabled={hidden}
                title={hidden ? 'La empresa no muestra estas reseñas' : undefined}
                className={`flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-left text-xs transition ${
                  active ? 'bg-blue-50' : hidden ? 'cursor-default' : 'hover:bg-slate-50'
                }`}
              >
                <span className="w-16 shrink-0 font-medium text-slate-600">
                  {stars} {stars === 1 ? 'estrella' : 'estrellas'}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-[#2563eb]"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right text-slate-500">{percent}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
