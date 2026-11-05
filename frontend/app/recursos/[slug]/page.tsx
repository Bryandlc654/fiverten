import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '../../../components/public/PublicShell';
import { RESOURCES, resourceBySlug } from '../../../lib/resources';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return RESOURCES.map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = resourceBySlug(slug);
  if (!resource) return { title: 'Recurso no encontrado | FIVERTEN' };
  return {
    title: `${resource.title} | FIVERTEN`,
    description: resource.summary,
  };
}

export default async function ResourcePage({ params }: PageProps) {
  const { slug } = await params;
  const resource = resourceBySlug(slug);
  if (!resource) notFound();

  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <Link href="/recursos" className="text-xs font-semibold text-blue-700 hover:underline">
            ← Volver a recursos
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            {resource.tag}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{resource.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{resource.summary}</p>
          <p className="mt-2 text-xs text-slate-400">
            Actualizado el{' '}
            {new Date(resource.updatedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </header>

        <div className="space-y-6">
          {resource.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="material-symbols-outlined text-[17px] text-blue-700">
                        check
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-slate-900">¿Quieres aplicar esto en tu empresa?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Crea tu cuenta o solicita una verificación para empezar a construir tu reputación.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/verificar-empresa"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Solicitar verificación
            </Link>
            <Link
              href="/empresas"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Ver empresas
            </Link>
          </div>
        </section>
      </article>
    </PublicShell>
  );
}
