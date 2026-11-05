'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import Pagination from '../../../components/ui/Pagination';
import Modal from '../../../components/ui/Modal';
import { Alert, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type AdminOrganizationSummary,
  type AdminPayment,
  type AdminPlan,
  type AdminSubscription,
  type BillingStats,
  type PaymentStatus,
  type SubscriptionStatus,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PAGE_SIZE = 20;
const SUB_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
];
const PAY_STATUSES: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded'];
const METHOD_LABELS: Record<string, string> = {
  manual: 'Manual',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

type Tab = 'overview' | 'plans' | 'subscriptions' | 'payments';

export default function AdminBillingPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [organizations, setOrganizations] = useState<AdminOrganizationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | 'new' | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const loadBase = useCallback(async () => {
    setError(null);
    try {
      const [statsData, plansData] = await Promise.all([
        api.adminBillingStats(),
        api.adminListPlans(),
      ]);
      setStats(statsData);
      setPlans(plansData.plans);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las membresías');
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'subscriptions') {
        const data = await api.adminListSubscriptions({
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          status: status || undefined,
        });
        setSubscriptions(data.items);
        setTotal(data.total);
      } else if (tab === 'payments') {
        const data = await api.adminListPayments({
          page,
          pageSize: PAGE_SIZE,
          status: status || undefined,
        });
        setPayments(data.items);
        setTotal(data.total);
      } else if (tab === 'plans') {
        setTotal(plans.length);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, status, plans.length]);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) return;
    void loadBase();
  }, [isLoading, isSuperAdmin, loadBase]);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) return;
    void loadList();
  }, [isLoading, isSuperAdmin, loadList]);

  useEffect(() => {
    if (isSuperAdmin) {
      api
        .adminListOrganizations({ pageSize: 100 })
        .then((data) => setOrganizations(data.items))
        .catch(() => undefined);
    }
  }, [isSuperAdmin]);

  async function refresh() {
    await loadBase();
    await loadList();
  }

  async function updateSubscription(sub: AdminSubscription, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api.adminUpdateSubscription(sub.id, payload);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la suscripción');
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription(sub: AdminSubscription, immediate: boolean) {
    if (!window.confirm(immediate ? '¿Cancelar ahora?' : '¿Cancelar al final del periodo?')) return;
    setBusy(true);
    try {
      await api.adminCancelSubscription(sub.id, { immediate });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar');
    } finally {
      setBusy(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardShell
      active="adminBilling"
      title="Membresías y suscripciones"
      subtitle="Planes, límites, estado de suscripción, pagos e ingresos"
    >
      <div className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            label="MRR"
            value={stats ? `${stats.mrr} €` : '—'}
            hint="Ingreso mensual recurrente"
          />
          <Metric label="Ingresos 30 días" value={stats ? `${stats.revenue.last30} €` : '—'} />
          <Metric
            label="Activas"
            value={stats?.subscriptions.active ?? '—'}
            hint="Suscripciones activas"
          />
          <Metric label="En prueba" value={stats?.subscriptions.trialing ?? '—'} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              {(
                [
                  ['overview', 'Resumen'],
                  ['plans', 'Planes'],
                  ['subscriptions', 'Suscripciones'],
                  ['payments', 'Pagos'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTab(key);
                    setPage(1);
                    setStatus('');
                  }}
                  className={`rounded-md px-3 py-1.5 transition ${
                    tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(tab === 'subscriptions' || tab === 'payments') && (
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Todos los estados</option>
                  {(tab === 'subscriptions' ? SUB_STATUSES : PAY_STATUSES).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              )}
              {tab === 'subscriptions' && (
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar empresa…"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              )}
              {tab === 'plans' && (
                <button
                  type="button"
                  onClick={() => setEditingPlan('new')}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  Nuevo plan
                </button>
              )}
              {tab === 'payments' && (
                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  Registrar pago
                </button>
              )}
            </div>
          </div>

          {tab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Suscripciones por estado</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {stats &&
                    Object.entries({
                      Activas: stats.subscriptions.active,
                      'En prueba': stats.subscriptions.trialing,
                      Impagadas: stats.subscriptions.pastDue,
                      Canceladas: stats.subscriptions.cancelled,
                      Expiradas: stats.subscriptions.expired,
                    }).map(([label, value]) => (
                      <li key={label} className="flex justify-between">
                        <span className="text-slate-600">{label}</span>
                        <strong className="text-slate-900">{value}</strong>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Ingresos por mes</h3>
                <ul className="mt-3 space-y-1 text-sm">
                  {stats?.revenue.series.slice(-6).map((point) => (
                    <li key={point.month} className="flex justify-between">
                      <span className="text-slate-600">{point.month}</span>
                      <strong className="text-slate-900">{point.amount} €</strong>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-500">
                  Total histórico: <strong>{stats?.revenue.total ?? 0} €</strong>
                </p>
              </div>
            </div>
          )}

          {tab === 'plans' && (
            <div className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {plan.name}{' '}
                      <span className="ml-1 text-xs font-normal text-slate-400">{plan.code}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {plan.priceMonthly} €/mes · {plan.priceYearly} €/año ·{' '}
                      {plan.reviewLimit ? `${plan.reviewLimit} reseñas` : 'reseñas ilimitadas'} ·{' '}
                      {plan.userLimit ? `${plan.userLimit} usuarios` : 'usuarios ilimitados'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        plan.isActive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingPlan(plan)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'subscriptions' && (
            <div className="divide-y divide-slate-100">
              {loading ? (
                <p className="px-5 py-4 text-sm text-slate-500">Cargando suscripciones…</p>
              ) : subscriptions.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">No hay suscripciones.</p>
              ) : (
                subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {sub.organization.tradeName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sub.plan.name} · hasta{' '}
                        {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')}
                        {sub.cancelAtPeriodEnd ? ' · cancelación programada' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={sub.plan.id}
                        onChange={(event) =>
                          void updateSubscription(sub, { planId: event.target.value })
                        }
                        disabled={busy}
                        aria-label="Plan"
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                      >
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sub.status}
                        onChange={(event) =>
                          void updateSubscription(sub, { status: event.target.value })
                        }
                        disabled={busy}
                        aria-label="Estado"
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                      >
                        {SUB_STATUSES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void cancelSubscription(sub, false)}
                        disabled={busy || sub.cancelAtPeriodEnd}
                        className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                      >
                        Cancelar al final
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelSubscription(sub, true)}
                        disabled={busy || sub.status === 'cancelled'}
                        className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Cancelar ahora
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="divide-y divide-slate-100">
              {loading ? (
                <p className="px-5 py-4 text-sm text-slate-500">Cargando pagos…</p>
              ) : payments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">No hay pagos registrados.</p>
              ) : (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {payment.organization?.tradeName ?? 'Empresa'} · {payment.amount}{' '}
                        {payment.currency}
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
                        void (async () => {
                          setBusy(true);
                          try {
                            await api.adminUpdatePayment(payment.id, {
                              status: event.target.value as PaymentStatus,
                            });
                            await refresh();
                          } catch (err) {
                            setError(
                              err instanceof ApiError
                                ? err.message
                                : 'No se pudo actualizar el pago',
                            );
                          } finally {
                            setBusy(false);
                          }
                        })()
                      }
                      disabled={busy}
                      aria-label="Estado del pago"
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      {PAY_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          )}

          {(tab === 'subscriptions' || tab === 'payments') && (
            <Pagination summary={`${total} registros`} page={page} pages={pages} onPage={setPage} />
          )}
        </section>
      </div>

      {editingPlan && (
        <PlanModal
          plan={editingPlan === 'new' ? null : editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={async () => {
            setEditingPlan(null);
            await refresh();
          }}
        />
      )}

      {paymentOpen && (
        <PaymentModal
          organizations={organizations}
          onClose={() => setPaymentOpen(false)}
          onSaved={async () => {
            setPaymentOpen(false);
            await refresh();
          }}
        />
      )}
    </DashboardShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" title={hint}>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function PlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: AdminPlan | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    code: plan?.code ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    priceMonthly: String(plan?.priceMonthly ?? 0),
    priceYearly: String(plan?.priceYearly ?? 0),
    currency: plan?.currency ?? 'EUR',
    reviewLimit: plan?.reviewLimit === null ? '' : String(plan?.reviewLimit ?? ''),
    userLimit: plan?.userLimit === null ? '' : String(plan?.userLimit ?? ''),
    isActive: plan?.isActive ?? true,
    isPublic: plan?.isPublic ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      priceMonthly: Number(form.priceMonthly),
      priceYearly: Number(form.priceYearly),
      currency: form.currency.toUpperCase(),
      reviewLimit: form.reviewLimit === '' ? null : Number(form.reviewLimit),
      userLimit: form.userLimit === '' ? null : Number(form.userLimit),
      isActive: form.isActive,
      isPublic: form.isPublic,
    };
    try {
      if (plan) {
        const { code: _code, ...rest } = payload;
        await api.adminUpdatePlan(plan.id, rest);
      } else {
        await api.adminCreatePlan(payload);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el plan');
      setBusy(false);
    }
  }

  return (
    <Modal title={plan ? 'Editar plan' : 'Nuevo plan'} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código" className="block">
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              disabled={!!plan}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Nombre" className="block">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Precio mensual" className="block">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.priceMonthly}
              onChange={(event) => setForm({ ...form, priceMonthly: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Precio anual" className="block">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.priceYearly}
              onChange={(event) => setForm({ ...form, priceYearly: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Moneda" className="block">
            <input
              maxLength={3}
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Límite de reseñas (vacío = sin límite)" className="block">
            <input
              type="number"
              min={0}
              value={form.reviewLimit}
              onChange={(event) => setForm({ ...form, reviewLimit: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Límite de usuarios (vacío = sin límite)" className="block">
            <input
              type="number"
              min={0}
              value={form.userLimit}
              onChange={(event) => setForm({ ...form, userLimit: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Descripción" className="block">
          <textarea
            rows={2}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={inputClass}
          />
        </Field>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            Activo
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(event) => setForm({ ...form, isPublic: event.target.checked })}
            />
            Visible en precios
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({
  organizations,
  onClose,
  onSaved,
}: {
  organizations: AdminOrganizationSummary[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [method, setMethod] = useState('manual');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.adminCreatePayment({
        organizationId,
        amount: Number(amount),
        status,
        method,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago');
      setBusy(false);
    }
  }

  return (
    <Modal title="Registrar pago" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Empresa" className="block">
          <select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            required
            className={inputClass}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.tradeName}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
              value={status}
              onChange={(event) => setStatus(event.target.value as PaymentStatus)}
              className={inputClass}
            >
              {PAY_STATUSES.map((item) => (
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
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !organizationId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  );
}
