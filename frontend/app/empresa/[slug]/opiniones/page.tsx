'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import CompanyPublicNav from '../../../../components/public/CompanyPublicNav';
import PublicHero from '../../../../components/public/PublicHero';
import PublicShell from '../../../../components/public/PublicShell';
import RatingBreakdown from '../../../../components/reviews/RatingBreakdown';
import ReportReviewModal from '../../../../components/reviews/ReportReviewModal';
import ReviewCard from '../../../../components/reviews/ReviewCard';
import Pagination from '../../../../components/ui/Pagination';
import {
  ApiError,
  api,
  type Paginated,
  type PublicProfile,
  type PublicReview,
} from '../../../../lib/api';
import {
  LOW_RATING_MAX,
  PERIOD_OPTIONS,
  SORT_OPTIONS,
  type ReviewPeriod,
  type ReviewSort,
} from '../../../../lib/review-filters';

const PAGE_SIZE = 10;

export default function PublicReviewsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Paginated<PublicReview> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [period, setPeriod] = useState<ReviewPeriod>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;
    api
      .publicProfile(slug)
      .then((data) => {
        setProfile(data);
        document.title = `Opiniones de ${data.tradeName} | FIVERTEN`;
      })
      .catch((err) =>
        setError(err instanceof ApiError && err.status === 404 ? 'not_found' : 'error'),
      );
  }, [slug]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    api
      .publicReviews(slug, {
        rating: rating ?? undefined,
        sort,
        period: period || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then(setReviews)
      .catch(() => setReviews(null))
      .finally(() => setLoading(false));
  }, [slug, rating, sort, period, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <PublicShell>
        <p className="text-sm text-slate-600">
          {error === 'not_found' ? 'Empresa no encontrada.' : 'No se pudo cargar la información.'}
        </p>
      </PublicShell>
    );
  }

  if (!profile) {
    return (
      <PublicShell>
        <p className="text-sm text-slate-500">Cargando opiniones…</p>
      </PublicShell>
    );
  }

  const pages = reviews ? Math.max(1, Math.ceil(reviews.total / PAGE_SIZE)) : 1;

  return (
    <PublicShell>
      <div className="space-y-5">
        <PublicHero profile={profile} />
        <CompanyPublicNav slug={slug} active="opiniones" />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <RatingBreakdown
              rating={profile.rating}
              selected={rating}
              onSelect={(value) => {
                setRating(value);
                setPage(1);
              }}
              lowRatingsHidden={profile.lowRatingsHidden}
            />
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">
                Opiniones <span className="text-sm font-medium text-slate-400">{reviews?.total ?? 0}</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={period}
                  onChange={(event) => {
                    setPeriod(event.target.value as ReviewPeriod);
                    setPage(1);
                  }}
                  aria-label="Filtrar por fecha"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as ReviewSort);
                    setPage(1);
                  }}
                  aria-label="Ordenar opiniones"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && !reviews ? (
              <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ) : !reviews || reviews.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <p className="text-base font-semibold text-slate-900">
                  {rating || period ? 'No hay opiniones con estos filtros' : 'Todavía no hay opiniones'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {reviews.items.map((review) => (
                    <ReviewCard
                      key={review.id}
                      reviewerName={review.reviewerName}
                      rating={review.rating}
                      title={review.title}
                      body={review.body}
                      date={review.publishedAt}
                      experienceDate={review.experienceDate}
                      verified={review.verified}
                      projectName={review.project?.name}
                      companyName={profile.tradeName}
                      response={review.response}
                    >
                      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                        {reportedIds.includes(review.id) ? (
                          <span className="text-xs text-slate-400">
                            Gracias, revisaremos esta opinión.
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReportingId(review.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <span className="material-symbols-outlined text-[15px]">flag</span>
                            Reportar
                          </button>
                        )}
                      </div>
                    </ReviewCard>
                  ))}
                </div>
                {pages > 1 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <Pagination summary={`${reviews.total} opiniones`} page={page} pages={pages} onPage={setPage} />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {reportingId && (
        <ReportReviewModal
          intro="Si incumple nuestras políticas, la retiraremos. La empresa no puede ocultar opiniones por sí misma."
          onSubmit={(payload) => api.reportPublicReview(reportingId, payload)}
          onClose={() => setReportingId(null)}
          onDone={() => {
            setReportedIds((current) => [...current, reportingId]);
            setReportingId(null);
          }}
        />
      )}
    </PublicShell>
  );
}
