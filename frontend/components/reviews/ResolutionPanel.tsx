'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  api,
  type CompanyResolution,
  type ResolutionStatus,
  type TenantReview,
} from '../../lib/api';
import { Alert, Badge, LoadingRow, inputClass } from '../ui';

type ResolutionSummary = TenantReview['resolution'];

export const RESOLUTION_STATUS_LABELS: Record<ResolutionStatus, { label: string; tone: string }> = {
  open: { label: 'Esperando al cliente', tone: 'bg-blue-50 text-blue-600' },
  in_progress: { label: 'En curso', tone: 'bg-amber-50 text-amber-600' },
  accepted: { label: 'Resuelta', tone: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: 'Solución rechazada', tone: 'bg-red-50 text-red-600' },
  closed: { label: 'Cerrada', tone: 'bg-slate-100 text-slate-500' },
};

const ACTIVE_STATUSES: ResolutionStatus[] = ['open', 'in_progress'];

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Hilo de resolución de una reseña de baja valoración. La empresa abre la
 * incidencia, escribe al cliente (que recibe un enlace por correo) y puede
 * cerrarla si no hay acuerdo.
 */
export default function ResolutionPanel({
  reviewId,
  onSummaryChange,
}: {
  reviewId: string;
  onSummaryChange: (summary: ResolutionSummary) => void;
}) {
  // undefined: cargando. null: no hay resolución todavía.
  const [resolution, setResolution] = useState<CompanyResolution | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getReviewResolution(reviewId)
      .then(({ resolution: current }) => {
        if (active) setResolution(current);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(messageOf(err, 'No se pudo cargar la resolución'));
          setResolution(null);
        }
      });
    return () => {
      active = false;
    };
  }, [reviewId]);

  async function refresh() {
    const { resolution: current } = await api.getReviewResolution(reviewId);
    setResolution(current);
    onSummaryChange(
      current ? { id: current.id, status: current.status, outcome: current.outcome } : null,
    );
  }

  const isActive = resolution != null && ACTIVE_STATUSES.includes(resolution.status);
  const canStartNew = resolution == null || resolution.status !== 'accepted';
  const minLength = isActive ? 2 : 10;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    setBusy(true);
    setError(null);
    try {
      if (isActive) {
        await api.sendResolutionMessage(reviewId, text);
      } else {
        await api.openReviewResolution(reviewId, text);
      }
      setDraft('');
      await refresh();
    } catch (err) {
      setError(messageOf(err, 'No se pudo enviar el mensaje'));
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (
      !window.confirm(
        '¿Cerrar la incidencia sin acuerdo? El cliente ya no podrá responder desde su enlace.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.closeReviewResolution(reviewId);
      await refresh();
    } catch (err) {
      setError(messageOf(err, 'No se pudo cerrar la incidencia'));
    } finally {
      setBusy(false);
    }
  }

  if (resolution === undefined) {
    return <LoadingRow label="Cargando resolución…" />;
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Resolución de la incidencia</h3>
        {resolution && (
          <Badge
            label={RESOLUTION_STATUS_LABELS[resolution.status].label}
            tone={RESOLUTION_STATUS_LABELS[resolution.status].tone}
          />
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {resolution && resolution.messages.length > 0 && (
        <ol className="space-y-3">
          {resolution.messages.map((message, index) =>
            message.senderType === 'system' ? (
              <li key={message.id ?? index} className="text-center text-xs italic text-slate-400">
                {message.body}
              </li>
            ) : (
              <li
                key={message.id ?? index}
                className={`rounded-lg bg-white p-3 ${
                  message.senderType === 'company'
                    ? 'ml-8 border border-blue-100'
                    : 'mr-8 border border-slate-200'
                }`}
              >
                <p className="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold">
                    {message.senderType === 'company' ? 'Tu empresa' : 'Cliente'}
                  </span>
                  <span>
                    {new Date(message.createdAt).toLocaleString('es-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </p>
                <p className="whitespace-pre-line text-sm text-slate-800">{message.body}</p>
              </li>
            ),
          )}
        </ol>
      )}

      {(isActive || canStartNew) && (
        <form onSubmit={submit} className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              {isActive ? 'Responder al cliente' : 'Abrir una resolución'}
            </span>
            <textarea
              rows={3}
              required
              maxLength={3000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isActive
                  ? 'Escribe tu respuesta. El cliente recibirá un correo con un enlace para contestar.'
                  : 'Explica al cliente qué vas a hacer para resolver su incidencia. Se le enviará un correo con un enlace seguro.'
              }
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isActive ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void close()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-60"
              >
                Cerrar sin acuerdo
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={busy || draft.trim().length < minLength}
              className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              {busy ? 'Enviando…' : isActive ? 'Enviar al cliente' : 'Abrir y avisar al cliente'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
