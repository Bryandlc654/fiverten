'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError, api, type AdminReview, type ModerationAction } from '../../lib/api';
import { formatDate } from '../reviews/ReviewCard';
import { Stars } from '../reviews/Stars';
import { REVIEW_STATUS_LABELS } from '../reviews/TenantReviewItem';
import { Alert, Badge, Field, inputClass } from '../ui';
import Modal from '../ui/Modal';

interface ActionDef {
  action: ModerationAction;
  label: string;
  icon: string;
  danger?: boolean;
  /** Pide motivo (queda en el historial). */
  needsReason?: boolean;
}

// Acciones disponibles en cada estado (espejo de backend/src/reviews/review-states.ts).
const ACTIONS: Partial<Record<AdminReview['status'], ActionDef[]>> = {
  under_review: [
    { action: 'publish', label: 'Publicar', icon: 'check_circle' },
    { action: 'reject', label: 'Rechazar', icon: 'block', danger: true, needsReason: true },
  ],
  reported: [
    { action: 'unflag', label: 'Descartar reportes', icon: 'done_all' },
    { action: 'hide', label: 'Ocultar', icon: 'visibility_off', danger: true, needsReason: true },
  ],
  published: [
    { action: 'hide', label: 'Ocultar', icon: 'visibility_off', danger: true, needsReason: true },
  ],
  hidden: [{ action: 'restore', label: 'Restaurar', icon: 'restore' }],
  rejected: [{ action: 'restore', label: 'Restaurar', icon: 'restore' }],
};

const ANTIFRAUD_LABELS: Record<string, string> = {
  ip_burst: 'Varias reseñas desde la misma IP',
  contains_link: 'Contiene enlaces',
};

const ACTION_LABELS: Record<string, string> = {
  publish: 'Publicada',
  reject: 'Rechazada',
  hide: 'Ocultada',
  restore: 'Restaurada',
  unflag: 'Reportes descartados',
  flag: 'Marcada',
};

function statusLabel(status: string | null): string {
  if (!status) return '—';
  return REVIEW_STATUS_LABELS[status as AdminReview['status']]?.label ?? status;
}

export default function ModerationItem({
  review,
  onDone,
}: {
  review: AdminReview;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ActionDef | null>(null);
  const [reason, setReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const status = REVIEW_STATUS_LABELS[review.status];

  async function run(def: ActionDef, why?: string) {
    setBusy(true);
    setError(null);
    try {
      await api.adminModerateReview(review.id, def.action, why);
      setPending(null);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo aplicar la acción');
    } finally {
      setBusy(false);
    }
  }

  function start(def: ActionDef) {
    if (def.needsReason) {
      setReason('');
      setPending(def);
    } else {
      void run(def);
    }
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (pending) void run(pending, reason.trim());
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Stars rating={review.rating} size={16} />
            <Badge label={status.label} tone={status.tone} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <Link
              href={`/empresa/${review.organization.slug}`}
              target="_blank"
              className="font-semibold text-slate-700 hover:underline"
            >
              {review.organization.tradeName}
            </Link>{' '}
            · {review.reviewerName} ({review.reviewerEmail}) · {formatDate(review.createdAt)}
            {review.ipAddress ? ` · IP ${review.ipAddress}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(ACTIONS[review.status] ?? []).map((def) => (
            <button
              key={def.action}
              type="button"
              disabled={busy}
              onClick={() => start(def)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                def.danger
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{def.icon}</span>
              {def.label}
            </button>
          ))}
        </div>
      </header>

      {review.title && <h3 className="mt-3 text-sm font-bold text-slate-900">{review.title}</h3>}
      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.body}</p>
      {review.response && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <strong>Respuesta de la empresa:</strong> {review.response}
        </p>
      )}

      {review.antifraud.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.antifraud.map((flag) => (
            <Badge
              key={flag}
              label={`⚠ ${ANTIFRAUD_LABELS[flag] ?? flag}`}
              tone="bg-amber-50 text-amber-700"
            />
          ))}
        </div>
      )}

      {review.reports.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2">
          <p className="text-xs font-semibold text-red-700">
            {review.reports.length}{' '}
            {review.reports.length === 1 ? 'reporte abierto' : 'reportes abiertos'}
          </p>
          <ul className="mt-1 space-y-1 text-xs text-slate-600">
            {review.reports.map((report) => (
              <li key={report.id}>
                <strong>{report.reason ?? 'Sin motivo'}</strong> ·{' '}
                {report.byOrganization ? 'por la empresa' : 'por un visitante'} ·{' '}
                {formatDate(report.createdAt)}
                {report.comment ? ` — “${report.comment}”` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}

      {review.history.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowHistory((value) => !value)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showHistory ? 'expand_less' : 'history'}
            </span>
            Historial ({review.history.length})
          </button>
          {showHistory && (
            <ol className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3 text-xs text-slate-500">
              {review.history.map((entry, index) => (
                <li key={index}>
                  <strong className="text-slate-700">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </strong>{' '}
                  ({statusLabel(entry.fromStatus)} → {statusLabel(entry.toStatus)}) ·{' '}
                  {formatDate(entry.createdAt)} · {entry.byModerator ? 'moderador' : 'sistema'}
                  {entry.reason ? ` — ${entry.reason}` : ''}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {pending && (
        <Modal
          title={`${pending.label} reseña`}
          subtitle="El motivo queda registrado en el historial de la reseña."
          busy={busy}
          onClose={() => setPending(null)}
        >
          <form onSubmit={confirm} className="space-y-3">
            <Field label="Motivo">
              <textarea
                rows={3}
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={busy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !reason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? 'Aplicando…' : pending.label}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </article>
  );
}
