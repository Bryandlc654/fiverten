'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { caseBadge } from '../../../components/cases/case-labels';
import { CaseComposer, CaseThread } from '../../../components/cases/CaseThread';
import PublicShell from '../../../components/public/PublicShell';
import { Stars } from '../../../components/reviews/Stars';
import { Alert, Badge, LoadingRow } from '../../../components/ui';
import { ApiError, api, type ClientCase } from '../../../lib/api';

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Qué se espera del cliente en cada fase. */
function guidance(data: ClientCase): { tone: 'info' | 'success'; text: string } {
  switch (data.status) {
    case 'awaiting_admin':
    case 'evidence_requested':
      return {
        tone: 'info',
        text: 'Antes de publicar una reseña de baja valoración necesitamos comprobar lo que describes. Adjunta fotos, facturas, capturas de conversaciones o cualquier prueba que lo respalde.',
      };
    case 'evidence_submitted':
      return {
        tone: 'info',
        text: 'Hemos recibido tus evidencias y las estamos revisando. Te avisaremos por correo cuando haya novedades.',
      };
    case 'company_notified':
    case 'company_responded':
      return {
        tone: 'info',
        text: `Hemos validado tus evidencias y hemos pedido a ${data.company} que dé su versión. Si llegáis a un acuerdo, la reseña puede retirarse; si no, decidiremos con las evidencias de ambas partes.`,
      };
    case 'closed':
      return {
        tone: data.outcome === 'rejected' ? 'info' : 'success',
        text:
          data.outcome === 'published'
            ? 'El caso se ha cerrado sin acuerdo y tu reseña ya es pública.'
            : data.outcome === 'withdrawn'
              ? 'Has llegado a un acuerdo con la empresa y la reseña se ha retirado. Gracias por tu colaboración.'
              : 'Tras revisar el caso, tu reseña no se publicará.',
      };
  }
}

/**
 * Enlace del correo para el caso de evidencias de una reseña de baja valoración.
 * No requiere cuenta: el token de la URL identifica el caso.
 */
export default function CasePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const [data, setData] = useState<ClientCase | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [agreeing, setAgreeing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.clientCase(token));
      setLoadError(null);
    } catch (err) {
      setLoadError(messageOf(err, 'No se pudo cargar el caso.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(body: string, files: File[]) {
    await api.clientCaseMessage(token, body, files);
    await load();
  }

  async function agree() {
    setAgreeing(true);
    setActionError(null);
    try {
      await api.clientCaseAgree(token);
      await load();
    } catch (err) {
      setActionError(messageOf(err, 'No se pudo registrar tu acuerdo'));
    } finally {
      setAgreeing(false);
    }
  }

  const badge = data ? caseBadge(data.status, data.outcome) : null;
  const info = data ? guidance(data) : null;
  const companyStage = data?.status === 'company_notified' || data?.status === 'company_responded';

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <LoadingRow label="Cargando el caso…" />
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <span className="material-symbols-outlined text-[44px] text-red-400">link_off</span>
            <h1 className="mt-2 text-xl font-bold">No podemos abrir este caso</h1>
            <p className="mt-2 text-sm text-slate-600">{loadError}</p>
            <p className="mt-2 text-xs text-slate-500">
              Cada correo que te enviamos sobre el caso lleva un enlace nuevo: usa el del correo más
              reciente.
            </p>
          </div>
        )}

        {data && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tu reseña sobre {data.company}
                </p>
                <h1 className="mt-1 text-xl font-bold">Revisión de evidencias</h1>
              </div>
              {badge && <Badge label={badge.label} tone={badge.tone} />}
            </header>

            {info && (
              <Alert tone={info.tone}>
                {info.text}
                {data.decisionReason && (
                  <span className="mt-1 block">Motivo: {data.decisionReason}</span>
                )}
              </Alert>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <Stars rating={data.review.rating} />
              {data.review.title && (
                <h2 className="mt-2 font-semibold text-slate-900">{data.review.title}</h2>
              )}
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{data.review.body}</p>
            </section>

            {actionError && <Alert tone="error">{actionError}</Alert>}

            {companyStage && (
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">¿Habéis llegado a un acuerdo?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Si la empresa ha solucionado tu problema, puedes aceptar que la reseña se retire.
                  Se retirará cuando la empresa también lo acepte y nuestro equipo cierre el caso.
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  <li className={data.agreements.client ? 'text-emerald-600' : 'text-slate-500'}>
                    {data.agreements.client
                      ? '✓ Has aceptado el acuerdo'
                      : '· Tu aceptación: pendiente'}
                  </li>
                  <li className={data.agreements.company ? 'text-emerald-600' : 'text-slate-500'}>
                    {data.agreements.company
                      ? `✓ ${data.company} ha aceptado el acuerdo`
                      : `· Aceptación de ${data.company}: pendiente`}
                  </li>
                </ul>
                {data.permissions.canAgree && (
                  <button
                    type="button"
                    disabled={agreeing}
                    onClick={() => void agree()}
                    className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {agreeing ? 'Guardando…' : 'Acepto retirar la reseña'}
                  </button>
                )}
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Conversación</h2>
              <CaseThread
                messages={data.messages}
                self="client"
                names={{ admin: 'Equipo FIVERTEN', company: data.company, client: 'Cliente' }}
                download={(fileId) => api.clientCaseFile(token, fileId)}
              />
              {data.permissions.canWrite && (
                <CaseComposer
                  placeholder={
                    data.status === 'evidence_requested'
                      ? 'Explica lo ocurrido y adjunta tus evidencias'
                      : 'Escribe un mensaje'
                  }
                  submitLabel={
                    data.status === 'evidence_requested' ? 'Enviar evidencias' : 'Enviar'
                  }
                  onSend={send}
                />
              )}
            </section>
          </>
        )}
      </div>
    </PublicShell>
  );
}
