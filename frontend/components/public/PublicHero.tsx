import Link from 'next/link';
import type { PublicProfile } from '../../lib/api';
import { formatRating, Stars } from '../reviews/Stars';

/**
 * Cabecera corta del perfil público: portada de la empresa (o un degradado de
 * marca si no ha subido ninguna), logo superpuesto y resumen de su reputación.
 */
export default function PublicHero({ profile }: { profile: PublicProfile }) {
  const { rating } = profile;
  const initial = profile.tradeName.trim()[0]?.toUpperCase() ?? '?';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Portada */}
      <div className="relative h-36 sm:h-44 lg:h-48">
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#0b101b] via-[#13213f] to-[#2563eb]"
          >
            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#2563eb]/40 blur-3xl" />
            <div className="absolute -bottom-20 left-1/4 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>
        )}
        {/* Velo para que la portada nunca compita con el contenido */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-transparent to-slate-900/10"
        />

        {rating.average !== null && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-md sm:right-5 sm:top-5">
            <span
              className="material-symbols-outlined text-[18px] text-amber-300"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="text-sm font-bold">{formatRating(rating.average)}</span>
            <span className="text-xs text-white/80">/ 5</span>
          </div>
        )}
      </div>

      {/* Identidad */}
      <div className="relative px-5 pb-6 sm:px-8">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:-mt-14">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white p-1 shadow-lg ring-4 ring-white sm:h-28 sm:w-28">
              {profile.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logoUrl}
                  alt={`Logo de ${profile.tradeName}`}
                  className="h-full w-full rounded-xl object-contain"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] text-4xl font-bold text-white sm:text-5xl">
                  {initial}
                </span>
              )}
            </div>

            {/* En escritorio el texto arranca justo debajo de la portada (el logo la solapa 3,5 rem). */}
            <div className="min-w-0 sm:pt-[4.25rem]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {profile.tradeName}
                </h1>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    Empresa verificada
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Stars rating={rating.average ?? 0} size={18} />
                  {rating.average !== null && (
                    <strong className="text-slate-900">{formatRating(rating.average)}</strong>
                  )}
                </span>
                <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
                <span>
                  {rating.total} {rating.total === 1 ? 'reseña' : 'reseñas'}
                </span>
              </div>
            </div>
          </div>

          <Link
            href={`/review/${profile.slug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-600 hover:shadow-lg lg:mt-[4.25rem] lg:w-auto"
          >
            <span className="material-symbols-outlined text-[20px]">rate_review</span>
            Escribir una reseña
          </Link>
        </div>
      </div>
    </section>
  );
}
