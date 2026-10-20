'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type TenantReview } from '../../lib/api';
import { formatDate } from '../reviews/ReviewCard';
import { Stars } from '../reviews/Stars';
import { initialsOf } from '../ui';

export default function LatestReviews() {
  const [reviews, setReviews] = useState<TenantReview[] | null>(null);

  useEffect(() => {
    api
      .listReviews({ status: 'published', pageSize: 3 })
      .then((data) => setReviews(data.items))
      .catch(() => setReviews([]));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Últimas opiniones</h3>
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Ver todas
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </Link>
      </div>
      {reviews === null ? (
        <p className="mt-4 text-sm text-slate-400">Cargando…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aún no tienes reseñas publicadas. Comparte tu enlace desde{' '}
          <Link href="/dashboard/reviews" className="font-semibold text-blue-600 hover:underline">
            Opiniones
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {reviews.map((review) => (
            <li key={review.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {initialsOf(review.reviewerName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(review.publishedAt)}
                  </span>
                  {!review.response && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                      Sin responder
                    </span>
                  )}
                </div>
                <Stars rating={review.rating} size={16} />
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{review.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
