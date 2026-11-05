import type { Metadata } from 'next';
import Link from 'next/link';
import HomeHeader from '../../components/public/HomeHeader';
import PublicFooter from '../../components/public/PublicFooter';

export const metadata: Metadata = {
  title: 'Soluciones por tipo de negocio | FIVERTEN',
  description:
    'Reputación verificable para comercios, salud, inmobiliaria, hostelería, startups y empresas con varias sedes.',
};

const SOLUTIONS = [
  {
    icon: 'storefront',
    tag: 'Local',
    title: 'Comercio y servicios locales',
    text: 'Muestra tu reputación real, responde a clientes y convierte tu perfil verificado en una prueba de confianza para nuevas ventas.',
    link: '/empresas',
    cta: 'Ver directorio',
  },
  {
    icon: 'health_and_safety',
    tag: 'Salud',
    title: 'Salud y bienestar',
    text: 'Refuerza la confianza con verificación documental y un historial de opiniones moderado de forma independiente.',
    link: '/metodologia',
    cta: 'Ver metodología',
  },
  {
    icon: 'apartment',
    tag: 'Profesionales',
    title: 'Inmobiliaria y profesionales',
    text: 'Presenta proyectos verificables, documentación validada y opiniones de clientes en un perfil público único.',
    link: '/empresa/mi-empresa/proyectos',
    cta: 'Ver proyectos',
  },
  {
    icon: 'restaurant',
    tag: 'Hostelería',
    title: 'Hostelería y turismo',
    text: 'Recibe opiniones con enlaces personalizados y QR, y responde públicamente sin poder ocultar las críticas.',
    link: '/recursos/widgets-y-qr',
    cta: 'Ver widgets y QR',
  },
  {
    icon: 'rocket_launch',
    tag: 'Digital',
    title: 'Startups y SaaS',
    text: 'Integra el sello y el widget en tu web para mostrar puntuación, reseñas recientes y verificación en tiempo real.',
    link: '/empresa/mi-empresa/certificaciones',
    cta: 'Ver certificaciones',
  },
  {
    icon: 'business',
    tag: 'Equipos',
    title: 'Empresas con varias sedes',
    text: 'Gestiona usuarios por roles, límites por plan y equipos de soporte con acceso controlado.',
    link: '/precios',
    cta: 'Ver planes',
  },
];

const CAPABILITIES = [
  'Perfil público con estado de verificación',
  'Opiniones con identidad y contexto',
  'Proyectos con evidencias trazables',
  'Sello dinámico y widget para tu web',
];

export default function SolutionsPage() {
  return (
    <div className="home-root min-h-screen bg-paper font-sans text-ink antialiased">
      <HomeHeader />

      <section className="home-noise relative isolate overflow-hidden bg-ink pb-20 pt-36 text-white lg:pb-24 lg:pt-44">
        <div className="home-grid-bg absolute inset-0 -z-10" />
        <div className="home-orb absolute -right-32 top-16 -z-10 h-[430px] w-[430px] rounded-full bg-aqua/15 blur-3xl" />
        <div className="home-orb home-orb-delay absolute -left-40 bottom-0 -z-10 h-[340px] w-[340px] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-semibold tracking-wide text-aqua">
              SOLUCIONES POR TIPO DE NEGOCIO
            </div>
            <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.055em] sm:text-6xl">
              Reputación verificable
              <br />
              <span className="text-aqua">para cada negocio.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              FIVERTEN se adapta a empresas que necesitan demostrar confianza, recoger opiniones y
              responder a sus clientes con transparencia.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/verificar-empresa"
                className="home-shine inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Verificar mi empresa <span>→</span>
              </Link>
              <Link
                href="/empresas"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-aqua/60 hover:bg-white/5"
              >
                Explorar empresas <span className="text-aqua">↗</span>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-aqua">Una base común</p>
            <ul className="mt-5 space-y-4 text-sm text-slate-300">
              {CAPABILITIES.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-6 text-slate-400">
              El mismo sistema de confianza, adaptado al volumen y las necesidades de cada tipo de
              empresa.
            </p>
          </div>
        </div>
      </section>

      <main>
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Casos de uso
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Tu sector, tu forma de demostrar confianza.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                No cambiamos el estándar de verificación: cambiamos cómo se presenta la evidencia y
                cómo se gestiona la relación con el cliente.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SOLUTIONS.map((item) => (
                <article
                  key={item.title}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-aqua/60 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <SolutionIcon name={item.icon} />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 flex-1 text-xs leading-6 text-slate-500">{item.text}</p>
                  <Link
                    href={item.link}
                    className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 transition group-hover:gap-2"
                  >
                    {item.cta} <span>→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F4F3EF] py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[1fr_1fr] lg:px-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Cómo encaja FIVERTEN
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Menos promesas. Más evidencia.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Cada solución usa el mismo núcleo: identidad revisada, documentación comprobable,
                proyectos con evidencias y opiniones con contexto.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/como-funciona"
                  className="rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Ver cómo funciona
                </Link>
                <Link
                  href="/trust-center"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Leer Trust Center
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Visibilidad', 'Perfil público en el directorio y en búsquedas.'],
                ['Credibilidad', 'Sello basado en revisión real, no en autodeclaraciones.'],
                ['Contexto', 'Proyectos y opiniones con evidencia y estado.'],
                ['Control', 'Equipo, roles y límites según el plan contratado.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-white lg:py-24">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-bold tracking-widest text-aqua">
              TU CASO TAMBIÉN CUENTA
            </span>
            <h2 className="font-display mt-6 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
              ¿No encajas en ninguna categoría?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Cuéntanos tu caso y te ayudamos a definir el mejor plan y proceso de verificación.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/verificar-empresa"
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Hablar con FIVERTEN
              </Link>
              <Link
                href="/precios"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function SolutionIcon({ name }: { name: string }) {
  if (name === 'storefront') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M4 9h16l-1-5H5L4 9Zm0 0v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M9 21v-6h6v6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (name === 'health_and_safety') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M12 8v6m-3-3h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'apartment') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M9 7h1m-1 4h1m-1 4h1m6-6h1a2 2 0 0 1 2 2v9M4 21h16"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (name === 'restaurant') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M7 3v8m0 0v10M4 3v5a3 3 0 0 0 6 0V3M16 3v18M16 3c3 1 4 4 4 7h-4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (name === 'rocket_launch') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M14 4c3-1 6 0 6 0s1 3 0 6c-1.5 4.5-6 8-9 9l-3-3c1-3 4.5-7.5 9-9Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="m9 15-3 3m1-7-4 1 3 3m7-1 1 4 3-3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m4-4h1m-1 4h1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
