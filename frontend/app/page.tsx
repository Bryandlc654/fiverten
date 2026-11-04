'use client';

import Link from 'next/link';
import PublicShell from '../components/public/PublicShell';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <PublicShell>
      <div className="space-y-12">
        <section className="relative overflow-hidden rounded-3xl bg-[#0b101b] px-6 py-14 text-white sm:px-10">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Reputación verificable
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
              Reseñas reales.
              <br />
              Empresas verificadas.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              FIVERTEN ayuda a los clientes a decidir con confianza y a las empresas a demostrar
              que son quienes dicen ser. Perfil público, reseñas verificadas y un sello dinámico
              que puedes insertar en tu web.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/empresas"
                className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
              >
                Buscar empresas
              </Link>
              <Link
                href="/verificar-empresa"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/5"
              >
                Verificar mi empresa
              </Link>
              {!isLoading && isAuthenticated && (
                <Link
                  href="/app"
                  className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Ir a mi panel
                </Link>
              )}
            </div>
            <form action="/empresas" className="mt-7 flex max-w-xl gap-2">
              <input
                name="search"
                placeholder="Busca por nombre o servicio…"
                aria-label="Buscar empresas"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                Buscar
              </button>
            </form>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: 'verified_user',
              title: 'Verificación real',
              text: 'Revisamos identidad, documentación fiscal y evidencias. Ninguna empresa puede autoverificarse.',
            },
            {
              icon: 'reviews',
              title: 'Opiniones con contexto',
              text: 'Reseñas vinculadas a clientes y experiencias, con estados y moderación independiente.',
            },
            {
              icon: 'verified',
              title: 'Sello dinámico',
              text: 'Si la verificación caduca o se revoca, tu sello lo refleja automáticamente.',
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined">{item.icon}</span>
              </span>
              <h2 className="mt-3 text-base font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">¿Cómo funciona?</h2>
              <p className="mt-1 text-sm text-slate-600">
                De la solicitud al sello en cinco pasos, con revisión humana.
              </p>
            </div>
            <Link href="/como-funciona" className="text-sm font-bold text-blue-600 hover:underline">
              Ver proceso completo
            </Link>
          </div>
          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
            {[
              'Registra tu empresa',
              'Solicita la verificación',
              'Sube documentación',
              'Registra proyectos y evidencias',
              'FIVERTEN revisa y activa el sello',
            ].map((step, index) => (
              <li key={step} className="rounded-xl bg-slate-50 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b101b] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="mt-2 text-sm font-semibold text-slate-800">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/trust-center"
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 transition hover:border-blue-300"
          >
            <h2 className="text-lg font-bold text-slate-900">Trust Center</h2>
            <p className="mt-1 text-sm text-slate-600">
              Metodología, estados, fuentes y seguridad. Transparencia sobre cómo verificamos.
            </p>
          </Link>
          <Link
            href="/precios"
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 transition hover:border-blue-300"
          >
            <h2 className="text-lg font-bold text-slate-900">Planes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Empieza gratis y amplía límites, usuarios y funciones cuando lo necesites.
            </p>
          </Link>
        </section>
      </div>
    </PublicShell>
  );
}
