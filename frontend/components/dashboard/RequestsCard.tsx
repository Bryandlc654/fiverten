import Link from 'next/link';
import type { OrganizationStats } from '../../lib/api';
import { formatPercent } from './stats-format';

/**
 * Solicitudes del panel: reseñas pendientes de confirmar o en revisión,
 * incidencias abiertas con clientes y casos de evidencias.
 */
export default function RequestsCard({ stats }: { stats: OrganizationStats | null }) {
  if (stats === null) {
    return <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }
  const { resolutions, cases, pendingConfirmation, underReview } = stats.requests;
  const reviewRequests = stats.requests.reviewRequests ?? {
    sent: 0,
    opened: 0,
    completed: 0,
    conversion: 0,
  };

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">Solicitudes e incidencias</h3>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Metric
          label="Por confirmar"
          value={pendingConfirmation}
          hint="El cliente aún no confirmó su correo"
        />
        <Metric label="En revisión" value={underReview} hint="Moderación o caso de evidencias" />
      </dl>

      <Section
        title="Solicitudes de reseña"
        href="/app/clientes"
        rate={reviewRequests.conversion}
        rateLabel="conversión"
        items={[
          { label: 'Enviadas', value: reviewRequests.sent, tone: 'text-slate-700' },
          { label: 'Abiertas', value: reviewRequests.opened, tone: 'text-blue-700' },
          { label: 'Completadas', value: reviewRequests.completed, tone: 'text-emerald-600' },
        ]}
      />
      <Section
        title="Incidencias con clientes"
        href="/app/opiniones?lowRating=true"
        rate={resolutions.resolutionRate}
        rateLabel="resueltas"
        items={[
          { label: 'Abiertas', value: resolutions.open, tone: 'text-amber-600' },
          { label: 'Resueltas', value: resolutions.resolved, tone: 'text-emerald-600' },
          { label: 'Sin acuerdo', value: resolutions.unresolved, tone: 'text-slate-600' },
        ]}
      />
      <Section
        title="Casos de evidencias"
        href="/app/casos"
        rate={cases.resolutionRate}
        rateLabel="cerrados"
        items={[
          { label: 'Abiertos', value: cases.open, tone: 'text-amber-600' },
          { label: 'Publicadas', value: cases.published, tone: 'text-slate-600' },
          {
            label: 'No publicadas',
            value: cases.rejected + cases.withdrawn,
            tone: 'text-emerald-600',
          },
        ]}
      />
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2" title={hint}>
      <dd className="text-lg font-bold text-slate-900">{value}</dd>
      <dt className="text-[11px] text-slate-500">{label}</dt>
    </div>
  );
}

function Section({
  title,
  href,
  rate,
  rateLabel,
  items,
}: {
  title: string;
  href: string;
  rate: number | null;
  rateLabel: string;
  items: { label: string; value: number; tone: string }[];
}) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={href} className="text-sm font-semibold text-slate-800 hover:text-blue-700">
          {title}
        </Link>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {formatPercent(rate)} {rateLabel}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <p className={`text-base font-bold ${item.tone}`}>{item.value}</p>
            <p className="text-[11px] text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
