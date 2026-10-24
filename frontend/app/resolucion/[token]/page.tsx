'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PublicShell from '../../../components/public/PublicShell';
import { Stars, StarPicker } from '../../../components/reviews/Stars';
import { Alert, Badge, LoadingRow, inputClass } from '../../../components/ui';
import { ApiError, api, type ClientResolution, type ResolutionStatus } from '../../../lib/api';

const STATUS_LABELS: Record<ResolutionStatus, { label: string; tone: string }> = {
  open: { label: 'Abierta', tone: 'bg-blue-50 text-blue-600' },
  in_progress: { label: 'En curso', tone: 'bg-amber-50 text-amber-600' },
  accepted: { label: 'Resuelta', tone: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: 'Sin acuerdo', tone: 'bg-red-50 text-red-600' },
  closed: { label: 'Cerrada', tone: 'bg-slate-100 text-slate-500' },
};

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Enlace del correo para resolver una reseña de baja valoración. No requiere
 * cuenta: el token de la URL identifica la incidencia.
 */
export default function ResolutionPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<ClientResolution | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rejectReason, setRejectReason] = useState<'no_solution' | 'other'>('no_solution');
  const [deciding, setDeciding] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.clientResolution(token);
      setData(result);
      setRating(result.review.rating);
      setTitle(result.review.title ?? '');
      setBody(result.review.body);
      setLoadError(null);
    } catch (err) {
      setLoadError(messageOf(err, 'No se pudo cargar la incidencia.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Ejecuta una acción del cliente y recarga el estado al terminar. */
  async function run(action: () => Promise<unknown>, fallback: string, after?: () => void) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      after?.();
      await load();
    } catch (err) {
      setActionError(messageOf(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    void run(
      () => api.clientResolutionMessage(token, text),
      'No se pudo enviar tu mensaje',
      () => setMessage(''),
    );
  }

  function saveReview(event: FormEvent) {
    event.preventDefault();
    void run(
      () =>
        api.clientUpdateReview({
          token,
          rating,
          title: title.trim(),
          body: body.trim(),
        }),
      'No se pudo actualizar tu reseña',
      () => setEditing(false),
    );
  }

  function accept() {
    void run(() => api.clientAcceptResolution(token), 'No se pudo aceptar la solución');
  }

  function reject(event: FormEvent) {
    event.preventDefault();
    void run(
      () => api.clientRejectResolution(token, rejectReason),
      'No se pudo registrar tu respuesta',
      () => setDeciding(false),
    );
  }

  const active = data?.permissions.canWrite ?? false;
  const status = data ? STATUS_LABELS[data.resolution.status] : null;

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <LoadingRow label="Cargando la incidencia…" />
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <span className="material-symbols-outlined text-[44px] text-red-400">link_off</span>
            <h1 className="mt-2 text-xl font-bold">No podemos abrir esta incidencia</h1>
            <p className="mt-2 text-sm text-slate-600">{loadError}</p>
          </div>
        )}

        {data && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Incidencia con {data.company}
                </p>
                <h1 className="mt-1 text-xl font-bold">Tu reseña y la respuesta de la empresa</h1>
              </div>
              {status && <Badge label={status.label} tone={status.tone} />}
            </header>

            {data.resolution.closedAt && (
              <Alert tone={data.resolution.status === 'accepted' ? 'success' : 'info'}>
                {data.resolution.status === 'accepted'
                  ? 'Has aceptado la solución. ¡Gracias por darnos la oportunidad de mejorar!'
                  : data.resolution.status === 'rejected'
                    ? 'Has indicado que la solución no te convence. La empresa puede volver a contactarte.'
                    : 'La empresa ha cerrado esta incidencia.'}
              </Alert>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={data.review.rating} />
                {data.permissions.canEditReview && !editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs font-semibold text-[#2563eb] hover:underline"
                  >
                    Editar mi reseña
                  </button>
                )}
              </div>
              {data.review.title && (
                <h2 className="mt-2 font-semibold text-slate-900">{data.review.title}</h2>
              )}
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{data.review.body}</p>

              {editing && (
                <form onSubmit={saveReview} className="mt-4 space-y-3">
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      Puntuación
                    </span>
                    <StarPicker value={rating} onChange={setRating} />
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Título</span>
                    <input
                      value={title}
                      maxLength={255}
                      onChange={(e) => setTitle(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Opinión</span>
                    <textarea
                      rows={4}
                      required
                      minLength={10}
                      maxLength={5000}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditing(false)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={busy || body.trim().length < 10 || rating < 1}
                      className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                    >
                      {busy ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {actionError && <Alert tone="error">{actionError}</Alert>}

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Conversación</h2>
              {data.messages.length === 0 && (
                <p className="text-sm text-slate-500">Aún no hay mensajes.</p>
              )}
              <ol className="space-y-3">
                {data.messages.map((item, index) =>
                  item.senderType === 'system' ? (
                    <li key={index} className="text-center text-xs italic text-slate-400">
                      {item.body}
                    </li>
                  ) : (
                    <li
                      key={index}
                      className={`rounded-lg bg-white p-3 ${
                        item.senderType === 'client'
                          ? 'ml-8 border border-blue-100'
                          : 'mr-8 border border-slate-200'
                      }`}
                    >
                      <p className="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                        <span className="font-semibold">
                          {item.senderType === 'client' ? 'Tú' : data.company}
                        </span>
                        <span>
                          {new Date(item.createdAt).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </p>
                      <p className="whitespace-pre-line text-sm text-slate-800">{item.body}</p>
                    </li>
                  ),
                )}
              </ol>

              {active && (
                <form onSubmit={sendMessage} className="space-y-2">
                  <textarea
                    rows={3}
                    required
                    maxLength={3000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe a la empresa"
                    className={inputClass}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={busy || message.trim().length < 2}
                      className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                    >
                      {busy ? 'Enviando…' : 'Enviar mensaje'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {data.permissions.canDecide && (
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">¿La solución te convence?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Si la aceptas, la incidencia se da por resuelta. Si no, lo registraremos.
                </p>

                {!deciding ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={accept}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Aceptar solución
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeciding(true)}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-red-200 hover:text-red-600 disabled:opacity-60"
                    >
                      No me convence
                    </button>
                  </div>
                ) : (
                  <form onSubmit={reject} className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                        Motivo
                      </span>
                      <select
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value as 'no_solution' | 'other')}
                        className={inputClass}
                      >
                        <option value="no_solution">
                          La solución propuesta no resuelve mi caso
                        </option>
                        <option value="other">Otro motivo</option>
                      </select>
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDeciding(false)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Volver
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Confirmar
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </PublicShell>
  );
}
