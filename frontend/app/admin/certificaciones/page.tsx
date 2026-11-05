'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '../../../components/DashboardShell';
import Pagination from '../../../components/ui/Pagination';
import { Alert, Badge, inputClass } from '../../../components/ui';
import { ApiError, api, type AdminCertification } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PAGE_SIZE = 20;

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Pendiente', tone: 'bg-amber-50 text-amber-700' },
  verified: { label: 'Validada', tone: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: 'Rechazada', tone: 'bg-red-50 text-red-600' },
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminCertificationsPage() {
  const router = useRouter();
  const { isSuperAdmin, isVerifier, isLoading } = useAuth();
  const [items, setItems] = useState<AdminCertification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<AdminCertification | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !(isSuperAdmin || isVerifier)) router.replace('/app');
  }, [isLoading, isSuperAdmin, isVerifier, router]);

  const load = useCallback(async () => {
    if (isLoading || !(isSuperAdmin || isVerifier)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminListCertifications({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        search: search || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las certificaciones');
    } finally {
      setLoading(false);
    }
  }, [page, status, search, isLoading, isSuperAdmin, isVerifier]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<AdminCertification>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await action();
      setSelected(updated);
      setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardShell
      active="adminCertifications"
      title="Certificaciones"
      subtitle="Valida credenciales externas aportadas por las empresas"
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            aria-label="Filtrar por estado"
          >
            <option value="">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="verified">Validadas</option>
            <option value="rejected">Rechazadas</option>
          </select>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar empresa o certificación…"
            className="min-w-56 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="px-4 py-4 text-sm text-slate-500">Cargando certificaciones…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No hay certificaciones con estos filtros.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(item);
                        setNote('');
                      }}
                      className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                        selected?.id === item.id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                        <Badge
                          label={STATUS[item.status]?.label ?? item.status}
                          tone={STATUS[item.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {item.organization.tradeName} · {item.issuer}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {total > PAGE_SIZE && (
              <Pagination
                summary={`${total} certificaciones`}
                page={page}
                pages={pages}
                onPage={setPage}
              />
            )}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            {!selected ? (
              <p className="text-sm text-slate-500">Selecciona una certificación para revisarla.</p>
            ) : (
              <div className="space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selected.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.organization.tradeName} · {selected.issuer}
                    </p>
                  </div>
                  <Badge
                    label={STATUS[selected.status]?.label ?? selected.status}
                    tone={STATUS[selected.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                  />
                </header>

                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">ID de credencial</dt>
                    <dd className="font-medium text-slate-900">{selected.credentialId ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Emitida</dt>
                    <dd className="font-medium text-slate-900">{formatDate(selected.issuedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Caduca</dt>
                    <dd className="font-medium text-slate-900">{formatDate(selected.expiresAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Comprobación</dt>
                    <dd className="truncate">
                      {selected.credentialUrl ? (
                        <a
                          href={selected.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-blue-700 hover:underline"
                        >
                          Abrir credencial
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                </dl>

                {selected.decisionReason && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <strong>Motivo:</strong> {selected.decisionReason}
                  </p>
                )}

                {selected.status === 'pending' && (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Nota o motivo de rechazo (opcional)"
                      className={inputClass}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              api.adminApproveCertification(selected.id, note.trim() || undefined),
                            'Certificación validada',
                          )
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Validar
                      </button>
                      <button
                        type="button"
                        disabled={busy || note.trim().length < 3}
                        onClick={() =>
                          void run(
                            () => api.adminRejectCertification(selected.id, note.trim()),
                            'Certificación rechazada',
                          )
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>
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
