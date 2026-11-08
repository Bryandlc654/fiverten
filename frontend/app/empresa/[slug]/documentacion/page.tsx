'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnalyticsTracker from '../../../../components/public/AnalyticsTracker';
import CompanyPublicNav from '../../../../components/public/CompanyPublicNav';
import PublicShell from '../../../../components/public/PublicShell';
import {
  VERIFICATION_CATEGORIES,
  VERIFICATION_STATUS,
  formatVerificationDate,
} from '../../../../components/public/verification-labels';
import { Badge } from '../../../../components/ui';
import { ApiError, api, type PublicVerification } from '../../../../lib/api';

export default function PublicDocumentationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [data, setData] = useState<PublicVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .publicVerification(slug)
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError && err.status === 404 ? 'not_found' : 'error'),
      );
  }, [slug]);

  if (error) {
    return (
      <PublicShell>
        <p className="text-sm text-slate-600">
          {error === 'not_found' ? 'Empresa no encontrada.' : 'No se pudo cargar la información.'}
        </p>
      </PublicShell>
    );
  }

  if (!data) {
    return (
      <PublicShell>
        <p className="text-sm text-slate-500">Cargando documentación…</p>
      </PublicShell>
    );
  }

  const status = VERIFICATION_STATUS[data.status] ?? VERIFICATION_STATUS.not_verified;

  return (
    <PublicShell>
      <AnalyticsTracker slug={slug} />
      <div className="space-y-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Documentación verificada
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.organization.tradeName}</h1>
        </header>
        <CompanyPublicNav slug={slug} active="documentacion" />

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Estado de la verificación</h2>
              <p className="mt-1 text-sm text-slate-600">{status.help}</p>
            </div>
            <Badge label={status.label} tone={status.tone} />
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Verificada el</dt>
              <dd className="font-medium text-slate-900">
                {formatVerificationDate(data.verifiedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Válida hasta</dt>
              <dd className="font-medium text-slate-900">
                {formatVerificationDate(data.expiresAt)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Categorías comprobadas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Mostramos qué categorías ha validado FIVERTEN. Los documentos privados nunca se
            publican.
          </p>
          {data.status !== 'verified' && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Solo se muestran categorías comprobadas cuando la verificación está vigente.
            </p>
          )}
          {data.categories.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Todavía no hay categorías verificadas para esta empresa.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.categories.map((category) => (
                <li
                  key={category}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50/60 px-3 py-2 text-sm text-slate-700"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">
                    verified
                  </span>
                  {VERIFICATION_CATEGORIES[category] ?? category}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
