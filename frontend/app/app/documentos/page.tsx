'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type VerificationDocumentCategory,
  type VerificationStatusResponse,
} from '../../../lib/api';

const CATEGORIES: Record<string, string> = {
  identity: 'Identidad del representante',
  tax: 'Documento fiscal (CIF/NIF)',
  address: 'Comprobante de domicilio',
  project: 'Proyecto o evidencia',
  other: 'Otro documento',
};

const STATUS: Record<string, { label: string; help: string }> = {
  not_verified: { label: 'Sin verificar', help: 'Sube la documentación para empezar.' },
  pending: { label: 'En revisión', help: 'FIVERTEN está revisando la documentación.' },
  verified: { label: 'Verificada', help: 'La documentación está aprobada y vigente.' },
  rejected: { label: 'Rechazada', help: 'Revisa el motivo y vuelve a enviar la documentación.' },
  expired: { label: 'Caducada', help: 'La verificación caducó o se revocó.' },
};

const REQUEST_STATUS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  in_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  revoked: 'Revocada',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DocumentsPage() {
  const [data, setData] = useState<VerificationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<VerificationDocumentCategory>('identity');
  const [issuer, setIssuer] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.myVerification());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la documentación');
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
      () =>
        api.uploadVerificationDocument(category, file, {
          issuer: issuer.trim() || undefined,
          documentNumber: documentNumber.trim() || undefined,
          issueDate: issueDate || undefined,
          expiryDate: expiryDate || undefined,
        }),
      'Documento añadido. Recuerda enviar la solicitud cuando esté todo.',
    );
    setIssuer('');
    setDocumentNumber('');
    setIssueDate('');
    setExpiryDate('');
  }

  if (loading || !data) {
    return (
      <DashboardShell active="documentos" title="Documentos" subtitle="Documentación de verificación">
        {error ? <Alert tone="error">{error}</Alert> : <p className="text-sm text-slate-500">Cargando…</p>}
      </DashboardShell>
    );
  }

  const request = data.request;
  const documents = request?.documents ?? [];
  const status = STATUS[data.status] ?? STATUS.not_verified;
  const required = data.requirements.requiredDocuments;
  const missing = required.filter(
    (key) => !documents.some((document) => document.category === key),
  );
  const versionById = new Map<string, number>();
  const versionCounters = new Map<string, number>();
  for (const document of [...documents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )) {
    const next = (versionCounters.get(document.category) ?? 0) + 1;
    versionCounters.set(document.category, next);
    versionById.set(document.id, next);
  }

  return (
    <DashboardShell
      active="documentos"
      title="Documentos"
      subtitle="Documentación privada para la verificación de tu empresa"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Estado de la verificación
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{data.organization.tradeName}</h2>
              <p className="mt-1 text-sm text-slate-600">{status.help}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {status.label}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Solicitud</dt>
              <dd className="font-medium text-slate-900">
                {request ? (REQUEST_STATUS[request.status] ?? request.status) : 'Sin enviar'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Revisión</dt>
              <dd className="font-medium text-slate-900">
                {request?.reviewedAt ? formatDate(request.reviewedAt) : 'Pendiente'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Vigencia</dt>
              <dd className="font-medium text-slate-900">
                {data.expiresAt ? formatDate(data.expiresAt) : 'Sin verificar'}
              </dd>
            </div>
          </dl>
          {request?.decisionReason && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <strong>Motivo:</strong> {request.decisionReason}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-sm">
            <Link href="/app/proyectos" className="font-semibold text-blue-600 hover:underline">
              Gestionar proyectos y evidencias →
            </Link>
            <Link href="/app/sello" className="font-semibold text-blue-600 hover:underline">
              Enviar solicitud y ver sello →
            </Link>
          </div>
        </section>

        {data.canSubmit ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Añadir documento</h2>
            <p className="mt-1 text-xs text-slate-500">
              Los documentos son privados: solo los revisa el equipo de FIVERTEN. Cada nueva subida
              del mismo tipo se guarda como una versión nueva.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tipo de documento" className="block">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as VerificationDocumentCategory)}
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
              <Field label="Emisor (opcional)" className="block">
                <input
                  value={issuer}
                  onChange={(event) => setIssuer(event.target.value)}
                  placeholder="Agencia Tributaria, colegio profesional…"
                  className={inputClass}
                />
              </Field>
              <Field label="Número de documento (opcional)" className="block">
                <input
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Fecha de emisión (opcional)" className="block">
                <input
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Fecha de caducidad (opcional)" className="block">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            {missing.length > 0 && (
              <p className="mt-2 text-xs text-amber-600">
                Faltan: {missing.map((item) => CATEGORIES[item] ?? item).join(', ')}
              </p>
            )}
          </section>
        ) : (
          <Alert tone="info">
            La documentación no se puede modificar mientras hay una solicitud en revisión o la
            verificación está vigente.
          </Alert>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Documentos subidos</h2>
          {documents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Todavía no hay documentos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{document.filename}</p>
                    <p className="text-xs text-slate-500">
                      {CATEGORIES[document.category] ?? document.category} · v
                      {document.version ?? versionById.get(document.id) ?? 1} ·{' '}
                      {formatDate(document.createdAt)} · {(document.size / 1024).toFixed(0)} KB
                    </p>
                    {(document.issuer || document.documentNumber || document.expiryDate) && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {[
                          document.issuer,
                          document.documentNumber,
                          document.expiryDate
                            ? `Válido hasta ${formatDate(document.expiryDate)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Evidencia: {document.evidence?.status ?? 'submitted'}
                      {document.evidence?.hash
                        ? ` · SHA-256 ${document.evidence.hash.slice(0, 12)}…`
                        : ''}
                    </p>
                  </div>
                  {data.canSubmit && (
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
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
