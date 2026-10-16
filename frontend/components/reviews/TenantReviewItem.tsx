'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, api, type ReviewStatus, type TenantReview } from '../../lib/api';
import { Badge, inputClass } from '../ui';
import ReviewCard from './ReviewCard';

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, { label: string; tone: string }> = {
  pending: { label: 'Pendiente de confirmar', tone: 'bg-slate-100 text-slate-500' },
  published: { label: 'Publicada', tone: 'bg-emerald-50 text-emerald-600' },
  under_review: { label: 'En revisión', tone: 'bg-amber-50 text-amber-600' },
  reported: { label: 'Reportada', tone: 'bg-red-50 text-red-600' },
  hidden: { label: 'Oculta', tone: 'bg-slate-100 text-slate-500' },
};

/** Reseña en el panel de la empresa, con el formulario de respuesta pública. */
export default function TenantReviewItem({
  review,
  companyName,
  canRespond,
  onChange,
}: {
  review: TenantReview;
  companyName: string;
  canRespond: boolean;
  onChange: (review: TenantReview) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.response?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = REVIEW_STATUS_LABELS[review.status];
  const respondable = canRespond && review.status !== 'pending';

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onChange(await api.respondToReview(review.id, draft.trim()));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.removeReviewResponse(review.id);
      onChange({ ...review, response: null });
      setDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo retirar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReviewCard
      reviewerName={review.reviewerName}
      rating={review.rating}
      title={review.title}
      body={review.body}
      date={review.publishedAt ?? review.createdAt}
      experienceDate={review.experienceDate}
      verified={review.verified}
      companyName={companyName}
      response={editing ? null : review.response}
      badge={
        <div className="flex items-center gap-2">
          {review.orderReference && (
            <span className="text-xs text-slate-400">Pedido {review.orderReference}</span>
          )}
          <Badge label={status.label} tone={status.tone} />
        </div>
      }
    >
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {respondable && editing && (
        <form onSubmit={save} className="mt-4 space-y-2">
          <textarea
            rows={3}
            required
            maxLength={3000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe una respuesta pública. La verán todos los visitantes de tu perfil."
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setDraft(review.response?.body ?? '');
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || draft.trim().length < 2}
              className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              {busy ? 'Publicando…' : 'Publicar respuesta'}
            </button>
          </div>
        </form>
      )}

      {respondable && !editing && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <span className="material-symbols-outlined text-[16px]">reply</span>
            {review.response ? 'Editar respuesta' : 'Responder'}
          </button>
          {review.response && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-60"
            >
              Retirar respuesta
            </button>
          )}
        </div>
      )}
    </ReviewCard>
  );
}
