'use client';

import { useEffect, useState } from 'react';
import PublicShell from '../../components/public/PublicShell';
import { Alert, Badge } from '../../components/ui';
import { ApiError, api, type AdminPlan } from '../../lib/api';

export default function PricingPage() {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .publicPlans()
      .then((data) => setPlans(data.plans))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los planes'),
      );
  }, []);

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Membresías</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Planes para cada etapa</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Empieza gratis y amplía límites, usuarios y funciones a medida que crece tu reputación.
          </p>
        </header>

        {error && (
          <div className="mt-6">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {!plans ? (
          <p className="mt-8 text-sm text-slate-500">Cargando planes…</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                  {plan.code === 'business' && (
                    <Badge label="Popular" tone="bg-blue-50 text-blue-700" />
                  )}
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {plan.priceMonthly > 0 ? `${plan.priceMonthly} €` : 'Personalizado'}
                  {plan.priceMonthly > 0 && (
                    <span className="text-sm font-medium text-slate-500">/mes</span>
                  )}
                </p>
                <p className="mt-2 min-h-[48px] text-sm text-slate-600">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li>{plan.reviewLimit ? `${plan.reviewLimit} reseñas` : 'Reseñas ilimitadas'}</li>
                  <li>{plan.userLimit ? `${plan.userLimit} usuarios` : 'Usuarios ilimitados'}</li>
                  <li>
                    {plan.features.resolutions ? 'Resolución de incidencias' : 'Sin resolución'}
                  </li>
                  <li>{plan.features.qr ? 'Código QR' : 'Sin QR'}</li>
                  <li>{plan.features.widgets ? 'Widgets para tu web' : 'Sin widgets'}</li>
                </ul>
                <a
                  href="/register"
                  className="mt-auto inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  Empezar
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
