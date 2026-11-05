'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '../../../components/DashboardShell';
import Pagination from '../../../components/ui/Pagination';
import { Alert, Badge, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type SupportMessage,
  type SupportTicketDetail,
  type SupportTicketList,
  type TicketPriority,
  type TicketStatus,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PAGE_SIZE = 20;

const STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: 'Abierto', tone: 'bg-blue-50 text-blue-700' },
  pending: { label: 'En espera', tone: 'bg-amber-50 text-amber-700' },
  resolved: { label: 'Resuelto', tone: 'bg-emerald-50 text-emerald-600' },
  closed: { label: 'Cerrado', tone: 'bg-slate-100 text-slate-500' },
};

const PRIORITY: Record<string, { label: string; tone: string }> = {
  low: { label: 'Baja', tone: 'bg-slate-100 text-slate-500' },
  normal: { label: 'Normal', tone: 'bg-blue-50 text-blue-700' },
  high: { label: 'Alta', tone: 'bg-amber-50 text-amber-700' },
  urgent: { label: 'Urgente', tone: 'bg-red-50 text-red-600' },
};

const STATUS_LIST: TicketStatus[] = ['open', 'pending', 'resolved', 'closed'];
const PRIORITY_LIST: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSupportPage() {
  const router = useRouter();
  const { isSuperAdmin, isSupportAgent, isLoading } = useAuth();
  const [data, setData] = useState<SupportTicketList | null>(null);
  const [selected, setSelected] = useState<SupportTicketDetail | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigned, setAssigned] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin && !isSupportAgent) {
      router.replace('/app');
    }
  }, [isLoading, isSuperAdmin, isSupportAgent, router]);

  const load = useCallback(async () => {
    if (isLoading || (!isSuperAdmin && !isSupportAgent)) return;
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.supportTickets({
          page,
          pageSize: PAGE_SIZE,
          status: status || undefined,
          priority: priority || undefined,
          assigned: assigned || undefined,
          search: search || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los tickets');
    } finally {
      setLoading(false);
    }
  }, [page, status, priority, assigned, search, isLoading, isSuperAdmin, isSupportAgent]);

  const openTicket = useCallback(async (id: string) => {
    setError(null);
    try {
      setSelected(await api.supportTicket(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir el ticket');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('ticket');
    if (id && !isLoading && (isSuperAdmin || isSupportAgent)) void openTicket(id);
  }, [openTicket, isLoading, isSuperAdmin, isSupportAgent]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.supportReply(selected.id, reply.trim(), internal);
      setReply('');
      setNotice(internal ? 'Nota interna guardada' : 'Respuesta enviada');
      await Promise.all([openTicket(selected.id), load()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar');
    } finally {
      setBusy(false);
    }
  }

  async function updateTicket(payload: { status?: TicketStatus; priority?: TicketPriority }) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.supportUpdateTicket(selected.id, payload);
      setNotice('Ticket actualizado');
      await Promise.all([openTicket(selected.id), load()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar');
    } finally {
      setBusy(false);
    }
  }

  async function assignMe() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.supportAssignMe(selected.id);
      await Promise.all([openTicket(selected.id), load()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo asignar');
    } finally {
      setBusy(false);
    }
  }

  const stats = data?.stats;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <DashboardShell
      active="adminSupport"
      title="Soporte"
      subtitle="Tickets de las empresas y conversaciones con el equipo de FIVERTEN"
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Abiertos" value={stats?.status.open ?? '—'} />
          <Metric label="En espera" value={stats?.status.pending ?? '—'} />
          <Metric label="Sin asignar" value={stats?.unassigned ?? '—'} />
          <Metric label="Asignados a mí" value={stats?.mine ?? '—'} />
        </section>

        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Estado"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            {STATUS_LIST.map((item) => (
              <option key={item} value={item}>
                {STATUS[item].label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
            aria-label="Prioridad"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas las prioridades</option>
            {PRIORITY_LIST.map((item) => (
              <option key={item} value={item}>
                {PRIORITY[item].label}
              </option>
            ))}
          </select>
          <select
            value={assigned}
            onChange={(event) => {
              setAssigned(event.target.value);
              setPage(1);
            }}
            aria-label="Asignación"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="me">Asignados a mí</option>
            <option value="unassigned">Sin asignar</option>
          </select>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar empresa o asunto…"
            aria-label="Buscar tickets"
            className="min-w-48 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">Tickets</h2>
            </div>
            {loading ? (
              <p className="px-4 py-4 text-sm text-slate-500">Cargando tickets…</p>
            ) : !data || data.items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No hay tickets con estos filtros.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.items.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => void openTicket(ticket.id)}
                      className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                        selected?.id === ticket.id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {ticket.subject}
                        </p>
                        <Badge
                          label={STATUS[ticket.status]?.label ?? ticket.status}
                          tone={STATUS[ticket.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                        />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {ticket.organization.tradeName} · {formatDate(ticket.lastMessageAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data && data.total > PAGE_SIZE && (
              <Pagination
                summary={`${data.total} tickets`}
                page={page}
                pages={pages}
                onPage={setPage}
              />
            )}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            {!selected ? (
              <p className="text-sm text-slate-500">Selecciona un ticket para revisarlo.</p>
            ) : (
              <div className="space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">{selected.subject}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.organization.tradeName} · {selected.creator.email} ·{' '}
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      label={STATUS[selected.status]?.label ?? selected.status}
                      tone={STATUS[selected.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                    />
                    <Badge
                      label={PRIORITY[selected.priority]?.label ?? selected.priority}
                      tone={PRIORITY[selected.priority]?.tone ?? 'bg-slate-100 text-slate-500'}
                    />
                    {!selected.assignee && (
                      <button
                        type="button"
                        onClick={() => void assignMe()}
                        disabled={busy}
                        className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                      >
                        Asignármelo
                      </button>
                    )}
                  </div>
                </header>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Estado
                    <select
                      value={selected.status}
                      onChange={(event) =>
                        void updateTicket({ status: event.target.value as TicketStatus })
                      }
                      disabled={busy}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {STATUS_LIST.map((item) => (
                        <option key={item} value={item}>
                          {STATUS[item].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Prioridad
                    <select
                      value={selected.priority}
                      onChange={(event) =>
                        void updateTicket({ priority: event.target.value as TicketPriority })
                      }
                      disabled={busy}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {PRIORITY_LIST.map((item) => (
                        <option key={item} value={item}>
                          {PRIORITY[item].label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <ol className="space-y-3">
                  {selected.messages.map((message) => (
                    <SupportBubble key={message.id} message={message} />
                  ))}
                </ol>

                <form onSubmit={sendReply} className="space-y-2 border-t border-slate-100 pt-4">
                  <textarea
                    rows={3}
                    required
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder={
                      internal
                        ? 'Nota interna (solo equipo de soporte)…'
                        : 'Respuesta para la empresa…'
                    }
                    className={inputClass}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={internal}
                        onChange={(event) => setInternal(event.target.checked)}
                      />
                      Nota interna
                    </label>
                    <button
                      type="submit"
                      disabled={busy || reply.trim().length < 1}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? 'Enviando…' : internal ? 'Guardar nota' : 'Responder'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function SupportBubble({ message }: { message: SupportMessage }) {
  if (message.senderType === 'system') {
    return <li className="text-center text-xs italic text-slate-400">{message.body}</li>;
  }
  const fromSupport = message.senderType === 'support';
  return (
    <li
      className={`rounded-xl border p-3 ${
        message.isInternal
          ? 'border-amber-200 bg-amber-50/60'
          : fromSupport
            ? 'ml-6 border-blue-100 bg-blue-50/40'
            : 'mr-6 border-slate-200 bg-slate-50'
      }`}
    >
      <p className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="font-semibold">
          {message.isInternal ? 'Nota interna' : fromSupport ? 'Soporte FIVERTEN' : 'Empresa'}
        </span>
        <span>{formatDate(message.createdAt)}</span>
      </p>
      <p className="whitespace-pre-line text-sm text-slate-800">{message.body}</p>
    </li>
  );
}
