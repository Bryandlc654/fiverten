'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Pagination from '../../../components/ui/Pagination';
import PublicShell from '../../../components/public/PublicShell';
import RatingBreakdown from '../../../components/reviews/RatingBreakdown';
import ReportReviewModal from '../../../components/reviews/ReportReviewModal';
import ReviewCard from '../../../components/reviews/ReviewCard';
import { formatRating, Stars } from '../../../components/reviews/Stars';
import { ApiError, api, type Paginated, type PublicProfile, type PublicReview } from '../../../lib/api';
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
          <span className="material-symbols-outlined text-[40px] text-amber-500">visibility_off</span>
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
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Cargando perfil…
        </div>
      </PublicShell>
    );
  }

  const pages = reviews ? Math.max(1, Math.ceil(reviews.total / PAGE_SIZE)) : 1;

  return (
    <PublicShell>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {profile.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="" className="h-40 w-full object-cover sm:h-52" />
        )}
        <div className="flex flex-wrap items-center justify-between gap-5 p-6">
          <div className="flex min-w-0 items-center gap-4">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt={profile.tradeName}
                className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-2xl font-bold text-white">
                {profile.tradeName[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{profile.tradeName}</h1>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    Empresa verificada
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Stars rating={profile.rating.average ?? 0} size={16} />
                <span>
                  {profile.rating.average !== null
                    ? `${formatRating(profile.rating.average)} · `
                    : ''}
                  {profile.rating.total} {profile.rating.total === 1 ? 'reseña' : 'reseñas'}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/review/${profile.slug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <span className="material-symbols-outlined text-[18px]">rate_review</span>
            Escribir una reseña
          </Link>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="space-y-4">
          <RatingBreakdown rating={profile.rating} selected={rating} onSelect={selectRating} />

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="text-base font-bold text-slate-900">Sobre la empresa</h2>
            {profile.description && (
              <p className="mt-2 whitespace-pre-line text-slate-600">{profile.description}</p>
            )}
            <ul className="mt-3 space-y-2 text-slate-600">
              {profile.website && (
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">language</span>
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="truncate text-blue-600 hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              )}
              {profile.email && (
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">mail</span>
                  <a href={`mailto:${profile.email}`} className="truncate hover:underline">
                    {profile.email}
                  </a>
                </li>
              )}
              {profile.phone && (
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">call</span>
                  {profile.phone}
                </li>
              )}
              <li className="flex items-center gap-2 text-xs text-slate-400">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                En FIVERTEN desde {new Date(profile.createdAt).getFullYear()}
              </li>
            </ul>
          </div>
        </aside>

        <section className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[null, 5, 4, 3, 2, 1].map((value) => (
                <button
                  key={value ?? 'all'}
                  type="button"
                  onClick={() => selectRating(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    rating === value
                      ? 'border-[#2563eb] bg-[#2563eb] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {value === null ? 'Todas' : `${value} ★`}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as ReviewPeriod);
                  setPage(1);
                }}
                aria-label="Filtrar por fecha"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
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
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingReviews && !reviews ? (
            <p className="text-sm text-slate-500">Cargando reseñas…</p>
          ) : !reviews || reviews.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {rating || period
                ? 'No hay reseñas con estos filtros.'
                : 'Todavía no hay reseñas. ¡Sé el primero en opinar!'}
            </div>
          ) : (
            <>
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
                  <div className="mt-3 flex justify-end">
                    {reportedIds.includes(review.id) ? (
                      <span className="text-xs text-slate-400">
                        Gracias, nuestro equipo revisará esta reseña.
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReportingId(review.id)}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-red-600"
                      >
                        <span className="material-symbols-outlined text-[15px]">flag</span>
                        Reportar
                      </button>
                    )}
                  </div>
                </ReviewCard>
              ))}
              {pages > 1 && (
                <div className="rounded-xl border border-slate-200 bg-white">
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
