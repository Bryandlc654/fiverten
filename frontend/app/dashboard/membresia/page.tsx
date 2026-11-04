'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, Badge } from '../../../components/ui';
import {
  ApiError,
  api,
  type AdminPayment,
  type AdminPlan,
  type CompanySubscription,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { roleAtLeast } from '../../../lib/roles';

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
  const { role } = useAuth();
  const [data, setData] = useState<CompanySubscription | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const canChange = roleAtLeast(role, 'admin');

  useEffect(() => {
    Promise.all([
      api.mySubscription(),
      api.myPayments({ page: 1, pageSize: 20 }),
      api.publicPlans(),
    ])
      .then(([subscription, history, publicPlans]) => {
        setData(subscription);
        setPayments(history.items);
        setPlans(publicPlans.plans);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la membresía'),
      );
  }, []);

  async function changePlan(plan: AdminPlan) {
    if (!window.confirm(`¿Cambiar al plan ${plan.name}?`)) return;
    setChanging(plan.id);
    setError(null);
    setNotice(null);
    try {
      await api.changeMyPlan(plan.id);
      setData(await api.mySubscription());
      setNotice(`Plan actualizado a ${plan.name}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar de plan');
    } finally {
      setChanging(null);
    }
  }

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
        {notice && <Alert tone="success">{notice}</Alert>}

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
                Los cambios de plan se aplican de inmediato. Para cancelar o resolver un pago,
                contacta con soporte.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Planes disponibles</h2>
                  <p className="text-xs text-slate-500">
                    Puedes subir o bajar de plan cuando quieras.
                  </p>
                </div>
              </div>

              {!canChange && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Solo el propietario o un administrador pueden cambiar el plan.
                </p>
              )}

              {plans.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No hay planes disponibles.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const current = data.plan?.id === plan.id;
                    return (
                      <article
                        key={plan.id}
                        className={`flex flex-col rounded-xl border p-4 ${
                          current
                            ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-200'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                          {current && (
                            <Badge label="Plan actual" tone="bg-blue-100 text-blue-700" />
                          )}
                        </div>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">
                          {plan.priceMonthly > 0 ? `${plan.priceMonthly} €` : 'Personalizado'}
                          {plan.priceMonthly > 0 && (
                            <span className="text-xs font-medium text-slate-500">/mes</span>
                          )}
                        </p>
                        <p className="mt-1 min-h-[36px] text-xs text-slate-500">
                          {plan.description ?? 'Plan de FIVERTEN'}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-600">
                          <li>
                            {plan.reviewLimit
                              ? `${plan.reviewLimit} reseñas`
                              : 'Reseñas ilimitadas'}
                          </li>
                          <li>
                            {plan.userLimit
                              ? `${plan.userLimit} usuarios`
                              : 'Usuarios ilimitados'}
                          </li>
                        </ul>
                        <button
                          type="button"
                          onClick={() => void changePlan(plan)}
                          disabled={current || !canChange || changing !== null}
                          className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                            current
                              ? 'border border-blue-200 bg-white text-blue-700'
                              : 'bg-[#2563eb] text-white hover:bg-blue-600'
                          }`}
                        >
                          {current
                            ? 'Plan actual'
                            : changing === plan.id
                              ? 'Cambiando…'
                              : 'Cambiar a este plan'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-[11px] text-slate-400">
                Si el nuevo plan no cubre tu uso actual, el cambio se bloqueará hasta que
                reduzcas usuarios o reseñas.
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
