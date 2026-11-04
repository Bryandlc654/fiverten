'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '../../../components/DashboardShell';
import Pagination from '../../../components/ui/Pagination';
import { Alert, Badge, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type VerificationInquiry,
  type VerificationInquiryStatus,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PAGE_SIZE = 20;

const STATUS: Record<VerificationInquiryStatus, { label: string; tone: string }> = {
  new: { label: 'Nueva', tone: 'bg-blue-50 text-blue-600' },
  contacted: { label: 'Contactada', tone: 'bg-amber-50 text-amber-700' },
  closed: { label: 'Cerrada', tone: 'bg-slate-100 text-slate-500' },
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

export default function AdminInquiriesPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading } = useAuth();
  const [items, setItems] = useState<VerificationInquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VerificationInquiry | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) router.replace('/app');
  }, [isLoading, isSuperAdmin, router]);

  const load = useCallback(async () => {
    if (isLoading || !isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminListVerificationInquiries({
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

  async function update(nextStatus: VerificationInquiryStatus) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.adminUpdateVerificationInquiry(selected.id, {
        status: nextStatus,
        notes: notes.trim() || undefined,
      });
      setSelected(updated);
      setNotes(updated.notes ?? '');
      setNotice('Solicitud actualizada');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardShell
      active="adminInquiries"
      title="Solicitudes de verificación"
      subtitle="Contactos recibidos desde el formulario público de captación"
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
            <option value="new">Nuevas</option>
            <option value="contacted">Contactadas</option>
            <option value="closed">Cerradas</option>
          </select>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar empresa, contacto o correo…"
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
                      onClick={() => {
                        setSelected(item);
                        setNotes(item.notes ?? '');
                      }}
                      className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                        selected?.id === item.id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.companyName}
                        </p>
                        <Badge
                          label={STATUS[item.status]?.label ?? item.status}
                          tone={STATUS[item.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {item.contactName} · {formatDate(item.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {total > PAGE_SIZE && (
              <Pagination
                summary={`${total} solicitudes`}
                page={page}
                pages={pages}
                onPage={setPage}
              />
            )}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            {!selected ? (
              <p className="text-sm text-slate-500">Selecciona una solicitud para gestionarla.</p>
            ) : (
              <div className="space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selected.companyName}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.contactName} · {selected.email}
                      {selected.phone ? ` · ${selected.phone}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Recibida el {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  <Badge
                    label={STATUS[selected.status]?.label ?? selected.status}
                    tone={STATUS[selected.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                  />
                </header>

                {selected.message && (
                  <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {selected.message}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Notas internas
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={busy || selected.status === 'contacted'}
                    onClick={() => void update('contacted')}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    Marcar contactada
                  </button>
                  <button
                    type="button"
                    disabled={busy || selected.status === 'closed'}
                    onClick={() => void update('closed')}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    Cerrar solicitud
                  </button>
                  <a
                    href={`mailto:${selected.email}`}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Responder por correo
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
