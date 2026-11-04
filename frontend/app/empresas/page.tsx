'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PublicShell from '../../components/public/PublicShell';
import { Stars } from '../../components/reviews/Stars';
import Pagination from '../../components/ui/Pagination';
import {
  ApiError,
  api,
  resolveAssetUrl,
  type Paginated,
  type PublicCatalogs,
  type PublicOrganizationSummary,
} from '../../lib/api';

const PAGE_SIZE = 12;

export default function CompaniesDirectoryPage() {
  const [data, setData] = useState<Paginated<PublicOrganizationSummary> | null>(null);
  const [catalogs, setCatalogs] = useState<PublicCatalogs | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [verified, setVerified] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('search') ?? '';
    setSearchInput(initial);
    setSearch(initial);
    const initialSector = params.get('sector');
    if (initialSector) setSector(initialSector);
    const initialCountry = params.get('country');
    if (initialCountry) setCountry(initialCountry);
    setVerified(params.get('verified') === 'true');
  }, []);

  useEffect(() => {
    api.publicCatalogs().then(setCatalogs).catch(() => setCatalogs(null));
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
          page,
          pageSize: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el directorio');
    } finally {
      setLoading(false);
    }
  }, [search, sector, country, verified, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <PublicShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold text-slate-900">Directorio de empresas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Busca empresas verificadas, consulta su reputación y lee experiencias reales.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <form onSubmit={onSearch} className="flex flex-wrap gap-2">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nombre o servicio…"
              aria-label="Buscar empresa"
              className="min-w-56 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <select
              value={sector}
              onChange={(event) => {
                setSector(event.target.value);
                setPage(1);
              }}
              aria-label="Categoría"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todas las categorías</option>
              {catalogs?.sectors.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setPage(1);
              }}
              aria-label="País"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todos los países</option>
              {catalogs?.countries.map((item) => (
                <option key={item.id} value={item.iso2}>
                  {item.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={verified}
                onChange={(event) => {
                  setVerified(event.target.checked);
                  setPage(1);
                }}
              />
              Solo verificadas
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              Buscar
            </button>
          </form>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Cargando empresas…</p>
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <span className="material-symbols-outlined text-[36px] text-slate-300">storefront</span>
            <p className="mt-2 text-base font-semibold text-slate-900">No hay empresas con estos filtros</p>
            <p className="mt-1 text-sm text-slate-500">Prueba a cambiar la búsqueda o quitar filtros.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((item) => (
                <Link
                  key={item.slug}
                  href={`/empresa/${item.slug}`}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {item.logoUrl ? (
                        <Image
                          src={resolveAssetUrl(item.logoUrl) ?? item.logoUrl}
                          alt={`Logo de ${item.tradeName}`}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] text-lg font-bold text-white">
                          {item.tradeName[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-sm font-bold text-slate-900">{item.tradeName}</h2>
                        {item.verified && (
                          <span className="material-symbols-outlined text-[16px] text-emerald-600">
                            verified
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {[item.sector?.name, item.country?.name].filter(Boolean).join(' · ') ||
                          'Sin categoría'}
                      </p>
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Stars rating={item.rating.average ?? 0} size={15} />
                    <span className="text-xs font-semibold text-slate-700">
                      {item.rating.average?.toFixed(1) ?? '—'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.rating.total} {item.rating.total === 1 ? 'reseña' : 'reseñas'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {pages > 1 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
      </div>
    </PublicShell>
  );
}
