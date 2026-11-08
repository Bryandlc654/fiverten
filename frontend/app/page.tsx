'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HomeHeader from '../components/public/HomeHeader';
import PublicFooter from '../components/public/PublicFooter';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, resolveAssetUrl, type PublicOrganizationSummary } from '../lib/api';

const FAQS = [
  {
    question: '¿La verificación es automática?',
    answer:
      'No. La empresa presenta la información y el equipo de FIVERTEN realiza una revisión humana y documental. La empresa no puede autoverificarse.',
  },
  {
    question: '¿Cuánto tarda la revisión?',
    answer:
      'El plazo indicado para la revisión es de 5 días hábiles, sujeto a que la documentación y las evidencias estén completas.',
  },
  {
    question: '¿Qué pasa si mi sello caduca?',
    answer:
      'El estado del sello se actualiza automáticamente para reflejar que la verificación ya no está vigente. Puedes iniciar la renovación desde 30 días antes del vencimiento.',
  },
  {
    question: '¿Una empresa puede eliminar una reseña?',
    answer:
      'No puede ocultar ni editar reseñas. Puede responder públicamente y reportar contenido para que sea evaluado mediante el proceso de moderación.',
  },
  {
    question: '¿Los documentos de mi empresa son públicos?',
    answer:
      'No. Los documentos de identidad, fiscales y domicilio son privados y solo los revisa el equipo de FIVERTEN.',
  },
];

