'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import HomeHeader from '../../../../components/public/HomeHeader';
import PublicFooter from '../../../../components/public/PublicFooter';
import ReportReviewModal from '../../../../components/reviews/ReportReviewModal';
import Pagination from '../../../../components/ui/Pagination';
import {
  ApiError,
  api,
  resolveAssetUrl,
  type Paginated,
  type PublicProfile,
  type PublicReview,
} from '../../../../lib/api';

const PAGE_SIZE = 10;

const PROJECT_TYPES: Record<string, string> = {
  reforma_integral: 'Reforma integral',
  obra_nueva: 'Obra nueva',
  rehabilitacion: 'Rehabilitación',
  instalacion: 'Instalación',
  consultoria: 'Consultoría',
  otro: 'Otro',
};

const EVIDENCE_LABELS: Record<string, string> = {
  contract: 'Contrato validado',
  budget: 'Presupuesto validado',
  invoice: 'Factura validada',
  photos: 'Fotografías verificadas',
  certificate: 'Certificado validado',
  act: 'Acta validada',
  other: 'Evidencia validada',
};

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function PublicReviewsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Paginated<PublicReview> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState('');
  const [period, setPeriod] = useState('');
  const [projectType, setProjectType] = useState('');
  const [clientStatus, setClientStatus] = useState('');
  const [sort, setSort] = useState('recent');
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
        rating: rating ? Number(rating) : undefined,
        period: period || undefined,
        projectType: projectType || undefined,
        clientStatus: clientStatus || undefined,
        sort: sort as 'recent' | 'oldest' | 'highest' | 'lowest',
        page,
        pageSize: PAGE_SIZE,
      })
      .then(setReviews)
      .catch(() => setReviews(null))
      .finally(() => setLoading(false));
  }, [slug, rating, period, projectType, clientStatus, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  function resetFilters() {
    setRating('');
    setPeriod('');
    setProjectType('');
    setClientStatus('');
    setSort('recent');
    setPage(1);
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <HomeHeader />
        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 pt-24">
          <p className="text-sm text-slate-600">
            {error === 'not_found' ? 'Empresa no encontrada.' : 'No se pudo cargar la información.'}
          </p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <HomeHeader />
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 pt-24">
          <p className="text-sm text-slate-500">Cargando opiniones…</p>
        </main>
      </div>
    );
  }

  const totalEligible = profile.rating.sampleSize ?? profile.rating.total;
  const distribution = profile.rating.distribution;
  const pages = reviews ? Math.max(1, Math.ceil(reviews.total / PAGE_SIZE)) : 1;
  const projectTypes = Object.keys(PROJECT_TYPES);
  const averageEvidence =
    reviews && reviews.items.length > 0
      ? Math.round(
          (reviews.items.reduce(
            (total, review) => total + (review.project?.evidenceCount ?? 0),
            0,
          ) /
            reviews.items.length) *
            10,
        ) / 10
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800 antialiased">
      <HomeHeader />

      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-r from-[#0d131f] via-[#111927] to-[#141b2d] text-white">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-25 mix-blend-luminosity" style={{ backgroundImage: `url('${resolveAssetUrl(profile.coverUrl) ?? profile.coverUrl ?? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85'}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d131f] via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-400">
            <Link href="/" className="hover:text-gray-200">Inicio</Link>
            <span className="text-gray-600">›</span>
            <Link href="/empresas" className="hover:text-gray-200">Empresas</Link>
            <span className="text-gray-600">›</span>
            <Link href={`/empresa/${slug}`} className="hover:text-gray-200">{profile.tradeName}</Link>
            <span className="text-gray-600">›</span>
            <span className="text-gray-300">Opiniones verificadas</span>
          </nav>

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex items-start space-x-4 sm:items-center sm:space-x-5">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-500/30 bg-[#080d1a] p-3 shadow-xl sm:h-20 sm:w-20">
                {profile.logoUrl ? (
                  <Image
                    src={resolveAssetUrl(profile.logoUrl) ?? profile.logoUrl}
                    alt={`Logo de ${profile.tradeName}`}
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-2xl font-black text-blue-500">
                    {profile.tradeName[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {profile.tradeName}
                  </h1>
                  {profile.verified && <VerifiedIcon />}
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-gray-300">
                  {([profile.sector?.name, profile.country?.name].filter(Boolean) as string[]).map(
                    (item, index) => (
                      <span key={item} className="flex items-center gap-2">
                        {index > 0 && <span className="text-gray-500">•</span>}
                        {item.toUpperCase()}
                      </span>
                    ),
                  )}
                </div>
                {profile.verified && (
                  <span className="inline-flex rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Verified company
                  </span>
                )}
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-300 sm:text-sm">
                  Empresa verificada con identidad, documentación, proyectos y clientes reales.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t border-gray-800 pt-4 sm:gap-8 lg:border-t-0 lg:pt-0">
              <HeroMetric value={totalEligible} label="opiniones verificadas" icon="users" />
              <HeroMetric value={averageEvidence} label="tipos de evidencia por proyecto (media)" icon="document" />
              <HeroMetric value={profile.rating.average?.toFixed(1) ?? '—'} label="valoración media de clientes verificados" icon="star" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-2 sm:px-6 md:flex-row lg:px-8">
          <nav className="flex w-full space-x-6 overflow-x-auto text-xs font-medium text-gray-500 sm:space-x-8 sm:text-sm md:w-auto">
            <Link href={`/empresa/${slug}`} className="border-b-2 border-transparent py-3.5 hover:text-gray-900">Resumen</Link>
            <Link href={`/empresa/${slug}/documentacion`} className="border-b-2 border-transparent py-3.5 hover:text-gray-900">Documentos</Link>
            <Link href={`/empresa/${slug}/proyectos`} className="border-b-2 border-transparent py-3.5 hover:text-gray-900">Proyectos</Link>
            <Link href={`/empresa/${slug}/opiniones`} className="border-b-2 border-blue-600 py-3.5 font-semibold text-blue-600">Opiniones</Link>
            <Link href={`/empresa/${slug}/certificaciones`} className="border-b-2 border-transparent py-3.5 hover:text-gray-900">Certificaciones</Link>
          </nav>
          <div className="flex w-full items-center justify-end space-x-3 pb-2 md:w-auto md:pb-0">
            <Link href={`/empresa/${slug}#contactar`} className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
              Contactar
            </Link>
            <Link href="/verificar-empresa" className="flex items-center space-x-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600">
              <span>Verificar empresa similar</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Opiniones verificadas</span>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                Experiencias reales. Proyectos comprobados.
              </h2>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500 sm:text-sm">
                {totalEligible} opiniones de clientes verificados que han trabajado con {profile.tradeName}.
                Todas las opiniones están vinculadas a proyectos, documentación y clientes reales.
              </p>
            </div>

            <div className="grid grid-cols-1 items-center gap-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-12">
              <div className="md:col-span-7">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Distribución de valoraciones</h3>
                <div className="space-y-1.5 text-xs">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = distribution[star] ?? 0;
                    const percentage = totalEligible > 0 ? (count / totalEligible) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center space-x-2">
                        <span className="w-5 font-medium text-gray-600">{star} <span className="text-[10px]">★</span></span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="w-7 text-right font-medium text-gray-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col items-start justify-center md:col-span-5 md:border-l md:border-gray-200 md:pl-6">
                <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Valoración media</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-extrabold tracking-tight text-gray-900">{profile.rating.average?.toFixed(1) ?? '—'}</span>
                  <span className="text-sm font-medium text-gray-400">/ 5</span>
                </div>
                <BlueStars rating={profile.rating.average ?? 0} />
                <p className="mt-1 text-xs font-medium text-gray-400">
                  Basada en <span className="font-bold text-gray-700">{totalEligible}</span> opiniones verificadas
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FilterSelect label="Tipo de cliente" value={clientStatus} onChange={(value) => { setClientStatus(value); setPage(1); }} options={[
                  ['', 'Todos'], ['identified', 'Identificado'], ['confirmed', 'Confirmado'], ['verified', 'Verificado'],
                ]} />
                <FilterSelect label="Tipo de proyecto" value={projectType} onChange={(value) => { setProjectType(value); setPage(1); }} options={[
                  ['', 'Todos'], ...projectTypes.map((type) => [type, PROJECT_TYPES[type] ?? type] as [string, string]),
                ]} />
                <FilterSelect label="Fecha" value={period} onChange={(value) => { setPeriod(value); setPage(1); }} options={[
                  ['', 'Todas las fechas'], ['30d', 'Último mes'], ['365d', 'Último año'],
                ]} />
                <FilterSelect label="Ordenar" value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[
                  ['recent', 'Más recientes'], ['highest', 'Mejor valoradas'], ['oldest', 'Más antiguas'],
                ]} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-gray-500">{reviews?.total ?? 0} resultados</span>
                <button type="button" onClick={resetFilters} className="text-xs font-semibold text-blue-600 hover:underline">
                  Limpiar filtros
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-48 animate-pulse rounded-xl border border-gray-200 bg-white" />
                ))}
              </div>
            ) : !reviews || reviews.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                <p className="text-base font-semibold text-gray-900">No hay opiniones con estos filtros</p>
                <p className="mt-1 text-sm text-gray-500">Prueba a cambiar los filtros o el periodo.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {reviews.items.map((review) => (
                    <ReviewItem
                      key={review.id}
                      review={review}
                      profile={profile}
                      reported={reportedIds.includes(review.id)}
                      onReport={() => setReportingId(review.id)}
                    />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <Pagination summary={`${reviews.total} opiniones`} page={page} pages={pages} onPage={setPage} />
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-gray-400">Confianza verificada</span>
              <div className="mb-4 flex items-center space-x-3 border-b border-gray-100 pb-3">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0B0F17] p-1.5">
                  {profile.logoUrl ? (
                    <Image src={resolveAssetUrl(profile.logoUrl) ?? profile.logoUrl} alt={profile.tradeName} fill sizes="32px" className="object-contain" />
                  ) : (
                    <span className="text-sm font-bold text-blue-500">{profile.tradeName[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-sm font-bold leading-none text-gray-900">{profile.tradeName}</h4>
                  {profile.verified && <VerifiedIcon className="h-4 w-4" />}
                </div>
              </div>
              <ul className="space-y-3 text-xs font-medium text-gray-600">
                <TrustRow label="Identidad de la empresa verificada" ok={profile.verified} />
                <TrustRow label="Documentación legal comprobada" ok={profile.verified} />
                <TrustRow label="Proyectos verificados con evidencias" ok={reviews?.items.some((review) => review.project) ?? false} />
                <TrustRow label="Clientes reales identificados" ok={totalEligible > 0} />
                <TrustRow label="Opiniones auditadas y trazables" ok={reviews?.items.some((review) => review.verificationState !== 'identified') ?? false} />
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="mb-4 block text-[11px] font-bold uppercase tracking-wider text-gray-400">Cómo se verifica una opinión</span>
              <div className="space-y-4">
                {[
                  ['01', 'Cliente identificado', 'Verificamos la identidad del cliente (DNI, email o teléfono) para garantizar que es real.'],
                  ['02', 'Proyecto confirmado', 'Comprobamos que el proyecto existe mediante contrato, presupuesto o documentación oficial.'],
                  ['03', 'Experiencia verificada', 'La opinión se vincula al proyecto y se revisa para garantizar su autenticidad.'],
                  ['04', 'Publicación y seguimiento', 'Una vez verificada, la opinión se publica y queda trazable en nuestro sistema.'],
                ].map(([number, title, text]) => (
                  <div key={number} className="flex items-start space-x-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 text-xs font-bold text-gray-400">{number}</div>
                    <div className="text-xs">
                      <div className="mb-0.5 font-bold text-gray-900">{title}</div>
                      <p className="leading-snug text-gray-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-xl border border-blue-200/80 bg-blue-50/70 p-4">
              <span className="mt-0.5 shrink-0 text-blue-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              </span>
              <div className="text-xs leading-relaxed">
                <h5 className="mb-1 font-bold text-gray-900">Sin opiniones incentivadas</h5>
                <p className="text-gray-600">
                  En FIVERTEN no se permiten opiniones a cambio de descuentos, regalos o cualquier tipo de incentivo. Todas las opiniones son experiencias reales y auditadas.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />

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
    </div>
  );
}

function ReviewItem({
  review,
  profile,
  reported,
  onReport,
}: {
  review: PublicReview;
  profile: PublicProfile;
  reported: boolean;
  onReport: () => void;
}) {
  const project = review.project;
  const badges = [
    review.verificationState === 'verified' ? 'Experiencia verificada' : null,
    project ? 'Proyecto confirmado' : null,
    'Cliente identificado',
    ...(project?.evidenceTypes ?? []).slice(0, 2).map((type) => EVIDENCE_LABELS[type] ?? 'Evidencia validada'),
  ].filter((badge): badge is string => Boolean(badge));

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-1 items-start space-x-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
            {initials(review.reviewerName)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{review.reviewerName}</span>
              <span className="inline-flex items-center text-[11px] font-semibold text-blue-600">
                <VerifiedIcon className="mr-0.5 h-3.5 w-3.5" />
                {review.verificationState === 'verified'
                  ? 'Cliente verificado'
                  : review.verificationState === 'confirmed'
                    ? 'Cliente confirmado'
                    : 'Cliente identificado'}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {project?.name && <span className="font-medium text-gray-700">{project.name}</span>}
              {project?.city && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center gap-1">
                    <LocationIcon />
                    {project.city}
                  </span>
                </>
              )}
            </div>
            <div className="my-2 flex items-center space-x-2">
              <BlueStars rating={review.rating} />
              <span className="text-xs text-gray-400">{formatDate(review.publishedAt)}</span>
            </div>
            {review.title && <h3 className="mb-1 text-sm font-bold text-gray-900">{review.title}</h3>}
            <p className="mb-3 text-xs leading-relaxed text-gray-700">{review.body}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {badges.map((badge) => (
                <span key={badge} className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  ✓ {badge}
                </span>
              ))}
            </div>
            <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
              {reported ? (
                <span className="text-xs text-gray-400">Gracias, revisaremos esta opinión.</span>
              ) : (
                <button type="button" onClick={onReport} className="text-xs text-gray-400 hover:text-red-600">
                  Reportar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-28">
          <Image
            src={resolveAssetUrl(profile.coverUrl) ?? profile.coverUrl ?? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'}
            alt={project?.name ?? profile.tradeName}
            fill
            sizes="112px"
            className="object-cover"
          />
          {project && (
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              {project.evidenceCount} evid.
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function HeroMetric({ value, label, icon }: { value: number | string; label: string; icon: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className="text-gray-400">
        {icon === 'users' && <UsersIcon />}
        {icon === 'document' && <DocumentIcon />}
        {icon === 'star' && <StarIcon />}
      </div>
      <div>
        <div className="mb-1 text-2xl font-bold leading-none tracking-tight text-white">{value}</div>
        <div className="text-[11px] leading-tight text-gray-400">{label}</div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}

function TrustRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={ok ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
    </li>
  );
}

function BlueStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center space-x-0.5 text-blue-600">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'fill-current' : 'fill-slate-200'}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function VerifiedIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`${className} fill-current text-blue-500`} viewBox="0 0 20 20">
      <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
