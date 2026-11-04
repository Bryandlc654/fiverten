import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '../../components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Soluciones por tipo de negocio | FIVERTEN',
  description:
    'Reputación verificable para comercios, salud, inmobiliaria, hostelería, startups y empresas con varias sedes.',
};

const SOLUTIONS = [
  {
    icon: 'storefront',
    title: 'Comercio y servicios locales',
    text: 'Muestra tu reputación real, responde a clientes y convierte tu perfil verificado en una prueba de confianza para nuevas ventas.',
  },
  {
    icon: 'health_and_safety',
    title: 'Salud y bienestar',
    text: 'Refuerza la confianza con verificación documental y un historial de opiniones moderado de forma independiente.',
  },
  {
    icon: 'apartment',
    title: 'Inmobiliaria y profesionales',
    text: 'Presenta proyectos verificables, documentación validada y opiniones de clientes en un perfil público único.',
  },
  {
    icon: 'restaurant',
    title: 'Hostelería y turismo',
    text: 'Recibe opiniones con enlaces personalizados y QR, y responde públicamente sin poder ocultar las críticas.',
  },
  {
    icon: 'rocket_launch',
    title: 'Startups y SaaS',
    text: 'Integra el sello y el widget en tu web para mostrar puntuación, reseñas recientes y verificación en tiempo real.',
  },
  {
    icon: 'business',
    title: 'Empresas con varias sedes',
    text: 'Gestiona usuarios por roles, límites por plan y equipos de soporte con acceso controlado.',
  },
];

export default function SolutionsPage() {
  return (
    <PublicShell>
      <div className="space-y-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Soluciones</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Reputación verificable para cada tipo de negocio
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            FIVERTEN se adapta a empresas que necesitan demostrar confianza, recoger opiniones y
            responder a sus clientes con transparencia.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined">{item.icon}</span>
              </span>
              <h2 className="mt-3 text-base font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-slate-900">¿No encajas en ninguna categoría?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cuéntanos tu caso y te ayudamos a definir el mejor plan y proceso de verificación.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/verificar-empresa" className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white">
              Hablar con FIVERTEN
            </Link>
            <Link href="/precios" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Ver planes
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
