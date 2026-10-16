'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/** Enlace para pedir reseñas a los clientes y acceso al perfil público. */
export default function ShareReviewLink({ slug, isPublic }: { slug: string; isPublic: boolean }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const reviewUrl = `${origin}/review/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pide reseñas a tus clientes</h2>
          <p className="text-xs text-slate-500">
            Comparte este enlace por email, WhatsApp o en tu web.
          </p>
        </div>
        {isPublic ? (
          <Link
            href={`/empresa/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            Ver mi perfil público
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </Link>
        ) : (
          <Link
            href="/dashboard/company"
            className="text-xs font-semibold text-amber-600 hover:underline"
          >
            Tu perfil aún no es público · Activarlo
          </Link>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="material-symbols-outlined text-[16px] text-slate-400">link</span>
        <span className="truncate text-sm text-slate-600" data-testid="review-link">
          {reviewUrl}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </section>
  );
}
