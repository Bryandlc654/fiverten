'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, Badge, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type VerificationDocumentCategory,
  type VerificationStatusResponse,
} from '../../../lib/api';

const STATUS: Record<string, { label: string; tone: string; help: string }> = {
  not_verified: {
    label: 'Sin verificar',
    tone: 'bg-slate-100 text-slate-600',
    help: 'Envía la documentación para que FIVERTEN revise tu empresa.',
  },
  pending: {
    label: 'En revisión',
    tone: 'bg-amber-50 text-amber-700',
    help: 'Hemos recibido tu solicitud. El equipo de FIVERTEN la revisará en unos días.',
  },
  verified: {
    label: 'Verificada',
    tone: 'bg-emerald-50 text-emerald-600',
    help: 'Tu empresa está verificada y puedes usar el sello.',
  },
  rejected: {
    label: 'Rechazada',
    tone: 'bg-red-50 text-red-600',
    help: 'Revisa el motivo y vuelve a enviar la documentación.',
  },
  expired: {
    label: 'Caducada',
    tone: 'bg-slate-100 text-slate-500',
    help: 'La verificación ha caducado o se ha revocado. Solicita la renovación.',
  },
};

const CATEGORIES: Record<string, string> = {
  identity: 'Identidad del representante',
  tax: 'Documento fiscal (CIF/NIF)',
  address: 'Comprobante de domicilio',
  project: 'Proyecto o evidencia',
  other: 'Otro documento',
};

const DOC_STATUSES: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  in_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  revoked: 'Revocada',
};

