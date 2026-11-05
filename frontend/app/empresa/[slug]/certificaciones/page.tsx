'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CompanyPublicNav from '../../../../components/public/CompanyPublicNav';
import PublicShell from '../../../../components/public/PublicShell';
import {
  VERIFICATION_CATEGORIES,
  VERIFICATION_STATUS,
  formatVerificationDate,
} from '../../../../components/public/verification-labels';
import { Badge } from '../../../../components/ui';
import { ApiError, api, type PublicVerification } from '../../../../lib/api';

export default function PublicCertificationsPage() {
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
        <p className="text-sm text-slate-500">Cargando certificaciones…</p>
      </PublicShell>
    );
  }

  const status = VERIFICATION_STATUS[data.status] ?? VERIFICATION_STATUS.not_verified;
  const origin = typeof window === 'undefined' ? 'https://fiverten.com' : window.location.origin;
  const sealUrl = `${origin}/api/seal/${data.organization.publicId}.svg`;

  return (
    <PublicShell>
      <div className="space-y-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Certificaciones y credenciales
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.organization.tradeName}</h1>
        </header>
        <CompanyPublicNav slug={slug} active="certificaciones" />

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sello FIVERTEN</h2>
              <p className="mt-1 text-sm text-slate-600">{status.help}</p>
              <p className="mt-2 text-xs text-slate-500">
                Verificada el {formatVerificationDate(data.verifiedAt)} · Válida hasta{' '}
                {formatVerificationDate(data.expiresAt)}
              </p>
            </div>
            {data.status === 'verified' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sealUrl} alt="Sello FIVERTEN" className="h-24 w-auto" />
            ) : (
              <Badge label={status.label} tone={status.tone} />
            )}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <Badge label={status.label} tone={status.tone} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Certificaciones externas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Credenciales aportadas por la empresa y validadas por FIVERTEN.
          </p>
          {data.certifications.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No hay certificaciones externas verificadas para esta empresa.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.certifications.map((certification) => (
                <li key={certification.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{certification.name}</p>
                      <p className="text-xs text-slate-500">{certification.issuer}</p>
                    </div>
                    <span className="material-symbols-outlined text-emerald-600">verified</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {certification.issuedAt
                      ? `Emitida el ${formatVerificationDate(certification.issuedAt)}`
                      : 'Fecha de emisión no indicada'}
                    {certification.expiresAt
                      ? ` · Válida hasta ${formatVerificationDate(certification.expiresAt)}`
                      : ''}
                  </p>
                  {certification.credentialId && (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      ID de credencial: {certification.credentialId}
                    </p>
                  )}
                  {certification.credentialUrl && (
                    <a
                      href={certification.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-1 inline-flex text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      Comprobar credencial
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Credenciales FIVERTEN</h2>
          {data.categories.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No hay credenciales FIVERTEN verificadas para esta empresa.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.categories.map((category) => (
                <li
                  key={category}
                  className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {VERIFICATION_CATEGORIES[category] ?? category}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Validada por FIVERTEN
                      {data.verifiedAt ? ` · ${formatVerificationDate(data.verifiedAt)}` : ''}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-emerald-600">verified</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
