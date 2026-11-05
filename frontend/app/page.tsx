'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HomeHeader from '../components/public/HomeHeader';
import PublicFooter from '../components/public/PublicFooter';
import { useEffect, useState, type FormEvent } from 'react';

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
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const value = search.trim();
    if (!value) {
      setSearchMessage('Escribe el nombre de una empresa o un servicio para comenzar.');
      return;
    }
    setSearchMessage(`Buscando “${value}” en el directorio…`);
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
          <div className="home-grid-bg absolute inset-0 -z-10" />
          <div className="home-orb absolute -right-32 top-16 -z-10 h-[470px] w-[470px] rounded-full bg-aqua/15 blur-3xl" />
          <div className="home-orb home-orb-delay absolute -left-40 bottom-0 -z-10 h-[360px] w-[360px] rounded-full bg-blue-500/15 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.04fr_.96fr] lg:px-8">
            <div className="relative z-10">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-semibold tracking-wide text-aqua">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua" />
                </span>
                CONFIANZA QUE SE PUEDE COMPROBAR
              </div>
              <h1 className="font-display max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] sm:text-6xl lg:text-[4.55rem]">
                Reputación que
                <br />
                <span className="bg-gradient-to-r from-aqua via-mint to-white bg-clip-text text-transparent">
                  puedes verificar.
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
                Reseñas reales. Empresas verificadas. FIVERTEN ayuda a los clientes a decidir con
                confianza y a las empresas a demostrar que son quienes dicen ser.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/empresas"
                  className="home-shine inline-flex items-center justify-center gap-3 rounded-full bg-aqua px-7 py-4 font-bold text-ink shadow-glow transition hover:-translate-y-1 hover:bg-mint"
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
                  <svg className="h-4 w-4 text-aqua" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 4 4L19 6" />
                  </svg>{' '}
                  Revisión humana
                </span>
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-aqua" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 4 4L19 6" />
                  </svg>{' '}
                  Evidencias documentales
                </span>
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-aqua" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 4 4L19 6" />
                  </svg>{' '}
                  Estado transparente
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[590px]">
              <div className="absolute -inset-7 rounded-[3rem] bg-aqua/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/15 bg-[#10243d]/90 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between px-3 pb-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[.2em] text-slate-500">
                    FIVERTEN / TRUST PROFILE
                  </span>
                  <span className="text-xs text-slate-500">•••</span>
                </div>
                <div className="overflow-hidden rounded-2xl bg-[#F5F8FC] text-ink">
                  <div className="relative h-36 overflow-hidden bg-[#dce9ec]">
                    <Image
                      src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85"
                      alt="Oficina profesional luminosa"
                      fill
                      sizes="(max-width: 640px) 100vw, 590px"
                      className="object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b2138]/70 to-transparent" />
                    <div className="absolute bottom-4 left-5 text-white">
                      <p className="text-[10px] font-bold tracking-[.2em] text-aqua">
                        PERFIL DE EMPRESA
                      </p>
                      <p className="mt-1 text-xl font-extrabold">Estudio Norte</p>
                    </div>
                    <div className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur">
                      PERFIL PÚBLICO
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Estado de confianza</p>
                        <div className="mt-1 flex items-center gap-2 text-sm font-bold text-emerald-700">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100">✓</span>
                          Empresa verificada
                        </div>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Reseñas</p>
                        <p className="text-lg font-extrabold">
                          4.9 <span className="text-amber-400">★★★★★</span>
                        </p>
                      </div>
                    </div>
                    <div className="my-5 h-px bg-slate-200" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[10px] text-slate-400">Identidad</p>
                        <p className="mt-1 text-xs font-bold text-emerald-700">Validada</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[10px] text-slate-400">Documentos</p>
                        <p className="mt-1 text-xs font-bold text-emerald-700">Revisados</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[10px] text-slate-400">Vigencia</p>
                        <p className="mt-1 text-xs font-bold text-ink">365 días</p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-xl border border-aqua/30 bg-aqua/10 p-3">
                      <div className="flex items-center gap-3">
                        <span className="home-badge-ring relative grid h-10 w-10 place-items-center rounded-full bg-ink text-aqua">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m12 2 2.2 2.3 3.2-.1 1.1 3 2.7 1.7-1 3 1 3-2.7 1.7-1.1 3-3.2-.1L12 21l-2.2-2.3-3.2.1-1.1-3-2.7-1.7 1-3-1-3 2.7-1.7 1.1-3 3.2.1L12 2Z" />
                            <path d="m8.5 12 2.2 2.2 4.8-4.8" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-bold">Sello FIVERTEN activo</p>
                          <p className="text-[10px] text-slate-500">Verificación vigente</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">● ACTIVO</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 pb-1 pt-4 text-[10px] text-slate-500">
                  <span>Vista ilustrativa de un perfil público</span>
                  <span>fiverten.com</span>
                </div>
              </div>
              <div className="home-glass absolute -left-8 top-24 hidden -translate-x-2 rounded-2xl p-4 shadow-glow sm:block">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-aqua text-ink">✓</span>
                  <div>
                    <p className="text-xs font-bold text-white">Identidad revisada</p>
                    <p className="text-[10px] text-slate-400">Validación documental</p>
                  </div>
                </div>
              </div>
              <div className="home-glass absolute -bottom-7 -right-5 hidden rounded-2xl p-4 shadow-glow sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Sello dinámico
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  Siempre actualizado <span className="text-aqua">↗</span>
                </p>
              </div>
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
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Directorio FIVERTEN
              </span>
              <h2 className="font-display mt-4 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
                Encuentra empresas.
                <br />
                <span className="text-slate-400">Decide con seguridad.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-500">
                Busca por nombre o servicio y descubre perfiles públicos, señales de verificación y
                experiencias de clientes.
              </p>
            </div>
            <form
              onSubmit={onSearch}
              className="home-reveal mx-auto mt-10 flex max-w-3xl flex-col gap-2 rounded-2xl border border-slate-200 bg-paper p-2 shadow-card sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-3 px-4">
                <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Busca por nombre o servicio…"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                  aria-label="Buscar empresas"
                />
              </div>
              <button
                className="rounded-xl bg-ink px-8 py-3 font-semibold text-white transition hover:bg-teal-800"
                type="submit"
              >
                Buscar <span className="ml-2 text-aqua">→</span>
              </button>
            </form>
            <p className="mt-3 min-h-5 text-center text-sm text-teal-700" aria-live="polite">
              {searchMessage}
            </p>
            <div className="home-reveal mt-14 grid gap-5 md:grid-cols-3">
              {BENEFITS.map((item) => (
                <article
                  key={item.title}
                  className="group rounded-2xl border border-slate-200 p-7 transition duration-300 hover:-translate-y-2 hover:border-aqua/70 hover:shadow-card"
                >
                  <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
                  <a
                    href={item.link}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal-800"
                  >
                    {item.cta} <span className="transition group-hover:translate-x-1">→</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="relative overflow-hidden bg-[#edf4f6] py-24 lg:py-28">
          <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-aqua/20 blur-3xl" />
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="home-reveal flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                  Proceso transparente
                </span>
                <h2 className="font-display mt-4 max-w-2xl text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
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
                ['01', 'Registra tu empresa', 'Crea tu cuenta, completa los datos y activa tu página pública.'],
                ['02', 'Solicita verificación', 'Inicia la solicitud desde tu panel y acepta las condiciones.'],
                ['03', 'Sube documentación', 'Comparte documentos de identidad, fiscales y de domicilio.'],
                ['04', 'Añade evidencias', 'Registra proyectos y adjunta imágenes o PDF de tu actividad.'],
                ['05', 'Revisión y activación', 'FIVERTEN revisa y, si aprueba, activa tu sello dinámico.'],
              ].map(([number, title, text], index) => (
                <div
                  key={number}
                  className="home-reveal relative"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl text-xl font-extrabold shadow-lg ${
                      index === 4 ? 'bg-aqua text-ink shadow-glow' : 'bg-ink text-aqua'
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
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-aqua">◷</span>
                <div>
                  <p className="text-xs text-slate-400">Plazo de revisión</p>
                  <p className="mt-1 text-xl font-extrabold">5 días hábiles</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border-white/10 sm:border-x sm:px-7">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-aqua">✓</span>
                <div>
                  <p className="text-xs text-slate-400">Validez del sello</p>
                  <p className="mt-1 text-xl font-extrabold">365 días</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:pl-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-aqua">↻</span>
                <div>
                  <p className="text-xs text-slate-400">Ventana de renovación</p>
                  <p className="mt-1 text-xl font-extrabold">Desde 30 días antes</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="soluciones" className="overflow-hidden bg-ink py-24 text-white lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2 lg:px-8">
            <div className="home-reveal relative order-2 lg:order-1">
              <div className="absolute -inset-8 rounded-full bg-aqua/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-[#10243d] p-6 shadow-2xl sm:p-9">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <span className="text-xs font-bold tracking-[.18em] text-slate-400">
                    VISTA PREVIA · SELLO WEB
                  </span>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
                    EN LÍNEA
                  </span>
                </div>
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="home-badge-ring relative grid h-36 w-36 place-items-center rounded-full border border-aqua/50 bg-gradient-to-br from-aqua/20 to-transparent shadow-glow">
                    <div className="grid h-28 w-28 place-items-center rounded-full border border-aqua/30 bg-ink">
                      <svg className="h-14 w-14 text-aqua" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path
                          d="M24 3 30 9l8-.4 2.7 7.5 6.8 4.4-2.5 7.5 2.5 7.5-6.8 4.4L38 47l-8-.4L24 53l-6-6.4-8 .4-2.7-7.5L.5 35.1 3 27.6.5 20.1l6.8-4.4L10 8.2l8 .4L24 3Z"
                          transform="translate(0 -4)"
                        />
                        <path d="m14 24 6 6 14-14" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-aqua">
                    FIVERTEN VERIFIED
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold">Empresa verificada</h3>
                  <p className="mt-2 text-sm text-slate-400">Estado actualizado en tiempo real</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Estado del sello</span>
                    <span className="font-bold text-emerald-300">● Verificación vigente</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-aqua to-emerald-300" />
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
                    className="rounded-lg bg-aqua px-3 py-2 text-xs font-bold text-ink transition hover:bg-mint"
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
              <h2 className="font-display mt-4 text-4xl font-extrabold leading-tight tracking-[-.045em] sm:text-5xl">
                Tu reputación,
                <br />
                <span className="text-aqua">siempre al día.</span>
              </h2>
              <p className="mt-6 max-w-xl leading-8 text-slate-300">
                El sello FIVERTEN no es una imagen estática. Está conectado al estado de verificación
                de tu empresa y permite que cualquier visitante consulte si continúa vigente.
              </p>
              <ul className="mt-8 space-y-4 text-sm text-slate-300">
                <li className="flex gap-3"><span className="text-aqua">✓</span> Descarga tu sello en PNG y SVG.</li>
                <li className="flex gap-3"><span className="text-aqua">✓</span> Inserta el código embed en tu sitio web.</li>
                <li className="flex gap-3"><span className="text-aqua">✓</span> Consulta el estado de verificación desde tu panel.</li>
                <li className="flex gap-3"><span className="text-aqua">✓</span> Si caduca o se revoca, el sello se actualiza automáticamente.</li>
              </ul>
              <Link
                href="/verificar-empresa"
                className="mt-10 inline-flex items-center gap-3 rounded-full bg-aqua px-7 py-4 font-bold text-ink transition hover:-translate-y-1 hover:bg-mint"
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
                <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                  Trust Center
                </span>
                <h2 className="font-display mt-4 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
                  La confianza también necesita <span className="text-slate-400">transparencia.</span>
                </h2>
                <p className="mt-6 leading-8 text-slate-500">
                  Conoce qué revisamos, cómo tomamos decisiones y qué significa cada estado.
                  Explicamos nuestra metodología para que clientes y empresas sepan qué hay detrás de
                  cada sello.
                </p>
                <Link
                  href="/trust-center"
                  className="mt-8 inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-teal-800"
                >
                  Explorar Trust Center <span className="text-aqua">↗</span>
                </Link>
              </div>
              <div className="home-reveal grid gap-4 sm:grid-cols-2">
                {[
                  ['⌕', 'Metodología', 'Criterios, etapas de revisión y fundamentos de aprobación.'],
                  ['◉', 'Estados de verificación', 'Qué significa estar pendiente, verificado, vencido o revocado.'],
                  ['▤', 'Fuentes y evidencias', 'Documentos y señales que respaldan la evaluación.'],
                  ['⌑', 'Privacidad y seguridad', 'Documentación privada y revisión reservada al equipo FIVERTEN.'],
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

        <section id="metodologia" className="bg-[#f4f7fa] py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="home-reveal mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Criterios claros
              </span>
              <h2 className="font-display mt-4 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
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
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">✓</span>
                  <h3 className="text-xl font-extrabold">Criterios de aprobación</h3>
                </div>
                <ul className="mt-7 space-y-4 text-sm text-slate-600">
                  <li className="flex gap-3"><span className="font-bold text-emerald-600">✓</span> Documentos legibles y vigentes.</li>
                  <li className="flex gap-3"><span className="font-bold text-emerald-600">✓</span> Datos fiscales coincidentes con el perfil.</li>
                  <li className="flex gap-3"><span className="font-bold text-emerald-600">✓</span> Evidencias coherentes con la actividad declarada.</li>
                  <li className="flex gap-3"><span className="font-bold text-emerald-600">✓</span> Sin señales de suplantación o documentación manipulada.</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700">!</span>
                  <h3 className="text-xl font-extrabold">Motivos de rechazo</h3>
                </div>
                <ul className="mt-7 space-y-4 text-sm text-slate-600">
                  <li className="flex gap-3"><span className="font-bold text-rose-600">×</span> Documentación incompleta, ilegible o caducada.</li>
                  <li className="flex gap-3"><span className="font-bold text-rose-600">×</span> Datos que no coinciden con la empresa.</li>
                  <li className="flex gap-3"><span className="font-bold text-rose-600">×</span> Evidencias no verificables o insuficientes.</li>
                  <li className="flex gap-3"><span className="font-bold text-rose-600">×</span> Sospecha fundada de fraude o suplantación.</li>
                </ul>
              </div>
            </div>
            <div className="home-reveal mt-6 rounded-3xl bg-ink p-8 text-white sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-aqua">
                  Validez y renovación
                </p>
                <h3 className="mt-2 text-2xl font-extrabold">Un sello vigente, no permanente.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  La empresa puede solicitar la renovación desde 30 días antes del vencimiento. Si el
                  sello caduca o se revoca, su estado cambia automáticamente.
                </p>
              </div>
              <div className="mt-6 shrink-0 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 sm:mt-0">
                <p className="text-xs text-slate-400">Vigencia</p>
                <p className="text-3xl font-extrabold text-aqua">
                  365 <span className="text-sm font-medium text-white">días</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="opiniones" className="bg-white py-24 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
            <div className="home-reveal">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Opiniones con integridad
              </span>
              <h2 className="font-display mt-4 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
                Las experiencias importan. <span className="text-slate-400">La honestidad también.</span>
              </h2>
              <p className="mt-6 leading-8 text-slate-500">
                Las opiniones pertenecen a los clientes. Las empresas pueden responder públicamente,
                pero no ocultar ni editar reseñas. Los reportes se revisan mediante moderación y las
                decisiones quedan registradas.
              </p>
              <Link
                href="/metodologia"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-teal-800"
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
                <h3 className="mt-8 max-w-lg text-3xl font-extrabold leading-tight">
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
                  Las reseñas de baja valoración pueden pasar por un proceso de evidencias y resolución
                  antes de publicarse.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="bg-[#f4f7fa] py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.7fr_1.3fr] lg:px-8">
            <div className="home-reveal">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Centro de ayuda
              </span>
              <h2 className="font-display mt-4 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
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
                      <span className="home-faq-plus text-2xl font-normal text-teal-700">+</span>
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

        <section id="verificar" className="relative overflow-hidden bg-ink py-24 text-white lg:py-28">
          <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-aqua/15 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="home-reveal relative mx-auto max-w-4xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-bold tracking-widest text-aqua">
              TU SIGUIENTE PASO
            </span>
            <h2 className="font-display mt-7 text-4xl font-extrabold tracking-[-.05em] sm:text-6xl">
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
                className="home-shine rounded-full bg-aqua px-8 py-4 font-bold text-ink transition hover:-translate-y-1 hover:bg-mint"
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
