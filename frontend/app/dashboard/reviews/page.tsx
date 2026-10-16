'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import ShareReviewLink from '../../../components/reviews/ShareReviewLink';
import TenantReviewItem, { REVIEW_STATUS_LABELS } from '../../../components/reviews/TenantReviewItem';
import { Alert, LoadingRow, StatCard } from '../../../components/ui';
import Pagination from '../../../components/ui/Pagination';
import {
  ApiError,
  api,
  type OrganizationDetail,
  type ReviewStatus,
  type TenantReview,
  type TenantReviewList,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { roleAtLeast } from '../../../lib/roles';

const PAGE_SIZE = 20;

export default function ReviewsPage() {
  const { role } = useAuth();
  const [company, setCompany] = useState<OrganizationDetail | null>(null);
  const [data, setData] = useState<TenantReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ReviewStatus | ''>('');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);

  const canRespond = roleAtLeast(role, 'editor');

  useEffect(() => {
    api
      .getMyOrganization()
      .then(setCompany)
      .catch(() => setCompany(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.listReviews({
          status: status || undefined,
          rating: rating ? Number(rating) : undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las reseñas');
    } finally {
      setLoading(false);
    }
  }, [status, rating, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function replace(updated: TenantReview) {
    setData((current) =>
      current
        ? { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) }
        : current,
    );
    // Recarga en segundo plano para actualizar los contadores del resumen.
    void load();
  }

  const summary = data?.summary;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const selectClass =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500';

  return (
    <DashboardShell
      active="reviews"
      title="Opiniones"
      subtitle="Reseñas de tus clientes y tus respuestas públicas"
    >
      <div className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Publicadas"
            value={summary?.published}
            hint="Visibles en tu perfil"
            icon="reviews"
            tone="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Sin responder"
            value={summary?.unanswered}
            hint="Publicadas"
            icon="chat_bubble"
            tone="bg-violet-50 text-violet-600"
          />
          <StatCard
            label="Negativas"
            value={summary?.negative}
            hint="1 o 2 estrellas"
            icon="sentiment_dissatisfied"
            tone="bg-red-50 text-red-600"
          />
          <StatCard
            label="Pendientes"
            value={summary?.pending}
            hint="Sin confirmar por el cliente"
            icon="pending"
            tone="bg-amber-50 text-amber-600"
          />
        </section>

        {company && <ShareReviewLink slug={company.slug} isPublic={company.isPublic} />}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">
              Reseñas {data ? `(${data.total})` : ''}
            </h2>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filtrar por estado"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ReviewStatus | '');
                  setPage(1);
                }}
                className={selectClass}
              >
                <option value="">Todos los estados</option>
                {(Object.keys(REVIEW_STATUS_LABELS) as ReviewStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {REVIEW_STATUS_LABELS[key].label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por estrellas"
                value={rating}
                onChange={(e) => {
                  setRating(e.target.value);
                  setPage(1);
                }}
                className={selectClass}
              >
                <option value="">Todas las estrellas</option>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? 'estrella' : 'estrellas'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && !data ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <LoadingRow label="Cargando reseñas…" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {status || rating
                ? 'No hay reseñas con estos filtros.'
                : 'Aún no has recibido reseñas. Comparte tu enlace para empezar.'}
            </div>
          ) : (
            <>
              {data.items.map((review) => (
                <TenantReviewItem
                  key={review.id}
                  review={review}
                  companyName={company?.tradeName ?? 'la empresa'}
                  canRespond={canRespond}
                  onChange={replace}
                />
              ))}
              {pages > 1 && (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <Pagination
                    summary={`${data.total} reseñas`}
                    page={page}
                    pages={pages}
                    onPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
