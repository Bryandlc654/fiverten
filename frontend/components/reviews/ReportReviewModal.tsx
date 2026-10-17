'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, type ReportPayload, type ReportReason } from '../../lib/api';
import { Alert, Field, inputClass } from '../ui';
import Modal from '../ui/Modal';

/**
 * Reportar una reseña a moderación. Lo usan los visitantes del perfil público
 * y las empresas desde su panel; ninguno puede ocultarla por sí mismo.
 */
export default function ReportReviewModal({
  onSubmit,
  onClose,
  onDone,
  intro,
}: {
  onSubmit: (payload: ReportPayload) => Promise<unknown>;
  onClose: () => void;
  onDone: () => void;
  intro: string;
}) {
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .reportReasons()
      .then((data) => setReasons(data.reasons))
      .catch(() => setError('No se pudieron cargar los motivos'));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason) {
      setError('Elige un motivo');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ reason, comment: comment.trim() || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el reporte');
      setBusy(false);
    }
  }

  return (
    <Modal title="Reportar reseña" subtitle={intro} busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Motivo">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
            <option value="">Elige un motivo…</option>
            {reasons.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Detalles (opcional)">
          <textarea
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
