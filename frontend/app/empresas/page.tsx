'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import HomeHeader from '../../components/public/HomeHeader';
import PublicFooter from '../../components/public/PublicFooter';
import Pagination from '../../components/ui/Pagination';
import {
  ApiError,
  api,
  resolveAssetUrl,
  type PublicDirectory,
  type PublicOrganizationSummary,
} from '../../lib/api';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'rating', label: 'Mejor valorados' },
] as const;

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CompaniesDirectoryPage() {
  const [data, setData] = useState<PublicDirectory | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [verified, setVerified] = useState(false);
  const [hasProjects, setHasProjects] = useState(false);
  const [hasOpinions, setHasOpinions] = useState(false);
  const [sort, setSort] = useState<'relevance' | 'recent' | 'rating'>('relevance');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('search') ?? '';
    setSearchInput(initial);
    setSearch(initial);
    setSector(params.get('sector') ?? '');
    setCountry(params.get('country') ?? '');
    setVerified(params.get('verified') === 'true');
    setHasProjects(params.get('hasProjects') === 'true');
    setHasOpinions(params.get('hasOpinions') === 'true');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.publicOrganizations({
          search: search || undefined,
          sector: sector || undefined,
          country: country || undefined,
          verified: verified || undefined,
          hasProjects: hasProjects || undefined,
          hasOpinions: hasOpinions || undefined,
          sort,
          page,
          pageSize: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el directorio');
    } finally {
      setLoading(false);
    }
  }, [search, sector, country, verified, hasProjects, hasOpinions, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setSearchInput('');
    setSector('');
    setCountry('');
    setVerified(false);
    setHasProjects(false);
    setHasOpinions(false);
    setSort('relevance');
    setPage(1);
  }

  function toggleSaved(slug: string) {
    setSaved((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const facets = data?.facets;
  const sectors = showAllSectors
    ? (facets?.sectors ?? [])
    : (facets?.sectors ?? []).slice(0, 5);
  const metrics = facets?.metrics;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 antialiased">
      <HomeHeader />

      <section className="relative overflow-hidden bg-[#0d121c] pb-16 pt-28 text-white lg:pt-36">
        <div className="absolute inset-0 z-0 opacity-25">
          <Image
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85"
            alt="Edificios modernos corporativos"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f17] via-[#0b0f17]/90 to-transparent" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Directorio de empresas
              </div>
              <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Empresas verificadas
              </h1>
              <p className="max-w-xl text-sm font-normal leading-relaxed text-slate-300 sm:text-base">
                Descubre empresas verificadas, sus proyectos, opiniones reales y toda la evidencia
                que respalda su reputación.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border border-slate-700/60 bg-[#141b29]/80 p-5 shadow-2xl backdrop-blur-md">
                <Metric
                  value={metrics ? metrics.verifiedCompanies.toLocaleString('es-ES') : '—'}
                  label="Empresas verificadas"
                  icon="building"
                />
                <Metric
                  value={metrics ? metrics.verifiedProjects.toLocaleString('es-ES') : '—'}
                  label="Proyectos verificados"
                  icon="document"
                />
                <Metric
                  value={metrics ? `${metrics.identityVerifiedPercent}%` : '—'}
                  label="Identidades comprobadas"
                  icon="shield"
                />
                <Metric
                  value={metrics ? `+${metrics.countries}` : '—'}
                  label="Países"
                  icon="globe"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-7 mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
          <form
            onSubmit={onSearch}
            className="flex items-center rounded-lg border border-slate-200 bg-white p-1.5 shadow-md lg:col-span-8"
          >
            <div className="pl-3 pr-2 text-slate-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar empresa, sector o ubicación..."
              aria-label="Buscar empresas"
              className="w-full border-none bg-transparent px-1 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none"
            />
            <button
              type="submit"
              className="flex items-center space-x-1.5 whitespace-nowrap rounded-md bg-[#1d63ed] px-6 py-2.5 text-xs font-medium text-white shadow transition hover:bg-blue-600"
            >
              <span>Buscar</span>
              <ArrowIcon />
            </button>
          </form>

          <div className="group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-md transition hover:border-blue-300 lg:col-span-4">
            <div className="z-10 pl-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800">
                <LocationIcon className="h-4 w-4 text-blue-600" />
                <span>Empresas verificadas cerca de ti</span>
              </div>
              <div className="ml-5 mt-0.5 flex items-center space-x-1 text-[11px] font-medium text-blue-600">
                <span>Explora por ubicación</span>
                <span className="text-xs">→</span>
              </div>
            </div>
            <div className="relative flex h-10 w-28 items-center justify-end overflow-hidden pr-2 opacity-80 transition group-hover:opacity-100">
              <div className="absolute inset-0 z-[1] bg-gradient-to-r from-white via-white/40 to-transparent" />
              <div className="relative flex h-full w-24 items-center justify-around overflow-hidden rounded border border-slate-200 bg-slate-100 px-1">
                <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] opacity-30 [background-size:6px_6px]" />
                <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Filtros</h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-normal text-blue-600 hover:text-blue-700 hover:underline"
              >
                Limpiar todo
              </button>
            </div>

            <FilterGroup title="Sector">
              <div className="space-y-2 text-xs">
                {sectors.map((item) => (
                  <label key={item.slug} className="flex cursor-pointer items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={sector === item.slug}
                        onChange={() => {
                          setSector(sector === item.slug ? '' : item.slug);
                          setPage(1);
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={sector === item.slug ? 'font-medium text-slate-700' : 'text-slate-600'}>
                        {item.name}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400">{item.count}</span>
                  </label>
                ))}
              </div>
              {(facets?.sectors.length ?? 0) > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllSectors((value) => !value)}
                  className="mt-2.5 flex items-center space-x-1 text-[11px] text-blue-600 hover:underline"
                >
                  <span>{showAllSectors ? 'Ver menos sectores' : 'Ver más sectores'}</span>
                  <ChevronIcon className={`h-3 w-3 transition ${showAllSectors ? 'rotate-180' : ''}`} />
                </button>
              )}
            </FilterGroup>

            <FilterGroup title="Ubicación" divider>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                  <LocationIcon className="h-3.5 w-3.5" />
                </span>
                <select
                  value={country}
                  onChange={(event) => {
                    setCountry(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Ubicación"
                  className="w-full rounded border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Todas las ubicaciones</option>
                  {facets?.countries.map((item) => (
                    <option key={item.iso2} value={item.iso2}>
                      {item.name} ({item.count})
                    </option>
                  ))}
                </select>
              </div>
            </FilterGroup>

            <FilterGroup title="Estado" divider>
              <div className="space-y-2 text-xs">
                <CheckRow
                  label="Empresa verificada"
                  count={facets?.verifiedCount ?? 0}
                  checked={verified}
                  onChange={() => {
                    setVerified((value) => !value);
                    setPage(1);
                  }}
                />
                <CheckRow
                  label="Con proyectos verificados"
                  count={facets?.withProjects ?? 0}
                  checked={hasProjects}
                  onChange={() => {
                    setHasProjects((value) => !value);
                    setPage(1);
                  }}
                />
                <CheckRow
                  label="Con opiniones verificadas"
                  count={facets?.withOpinions ?? 0}
                  checked={hasOpinions}
                  onChange={() => {
                    setHasOpinions((value) => !value);
                    setPage(1);
                  }}
                />
              </div>
            </FilterGroup>

            <FilterGroup title="Tipo de verificación" divider>
              <div className="space-y-2 text-xs">
                <CheckRow
                  label="Identidad verificada"
                  count={facets?.verifiedCount ?? 0}
                  checked={verified}
                  onChange={() => {
                    setVerified((value) => !value);
                    setPage(1);
                  }}
                />
                <CheckRow
                  label="Documentación comprobada"
                  count={facets?.verifiedCount ?? 0}
                  checked={verified}
                  onChange={() => {
                    setVerified((value) => !value);
                    setPage(1);
                  }}
                />
                <CheckRow
                  label="Proyectos verificados"
                  count={facets?.withProjects ?? 0}
                  checked={hasProjects}
                  onChange={() => {
                    setHasProjects((value) => !value);
                    setPage(1);
                  }}
                />
                <CheckRow
                  label="Opiniones verificadas"
                  count={facets?.withOpinions ?? 0}
                  checked={hasOpinions}
                  onChange={() => {
                    setHasOpinions((value) => !value);
                    setPage(1);
                  }}
                />
              </div>
            </FilterGroup>

            <FilterGroup title="Ordenar por" divider>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as typeof sort);
                  setPage(1);
                }}
                aria-label="Ordenar por"
                className="w-full appearance-none rounded border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterGroup>
          </aside>

          <section className="lg:col-span-9">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-medium text-slate-600">
                <span className="font-bold text-slate-900">
                  {data ? data.total.toLocaleString('es-ES') : '—'}
                </span>{' '}
                empresas encontradas
              </div>
              <div className="flex items-center space-x-1 text-xs">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`flex items-center space-x-1.5 rounded border px-3 py-1 font-medium transition ${
                    view === 'grid'
                      ? 'border-slate-200 bg-white text-slate-800 shadow-sm'
                      : 'border-transparent bg-transparent text-slate-500 hover:bg-white'
                  }`}
                >
                  <GridIcon />
                  <span>Mosaico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`flex items-center space-x-1.5 rounded border px-3 py-1 font-medium transition ${
                    view === 'list'
                      ? 'border-slate-200 bg-white text-slate-800 shadow-sm'
                      : 'border-transparent bg-transparent text-slate-500 hover:bg-white'
                  }`}
                >
                  <ListIcon />
                  <span>Lista</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className={`grid gap-5 ${view === 'grid' ? 'md:grid-cols-2' : ''}`}>
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="text-base font-semibold text-slate-900">
                  No hay empresas con estos filtros
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Prueba a cambiar la búsqueda o quitar filtros.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-md bg-[#1d63ed] px-4 py-2 text-xs font-semibold text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className={`grid gap-5 ${view === 'grid' ? 'md:grid-cols-2' : ''}`}>
                  {data.items.map((item) => (
                    <CompanyCard
                      key={item.slug}
                      item={item}
                      saved={saved.includes(item.slug)}
                      onSave={() => toggleSaved(item.slug)}
                      list={view === 'list'}
                    />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                    <Pagination
                      summary={`${data.total} empresas`}
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
      </main>

      <PublicFooter />
    </div>
  );
}

function CompanyCard({
  item,
  saved,
  onSave,
  list,
}: {
  item: PublicOrganizationSummary;
  saved: boolean;
  onSave: () => void;
  list: boolean;
}) {
  return (
    <article
      className={`flex flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md ${list ? '' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3.5">
          <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-md bg-slate-100">
            {item.coverUrl ? (
              <Image
                src={resolveAssetUrl(item.coverUrl) ?? item.coverUrl}
                alt={`Imagen de ${item.tradeName}`}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-3xl font-black text-blue-300">
                {item.tradeName[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-[#0f172a] text-xs font-bold text-blue-400 shadow-sm">
                  {item.logoUrl ? (
                    <Image
                      src={resolveAssetUrl(item.logoUrl) ?? item.logoUrl}
                      alt={`Logo de ${item.tradeName}`}
                      fill
                      sizes="32px"
                      className="object-contain p-0.5"
                    />
                  ) : (
                    <span className="font-mono text-sm font-black italic">{item.tradeName[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1">
                    <h3 className="truncate text-sm font-bold text-slate-900">{item.tradeName}</h3>
                    {item.verified && <VerifiedIcon className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                  </div>
                  <div className="mt-0.5 inline-flex items-center space-x-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-blue-600">
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      {item.verified ? 'Verified company' : 'Empresa pública'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onSave}
                aria-label={saved ? 'Quitar de guardados' : 'Guardar'}
                className={`p-1 transition ${saved ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <BookmarkIcon filled={saved} />
              </button>
            </div>

            <div className="mt-2 text-[11px] font-medium text-slate-500">
              {[item.sector?.name, item.country?.name].filter(Boolean).join(' · ') || 'Sin categoría'}
            </div>
            <div className="mt-1 flex items-center space-x-1 text-[11px] text-slate-600">
              <LocationIcon className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{item.country?.name ?? 'Ubicación no indicada'}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
              {item.description || 'Empresa verificada en FIVERTEN.'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          <Stat icon="building" value={item.projectsCount} label="Proyectos" />
          <Stat icon="star" value={item.rating.total} label="Opiniones" />
          <Stat icon="document" value={item.documentsCount} label="Documentos" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px]">
        <div className="space-y-0.5 text-slate-400">
          <div>
            VERIFICATION ID{' '}
            <span className="font-mono font-semibold text-slate-600">{item.publicId}</span>
          </div>
          <div className="text-[10px]">
            Última verificación <span className="text-slate-600">{formatDate(item.lastVerifiedAt)}</span>
          </div>
        </div>
        <Link
          href={`/empresa/${item.slug}`}
          className="flex items-center space-x-1 rounded border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
        >
          <span>Ver perfil</span>
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}

function Metric({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="mt-0.5 text-slate-400">
        {icon === 'building' && <BuildingIcon className="h-5 w-5" />}
        {icon === 'document' && <DocumentIcon className="h-5 w-5" />}
        {icon === 'shield' && <ShieldIcon className="h-5 w-5" />}
        {icon === 'globe' && <GlobeIcon className="h-5 w-5" />}
      </div>
      <div>
        <div className="text-lg font-bold leading-tight tracking-tight text-white">{value}</div>
        <div className="text-[11px] text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
  divider,
}: {
  title: string;
  children: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div className={`${divider ? 'border-t border-slate-100 pt-3' : ''} mb-5`}>
      <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>{title}</span>
        <ChevronIcon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className={checked ? 'font-medium text-slate-700' : 'text-slate-600'}>{label}</span>
      </span>
      <span className="text-[11px] text-slate-400">{count}</span>
    </label>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex items-center justify-center space-x-1.5">
      <span className="text-slate-400">
        {icon === 'building' && <BuildingIcon className="h-3.5 w-3.5" />}
        {icon === 'star' && <StarIcon className="h-3.5 w-3.5" />}
        {icon === 'document' && <DocumentIcon className="h-3.5 w-3.5" />}
      </span>
      <div className="text-left">
        <span className="text-xs font-bold text-slate-800">{value.toLocaleString('es-ES')}</span>
        <span className="block text-[10px] leading-tight text-slate-400">{label}</span>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ChevronIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function BuildingIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function DocumentIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function GlobeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function LocationIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function VerifiedIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function StarIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-blue-600" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-slate-400" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" fillRule="evenodd" />
    </svg>
  );
}
