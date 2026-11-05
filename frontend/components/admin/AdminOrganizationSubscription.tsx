'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  api,
  type AdminPayment,
  type AdminPlan,
  type AdminSubscription,
  type PaymentStatus,
  type SubscriptionStatus,
} from '../../lib/api';
import { Alert, Field, inputClass } from '../ui';

const STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due', 'cancelled', 'expired'];
const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded'];
const METHOD_LABELS: Record<string, string> = {
  manual: 'Manual',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export default function AdminOrganizationSubscription({
  organizationId,
}: {
  organizationId: string;
}) {
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [periodEnd, setPeriodEnd] = useState('');

  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [method, setMethod] = useState('manual');
  const [reference, setReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subscriptionData, plansData, paymentsData] = await Promise.all([
        api.adminGetOrganizationSubscription(organizationId),
        api.adminListPlans(),
        api.adminListPayments({ organizationId, page: 1, pageSize: 20 }),
      ]);
      setPlans(plansData.plans);
      setPayments(paymentsData.items);
      setSubscription(subscriptionData.subscription);
      if (subscriptionData.subscription) {
        setPlanId(subscriptionData.subscription.plan.id);
        setStatus(subscriptionData.subscription.status);
        setCycle(subscriptionData.subscription.billingCycle);
        setPeriodEnd(toDateInput(subscriptionData.subscription.currentPeriodEnd));
      } else {
        const fallback = plansData.plans.find((plan) => plan.code === 'free') ?? plansData.plans[0];
        setPlanId(fallback?.id ?? '');
        setStatus('active');
        setCycle('monthly');
        setPeriodEnd('');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la suscripción');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!planId) return;
    setBusy(true);
    setError(null);
    try {
      await api.adminUpsertOrganizationSubscription(organizationId, {
        planId,
        status,
        billingCycle: cycle,
        ...(periodEnd ? { currentPeriodEnd: `${periodEnd}T23:59:59.000Z` } : {}),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la suscripción');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(immediate: boolean) {
    if (!subscription) return;
    if (
      !window.confirm(
        immediate ? '¿Cancelar la suscripción ahora?' : '¿Cancelar al final del periodo?',
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.adminCancelSubscription(subscription.id, {
        immediate,
        note: immediate ? 'Cancelación desde el panel' : 'Cancelación al final del periodo',
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar');
    } finally {
      setBusy(false);
    }
  }

  async function addPayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.adminCreatePayment({
        organizationId,
        ...(subscription ? { subscriptionId: subscription.id } : {}),
        amount: Number(amount),
        status: paymentStatus,
        method,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
      });
      setAmount('');
      setReference('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago');
    } finally {
      setBusy(false);
    }
  }

  async function changePaymentStatus(payment: AdminPayment, next: PaymentStatus) {
    setBusy(true);
    setError(null);
    try {
      await api.adminUpdatePayment(payment.id, { status: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el pago');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Suscripción y pagos</h2>
          <p className="mt-1 text-xs text-slate-500">
            Plan contratado, estado, límites y facturación manual.
          </p>
        </div>
        {subscription && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {subscription.status} · {subscription.billingCycle === 'yearly' ? 'anual' : 'mensual'}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Cargando suscripción…</p>
      ) : (
        <>
          <form
            onSubmit={save}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Field label="Plan" className="block">
              <select
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
                className={inputClass}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {plan.priceMonthly} {plan.currency}/mes
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado" className="block">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
                className={inputClass}
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ciclo" className="block">
              <select
                value={cycle}
                onChange={(event) => setCycle(event.target.value as 'monthly' | 'yearly')}
                className={inputClass}
              >
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </Field>
            <Field label="Fin del periodo" className="block">
              <input
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={busy || !planId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
              >
                {busy
                  ? 'Guardando…'
                  : subscription
                    ? 'Actualizar suscripción'
                    : 'Crear suscripción'}
              </button>
              {subscription && (
                <>
                  <button
                    type="button"
                    onClick={() => void cancel(false)}
                    disabled={busy || subscription.cancelAtPeriodEnd}
                    className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                  >
                    Cancelar al final del periodo
                  </button>
                  <button
                    type="button"
                    onClick={() => void cancel(true)}
                    disabled={busy || subscription.status === 'cancelled'}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Cancelar ahora
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">Historial de pagos</h3>
            <form onSubmit={addPayment} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Importe" className="block">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Estado" className="block">
                <select
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}
                  className={inputClass}
                >
                  {PAYMENT_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Método" className="block">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className={inputClass}
                >
                  {Object.entries(METHOD_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Referencia" className="block">
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <button
                type="submit"
                disabled={busy || !amount}
                className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 sm:col-span-4 sm:justify-self-start"
              >
                Registrar pago
              </button>
            </form>

            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aún no hay pagos registrados.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {payment.amount} {payment.currency}
                      </p>
                      <p className="text-xs text-slate-500">
                        {METHOD_LABELS[payment.method] ?? payment.method} ·{' '}
                        {new Date(payment.createdAt).toLocaleDateString('es-ES')}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </p>
                    </div>
                    <select
                      value={payment.status}
                      onChange={(event) =>
                        void changePaymentStatus(payment, event.target.value as PaymentStatus)
                      }
                      disabled={busy}
                      aria-label="Estado del pago"
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      {PAYMENT_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
