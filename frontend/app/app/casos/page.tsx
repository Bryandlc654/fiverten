'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { caseBadge, formatDate } from '../../../components/cases/case-labels';
import { CaseComposer, CaseThread } from '../../../components/cases/CaseThread';
import { Stars } from '../../../components/reviews/Stars';
import { Alert, Badge, LoadingRow } from '../../../components/ui';
import { ApiError, api, type CompanyCase, type CompanyCaseSummary } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { roleAtLeast } from '../../../lib/roles';

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function CompanyCasesPage() {
  return (
    <Suspense fallback={null}>
      <CompanyCasesContent />
    </Suspense>
  );
}

function CompanyCasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const [items, setItems] = useState<CompanyCaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      setItems((await api.listCompanyCases()).items);
      setError(null);
    } catch (err) {
      setError(messageOf(err, 'No se pudieron cargar los casos'));
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const select = (id: string | null) =>
    router.replace(id ? `/app/casos?id=${id}` : '/app/casos', { scroll: false });

  return (
    <DashboardShell
      active="cases"
      title="Casos de reseñas"
      subtitle="Reseñas de baja valoración con evidencias del cliente: aporta tu versión"
    >
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          {!items ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <LoadingRow label="Cargando casos…" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No tienes casos abiertos. Te avisaremos por correo si un cliente aporta evidencias
              sobre una reseña de baja valoración.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const badge = caseBadge(item.status, item.outcome);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => select(item.id)}
                      className={`w-full rounded-xl border bg-white p-4 text-left transition hover:border-blue-300 ${
                        selectedId === item.id
                          ? 'border-[#356CFF] ring-1 ring-[#356CFF]'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Stars rating={item.review.rating} />
                        <Badge label={badge.label} tone={badge.tone} />
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                        {item.review.title ?? item.review.reviewerName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.review.reviewerName} · {formatDate(item.updatedAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          {selectedId ? (
            <CompanyCaseDetail key={selectedId} id={selectedId} onChange={() => void loadList()} />
          ) : (
            items &&
            items.length > 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Selecciona un caso para ver las evidencias y responder.
              </div>
            )
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function CompanyCaseDetail({ id, onChange }: { id: string; onChange: () => void }) {
  const { role } = useAuth();
  const [data, setData] = useState<CompanyCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreeing, setAgreeing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getCompanyCase(id));
      setError(null);
    } catch (err) {
      setError(messageOf(err, 'No se pudo cargar el caso'));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(body: string, files: File[]) {
    await api.sendCompanyCaseMessage(id, body, files);
    await load();
    onChange();
  }

  async function agree() {
    setAgreeing(true);
    setError(null);
    try {
      await api.agreeCompanyCase(id);
      await load();
      onChange();
    } catch (err) {
      setError(messageOf(err, 'No se pudo registrar el acuerdo'));
    } finally {
      setAgreeing(false);
    }
  }

  if (!data) {
    return error ? (
      <Alert tone="error">{error}</Alert>
    ) : (
      <div className="rounded-xl border border-slate-200 bg-white">
        <LoadingRow label="Cargando caso…" />
      </div>
    );
  }

  const badge = caseBadge(data.status, data.outcome);
  const canWrite = data.permissions.canWrite && roleAtLeast(role, 'editor');
  const canAgree = data.permissions.canAgree && roleAtLeast(role, 'editor');
  const open = data.status !== 'closed';

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Stars rating={data.review.rating} />
          <Badge label={badge.label} tone={badge.tone} />
        </div>
        {data.review.title && (
          <h2 className="mt-2 font-semibold text-slate-900">{data.review.title}</h2>
        )}
        <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{data.review.body}</p>
        <p className="mt-3 text-xs text-slate-500">
          {data.review.reviewerName} · {formatDate(data.review.createdAt)}
          {data.review.orderReference && ` · Pedido ${data.review.orderReference}`}
        </p>
      </section>

      {open ? (
        <Alert tone="info">
          Esta reseña aún no está publicada. El cliente ha aportado evidencias que el equipo de
          FIVERTEN considera válidas. Da tu versión y adjunta tus propias evidencias. Si llegáis a
          un acuerdo con el cliente, la reseña puede retirarse; si no, FIVERTEN decidirá.
        </Alert>
      ) : (
        <Alert tone={data.outcome === 'withdrawn' ? 'success' : 'info'}>
          {data.outcome === 'withdrawn'
            ? 'Caso cerrado por acuerdo: la reseña se ha retirado.'
            : data.outcome === 'published'
              ? 'Caso cerrado sin acuerdo: la reseña se ha publicado.'
              : 'Caso cerrado: la reseña no se publicará.'}
          {data.decisionReason && <span className="mt-1 block">Motivo: {data.decisionReason}</span>}
        </Alert>
      )}

      {open && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">Acuerdo con el cliente</h2>
          <p className="mt-1 text-sm text-slate-600">
            Si habéis resuelto el problema, ambas partes deben aceptar retirar la reseña. Después,
            FIVERTEN cerrará el caso.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li className={data.agreements.company ? 'text-emerald-600' : 'text-slate-500'}>
              {data.agreements.company
                ? '✓ Tu empresa ha aceptado el acuerdo'
                : '· Aceptación de tu empresa: pendiente'}
            </li>
            <li className={data.agreements.client ? 'text-emerald-600' : 'text-slate-500'}>
              {data.agreements.client
                ? '✓ El cliente ha aceptado el acuerdo'
                : '· Aceptación del cliente: pendiente'}
            </li>
          </ul>
          {canAgree && (
            <button
              type="button"
              disabled={agreeing}
              onClick={() => void agree()}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {agreeing ? 'Guardando…' : 'Aceptamos retirar la reseña'}
            </button>
          )}
          {data.permissions.canAgree && !canAgree && (
            <p className="mt-3 text-xs text-slate-500">
              Aceptar el acuerdo lo decide un responsable o administrador de la empresa.
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Evidencias y conversación</h2>
        <CaseThread
          messages={data.messages}
          self="company"
          names={{ admin: 'Equipo FIVERTEN', client: data.review.reviewerName, company: 'Empresa' }}
          download={(fileId) => api.companyCaseFile(id, fileId)}
        />
        {canWrite && (
          <CaseComposer
            placeholder="Explica tu versión de lo ocurrido y adjunta tus evidencias"
            submitLabel="Enviar"
            onSend={send}
          />
        )}
      </section>
    </div>
  );
}
