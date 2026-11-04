'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ApiError,
  api,
  type AdminReview,
  type OrganizationStats,
} from '../../lib/api';
import { Stars } from '../reviews/Stars';
import { Alert, Badge } from '../ui';

export default function AdminOrganizationInsights({ organizationId }: { organizationId: string }) {
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.adminOrganizationStats(organizationId, 12),
      api.adminOrganizationReviews(organizationId, { page: 1, pageSize: 10 }),
    ])
      .then(([statsData, reviewsData]) => {
        if (!active) return;
        setStats(statsData);
        setReviews(reviewsData.items);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los datos');
        }
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  const rate = stats?.responses.rate;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Reputación y reseñas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Últimas reseñas y métricas principales de la empresa.
          </p>
        </div>
        <Link
          href="/admin/reviews"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          Ver todas en moderación
        </Link>
      </div>

      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Puntuación" value={stats?.rating.average ?? '—'} />
        <Metric label="Reseñas" value={stats?.rating.total ?? '—'} />
        <Metric label="Tasa de respuesta" value={rate === null || rate === undefined ? '—' : `${Math.round(rate * 100)}%`} />
        <Metric label="Reseñas 30 días" value={stats?.periods.last30 ?? '—'} />
      </div>

      <h3 className="mt-5 text-sm font-semibold text-slate-800">Últimas reseñas</h3>
      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Esta empresa todavía no tiene reseñas.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {reviews.map((review) => (
            <li key={review.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={review.rating} size={14} />
                <Badge label={review.status} tone="bg-slate-100 text-slate-600" />
                <span className="text-xs text-slate-500">
                  {review.reviewerName} ·{' '}
                  {new Date(review.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-700">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
