'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnalyticsTracker from '../../../components/public/AnalyticsTracker';
import CompanyPageSkeleton from '../../../components/public/CompanyPageSkeleton';
import HomeHeader from '../../../components/public/HomeHeader';
import PublicFooter from '../../../components/public/PublicFooter';
import ReviewCard from '../../../components/reviews/ReviewCard';
import {
  VERIFICATION_CATEGORIES,
  VERIFICATION_STATUS,
  formatVerificationDate,
} from '../../../components/public/verification-labels';
import {
  ApiError,
  api,
  resolveAssetUrl,
  type Paginated,
  type PublicProfile,
  type PublicReview,
  type PublicVerification,
} from '../../../lib/api';

const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85';

function yearOf(value: string | null): string {
  return value ? String(new Date(value).getFullYear()) : '—';
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
}

/** Convierte un enlace de YouTube o Vimeo en la URL de su reproductor. */
function videoEmbedUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const url = parseUrl(value);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    const match = /^\/(?:embed|shorts|live)\/([\w-]+)/.exec(url.pathname);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = /(\d{6,})/.exec(url.pathname);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  return null;
}

function isVideoFile(value: string): boolean {
  return /\.(mp4|webm|ogg|ogv|mov|m4v)([?#]|$)/i.test(value);
}

function isImageUrl(value: string): boolean {
  return (
    /\.(jpe?g|png|webp|avif|gif|svg)([?#]|$)/i.test(value) || value.includes('/api/media/files/')
  );
}

function yearsSince(value: string): number {
  return Math.max(0, new Date().getFullYear() - new Date(value).getFullYear());
}

export default function PublicProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [verification, setVerification] = useState<PublicVerification | null>(null);
  const [reviews, setReviews] = useState<Paginated<PublicReview> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    Promise.all([
      api.publicProfile(slug),
      api.publicVerification(slug).catch(() => null),
      api.publicReviews(slug, { page: 1, pageSize: 3, sort: 'recent' }).catch(() => null),
    ])
      .then(([profileData, verificationData, reviewData]) => {
        if (!active) return;
        setProfile(profileData);
        setVerification(verificationData);
        setReviews(reviewData);
        document.title = `${profileData.tradeName} · Perfil verificado | FIVERTEN`;
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError && err.status === 404 ? 'not_found' : 'error');
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.tradeName ?? 'FIVERTEN', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 2000);
      }
    } catch {
      setShared(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <HomeHeader />
        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 pt-24">
          <div className="w-full rounded-xl border border-slate-200 bg-white p-10 text-center">
            <span className="material-symbols-outlined text-[42px] text-slate-300">storefront</span>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              {error === 'not_found' ? 'Empresa no encontrada' : 'No se pudo cargar el perfil'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {error === 'not_found'
                ? 'Puede que el perfil no exista o que la empresa aún no lo haya hecho público.'
                : 'Inténtalo de nuevo en unos minutos.'}
            </p>
            <Link
              href="/empresas"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Volver al directorio
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return <CompanyPageSkeleton />;
  }

  const categories = new Set(verification?.categories ?? []);
  const status =
    VERIFICATION_STATUS[verification?.status ?? 'not_verified'] ?? VERIFICATION_STATUS.not_verified;
  const projects = verification?.projects ?? [];
  const certifications = verification?.certifications ?? [];
  const activeYears = yearsSince(profile.createdAt);
  const identityVerified = categories.has('identity');
  const contactHref = profile.email
    ? `mailto:${profile.email}`
    : profile.phone
      ? `tel:${profile.phone}`
      : profile.website || '#resumen';

  const matrix = [
    {
      title: 'Identidad legal',
      description: 'Datos registrales y administradores comprobados.',
      ok: identityVerified,
      icon: 'building',
    },
    {
      title: 'Documentación fiscal',
      description: 'CIF/NIF y datos fiscales coincidentes.',
      ok: categories.has('tax'),
      icon: 'document',
    },
    {
      title: 'Domicilio',
      description: 'Domicilio o comprobante de actividad.',
      ok: categories.has('address'),
      icon: 'location',
    },
    {
      title: 'Proyectos y evidencias',
      description: 'Actividad y evidencias revisadas por FIVERTEN.',
      ok: projects.length > 0,
      icon: 'folder',
    },
    {
      title: 'Actividad verificada',
      description: 'Estado de verificación vigente.',
      ok: verification?.status === 'verified',
      icon: 'activity',
    },
  ];

  const timeline = [
    ...(verification?.verifiedAt
      ? [
          {
            date: verification.verifiedAt,
            title: 'Verificación completa',
            text: 'Revisión y validación de la documentación de la empresa.',
          },
        ]
      : []),
    ...(verification?.reviewedAt && verification.reviewedAt !== verification.verifiedAt
      ? [
          {
            date: verification.reviewedAt,
            title: 'Documentación revisada',
            text: 'FIVERTEN revisó la documentación aportada.',
          },
        ]
      : []),
    ...projects.slice(0, 2).map((project) => ({
      date: project.createdAt,
      title: 'Proyecto documentado',
      text: project.name,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F3EF] font-sans text-slate-900 antialiased">
      <AnalyticsTracker slug={slug} />
      <HomeHeader />

      <section className="relative overflow-hidden bg-slate-900 pt-16 text-white">
        <div className="absolute inset-0 z-0">
          <Image
            src={resolveAssetUrl(profile.coverUrl) ?? profile.coverUrl ?? HERO_FALLBACK}
            alt={`Imagen de ${profile.tradeName}`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-7 sm:px-6 lg:px-8">
          <nav className="mb-5 flex items-center space-x-2 text-xs text-slate-400">
            <Link href="/empresas" className="hover:text-slate-200">
              Empresas
            </Link>
            <span>&gt;</span>
            <span className="font-medium text-slate-300">{profile.tradeName}</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start space-x-5 sm:items-center">
              <div className="relative flex h-20 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-md sm:h-24 sm:w-24">
                {profile.logoUrl ? (
                  <Image
                    src={resolveAssetUrl(profile.logoUrl) ?? profile.logoUrl}
                    alt={`Logo de ${profile.tradeName}`}
                    fill
                    sizes="96px"
                    className="object-contain p-2"
                  />
                ) : (
                  <>
                    <span className="text-xl font-black tracking-tighter sm:text-2xl">
                      {profile.tradeName.slice(0, 4).toUpperCase()}
                    </span>
                    <span className="mt-0.5 text-[7px] font-semibold uppercase tracking-wider text-slate-500">
                      FIVERTEN
                    </span>
                  </>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {profile.tradeName}
                  </h1>
                  {profile.verified && <VerifiedSeal className="h-8 w-8" />}
                  <span className="inline-flex items-center rounded bg-blue-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {profile.verified ? 'Verified company' : 'Perfil público'}
                  </span>
                </div>
                <p className="mb-3 text-xs font-normal text-slate-300 sm:text-sm">
                  {[profile.sector?.name, profile.country?.name].filter(Boolean).join(' · ') ||
                    'Empresa en FIVERTEN'}
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
                  {profile.country && (
                    <span className="flex items-center gap-1.5">
                      <LocationIcon className="h-3.5 w-3.5 text-slate-400" />
                      {profile.country.name}
                    </span>
                  )}
                  {verification?.organization.publicId && (
                    <span className="flex items-center gap-1.5">
                      <DocumentIcon className="h-3.5 w-3.5 text-slate-400" />
                      ID de verificación{' '}
                      <strong className="font-mono font-medium text-slate-200">
                        {verification.organization.publicId}
                      </strong>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                    Última verificación{' '}
                    <strong className="font-mono font-medium text-slate-200">
                      {formatVerificationDate(verification?.verifiedAt ?? null)}
                    </strong>
                  </span>
                  {profile.verified && (
                    <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
                      Identidad verificada
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-start lg:self-center">
              <a
                href={contactHref}
                data-fv-event="contact_click"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <MailIcon className="h-3.5 w-3.5" />
                Contactar
              </a>
              <button
                type="button"
                onClick={() => void share()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80"
              >
                <ShareIcon className="h-3.5 w-3.5" />
                {shared ? 'Enlace copiado' : 'Compartir'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[64px] z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-7 overflow-x-auto text-xs font-medium text-slate-600">
            {[
              ['resumen', 'Resumen'],
              ['documentacion', 'Documentación'],
              ['proyectos', 'Proyectos'],
              ['opiniones', 'Opiniones'],
              ['certificaciones', 'Certificaciones'],
            ].map(([id, label], index) => (
              <a
                key={id}
                href={`#${id}`}
                className={`shrink-0 border-b-2 py-3.5 transition-colors ${
                  index === 0
                    ? 'border-blue-600 font-semibold text-blue-700'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <article
              id="resumen"
              className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm"
            >
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <h2 className="mb-3 text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                      Descripción
                    </h2>
                    <p className="mb-6 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                      {profile.description ||
                        'Empresa con perfil público y verificación en FIVERTEN.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href={contactHref}
                      data-fv-event="contact_click"
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      <MailIcon className="h-3.5 w-3.5" />
                      Contactar
                    </a>
                    {profile.website && (
                      <a
                        href={
                          profile.website.startsWith('http')
                            ? profile.website
                            : `https://${profile.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        data-fv-event="website_click"
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                      >
                        <ExternalIcon className="h-3.5 w-3.5 text-slate-500" />
                        Visitar web
                      </a>
                    )}
                  </div>
                </div>

                <PresentationMedia
                  url={profile.presentationUrl}
                  coverUrl={profile.coverUrl}
                  tradeName={profile.tradeName}
                  website={profile.website}
                />
              </div>
            </article>

            <article className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="h-6 w-6 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-900">
                    {profile.verified ? 'Identidad verificada' : 'Estado de verificación'}
                  </h3>
                </div>
                <div
                  className={`flex items-center space-x-2 rounded-md border px-3 py-2 text-xs ${
                    profile.verified
                      ? 'border-emerald-100 bg-emerald-50'
                      : 'border-amber-100 bg-amber-50'
                  }`}
                >
                  <ShieldCheckIcon
                    className={`h-4 w-4 ${profile.verified ? 'text-emerald-600' : 'text-amber-600'}`}
                  />
                  <div>
                    <p
                      className={`text-[11px] font-semibold leading-tight ${
                        profile.verified ? 'text-emerald-900' : 'text-amber-900'
                      }`}
                    >
                      {profile.verified ? 'Empresa verificada por FIVERTEN' : status.label}
                    </p>
                    <p
                      className={`text-[10px] leading-tight ${
                        profile.verified ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {status.help}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {matrix.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded text-slate-600">
                          <MatrixIcon name={item.icon} />
                        </span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            item.ok ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <h4 className="text-[11px] font-bold leading-snug text-slate-900">
                        {item.title}
                      </h4>
                      <div
                        className={`mt-0.5 mb-1.5 flex items-center gap-1 text-[10px] font-semibold ${
                          item.ok ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        <span>{item.ok ? '✔' : '—'}</span>
                        <span>{item.ok ? 'Verificado' : 'No consta'}</span>
                      </div>
                    </div>
                    <p className="text-[10px] leading-snug text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article
              id="proyectos"
              className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderIcon className="h-4 w-4 text-slate-700" />
                  <h3 className="text-base font-bold text-slate-900">Proyectos verificados</h3>
                </div>
                <Link
                  href={`/empresa/${slug}/proyectos`}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-700"
                >
                  Ver todos los proyectos <span>→</span>
                </Link>
              </div>
              {projects.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Esta empresa todavía no tiene proyectos públicos.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {projects.slice(0, 3).map((project) => (
                    <div
                      key={project.id}
                      className="group overflow-hidden rounded-lg border border-slate-200 transition hover:shadow-md"
                    >
                      <div className="relative h-28 overflow-hidden bg-slate-100">
                        <Image
                          src={
                            resolveAssetUrl(profile.coverUrl) ?? profile.coverUrl ?? HERO_FALLBACK
                          }
                          alt={project.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 250px"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-slate-800 shadow-sm backdrop-blur-sm">
                          <span className="text-emerald-500">✔</span> VERIFICADO
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="line-clamp-1 text-xs font-bold leading-snug text-slate-900">
                          {project.name}
                        </h4>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                          {project.description && (
                            <span className="line-clamp-1 w-full">{project.description}</span>
                          )}
                          {(project.projectType || project.city) && (
                            <span className="flex items-center gap-1">
                              <FolderIcon className="h-3 w-3 text-slate-400" />
                              {[project.projectType?.replaceAll('_', ' '), project.city]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3 text-slate-400" />
                            {project.year ?? yearOf(project.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FolderIcon className="h-3 w-3 text-slate-400" />
                            {project.evidenceCount} evidencia
                            {project.evidenceCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:underline"
                          >
                            Ver proyecto <ExternalIcon className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article
              id="documentacion"
              className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Documentación comprobada</h3>
                <Link
                  href={`/empresa/${slug}/documentacion`}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-700"
                >
                  Ver documentación →
                </Link>
              </div>
              {verification && verification.categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {verification.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                    >
                      <span className="material-symbols-outlined text-[15px]">verified</span>
                      {VERIFICATION_CATEGORIES[category] ?? category}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No hay categorías documentales verificadas actualmente.
                </p>
              )}
            </article>

            <article
              id="opiniones"
              className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Opiniones verificadas
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    {profile.rating.total}
                  </span>
                </h3>
                <Link
                  href={`/empresa/${slug}/opiniones`}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-700"
                >
                  Ver todas →
                </Link>
              </div>
              {!reviews || reviews.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Todavía no hay opiniones publicadas.
                </p>
              ) : (
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
                    />
                  ))}
                </div>
              )}
            </article>

            <article
              id="certificaciones"
              className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Certificaciones</h3>
                <Link
                  href={`/empresa/${slug}/certificaciones`}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-700"
                >
                  Ver certificaciones →
                </Link>
              </div>
              {certifications.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay certificaciones externas verificadas.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {certifications.map((certification) => (
                    <li
                      key={certification.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{certification.name}</p>
                        <p className="text-xs text-slate-500">{certification.issuer}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatVerificationDate(certification.issuedAt)}
                          {certification.expiresAt
                            ? ` · Válida hasta ${formatVerificationDate(certification.expiresAt)}`
                            : ''}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-emerald-600">verified</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Datos clave</h3>
                <BuildingIcon className="h-4 w-4 text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <KeyMetric
                  value={`${activeYears}+`}
                  label="Años de actividad"
                  detail={`Desde ${new Date(profile.createdAt).getFullYear()}`}
                  icon="calendar"
                />
                <KeyMetric
                  value={String(projects.length)}
                  label="Proyectos verificados"
                  detail="en FIVERTEN"
                  icon="folder"
                />
                <KeyMetric
                  value={String(profile.rating.total)}
                  label="Opiniones"
                  detail="de clientes reales"
                  icon="star"
                />
                <KeyMetric
                  value={String(verification?.documentsCount ?? 0)}
                  label="Documentos comprobados"
                  detail="y validados"
                  icon="document"
                />
              </div>
            </div>

            {profile.locations && profile.locations.length > 0 && (
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Ubicaciones</h3>
                  <LocationIcon className="h-4 w-4 text-slate-400" />
                </div>
                <ul className="space-y-3">
                  {profile.locations.map((location) => (
                    <li key={location.id} className="text-xs">
                      <p className="font-bold text-slate-800">
                        {location.label}
                        {location.isPrimary && (
                          <span className="ml-2 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                            Principal
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                        {[
                          location.addressLine,
                          location.city,
                          location.postalCode,
                          location.country,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Sin dirección pública'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Estado de verificación</h3>
                <div className="seal-badge flex h-10 w-10 flex-col items-center justify-center rounded-full border border-slate-300 p-1 text-center">
                  <span className="text-[6px] font-bold uppercase leading-none tracking-widest text-slate-600">
                    FIVERTEN
                  </span>
                  <span className="my-0.5 text-[10px] font-black leading-none text-slate-800">
                    V
                  </span>
                  <span className="text-[5px] font-bold uppercase leading-none tracking-widest text-slate-500">
                    VERIFIED
                  </span>
                </div>
              </div>
              <div className="space-y-3.5 text-xs">
                <StatusRow
                  ok={identityVerified}
                  title="Identidad verificada"
                  text="Datos registrales y administradores"
                  href={`/empresa/${slug}/documentacion`}
                />
                <StatusRow
                  ok={categories.has('tax') || categories.has('address')}
                  title="Documentación comprobada"
                  text="Datos fiscales y domicilio"
                  href={`/empresa/${slug}/documentacion`}
                />
                <StatusRow
                  ok={projects.length > 0}
                  title="Actividad verificada"
                  text="Proyectos y evidencias"
                  href={`/empresa/${slug}/proyectos`}
                />
                <StatusRow
                  ok={profile.verified}
                  title="Sin incidencias"
                  text="Estado de verificación vigente"
                  href={`/empresa/${slug}/certificaciones`}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-1.5">
                  <ClockIcon className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">Últimos eventos</h3>
                </div>
              </div>
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500">Sin eventos públicos registrados.</p>
              ) : (
                <div className="space-y-4 text-xs">
                  {timeline.map((event, index) => (
                    <div
                      key={`${event.date}-${event.title}-${index}`}
                      className="flex items-start space-x-3"
                    >
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      <div className="flex-grow">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-[10px] font-bold text-slate-400">
                            {formatVerificationDate(event.date)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800">
                            {event.title}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                          {event.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function PresentationMedia({
  url,
  coverUrl,
  tradeName,
  website,
}: {
  url: string | null | undefined;
  coverUrl: string | null;
  tradeName: string;
  website: string | null;
}) {
  // Solo se renderizan URLs absolutas http(s) o rutas internas de medios.
  const safeUrl = url && /^(https?:\/\/|\/)/i.test(url) ? url : null;
  const embed = videoEmbedUrl(safeUrl);
  if (embed) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-inner">
        <iframe
          src={embed}
          title={`Vídeo de presentación de ${tradeName}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (safeUrl && isVideoFile(safeUrl)) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-inner">
        <video
          src={safeUrl}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        >
          Tu navegador no puede reproducir este vídeo.
        </video>
      </div>
    );
  }

  if (safeUrl && isImageUrl(safeUrl)) {
    const src = resolveAssetUrl(safeUrl) ?? safeUrl;
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner"
      >
        <Image
          src={src}
          alt={`Imagen de presentación de ${tradeName}`}
          fill
          sizes="(max-width: 768px) 100vw, 500px"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </a>
    );
  }

  // Sin imagen o vídeo propio: portada enlazada a la web de la empresa.
  return (
    <a
      href={website || '#proyectos'}
      target={website ? '_blank' : undefined}
      rel={website ? 'noopener noreferrer nofollow' : undefined}
      data-fv-event={website ? 'website_click' : undefined}
      className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-inner"
    >
      <Image
        src={resolveAssetUrl(coverUrl) ?? coverUrl ?? HERO_FALLBACK}
        alt={`Presentación de ${tradeName}`}
        fill
        sizes="(max-width: 768px) 100vw, 500px"
        className="object-cover transition duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex items-end bg-slate-900/30 p-3">
        <span className="flex items-center space-x-2 rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition group-hover:bg-black/90">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white pl-0.5 text-black">
            <PlayIcon className="h-2.5 w-2.5 fill-current" />
          </span>
          <span>Ver presentación de la empresa</span>
        </span>
      </div>
    </a>
  );
}

function VerifiedSeal({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <Image
      src="/sello-fiverten-verificado.png"
      alt="Empresa verificada por FIVERTEN"
      width={512}
      height={512}
      className={className}
    />
  );
}

function KeyMetric({
  value,
  label,
  detail,
  icon,
}: {
  value: string;
  label: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-slate-600">
        <MatrixIcon name={icon} />
      </span>
      <div className="text-lg font-bold leading-none text-slate-900">{value}</div>
      <div className="text-[11px] font-semibold leading-tight text-slate-700">{label}</div>
      <div className="text-[10px] text-slate-400">{detail}</div>
    </div>
  );
}

function StatusRow({
  ok,
  title,
  text,
  href,
}: {
  ok: boolean;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start space-x-2">
        <span className={`mt-0.5 ${ok ? 'text-emerald-500' : 'text-slate-300'}`}>
          <ShieldCheckIcon className="h-4 w-4" />
        </span>
        <div>
          <h4 className="text-[11px] font-bold leading-tight text-slate-800">{title}</h4>
          <p className="text-[10px] text-slate-500">{text}</p>
        </div>
      </div>
      <Link
        href={href}
        className="whitespace-nowrap text-[10px] font-semibold text-blue-700 hover:text-blue-700"
      >
        Ver detalles →
      </Link>
    </div>
  );
}

function MatrixIcon({ name }: { name: string }) {
  if (name === 'building') return <BuildingIcon className="h-4 w-4" />;
  if (name === 'document') return <DocumentIcon className="h-4 w-4" />;
  if (name === 'location') return <LocationIcon className="h-4 w-4" />;
  if (name === 'folder') return <FolderIcon className="h-4 w-4" />;
  if (name === 'activity') return <ActivityIcon className="h-4 w-4" />;
  if (name === 'calendar') return <CalendarIcon className="h-4 w-4" />;
  if (name === 'star') return <StarIcon className="h-4 w-4" />;
  return <ShieldCheckIcon className="h-4 w-4" />;
}

function BuildingIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function DocumentIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function LocationIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function FolderIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ActivityIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CalendarIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function StarIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MailIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ShareIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ExternalIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PlayIcon({ className = 'h-2.5 w-2.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ClockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
