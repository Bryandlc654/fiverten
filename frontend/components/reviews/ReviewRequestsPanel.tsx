'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  api,
  type ReviewRequestList,
  type ReviewRequestStatus,
  type ReviewRequestSummary,
} from '../../lib/api';
import { Alert, inputClass } from '../ui';

const STATUS_LABELS: Record<ReviewRequestStatus, { label: string; tone: string }> = {
  sent: { label: 'Enviada', tone: 'bg-slate-100 text-slate-600' },
  opened: { label: 'Abierta', tone: 'bg-blue-50 text-blue-600' },
  completed: { label: 'Completada', tone: 'bg-emerald-50 text-emerald-600' },
};

const PAGE_SIZE = 8;

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Enlaces personalizados de solicitud de reseña: se envía un enlace único a
 * cada cliente y se mide si lo abre y si termina dejando la reseña.
 */
export default function ReviewRequestsPanel({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<ReviewRequestList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      setData(await api.listReviewRequests({ page: 1, pageSize: PAGE_SIZE }));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    setLastUrl(null);
    setCopied(false);
    try {
      const created = await api.createReviewRequest({ name: name.trim(), email: email.trim() });
      setLastUrl(created.url);
      setName('');
      setEmail('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setSending(false);
    }
  }

  async function copy() {
    if (!lastUrl) return;
    try {
      await navigator.clipboard.writeText(lastUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!canManage) return null;

  const stats = data?.stats;

  return (
    <section data-testid="review-requests" className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Solicitudes personalizadas</h2>
          <p className="text-xs text-slate-500">
            Envía un enlace único a cada cliente y mide cuántos dejan su reseña.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-center">
          <Stat label="Enviadas" value={stats?.sent} />
          <Stat label="Abiertas" value={stats?.opened} />
          <Stat label="Completadas" value={stats?.completed} />
          <Stat
            label="Conversión"
            value={stats ? `${Math.round(stats.conversion * 100)}%` : undefined}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          required
          minLength={2}
          maxLength={200}
          placeholder="Nombre del cliente"
          aria-label="Nombre del cliente"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
        <input
          required
          type="email"
          maxLength={255}
          placeholder="correo@cliente.com"
          aria-label="Correo del cliente"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          {sending ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>

      {lastUrl && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Solicitud enviada. También puedes compartir el enlace:
          <code className="max-w-full truncate rounded bg-white/70 px-2 py-1">{lastUrl}</code>
          <button
            type="button"
            onClick={() => void copy()}
            className="ml-auto rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800">Últimas solicitudes</h3>
        {loading && !data ? (
          <p className="mt-2 text-sm text-slate-500">Cargando solicitudes…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aún no has enviado ninguna solicitud personalizada.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {data.items.map((item) => {
              const status = STATUS_LABELS[item.status];
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.reviewerName}</p>
                    <p className="truncate text-xs text-slate-500">{item.reviewerEmail}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span
                      title={item.expired ? 'Enlace caducado' : undefined}
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        item.expired && item.status !== 'completed'
                          ? 'bg-amber-50 text-amber-700'
                          : status.tone
                      }`}
                    >
                      {item.expired && item.status !== 'completed' ? 'Caducada' : status.label}
                    </span>
                    <span className="hidden sm:inline">Enviada {formatDate(item.sentAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-base font-bold text-slate-900">{value ?? '—'}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
