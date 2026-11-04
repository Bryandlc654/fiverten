import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '../../components/public/PublicShell';
import { RESOURCES } from '../../lib/resources';

export const metadata: Metadata = {
  title: 'Recursos y guías | FIVERTEN',
  description:
    'Guías prácticas sobre reseñas, verificación de empresas, moderación, sello y reputación verificable.',
};

export default function ResourcesPage() {
  return (
    <PublicShell>
      <div className="space-y-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Recursos</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Guías y contenidos</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Material práctico para gestionar tu reputación, pedir reseñas y entender la
            verificación de FIVERTEN.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((item) => (
            <Link
              key={item.slug}
              href={`/recursos/${item.slug}`}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300"
            >
              <span className="self-start rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {item.tag}
              </span>
              <h2 className="mt-2 text-base font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.summary}</p>
              <span className="mt-4 text-xs font-semibold text-blue-600">Leer guía →</span>
            </Link>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-[#0b101b] p-6 text-white">
          <h2 className="text-lg font-bold">¿Necesitas ayuda con tu caso?</h2>
          <p className="mt-1 text-sm text-slate-300">
            El equipo de FIVERTEN puede revisar tu perfil y orientarte.
          </p>
          <Link
            href="/verificar-empresa"
            className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Contactar con FIVERTEN
          </Link>
        </section>
      </div>
    </PublicShell>
  );
}
