'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import Modal from '../../../components/ui/Modal';
import Pagination from '../../../components/ui/Pagination';
import { Alert, Badge, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type SupportMessage,
  type SupportTicketDetail,
  type SupportTicketList,
  type TicketCategory,
  type TicketPriority,
} from '../../../lib/api';

const PAGE_SIZE = 10;

const STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: 'Abierto', tone: 'bg-blue-50 text-blue-600' },
  pending: { label: 'En espera', tone: 'bg-amber-50 text-amber-700' },
  resolved: { label: 'Resuelto', tone: 'bg-emerald-50 text-emerald-600' },
  closed: { label: 'Cerrado', tone: 'bg-slate-100 text-slate-500' },
};

const PRIORITY: Record<string, { label: string; tone: string }> = {
  low: { label: 'Baja', tone: 'bg-slate-100 text-slate-500' },
  normal: { label: 'Normal', tone: 'bg-blue-50 text-blue-600' },
  high: { label: 'Alta', tone: 'bg-amber-50 text-amber-700' },
  urgent: { label: 'Urgente', tone: 'bg-red-50 text-red-600' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: 'General',
  billing: 'Facturación',
  reviews: 'Reseñas',
  technical: 'Técnico',
  account: 'Cuenta',
  other: 'Otro',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CompanySupportPage() {
  const [data, setData] = useState<SupportTicketList | null>(null);
  const [selected, setSelected] = useState<SupportTicketDetail | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.myTickets({ page, pageSize: PAGE_SIZE, status: status || undefined }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los tickets');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  const openTicket = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      setSelected(await api.myTicket(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir el ticket');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('ticket');
    if (id) void openTicket(id);
  }, [openTicket]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.replyMyTicket(selected.id, reply.trim());
      setReply('');
      setNotice('Respuesta enviada');
      await Promise.all([openTicket(selected.id), load()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  async function closeTicket() {
    if (!selected) return;
    if (!window.confirm('¿Cerrar este ticket?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.closeMyTicket(selected.id);
      setNotice('Ticket cerrado');
      await Promise.all([openTicket(selected.id), load()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cerrar el ticket');
    } finally {
      setBusy(false);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <DashboardShell
      active="support"
      title="Soporte"
      subtitle="Abre un ticket y habla directamente con el equipo de FIVERTEN"
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3">
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
              <option value="">Todos los estados</option>
              {Object.entries(STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            Nuevo ticket
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">Mis tickets</h2>
            </div>
            {loading ? (
              <p className="px-4 py-4 text-sm text-slate-500">Cargando tickets…</p>
            ) : !data || data.items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                Todavía no has abierto ningún ticket.
              </p>
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
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {ticket.subject}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{STATUS[ticket.status]?.label ?? ticket.status}</span>
                        <span>·</span>
                        <span>{formatDate(ticket.lastMessageAt)}</span>
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
              <p className="text-sm text-slate-500">
                Selecciona un ticket para ver la conversación.
              </p>
            ) : detailLoading && !selected ? (
              <p className="text-sm text-slate-500">Cargando ticket…</p>
            ) : (
              <div className="space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selected.subject}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {CATEGORY_LABELS[selected.category]} · abierto el{' '}
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
                    {selected.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => void closeTicket()}
                        disabled={busy}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cerrar ticket
                      </button>
                    )}
                  </div>
                </header>

                <ol className="space-y-3">
                  {selected.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </ol>

                {selected.status !== 'closed' && (
                  <form onSubmit={sendReply} className="space-y-2 border-t border-slate-100 pt-4">
                    <textarea
                      rows={3}
                      required
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Escribe tu respuesta…"
                      className={inputClass}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={busy || reply.trim().length < 1}
                        className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                      >
                        {busy ? 'Enviando…' : 'Enviar respuesta'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {creating && (
        <CreateTicketModal
          onClose={() => setCreating(false)}
          onCreated={async (ticket) => {
            setCreating(false);
            setNotice('Ticket creado. Te responderemos lo antes posible.');
            await load();
            await openTicket(ticket.id);
          }}
        />
      )}
    </DashboardShell>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  if (message.senderType === 'system') {
    return (
      <li className="text-center text-xs italic text-slate-400">{message.body}</li>
    );
  }
  const mine = message.senderType === 'company';
  return (
    <li
      className={`rounded-xl border p-3 ${
        mine ? 'ml-6 border-blue-100 bg-blue-50/40' : 'mr-6 border-slate-200 bg-slate-50'
      }`}
    >
      <p className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="font-semibold">
          {mine ? 'Tu empresa' : 'Equipo de soporte'}
        </span>
        <span>{formatDate(message.createdAt)}</span>
      </p>
      <p className="whitespace-pre-line text-sm text-slate-800">{message.body}</p>
    </li>
  );
}

function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ticket: { id: string }) => Promise<void>;
}) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ticket = await api.createTicket({ subject, message, category, priority });
      await onCreated(ticket);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el ticket');
      setBusy(false);
    }
  }

  return (
    <Modal title="Nuevo ticket de soporte" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Asunto" className="block">
          <input
            required
            minLength={3}
            maxLength={200}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría" className="block">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as TicketCategory)}
              className={inputClass}
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridad" className="block">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TicketPriority)}
              className={inputClass}
            >
              {Object.entries(PRIORITY).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="¿En qué podemos ayudarte?" className="block">
          <textarea
            required
            minLength={5}
            maxLength={5000}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Crear ticket
          </button>
        </div>
      </form>
    </Modal>
  );
}
