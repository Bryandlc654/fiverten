import type { OrganizationStats } from '../../lib/api';
import { formatRating } from '../reviews/Stars';
import { monthLabel } from './stats-format';

type Monthly = OrganizationStats['monthly'];

/**
 * Evolución mensual: barras con el número de reseñas publicadas y una línea con
 * la puntuación media (escala de 1 a 5). En móvil se muestran los últimos 6 meses.
 */
export default function PerformanceChart({ monthly }: { monthly: Monthly | null }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Evolución de puntuaciones</h3>
          <p className="text-xs text-slate-500">Reseñas publicadas y media por mes</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-200" /> Reseñas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-amber-500" /> Media
          </span>
        </div>
      </div>

      {monthly === null ? (
        <div className="mt-4 h-56 animate-pulse rounded-lg bg-slate-50" />
      ) : monthly.every((m) => m.count === 0) ? (
        <div className="mt-4 flex h-56 flex-col items-center justify-center rounded-lg bg-slate-50 text-center">
          <span className="material-symbols-outlined text-[32px] text-slate-300">insights</span>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Aquí verás cómo evolucionan tus reseñas cuando empieces a recibirlas.
          </p>
        </div>
      ) : (
        <>
          <div className="sm:hidden">
            <Chart data={monthly.slice(-6)} />
          </div>
          <div className="hidden sm:block">
            <Chart data={monthly} />
          </div>
        </>
      )}
    </div>
  );
}

function Chart({ data }: { data: Monthly }) {
  const maxCount = Math.max(1, ...data.map((m) => m.count));
  const step = 100 / data.length;
  // Posición (en %) de cada media sobre la escala 1-5.
  const points = data
    .map((m, i) =>
      m.average === null ? null : { x: step * (i + 0.5), y: 100 - ((m.average - 1) / 4) * 100, m },
    )
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <div className="flex h-48 flex-col justify-between py-0.5 text-right text-[10px] text-slate-400">
          {[5, 4, 3, 2, 1].map((v) => (
            <span key={v}>{v}★</span>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          {[0, 25, 50, 75, 100].map((top) => (
            <div
              key={top}
              className="absolute inset-x-0 border-t border-dashed border-slate-100"
              style={{ top: `${top}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end">
            {data.map((m) => (
              <div key={m.month} className="relative h-full flex-1">
                <div
                  className="absolute bottom-0 left-1/2 w-3/5 max-w-[36px] -translate-x-1/2 rounded-t bg-blue-200 transition-all"
                  style={{ height: `${(m.count / maxCount) * 100}%` }}
                  title={`${monthLabel(m.month, true)}: ${m.count} ${m.count === 1 ? 'reseña' : 'reseñas'}`}
                />
              </div>
            ))}
          </div>
          {points.length > 1 && (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          {points.map((p) => (
            <span
              key={p.m.month}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-500 shadow"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={`${monthLabel(p.m.month, true)}: media ${formatRating(p.m.average ?? 0)}`}
            />
          ))}
        </div>
      </div>
      <div className="ml-6 mt-1 flex text-[11px] text-slate-400">
        {data.map((m) => (
          <span key={m.month} className="flex-1 text-center">
            {monthLabel(m.month)}
            <span className="block text-[10px] text-slate-500">{m.count || ''}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