const DAY_MS = 86_400_000;

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function VerificationPage() {
  const [data, setData] = useState<VerificationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<VerificationDocumentCategory>('identity');
  const [copied, setCopied] = useState(false);
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certCredentialId, setCertCredentialId] = useState('');
  const [certCredentialUrl, setCertCredentialUrl] = useState('');
  const [certIssuedAt, setCertIssuedAt] = useState('');
  const [certExpiresAt, setCertExpiresAt] = useState('');
  const [certPublic, setCertPublic] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.myVerification());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la verificación');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo supera el máximo de 10 MB');
      return;
    }
    await run(
      () => api.uploadVerificationDocument(category, file),
      'Documento añadido. Recuerda enviar la solicitud cuando esté todo.',
    );
  }

  async function addCertification(event: FormEvent) {
    event.preventDefault();
    if (!certName.trim() || !certIssuer.trim()) return;
    await run(
      () =>
        api.addCertification({
          name: certName.trim(),
          issuer: certIssuer.trim(),
          credentialId: certCredentialId.trim() || undefined,
          credentialUrl: certCredentialUrl.trim() || undefined,
          issuedAt: certIssuedAt || undefined,
          expiresAt: certExpiresAt || undefined,
        }),
      'Certificación enviada para revisión',
    );
    setCertName('');
    setCertIssuer('');
    setCertCredentialId('');
    setCertCredentialUrl('');
    setCertIssuedAt('');
    setCertExpiresAt('');
  }

  async function submit() {
    if (!window.confirm('¿Enviar la solicitud de verificación a FIVERTEN?')) return;
    await run(() => api.submitVerification(), 'Solicitud enviada. Te avisaremos por correo.');
  }

  async function copyEmbed(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function trackSealDownload() {
    if (!data) return;
    void api
      .trackPublicAnalytics({
        slug: data.organization.slug,
        type: 'seal_download',
        path: window.location.pathname,
      })
      .catch(() => undefined);
  }

  if (loading || !data) {
    return (
      <DashboardShell
        active="verification"
        title="Sello y verificación"
        subtitle="Verificación de identidad y sello para tu web"
      >
        {error ? (
          <Alert tone="error">{error}</Alert>
        ) : (
          <p className="text-sm text-slate-500">Cargando verificación…</p>
        )}
      </DashboardShell>
    );
  }

  const status = STATUS[data.status] ?? STATUS.not_verified;
  const request = data.request;
  const documents = request?.documents ?? [];
  const projects = request?.projects ?? [];
  const required = data.requirements.requiredDocuments;
  const missing = required.filter(
    (categoryKey) => !documents.some((document) => document.category === categoryKey),
  );
  const minProjects = data.requirements.minProjects;
  const missingProjects = Math.max(0, minProjects - projects.length);
  const canSend =
    data.canSubmit && request?.status === 'draft' && missing.length === 0 && missingProjects === 0;
  const origin = typeof window === 'undefined' ? 'https://fiverten.com' : window.location.origin;
  const renewalDays = data.requirements.renewalDays;
  const reminderDays = data.requirements.reminderDays ?? renewalDays;
  const daysToExpiry = data.expiresAt
    ? Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / DAY_MS)
    : null;
  const renewalDue =
    data.status === 'verified' && daysToExpiry !== null && daysToExpiry <= reminderDays;
  const badge = data.badge;
  const sealToken = badge?.embedToken ?? data.organization.publicId;
  const profileUrl = badge?.currentUrl
    ? `${origin}${badge.currentUrl}`
    : `${origin}/empresa/${data.organization.slug}`;
  const sealSvg = `${origin}/api/seal/${sealToken}.svg`;
  const sealPng = `${origin}/api/seal/${sealToken}.png`;
  // Atribuye los clics del sello insertado en webs de terceros.
  const sealProfileUrl = `${profileUrl}${profileUrl.includes('?') ? '&' : '?'}utm_source=seal`;
  const embed = `<a href="${sealProfileUrl}" target="_blank" rel="noopener"><img src="${sealSvg}" alt="Sello FIVERTEN" width="300" height="104"></a>`;

  return (
    <DashboardShell
      active="verification"
      title="Sello y embeds"
      subtitle="Sello dinámico, credenciales y código para tu web"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {renewalDue && (
          <Alert tone="warning">
            <strong>Tu verificación caduca el {formatDate(data.expiresAt)}</strong>
            {daysToExpiry !== null && daysToExpiry >= 0
              ? ` (quedan ${daysToExpiry} ${daysToExpiry === 1 ? 'día' : 'días'})`
              : ''}
            . Ya puedes solicitar la renovación en el bloque «Solicitar renovación»: vuelve a
            aportar la documentación y al menos {minProjects} proyecto(s).
          </Alert>
        )}

        {data.status === 'expired' && (
          <Alert tone="warning">
            <strong>Tu verificación ha caducado.</strong> El sello ya no se muestra como verificado
            en tu web. Envía una nueva solicitud para recuperarlo.
          </Alert>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              {data.status === 'verified' && (
                <Image
                  src="/sello-fiverten-verificado.png"
                  alt=""
                  width={512}
                  height={512}
                  className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
                />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Estado de verificación
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {data.organization.tradeName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">{status.help}</p>
              </div>
            </div>
            <Badge label={status.label} tone={status.tone} />
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Verificada el</dt>
              <dd className="font-mono font-medium text-slate-900">
                {formatDate(data.verifiedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Válida hasta</dt>
              <dd className="font-mono font-medium text-slate-900">{formatDate(data.expiresAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Plazo de revisión</dt>
              <dd className="font-medium text-slate-900">
                {data.requirements.reviewDays} días hábiles
              </dd>
            </div>
          </dl>
          {request?.decisionReason && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <strong>Motivo:</strong> {request.decisionReason}
            </p>
          )}
          {request && request.events.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Historial de verificación</h3>
              <ul className="mt-2 space-y-2">
                {request.events.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
                  >
                    <p className="font-semibold text-slate-800">
                      {event.action} · {event.previousStatus ?? '—'} → {event.newStatus ?? '—'}
                    </p>
                    <p className="mt-0.5 font-mono">{formatDate(event.createdAt)}</p>
                    {event.reason && <p className="mt-1">{event.reason}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {data.canSubmit && missingProjects > 0 && (
          <Alert tone="warning">
            <strong>Faltan proyectos.</strong> Necesitas al menos {minProjects}{' '}
            {minProjects === 1 ? 'proyecto' : 'proyectos'} con evidencia para solicitar la
            verificación. Añádelos en{' '}
            <Link
              href="/app/proyectos"
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              Proyectos
            </Link>{' '}
            y vuelve aquí para enviar la solicitud.
          </Alert>
        )}

        {data.status === 'verified' && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Tu sello</h2>
            <p className="mt-1 text-xs text-slate-500">
              El sello es dinámico: si la verificación caduca o se revoca, cambiará automáticamente.
            </p>
            {badge && (
              <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                Badge {badge.state} · token independiente · {profileUrl}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4">
              <figure className="text-center">
                <Image
                  src="/sello-fiverten-verificado.png"
                  alt="Insignia FIVERTEN de empresa verificada"
                  width={512}
                  height={512}
                  className="h-24 w-24"
                />
                <figcaption className="mt-1 text-[11px] font-medium text-slate-500">
                  Insignia
                </figcaption>
                <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-semibold">
                  <a
                    href="/sello-fiverten-verificado.png"
                    download="sello-fiverten-verificado.png"
                    onClick={trackSealDownload}
                    className="text-blue-700 underline-offset-2 hover:underline"
                  >
                    PNG
                  </a>
                  <span className="text-slate-300">·</span>
                  <a
                    href="/sello-fiverten-verificado.svg"
                    download="sello-fiverten-verificado.svg"
                    onClick={trackSealDownload}
                    className="text-blue-700 underline-offset-2 hover:underline"
                  >
                    SVG
                  </a>
                </div>
              </figure>
              <figure className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sealSvg} alt="Sello FIVERTEN" className="h-24 w-auto" />
                <figcaption className="mt-1 text-[11px] font-medium text-slate-500">
                  Sello web
                </figcaption>
              </figure>
              <div className="flex flex-wrap gap-2">
                <a
                  href={sealPng}
                  download={`fiverten-sello-${data.organization.publicId}.png`}
                  onClick={trackSealDownload}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Descargar PNG
                </a>
                <a
                  href={sealSvg}
                  download={`fiverten-sello-${data.organization.publicId}.svg`}
                  onClick={trackSealDownload}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Descargar SVG
                </a>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600">Código para tu web</p>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <code className="truncate text-xs text-slate-600">{embed}</code>
                <button
                  type="button"
                  onClick={() => void copyEmbed(embed)}
                  className="ml-auto shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Certificaciones externas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Añade credenciales de terceros. Se publicarán en tu perfil cuando FIVERTEN las valide.
          </p>
          <form onSubmit={addCertification} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre de la certificación" className="block">
              <input
                required
                value={certName}
                onChange={(event) => setCertName(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Entidad emisora" className="block">
              <input
                required
                value={certIssuer}
                onChange={(event) => setCertIssuer(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="ID de credencial (opcional)" className="block">
              <input
                value={certCredentialId}
                onChange={(event) => setCertCredentialId(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="URL de comprobación (opcional)" className="block">
              <input
                type="url"
                value={certCredentialUrl}
                onChange={(event) => setCertCredentialUrl(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Fecha de emisión (opcional)" className="block">
              <input
                type="date"
                value={certIssuedAt}
                onChange={(event) => setCertIssuedAt(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Fecha de caducidad (opcional)" className="block">
              <input
                type="date"
                value={certExpiresAt}
                onChange={(event) => setCertExpiresAt(event.target.value)}
                className={inputClass}
              />
            </Field>
            <label className="flex items-start gap-2 text-xs text-slate-600 sm:col-span-2">
              <input
                type="checkbox"
                checked={certPublic}
                onChange={(event) => setCertPublic(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              Mostrar el número y la URL de la credencial en el perfil público.
            </label>
            <button
              type="submit"
              disabled={busy || !certName.trim() || !certIssuer.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2"
            >
              Añadir certificación
            </button>
          </form>
          {data.certifications.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.certifications.map((certification) => (
                <li
                  key={certification.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{certification.name}</p>
                    <p className="text-xs text-slate-500">
                      {certification.issuer} ·{' '}
                      {certification.status === 'verified'
                        ? 'Validada'
                        : certification.status === 'rejected'
                          ? 'Rechazada'
                          : 'En revisión'}
                      {certification.decisionReason ? ` · ${certification.decisionReason}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        () => api.deleteCertification(certification.id),
                        'Certificación eliminada',
                      )
                    }
                    disabled={busy}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Requisitos</h2>
          <p className="mt-1 text-xs text-slate-500">
            Incluido en todos los planes. La empresa nunca puede autoverificarse: FIVERTEN revisa y
            aprueba la documentación.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li>
              Documentos obligatorios: {required.map((item) => CATEGORIES[item] ?? item).join(', ')}
            </li>
            <li>Proyectos o evidencias mínimas: {data.requirements.minProjects}</li>
            <li>Revisión estimada: {data.requirements.reviewDays} días hábiles</li>
            <li>Validez del sello: {data.requirements.expiryDays} días</li>
            <li>Renovación: desde {data.requirements.renewalDays} días antes del vencimiento</li>
            <li>
              Criterios: documentación legible, datos fiscales coincidentes y evidencia verificable
            </li>
          </ul>
        </section>

        {data.canSubmit && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">
              {data.status === 'verified' ? 'Solicitar renovación' : 'Solicitar verificación'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Sube aquí los documentos obligatorios. Los proyectos y sus evidencias se gestionan en
              el módulo Proyectos; después vuelve para enviar la solicitud.
              {data.status === 'verified' &&
                ` Al aprobarla, la verificación se renueva por ${data.requirements.expiryDays} días.`}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
              <Field label="Tipo de documento" className="block">
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as VerificationDocumentCategory)
                  }
                  className={inputClass}
                >
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Archivo (PDF o imagen, máx. 10 MB)" className="block">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => void upload(event)}
                  disabled={busy}
                  className={inputClass}
                />
              </Field>
            </div>

            {missing.length > 0 && (
              <p className="mt-2 text-xs text-amber-600">
                Faltan: {missing.map((item) => CATEGORIES[item] ?? item).join(', ')}
              </p>
            )}

            <ul className="mt-4 divide-y divide-slate-100">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{document.filename}</p>
                    <p className="text-xs text-slate-500">
                      {CATEGORIES[document.category] ?? document.category} ·{' '}
                      {(document.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        () => api.deleteVerificationDocument(document.id),
                        'Documento eliminado',
                      )
                    }
                    disabled={busy}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Proyectos y evidencias</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {projects.length} de {minProjects} proyecto(s) registrados.
                    {missingProjects > 0
                      ? ' Los proyectos se añaden desde el módulo Proyectos.'
                      : ' Todo listo en este apartado.'}
                  </p>
                </div>
                <Link
                  href="/app/proyectos"
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  {missingProjects > 0 ? 'Añadir proyectos →' : 'Gestionar proyectos →'}
                </Link>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy || !canSend}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Enviando…' : 'Enviar solicitud a FIVERTEN'}
              </button>
              {!canSend && (
                <span className="ml-3 text-xs text-slate-500">
                  {missingProjects > 0
                    ? `Añade al menos ${minProjects} proyecto(s) en Proyectos para poder enviar.`
                    : missing.length > 0
                      ? 'Sube los documentos obligatorios que faltan.'
                      : 'Completa los requisitos para poder enviar la solicitud.'}
                </span>
              )}
            </div>
          </section>
        )}

        {!data.canSubmit && request && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">
              Solicitud {DOC_STATUSES[request.status] ?? request.status}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enviada el {formatDate(request.submittedAt)}. Documentos: {documents.length} ·
              Proyectos: {projects.length}
            </p>
            {request.status === 'submitted' || request.status === 'in_review' ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                FIVERTEN está revisando la solicitud. Te avisaremos por correo.
              </p>
            ) : null}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
