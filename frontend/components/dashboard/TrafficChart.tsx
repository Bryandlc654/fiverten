'use client';

import type { OrganizationAnalytics } from '../../lib/api';

type Series = OrganizationAnalytics['series'];

const SERIES = [
  { key: 'visits', label: 'Visitas', color: 'bg-blue-600' },
  { key: 'clicks', label: 'Clics', color: 'bg-emerald-500' },
  { key: 'downloads', label: 'Descargas', color: 'bg-amber-500' },
] as const;

function shortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function groupSeries(series: Series) {
  const size = series.length > 45 ? 7 : series.length > 14 ? 3 : 1;
  if (size === 1) {
    return series.map((item) => ({
      date: item.date,
      endDate: item.date,
      visits: item.visits,
      clicks: item.clicks,
      downloads: item.downloads,
    }));
  }
  const buckets: {
    date: string;
    endDate: string;
    visits: number;
    clicks: number;
    downloads: number;
  }[] = [];
  for (let i = 0; i < series.length; i += size) {
    const chunk = series.slice(i, i + size);
    buckets.push({
      date: chunk[0].date,
      endDate: chunk[chunk.length - 1].date,
      visits: chunk.reduce((sum, item) => sum + item.visits, 0),
      clicks: chunk.reduce((sum, item) => sum + item.clicks, 0),
      downloads: chunk.reduce((sum, item) => sum + item.downloads, 0),
    });
  }
  return buckets;
}

export default function TrafficChart({ series }: { series: Series }) {
  const buckets = groupSeries(series);
  const max = Math.max(1, ...buckets.flatMap((item) => [item.visits, item.clicks, item.downloads]));
  const hasData = buckets.some((item) => item.visits + item.clicks + item.downloads > 0);

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Tráfico del perfil</h2>
          <p className="text-xs text-slate-500">Visitas, clics de contacto y descargas del sello</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] font-medium text-slate-500">
          {SERIES.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="mt-5 flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
          <span className="material-symbols-outlined text-[34px] text-slate-300">monitoring</span>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Todavía no hay tráfico registrado
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Comparte tu perfil público o tu sello para empezar a medir visitas y clics.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto pb-1">
            <div className="flex min-w-[560px] items-end gap-1.5">
              {buckets.map((item) => (
                <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center">
                  <div className="flex h-48 w-full items-end justify-center gap-[2px]">
                    {SERIES.map((line) => {
                      const value = item[line.key];
                      return (
                        <span
                          key={line.key}
                          title={`${shortDate(item.date)}${item.endDate !== item.date ? ` – ${shortDate(item.endDate)}` : ''} · ${line.label}: ${value}`}
                          className={`min-h-[2px] w-full max-w-[10px] rounded-t-sm ${line.color} opacity-90 transition group-hover:opacity-100`}
                          style={{ height: `${Math.max(value > 0 ? 3 : 1, (value / max) * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                  <span className="mt-2 hidden text-[9px] text-slate-400 min-[640px]:block">
                    {shortDate(item.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            <span>{shortDate(series[0].date)}</span>
            <span>{shortDate(series[series.length - 1].date)}</span>
          </div>
        </>
      )}
    </div>
  );
}
