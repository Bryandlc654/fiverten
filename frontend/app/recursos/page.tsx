import type { Metadata } from 'next';
import Link from 'next/link';
import HomeHeader from '../../components/public/HomeHeader';
import PublicFooter from '../../components/public/PublicFooter';
import { RESOURCES } from '../../lib/resources';

export const metadata: Metadata = {
  title: 'Recursos y guías | FIVERTEN',
  description:
    'Guías prácticas sobre reseñas, verificación de empresas, moderación, sello y reputación verificable.',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ResourcesPage() {
  const [featured, ...rest] = RESOURCES;

  return (
    <div className="home-root min-h-screen bg-paper font-sans text-ink antialiased">
      <HomeHeader />

      <section className="home-noise relative isolate overflow-hidden bg-ink pb-20 pt-36 text-white lg:pb-24 lg:pt-44">
        <div className="home-grid-bg absolute inset-0 -z-10" />
        <div className="home-orb absolute -right-32 top-16 -z-10 h-[430px] w-[430px] rounded-full bg-aqua/15 blur-3xl" />
        <div className="home-orb home-orb-delay absolute -left-40 bottom-0 -z-10 h-[340px] w-[340px] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-semibold tracking-wide text-aqua">
                RECURSOS FIVERTEN
              </div>
              <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.055em] sm:text-6xl">
                Guías y contenidos
                <br />
                <span className="text-aqua">para decidir mejor.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Material práctico para gestionar tu reputación, pedir reseñas y entender la
                verificación de FIVERTEN.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/verificar-empresa"
                  className="home-shine inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Verificar empresa <span>→</span>
                </Link>
                <Link
                  href="/empresas"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-aqua/60 hover:bg-white/5"
                >
                  Explorar directorio <span className="text-aqua">↗</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">
                En esta sección
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {['Reseñas', 'Sello', 'Moderación', 'Planes'].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-sm font-bold text-white">{item}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Guías y criterios</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-6 text-slate-400">
                Contenido público, sin registro. Lenguaje claro, sin promesas no demostrables.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                  Biblioteca
                </span>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                  Empieza por lo importante.
                </h2>
              </div>
              <p className="max-w-md text-xs leading-6 text-slate-500">
                {RESOURCES.length} guías prácticas sobre reputación, evidencia y confianza
                verificable.
              </p>
            </div>

            {featured && (
              <Link
                href={`/recursos/${featured.slug}`}
                className="group mt-8 grid gap-6 overflow-hidden rounded-3xl border border-slate-200 bg-ink p-6 text-white transition hover:border-aqua/50 sm:p-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center"
              >
                <div>
                  <span className="inline-flex rounded-full bg-aqua/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-aqua">
                    Destacado · {featured.tag}
                  </span>
                  <h3 className="font-display mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-[-.035em] sm:text-3xl">
                    {featured.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                    {featured.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-aqua">
                    Leer guía <span className="transition group-hover:translate-x-1">→</span>
                  </span>
                </div>
                <div className="relative flex min-h-[190px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-aqua/20 blur-3xl" />
                  <div className="relative grid h-24 w-24 place-items-center rounded-full border border-aqua/30 bg-ink text-aqua shadow-glow">
                    <ResourceIcon tag={featured.tag} className="h-10 w-10" />
                  </div>
                  <p className="absolute bottom-3 right-4 text-[10px] text-slate-500">
                    Actualizado {formatDate(featured.updatedAt)}
                  </p>
                </div>
              </Link>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((item) => (
                <Link
                  key={item.slug}
                  href={`/recursos/${item.slug}`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-aqua/60 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <ResourceIcon tag={item.tag} />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-bold leading-6 text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-6 text-slate-500">{item.summary}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[10px] text-slate-400">{formatDate(item.updatedAt)}</span>
                    <span className="text-xs font-semibold text-blue-700 transition group-hover:translate-x-1">
                      Leer guía →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F4F3EF] py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[1fr_1fr] lg:px-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                También te puede interesar
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Entiende el sistema completo.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Los recursos explican el día a día. El Trust Center y la metodología explican las
                reglas y los límites.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/trust-center"
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-aqua/60 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-900">Trust Center</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Qué verificamos, estados y limitaciones.
                </p>
              </Link>
              <Link
                href="/como-funciona"
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-aqua/60 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-900">Cómo funciona</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  El proceso de verificación paso a paso.
                </p>
              </Link>
              <Link
                href="/metodologia"
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-aqua/60 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-900">Metodología</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Criterios de aprobación y rechazo.
                </p>
              </Link>
              <Link
                href="/empresas"
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-aqua/60 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-900">Directorio</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Empresas verificadas y opiniones reales.
                </p>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-white lg:py-24">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-bold tracking-widest text-aqua">
              CONTENIDO PÚBLICO
            </span>
            <h2 className="font-display mt-6 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
              ¿Necesitas ayuda con tu caso?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              El equipo de FIVERTEN puede revisar tu perfil y orientarte sobre el proceso.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/verificar-empresa"
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Contactar con FIVERTEN
              </Link>
              <Link
                href="/trust-center"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ir al Trust Center
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function ResourceIcon({ tag, className = 'h-5 w-5' }: { tag: string; className?: string }) {
  if (tag === 'Guía') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path d="M8 7h8M8 11h6" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    );
  }
  if (tag === 'Confianza') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="m8.5 12 2.2 2.2 4.8-4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (tag === 'Política') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3v18M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7Zm10 0-3 6a3 3 0 0 0 6 0l-3-6Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (tag === 'Planes') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M4 19V5m0 14h16M8 15l3-3 3 2 4-6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M4 5h16v12H7l-3 3V5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="m8 10 2.5 2.5L16 8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}
