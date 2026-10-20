'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PublicShell from '../../components/public/PublicShell';
import { ApiError, api } from '../../lib/api';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'done';
      status: 'published' | 'under_review';
      organization: { slug: string; tradeName: string; isPublic: boolean };
    };

export default function ConfirmReviewPage() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setState({ kind: 'error', message: 'Falta el token de confirmación en el enlace.' });
      return;
    }
    let active = true;
    api
      .confirmReview(token)
      .then((result) => {
        if (active) setState({ kind: 'done', ...result });
      })
      .catch((err) => {
        if (active) {
          setState({
            kind: 'error',
            message: err instanceof ApiError ? err.message : 'No se pudo confirmar la reseña.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
        {state.kind === 'loading' && (
          <p className="text-sm text-slate-500">Confirmando tu reseña…</p>
        )}

        {state.kind === 'error' && (
          <>
            <span className="material-symbols-outlined text-[44px] text-red-400">link_off</span>
            <h1 className="mt-2 text-xl font-bold">No hemos podido confirmar la reseña</h1>
            <p className="mt-2 text-sm text-slate-600">{state.message}</p>
          </>
        )}

        {state.kind === 'done' && state.status === 'published' && (
          <>
            <span className="material-symbols-outlined text-[44px] text-emerald-500">task_alt</span>
            <h1 className="mt-2 text-xl font-bold">¡Gracias! Tu reseña está publicada</h1>
            <p className="mt-2 text-sm text-slate-600">
              Tu opinión sobre <strong>{state.organization.tradeName}</strong> ya ayuda a otros
              clientes.
            </p>
            {state.organization.isPublic && (
              <Link
                href={`/empresa/${state.organization.slug}`}
                className="mt-5 inline-flex rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver mi reseña
              </Link>
            )}
          </>
        )}

        {state.kind === 'done' && state.status === 'under_review' && (
          <>
            <span className="material-symbols-outlined text-[44px] text-amber-500">
              hourglass_top
            </span>
            <h1 className="mt-2 text-xl font-bold">Correo confirmado</h1>
            <p className="mt-2 text-sm text-slate-600">
              Tu reseña sobre <strong>{state.organization.tradeName}</strong> necesita una revisión
              rápida de nuestro equipo antes de publicarse. No tienes que hacer nada más.
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}
