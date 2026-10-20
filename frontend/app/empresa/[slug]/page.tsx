'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Pagination from '../../../components/ui/Pagination';
import PublicHero from '../../../components/public/PublicHero';
import PublicShell from '../../../components/public/PublicShell';
import RatingBreakdown from '../../../components/reviews/RatingBreakdown';
import ReportReviewModal from '../../../components/reviews/ReportReviewModal';
import ReviewCard from '../../../components/reviews/ReviewCard';
import {
  ApiError,
  api,
  type Paginated,
  type PublicProfile,
  type PublicReview,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import {
  PERIOD_OPTIONS,
  SORT_OPTIONS,
  type ReviewPeriod,
  type ReviewSort,
} from '../../../lib/review-filters';

const PAGE_SIZE = 10;

export default function PublicProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { organization } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Paginated<PublicReview> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [period, setPeriod] = useState<ReviewPeriod>('');
  const [page, setPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;
    api
      .publicProfile(slug)
      .then((data) => {
        setProfile(data);
        document.title = `${data.tradeName} · Opiniones | FIVERTEN`;
      })
      .catch((err) =>
        setError(err instanceof ApiError && err.status === 404 ? 'not_found' : 'error'),
      );
  }, [slug]);

  const loadReviews = useCallback(() => {
    if (!slug) return;
    setLoadingReviews(true);
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
      .finally(() => setLoadingReviews(false));
  }, [slug, rating, sort, period, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  function selectRating(value: number | null) {
    setRating(value);
    setPage(1);
  }

  // La propietaria que abre el perfil de su propia empresa sin haberlo
  // publicado: se le explica qué hacer en lugar del mensaje genérico.
  if (error === 'not_found' && organization?.slug === slug) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-amber-500">
            visibility_off
          </span>
          <h1 className="mt-2 text-lg font-bold">Tu perfil aún no es público</h1>
          <p className="mt-1 text-sm text-slate-500">
            {organization.tradeName} todavía no aparece en FIVERTEN. Actívalo en{' '}
            <strong>Empresa → Mostrar el perfil de la empresa públicamente</strong> y guarda los
            cambios.
          </p>
          <Link
            href="/dashboard/company"
            className="mt-5 inline-flex rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Ir a los datos de la empresa
          </Link>
        </div>
      </PublicShell>
    );
  }

  if (error) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-slate-300">storefront</span>
          <h1 className="mt-2 text-lg font-bold">
            {error === 'not_found' ? 'Empresa no encontrada' : 'No se pudo cargar el perfil'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {error === 'not_found'
              ? 'Puede que el perfil no exista o que la empresa aún no lo haya hecho público.'
              : 'Inténtalo de nuevo en unos minutos.'}
          </p>
        </div>
      </PublicShell>
    );
  }

  if (!profile) {
    return (
      <PublicShell>
        <div className="flex items-center gap-3 text-sm text-slate-500">Cargando perfil…</div>
      </PublicShell>
    );
  }

  const pages = reviews ? Math.max(1, Math.ceil(reviews.total / PAGE_SIZE)) : 1;

  return (
    <PublicShell>
      <PublicHero profile={profile} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <RatingBreakdown rating={profile.rating} selected={rating} onSelect={selectRating} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Información
            </h2>
            {profile.description && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {profile.description}
              </p>
            )}
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
              {profile.website && (
                <li>
                  <a
                    href={
                      profile.website.startsWith('http')
                        ? profile.website
                        : `https://${profile.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group flex items-center gap-3 rounded-lg p-1.5 -m-1.5 transition hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <span className="material-symbols-outlined text-[18px]">language</span>
                    </span>
                    <span className="truncate font-medium text-blue-700 group-hover:underline">
                      {profile.website.replace(/^https?:\/\//, '')}
                    </span>
                  </a>
                </li>
              )}
              {profile.email && (
                <li>
                  <a
                    href={`mailto:${profile.email}`}
                    className="group flex items-center gap-3 rounded-lg p-1.5 -m-1.5 transition hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </span>
                    <span className="truncate group-hover:underline">{profile.email}</span>
                  </a>
                </li>
              )}
              {profile.phone && (
                <li className="flex items-center gap-3 p-1.5 -m-1.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <span className="material-symbols-outlined text-[18px]">call</span>
                  </span>
                  <span>{profile.phone}</span>
                </li>
              )}
              <li className="flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                En FIVERTEN desde {new Date(profile.createdAt).getFullYear()}
              </li>
            </ul>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Opiniones
                <span className="ml-2 text-sm font-medium text-slate-400">
                  {reviews?.total ?? 0}
                </span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value as ReviewPeriod);
                    setPage(1);
                  }}
                  aria-label="Filtrar por fecha"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as ReviewSort);
                    setPage(1);
                  }}
                  aria-label="Ordenar reseñas"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"
              role="group"
              aria-label="Filtrar por estrellas"
            >
              {[null, 5, 4, 3, 2, 1].map((value) => {
                const active = rating === value;
                return (
                  <button
                    key={value ?? 'all'}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectRating(value)}
                    className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-[#2563eb] text-white shadow-sm shadow-blue-600/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {value === null ? (
                      'Todas'
                    ) : (
                      <>
                        {value}
                        <span
                          className={`material-symbols-outlined text-[14px] ${active ? 'text-white' : 'text-amber-400'}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {loadingReviews && !reviews ? (
            <div className="space-y-4" aria-busy="true">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : !reviews || reviews.items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined text-[28px]">
                  {rating || period ? 'filter_alt_off' : 'rate_review'}
                </span>
              </span>
              <p className="mt-4 text-base font-semibold text-slate-900">
                {rating || period ? 'No hay reseñas con estos filtros' : 'Todavía no hay reseñas'}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {rating || period
                  ? 'Prueba con otro periodo o quita el filtro de estrellas.'
                  : '¡Sé el primero en contar tu experiencia!'}
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
                    companyName={profile.tradeName}
                    response={review.response}
                  >
                    <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                      {reportedIds.includes(review.id) ? (
                        <span className="text-xs text-slate-400">
                          Gracias, nuestro equipo revisará esta reseña.
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
                  <Pagination
                    summary={`${reviews.total} reseñas`}
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

      {reportingId && (
        <ReportReviewModal
          intro="Si incumple nuestras políticas, la retiraremos. La empresa no puede ocultar reseñas por sí misma."
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
