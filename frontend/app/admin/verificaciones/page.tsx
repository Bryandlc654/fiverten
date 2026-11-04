'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '../../../components/DashboardShell';
import Pagination from '../../../components/ui/Pagination';
import { Alert, Badge, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type AdminVerificationSummary,
  type VerificationRequest,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PAGE_SIZE = 20;

const STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Borrador', tone: 'bg-slate-100 text-slate-500' },
  submitted: { label: 'Enviada', tone: 'bg-blue-50 text-blue-600' },
  in_review: { label: 'En revisión', tone: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Aprobada', tone: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: 'Rechazada', tone: 'bg-red-50 text-red-600' },
  revoked: { label: 'Revocada', tone: 'bg-slate-100 text-slate-500' },
};

const CATEGORIES: Record<string, string> = {
  identity: 'Identidad',
  tax: 'Fiscal',
  address: 'Domicilio',
  project: 'Proyecto/evidencia',
  other: 'Otro',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading } = useAuth();
  const [items, setItems] = useState<AdminVerificationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('submitted');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState('365');
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) router.replace('/dashboard');
  }, [isLoading, isSuperAdmin, router]);

  const load = useCallback(async () => {
    if (isLoading || !isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminListVerifications({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        search: search || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [page, status, search, isLoading, isSuperAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(id: string) {
    setError(null);
    try {
      const detail = await api.adminGetVerification(id);
      setSelected(detail);
      setRejectReason('');
      setRevokeReason('');
      setNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir la solicitud');
    }
  }

  async function run(action: () => Promise<VerificationRequest>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setSelected(await action());
      setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  async function viewDocument(documentId: string) {
    if (!selected) return;
    try {
      const blob = await api.adminVerificationDocument(selected.id, documentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir el documento');
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardShell
      active="adminVerifications"
      title="Verificaciones"
      subtitle="Revisa documentación y aprueba o rechaza el sello de las empresas"
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por estado"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas las solicitudes</option>
            {Object.entries(STATUS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar empresa…"
            aria-label="Buscar empresa"
            className="min-w-56 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="px-4 py-4 text-sm text-slate-500">Cargando solicitudes…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No hay solicitudes con estos filtros.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void open(item.id)}
                      className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                        selected?.id === item.id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.organization.tradeName}
                        </p>
                        <Badge
                          label={STATUS[item.status]?.label ?? item.status}
                          tone={STATUS[item.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.submittedAt ?? item.createdAt)} · {item.documents} docs ·{' '}
                        {item.projects} proyectos
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {total > PAGE_SIZE && (
              <Pagination summary={`${total} solicitudes`} page={page} pages={pages} onPage={setPage} />
            )}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            {!selected ? (
              <p className="text-sm text-slate-500">Selecciona una solicitud para revisarla.</p>
            ) : (
              <div className="space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {selected.organization.tradeName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Enviada el {formatDate(selected.submittedAt)} · ID {selected.id}
                    </p>
                  </div>
                  <Badge
                    label={STATUS[selected.status]?.label ?? selected.status}
                    tone={STATUS[selected.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                  />
                </header>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Documentos</h3>
                  {selected.documents.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">Sin documentos.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-100">
                      {selected.documents.map((document) => (
                        <li key={document.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{document.filename}</p>
                            <p className="text-xs text-slate-500">
                              {CATEGORIES[document.category] ?? document.category} ·{' '}
                              {(document.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void viewDocument(document.id)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Ver
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Proyectos y evidencias</h3>
                  {selected.projects.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">Sin proyectos.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {selected.projects.map((project) => (
                        <li key={project.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <p className="font-semibold text-slate-900">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-slate-600">{project.description}</p>
                          )}
                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {project.url}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selected.decisionReason && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <strong>Motivo registrado:</strong> {selected.decisionReason}
                  </p>
                )}

                {['submitted', 'in_review'].includes(selected.status) && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
                      <Field label="Validez (días)" className="block">
                        <input
                          type="number"
                          min={30}
                          max={3650}
                          value={expiryDays}
                          onChange={(event) => setExpiryDays(event.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Nota interna (opcional)" className="block">
                        <input
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              api.adminApproveVerification(selected.id, {
                                expiresInDays: Number(expiryDays),
                                note: note.trim() || undefined,
                              }),
                            'Verificación aprobada',
                          )
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Aprobar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <Field label="Motivo de rechazo" className="block">
                        <input
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <button
                        type="button"
                        disabled={busy || rejectReason.trim().length < 3}
                        onClick={() =>
                          void run(
                            () => api.adminRejectVerification(selected.id, rejectReason.trim()),
                            'Verificación rechazada',
                          )
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {selected.status === 'approved' && (
                  <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Field label="Motivo de revocación" className="block">
                      <input
                        value={revokeReason}
                        onChange={(event) => setRevokeReason(event.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            api.adminRevokeVerification(
                              selected.id,
                              revokeReason.trim() || undefined,
                            ),
                          'Verificación revocada',
                        )
                      }
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Revocar sello
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
