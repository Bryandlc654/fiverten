'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, Badge } from '../../../components/ui';
import {
  ApiError,
  api,
  type AdminPayment,
  type CompanySubscription,
} from '../../../lib/api';

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  trialing: { label: 'En prueba', tone: 'bg-blue-50 text-blue-600' },
  active: { label: 'Activa', tone: 'bg-emerald-50 text-emerald-600' },
  past_due: { label: 'Impagada', tone: 'bg-amber-50 text-amber-700' },
  cancelled: { label: 'Cancelada', tone: 'bg-slate-100 text-slate-500' },
  expired: { label: 'Expirada', tone: 'bg-red-50 text-red-600' },
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  failed: 'Fallido',
  refunded: 'Reembolsado',
};

export default function MembershipPage() {
  const [data, setData] = useState<CompanySubscription | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.mySubscription(), api.myPayments({ page: 1, pageSize: 20 })])
      .then(([subscription, history]) => {
        setData(subscription);
        setPayments(history.items);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la membresía'),
      );
  }, []);

  const status = data?.subscription
    ? STATUS_LABELS[data.subscription.status] ?? {
        label: data.subscription.status,
        tone: 'bg-slate-100 text-slate-600',
      }
    : null;

  return (
    <DashboardShell
      active="membership"
      title="Mi plan"
      subtitle="Suscripción, límites y facturación de tu empresa"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        {!data ? (
          <p className="text-sm text-slate-500">Cargando membresía…</p>
        ) : (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {data.plan?.name ?? 'Sin plan'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {data.plan?.description ?? 'Contacta con soporte para contratar un plan.'}
                  </p>
                </div>
                {status && <Badge label={status.label} tone={status.tone} />}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Metric label="Precio mensual" value={`${data.plan?.priceMonthly ?? 0} €`} />
                <Metric label="Precio anual" value={`${data.plan?.priceYearly ?? 0} €`} />
                <Metric
                  label="Reseñas incluidas"
                  value={data.plan?.reviewLimit ? String(data.plan.reviewLimit) : 'Ilimitadas'}
                />
                <Metric
                  label="Usuarios incluidos"
                  value={data.plan?.userLimit ? String(data.plan.userLimit) : 'Ilimitados'}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Usuarios e invitaciones</p>
                  <p className="text-lg font-bold text-slate-900">
                    {data.usage.users}
                    {data.plan?.userLimit ? ` / ${data.plan.userLimit}` : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Reseñas recibidas</p>
                  <p className="text-lg font-bold text-slate-900">
                    {data.usage.reviews}
                    {data.plan?.reviewLimit ? ` / ${data.plan.reviewLimit}` : ''}
                  </p>
                </div>
              </div>

              {data.subscription && (
                <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Ciclo</dt>
                    <dd className="font-medium text-slate-900">
                      {data.subscription.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Renueva el</dt>
                    <dd className="font-medium text-slate-900">
                      {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('es-ES')}
                    </dd>
                  </div>
                  {data.subscription.cancelAtPeriodEnd && (
                    <p className="text-xs text-amber-600 sm:col-span-2">
                      La suscripción no se renovará al final del periodo.
                    </p>
                  )}
                </dl>
              )}

              <p className="mt-4 text-xs text-slate-400">
                Para cambiar de plan, cancelar o resolver un pago, contacta con soporte.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">Historial de pagos</h2>
              {payments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Todavía no hay pagos registrados.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {payment.amount} {payment.currency}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(payment.createdAt).toLocaleDateString('es-ES')}
                          {payment.reference ? ` · ${payment.reference}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {PAYMENT_LABELS[payment.status] ?? payment.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
