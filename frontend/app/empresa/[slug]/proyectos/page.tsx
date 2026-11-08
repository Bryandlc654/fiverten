'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnalyticsTracker from '../../../../components/public/AnalyticsTracker';
import CompanyPublicNav from '../../../../components/public/CompanyPublicNav';
import PublicShell from '../../../../components/public/PublicShell';
import {
  VERIFICATION_STATUS,
  formatVerificationDate,
} from '../../../../components/public/verification-labels';
import { Badge } from '../../../../components/ui';
import { ApiError, api, type PublicVerification } from '../../../../lib/api';

export default function PublicProjectsPage() {
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
        <p className="text-sm text-slate-500">Cargando proyectos…</p>
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
            Proyectos y evidencias
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.organization.tradeName}</h1>
        </header>
        <CompanyPublicNav slug={slug} active="proyectos" />

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3">
          <p className="text-sm text-slate-600">
            Verificación: <strong>{status.label}</strong>
            {data.verifiedAt ? ` · ${formatVerificationDate(data.verifiedAt)}` : ''}
          </p>
          <Badge label={status.label} tone={status.tone} />
        </section>

        {data.projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <span className="material-symbols-outlined text-[36px] text-slate-300">
              folder_open
            </span>
            <p className="mt-2 text-base font-semibold text-slate-900">No hay proyectos públicos</p>
            <p className="mt-1 text-sm text-slate-500">
              Los proyectos aparecen cuando la verificación está aprobada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.projects.map((project) => (
              <article
                key={project.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">{project.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {project.evidenceCount} evidencia
                    {project.evidenceCount === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {[
                    project.projectType?.replaceAll('_', ' '),
                    project.city,
                    project.year,
                    project.status === 'ongoing' ? 'En curso' : 'Finalizado',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Sin clasificar'}
                  {project.clientStatus
                    ? ` · Cliente ${project.clientStatus === 'verified' ? 'verificado' : project.clientStatus}`
                    : ''}
                </p>
                {(project.location || project.startDate || project.endDate) && (
                  <p className="mt-2 text-xs text-slate-500">
                    {project.location && <>{project.location} · </>}
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString('es-ES')
                      : '—'}{' '}
                    →{' '}
                    {project.endDate ? new Date(project.endDate).toLocaleDateString('es-ES') : '—'}
                  </p>
                )}
                {project.verificationScope && (
                  <p className="mt-2 text-xs text-slate-500">
                    <strong>Alcance:</strong> {project.verificationScope}
                  </p>
                )}
                {project.methodology && (
                  <p className="mt-1 text-xs text-slate-500">
                    <strong>Metodología:</strong> {project.methodology}
                  </p>
                )}
                {project.description && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {project.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Añadido el {formatVerificationDate(project.createdAt)}
                </p>
                {project.evidence.length > 0 && (
                  <ul className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-3">
                    {project.evidence.map((evidence) => (
                      <li
                        key={evidence.id}
                        className="flex items-center justify-between gap-2 text-xs text-slate-600"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-slate-400">
                            {evidence.kind === 'image' ? 'image' : 'description'}
                          </span>
                          {evidence.kind === 'image' ? 'Imagen' : 'PDF'} validado
                          {evidence.evidenceType && (
                            <span className="text-slate-400">
                              · {evidence.evidenceType.replaceAll('_', ' ')}
                            </span>
                          )}
                        </span>
                        <span className="text-slate-400">
                          {Math.max(1, Math.round(evidence.size / 1024))} KB ·{' '}
                          {formatVerificationDate(evidence.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Ver proyecto
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