const BENEFITS = [
  {
    title: 'Verificación real',
    text: 'Revisamos identidad, documentación fiscal y evidencias. Ninguna empresa puede autoverificarse.',
    link: '#metodologia',
    cta: 'Conoce el proceso',
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" />
      </svg>
    ),
  },
  {
    title: 'Opiniones con contexto',
    text: 'Reseñas vinculadas a clientes y experiencias, con estados, evidencias y moderación independiente.',
    link: '#opiniones',
    cta: 'Nuestra política',
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 5h16v12H7l-3 3V5Z" />
        <path d="m8 10 2.5 2.5L16 8" />
      </svg>
    ),
  },
  {
    title: 'Sello dinámico',
    text: 'Si la verificación caduca o se revoca, el sello insertado en tu web refleja el cambio automáticamente.',
    link: '#verificar',
    cta: 'Obtener mi sello',
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 2 14.5 4.5l3.5-.2 1.2 3.3 3 1.9-1.1 3.3 1.1 3.3-3 1.9-1.2 3.3-3.5-.2L12 23l-2.5-2.5-3.5.2-1.2-3.3-3-1.9 1.1-3.3-1.1-3.3 3-1.9L6 3.7l3.5.2L12 2Z" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<PublicOrganizationSummary[]>([]);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const query = search.trim();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('home-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    const elements = document.querySelectorAll('.home-reveal');
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Sugerencias del directorio mientras se escribe, sin salir de la home.
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestionsTotal(0);
      setSearching(false);
      setSearchError(false);
      return;
    }
    setSuggestionsOpen(true);
    setSearching(true);
    setSearchError(false);
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .publicOrganizations({ search: query, page: 1, pageSize: 6, sort: 'relevance' })
        .then((data) => {
          if (!active) return;
          setSuggestions(data.items);
          setSuggestionsTotal(data.total);
        })
        .catch(() => {
          if (!active) return;
          setSuggestions([]);
          setSuggestionsTotal(0);
          setSearchError(true);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
    }
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const value = search.trim();
    if (!value) {
      setSearchMessage('Escribe el nombre de una empresa o un servicio para comenzar.');
      return;
    }
    setSuggestionsOpen(false);
    setSearchMessage(`Mostrando resultados de “${value}” en el directorio.`);
    router.push(`/empresas?search=${encodeURIComponent(value)}`);
  }

  async function copyEmbed() {
    const snippet =
      '<iframe src="https://app-fiverten.onrender.com/sello/EMPRESA_ID" title="Verificación FIVERTEN" width="180" height="220" loading="lazy"></iframe>';
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="home-root min-h-screen bg-paper font-sans text-ink antialiased">
      <HomeHeader />

      <main>
        <section
          id="inicio"
          className="home-noise relative isolate overflow-hidden bg-ink pb-24 pt-36 text-white lg:pb-32 lg:pt-44"
        >
          <div className="absolute inset-0 -z-20">
            <Image
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2200&q=90"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/95 to-ink/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30" />
          </div>
          <div className="home-grid-bg absolute inset-0 -z-10 opacity-40" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.04fr_.96fr] lg:px-8">
            <div className="relative z-10">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-semibold tracking-wide text-aqua">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                </span>
                CONFIANZA QUE SE PUEDE COMPROBAR
              </div>
              <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.055em] sm:text-6xl lg:text-[4rem]">
                Reputación que
                <br />
                <span className="text-aqua">puedes verificar.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
                Reseñas reales. Empresas verificadas. FIVERTEN ayuda a los clientes a decidir con
                confianza y a las empresas a demostrar que son quienes dicen ser.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/empresas"
                  className="home-shine inline-flex items-center justify-center gap-3 rounded-full bg-blue-600 px-7 py-4 font-bold text-white shadow-glow transition hover:-translate-y-1 hover:bg-blue-700"
                >
                  Buscar empresas <span>↗</span>
                </Link>
                <Link
                  href="/verificar-empresa"
                  className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 px-7 py-4 font-semibold text-white transition hover:border-aqua/60 hover:bg-white/5"
                >
                  Verificar mi empresa <span className="text-aqua">→</span>
                </Link>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-7 text-sm text-slate-400">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-aqua"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>{' '}
                  Revisión humana
                </span>
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-aqua"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>{' '}
                  Evidencias documentales
                </span>
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-aqua"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>{' '}
                  Estado transparente
                </span>
              </div>
            </div>

            <div className="relative -mx-5 lg:mx-0 lg:-mr-16 xl:-mr-[calc((100vw-1280px)/2+4rem)]">
              <div className="relative h-[240px] overflow-hidden sm:h-[360px] lg:h-[540px] lg:rounded-l-[2.5rem] xl:h-[600px]">
                <Image
                  src="/hero-perfil-fiverten.png"
                  alt="Perfil público verificado de una empresa en FIVERTEN"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover object-left-top"
                />
              </div>

              <Image
                src="/sello-fiverten-verificado.png"
                alt="Sello FIVERTEN de empresa verificada"
                width={512}
                height={512}
                className="absolute -bottom-6 left-4 h-24 w-24 drop-shadow-[0_18px_35px_rgba(0,0,0,.45)] sm:left-6 sm:h-28 sm:w-28 lg:-left-10 lg:bottom-8 lg:h-32 lg:w-32"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-slate-200 bg-white py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 md:flex-row md:justify-between lg:px-8">
            <p className="shrink-0 text-xs font-bold uppercase tracking-[.18em] text-slate-400">
              La confianza se construye con evidencia
            </p>
            <div className="relative w-full overflow-hidden">
              <div className="home-marquee-track flex w-max items-center gap-12 text-sm font-semibold text-slate-500">
                <span>IDENTIDAD VALIDADA</span>
                <span className="text-aqua">✳</span>
                <span>RESEÑAS CON CONTEXTO</span>
                <span className="text-aqua">✳</span>
                <span>SELLO DINÁMICO</span>
                <span className="text-aqua">✳</span>
                <span>REVISIÓN HUMANA</span>
                <span className="text-aqua">✳</span>
                <span>IDENTIDAD VALIDADA</span>
                <span className="text-aqua">✳</span>
                <span>RESEÑAS CON CONTEXTO</span>
                <span className="text-aqua">✳</span>
                <span>SELLO DINÁMICO</span>
                <span className="text-aqua">✳</span>
                <span>REVISIÓN HUMANA</span>
              </div>
            </div>
          </div>
        </section>

        <section id="directorio" className="bg-white py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="home-reveal mx-auto max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Directorio FIVERTEN
              </span>
              <h2 className="font-display mt-4 text-4xl font-bold tracking-[-.045em] sm:text-5xl">
                Encuentra empresas.
                <br />
                <span className="text-slate-400">Decide con seguridad.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-500">
                Busca por nombre o servicio y descubre perfiles públicos, señales de verificación y
                experiencias de clientes.
              </p>
            </div>
            <div ref={searchBoxRef} className="home-reveal relative z-20 mx-auto mt-10 max-w-3xl">
              <form
                onSubmit={onSearch}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-paper p-2 shadow-card sm:flex-row"
              >
                <div className="flex flex-1 items-center gap-3 px-4">
                  <svg
                    className="h-5 w-5 shrink-0 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSearchMessage('');
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => {
                      if (query.length >= 2) setSuggestionsOpen(true);
                    }}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Busca por nombre o servicio…"
                    className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                    aria-label="Buscar empresas"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestionsOpen && query.length >= 2}
                    aria-controls="home-search-suggestions"
                    autoComplete="off"
                  />
                </div>
                <button
                  className="rounded-xl bg-ink px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
                  type="submit"
                >
                  Buscar <span className="ml-2 text-aqua">→</span>
                </button>
              </form>

              {suggestionsOpen && query.length >= 2 && (
                <div
                  id="home-search-suggestions"
                  className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl"
                  aria-live="polite"
                >
                  {searching && suggestions.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-slate-500">Buscando empresas…</p>
                  ) : searchError ? (
                    <p className="px-4 py-4 text-sm text-red-600">
                      No se pudo buscar ahora mismo. Inténtalo de nuevo.
                    </p>
                  ) : suggestions.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-slate-500">
                      No encontramos empresas para “{query}”. Prueba con otro nombre o servicio.
                    </p>
                  ) : (
                    <>
                      <ul className="divide-y divide-slate-100">
                        {suggestions.map((item) => (
                          <li key={item.slug}>
                            <Link
                              href={`/empresa/${item.slug}`}
                              onClick={() => setSuggestionsOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                            >
                              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700">
                                {item.logoUrl ? (
                                  <Image
                                    src={resolveAssetUrl(item.logoUrl) ?? item.logoUrl}
                                    alt=""
                                    fill
                                    sizes="40px"
                                    className="object-contain p-1"
                                  />
                                ) : (
                                  item.tradeName.slice(0, 2).toUpperCase()
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate text-sm font-semibold text-slate-900">
                                    {item.tradeName}
                                  </span>
                                  {item.verified && (
                                    <Image
                                      src="/sello-fiverten-verificado.png"
                                      alt="Empresa verificada"
                                      width={512}
                                      height={512}
                                      className="h-4 w-4 shrink-0"
                                    />
                                  )}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {[item.sector?.name, item.country?.name]
                                    .filter(Boolean)
                                    .join(' · ') || 'Perfil público'}
                                  {item.rating.total > 0 && item.rating.average !== null
                                    ? ` · ${item.rating.average.toFixed(1)} ★ (${item.rating.total})`
                                    : ''}
                                </span>
                              </span>
                              <span className="shrink-0 text-xs text-slate-400">Ver perfil →</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/empresas?search=${encodeURIComponent(query)}`}
                        onClick={() => setSuggestionsOpen(false)}
                        className="block border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-blue-700 transition hover:bg-slate-100"
                      >
                        Ver{' '}
                        {suggestionsTotal === 1
                          ? 'el resultado en el directorio'
                          : `los ${suggestionsTotal} resultados en el directorio`}{' '}
                        →
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="mt-3 min-h-5 text-center text-sm text-slate-500" aria-live="polite">
              {searchMessage}
            </p>
            <div className="home-reveal mt-14 grid gap-5 md:grid-cols-3">
              {BENEFITS.map((item) => (
                <article
                  key={item.title}
                  className="group rounded-2xl border border-slate-200 p-7 transition duration-300 hover:-translate-y-2 hover:border-aqua/70 hover:shadow-card"
                >
                  <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
                  <a
                    href={item.link}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700"
                  >
                    {item.cta} <span className="transition group-hover:translate-x-1">→</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="relative overflow-hidden bg-[#EFEEE9] py-24 lg:py-28"
        >
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="home-reveal flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                  Proceso transparente
                </span>
                <h2 className="font-display mt-4 max-w-2xl text-4xl font-bold tracking-[-.045em] sm:text-5xl">
                  De la solicitud al sello.
                  <br />
                  <span className="text-slate-400">Cinco pasos claros.</span>
                </h2>
              </div>
              <Link
                href="/como-funciona"
                className="inline-flex items-center gap-3 self-start rounded-full border border-slate-300 px-6 py-3 text-sm font-bold transition hover:border-ink hover:bg-ink hover:text-white md:self-auto"
              >
                Ver proceso completo <span>↗</span>
              </Link>
            </div>
            <div className="relative mt-16 grid gap-8 md:grid-cols-5">
              <div className="home-step-line absolute left-[8%] right-[8%] top-7 hidden h-px md:block" />
              {[
                [
                  '01',
                  'Registra tu empresa',
                  'Crea tu cuenta, completa los datos y activa tu página pública.',
                ],
                [
                  '02',
                  'Solicita verificación',
                  'Inicia la solicitud desde tu panel y acepta las condiciones.',
                ],
                [
                  '03',
                  'Sube documentación',
                  'Comparte documentos de identidad, fiscales y de domicilio.',
                ],
                [
                  '04',
                  'Añade evidencias',
                  'Registra proyectos y adjunta imágenes o PDF de tu actividad.',
                ],
                [
                  '05',
                  'Revisión y activación',
                  'FIVERTEN revisa y, si aprueba, activa tu sello dinámico.',
                ],
              ].map(([number, title, text], index) => (
                <div
                  key={number}
                  className="home-reveal relative"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold shadow-lg ${
                      index === 4 ? 'bg-blue-600 text-white shadow-glow' : 'bg-ink text-aqua'
                    }`}
                  >
                    {number}
                  </div>
                  <h3 className="mt-7 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
            <div className="home-reveal mt-16 grid gap-4 rounded-3xl bg-ink p-7 text-white sm:grid-cols-3 sm:p-9">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-aqua">
                  ◷
                </span>
                <div>
                  <p className="text-xs text-slate-400">Plazo de revisión</p>
                  <p className="mt-1 text-xl font-bold">5 días hábiles</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border-white/10 sm:border-x sm:px-7">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-aqua">
                  ✓
                </span>
                <div>
                  <p className="text-xs text-slate-400">Validez del sello</p>
                  <p className="mt-1 text-xl font-bold">365 días</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:pl-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-aqua">
                  ↻
                </span>
                <div>
                  <p className="text-xs text-slate-400">Ventana de renovación</p>
                  <p className="mt-1 text-xl font-bold">Desde 30 días antes</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="soluciones" className="overflow-hidden bg-ink py-24 text-white lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2 lg:px-8">
            <div className="home-reveal relative order-2 lg:order-1">
              <div className="absolute -inset-8 rounded-full bg-aqua/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-[#182129] p-6 shadow-2xl sm:p-9">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <span className="text-xs font-bold tracking-[.18em] text-slate-400">
                    VISTA PREVIA · SELLO WEB
                  </span>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
                    EN LÍNEA
                  </span>
                </div>
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="home-badge-ring relative h-40 w-40">
                    <Image
                      src="/sello-fiverten-verificado.png"
                      alt="Sello FIVERTEN de empresa verificada"
                      width={512}
                      height={512}
                      className="h-full w-full drop-shadow-[0_24px_45px_rgba(0,0,0,.5)]"
                    />
                  </div>
                  <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-aqua">
                    FIVERTEN VERIFIED
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">Empresa verificada</h3>
                  <p className="mt-2 text-sm text-slate-400">Estado actualizado en tiempo real</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Estado del sello</span>
                    <span className="font-bold text-emerald-300">● Verificación vigente</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[82%] rounded-full bg-blue-600" />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Ejemplo visual. La información real depende del estado del perfil.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                  <span className="font-mono text-xs text-slate-400">&lt;iframe ...&gt;</span>
                  <button
                    type="button"
                    onClick={() => void copyEmbed()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                  >
                    {copied ? 'Copiado' : 'Copiar código'}
                  </button>
                </div>
                <p className="mt-2 min-h-4 text-right text-xs text-aqua" aria-live="polite">
                  {copied ? 'Código de ejemplo copiado.' : ''}
                </p>
              </div>
            </div>
            <div className="home-reveal order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-aqua">
                Una señal visible de confianza
              </span>
              <h2 className="font-display mt-4 text-4xl font-bold leading-tight tracking-[-.045em] sm:text-5xl">
                Tu reputación,
                <br />
                <span className="text-aqua">siempre al día.</span>
              </h2>
              <p className="mt-6 max-w-xl leading-8 text-slate-300">
                El sello FIVERTEN no es una imagen estática. Está conectado al estado de
                verificación de tu empresa y permite que cualquier visitante consulte si continúa
                vigente.
              </p>
              <ul className="mt-8 space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="text-aqua">✓</span> Descarga tu sello en PNG y SVG.
                </li>
                <li className="flex gap-3">
                  <span className="text-aqua">✓</span> Inserta el código embed en tu sitio web.
                </li>
                <li className="flex gap-3">
                  <span className="text-aqua">✓</span> Consulta el estado de verificación desde tu
                  panel.
                </li>
                <li className="flex gap-3">
                  <span className="text-aqua">✓</span> Si caduca o se revoca, el sello se actualiza
                  automáticamente.
                </li>
              </ul>
              <Link
                href="/verificar-empresa"
                className="mt-10 inline-flex items-center gap-3 rounded-full bg-blue-600 px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-blue-700"
              >
                Solicitar verificación <span>↗</span>
              </Link>
            </div>
          </div>
        </section>

        <section id="trust-center" className="bg-white py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
              <div className="home-reveal">
                <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                  Trust Center
                </span>
                <h2 className="font-display mt-4 text-4xl font-bold tracking-[-.045em] sm:text-5xl">
                  La confianza también necesita{' '}
                  <span className="text-slate-400">transparencia.</span>
                </h2>
                <p className="mt-6 leading-8 text-slate-500">
                  Conoce qué revisamos, cómo tomamos decisiones y qué significa cada estado.
                  Explicamos nuestra metodología para que clientes y empresas sepan qué hay detrás
                  de cada sello.
                </p>
                <Link
                  href="/trust-center"
                  className="mt-8 inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-blue-700"
                >
                  Explorar Trust Center <span className="text-aqua">↗</span>
                </Link>
              </div>
              <div className="home-reveal grid gap-4 sm:grid-cols-2">
                {[
                  [
                    '⌕',
                    'Metodología',
                    'Criterios, etapas de revisión y fundamentos de aprobación.',
                  ],
                  [
                    '◉',
                    'Estados de verificación',
                    'Qué significa estar pendiente, verificado, vencido o revocado.',
                  ],
                  [
                    '▤',
                    'Fuentes y evidencias',
                    'Documentos y señales que respaldan la evaluación.',
                  ],
                  [
                    '⌑',
                    'Privacidad y seguridad',
                    'Documentación privada y revisión reservada al equipo FIVERTEN.',
                  ],
                ].map(([icon, title, text]) => (
                  <div key={title} className="rounded-2xl bg-paper p-7">
                    <span className="text-2xl">{icon}</span>
                    <h3 className="mt-5 font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="metodologia" className="bg-[#F4F3EF] py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="home-reveal mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Criterios claros
              </span>
              <h2 className="font-display mt-4 text-4xl font-bold tracking-[-.045em] sm:text-5xl">
                ¿Qué revisamos?
              </h2>
              <p className="mt-5 leading-7 text-slate-500">
                La verificación se basa en documentación y evidencias consistentes. La decisión
                corresponde al equipo de revisión de FIVERTEN.
              </p>
            </div>
            <div className="home-reveal mt-12 grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <h3 className="text-xl font-bold">Criterios de aprobación</h3>
                </div>
                <ul className="mt-7 space-y-4 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <span className="font-bold text-emerald-600">✓</span> Documentos legibles y
                    vigentes.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-emerald-600">✓</span> Datos fiscales
                    coincidentes con el perfil.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-emerald-600">✓</span> Evidencias coherentes con
                    la actividad declarada.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-emerald-600">✓</span> Sin señales de
                    suplantación o documentación manipulada.
                  </li>
                </ul>
              </div>
              <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700">
                    !
                  </span>
                  <h3 className="text-xl font-bold">Motivos de rechazo</h3>
                </div>
                <ul className="mt-7 space-y-4 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <span className="font-bold text-rose-600">×</span> Documentación incompleta,
                    ilegible o caducada.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-rose-600">×</span> Datos que no coinciden con la
                    empresa.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-rose-600">×</span> Evidencias no verificables o
                    insuficientes.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-rose-600">×</span> Sospecha fundada de fraude o
                    suplantación.
                  </li>
                </ul>
              </div>
            </div>
            <div className="home-reveal mt-6 rounded-3xl bg-ink p-8 text-white sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-aqua">
                  Validez y renovación
                </p>
                <h3 className="mt-2 text-2xl font-bold">Un sello vigente, no permanente.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  La empresa puede solicitar la renovación desde 30 días antes del vencimiento. Si
                  el sello caduca o se revoca, su estado cambia automáticamente.
                </p>
              </div>
              <div className="mt-6 shrink-0 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 sm:mt-0">
                <p className="text-xs text-slate-400">Vigencia</p>
                <p className="text-3xl font-bold text-aqua">
                  365 <span className="text-sm font-medium text-white">días</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="opiniones" className="bg-white py-24 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
            <div className="home-reveal">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Opiniones con integridad
              </span>
              <h2 className="font-display mt-4 text-4xl font-bold tracking-[-.045em] sm:text-5xl">
                Las experiencias importan.{' '}
                <span className="text-slate-400">La honestidad también.</span>
              </h2>
              <p className="mt-6 leading-8 text-slate-500">
                Las opiniones pertenecen a los clientes. Las empresas pueden responder públicamente,
                pero no ocultar ni editar reseñas. Los reportes se revisan mediante moderación y las
                decisiones quedan registradas.
              </p>
              <Link
                href="/metodologia"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-blue-700"
              >
                Leer política de opiniones <span>↗</span>
              </Link>
            </div>
            <div className="home-reveal relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-aqua/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-white sm:p-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-[.2em] text-aqua">
                    COMPROMISO FIVERTEN
                  </span>
                  <span className="text-amber-300">★★★★★</span>
                </div>
                <h3 className="mt-8 max-w-lg text-3xl font-bold leading-tight">
                  Una reputación confiable no se construye ocultando las opiniones difíciles.
                </h3>
                <div className="mt-9 grid gap-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-bold">Derecho a responder</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Las empresas pueden compartir públicamente su versión y contexto.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-bold">Moderación independiente</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Los reportes se evalúan y las decisiones quedan registradas.
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-xs leading-5 text-slate-500">
                  Las reseñas de baja valoración pueden pasar por un proceso de evidencias y
                  resolución antes de publicarse.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="bg-[#F4F3EF] py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.7fr_1.3fr] lg:px-8">
            <div className="home-reveal">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Centro de ayuda
              </span>
              <h2 className="font-display mt-4 text-4xl font-bold tracking-[-.045em] sm:text-5xl">
                Preguntas frecuentes.
              </h2>
              <p className="mt-5 leading-7 text-slate-500">
                Respuestas directas sobre el proceso de verificación, el sello y las reseñas.
              </p>
            </div>
            <div className="home-reveal divide-y divide-slate-200 rounded-2xl bg-white px-6">
              {FAQS.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div key={faq.question} className={`home-faq-item py-5 ${open ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-5 text-left font-bold"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : index)}
                    >
                      <span>{faq.question}</span>
                      <span className="home-faq-plus text-2xl font-normal text-slate-500">+</span>
                    </button>
                    <div className="home-faq-answer">
                      <p className="pt-4 text-sm leading-6 text-slate-500">{faq.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="verificar"
          className="relative overflow-hidden bg-ink py-24 text-white lg:py-28"
        >
          <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-aqua/15 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="home-reveal relative mx-auto max-w-4xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-bold tracking-widest text-aqua">
              TU SIGUIENTE PASO
            </span>
            <h2 className="font-display mt-7 text-4xl font-bold tracking-[-.05em] sm:text-6xl">
              Haz que la confianza
              <br />
              se pueda <span className="text-aqua">demostrar.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Crea tu perfil público, presenta tus evidencias y permite que tus clientes conozcan
              quién eres.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/verificar-empresa"
                className="home-shine rounded-full bg-blue-600 px-8 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-blue-700"
              >
                Verificar mi empresa <span className="ml-2">↗</span>
              </Link>
              <Link
                href="/trust-center"
                className="rounded-full border border-white/20 px-8 py-4 font-semibold transition hover:bg-white/10"
              >
                Visitar Trust Center
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
