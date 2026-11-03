'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { caseBadge, formatDate } from '../../../components/cases/case-labels';
import { CaseThread } from '../../../components/cases/CaseThread';
import { Stars } from '../../../components/reviews/Stars';
import { Alert, Badge, LoadingRow, inputClass } from '../../../components/ui';
import Pagination from '../../../components/ui/Pagination';
import { ApiError, api, type AdminCase, type AdminCaseList } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PAGE_SIZE = 20;

type Scope = 'active' | 'closed' | 'all';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'active', label: 'Abiertos' },
  { key: 'closed', label: 'Cerrados' },
  { key: 'all', label: 'Todos' },
];

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function AdminCasesPage() {
  return (
    <Suspense fallback={null}>
      <AdminCasesContent />
    </Suspense>
  );
}

function AdminCasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const { isSuperAdmin, isLoading } = useAuth();
  const [scope, setScope] = useState<Scope>('active');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminCaseList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, isSuperAdmin, router]);

  const load = useCallback(async () => {
    try {
      setData(await api.adminListCases({ scope, page, pageSize: PAGE_SIZE }));
      setError(null);
    } catch (err) {
      setError(messageOf(err, 'No se pudieron cargar los casos'));
    }
  }, [scope, page]);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  const select = (id: string | null) =>
    router.replace(id ? `/admin/casos?id=${id}` : '/admin/casos', { scroll: false });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <DashboardShell
      active="adminCases"
      title="Casos de evidencias"
      subtitle="Reseñas de 1 y 2 estrellas: evidencias del cliente y defensa de la empresa"
    >
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {SCOPES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setScope(item.key);
                  setPage(1);
                }}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  scope === item.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {item.label}
                {item.key === 'active' && data?.queue.needsAdmin ? (
                  <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {data.queue.needsAdmin}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {!data ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <LoadingRow label="Cargando casos…" />
            </div>
          ) : data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              {scope === 'active' ? 'No hay casos abiertos.' : 'No hay casos.'}
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {data.items.map((item) => {
                  const badge = caseBadge(item.status, item.outcome);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id)}
                        className={`w-full rounded-xl border bg-white p-4 text-left transition hover:border-blue-300 ${
                          selectedId === item.id
                            ? 'border-[#2563eb] ring-1 ring-[#2563eb]'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                            {item.needsAdmin && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                                title="Requiere tu acción"
                              />
                            )}
                            {item.organization.tradeName}
                          </span>
                          <Badge label={badge.label} tone={badge.tone} />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Stars rating={item.review.rating} />
                          <span className="truncate text-xs text-slate-500">
                            {item.review.reviewerName}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(item.updatedAt)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {pages > 1 && (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <Pagination
                    summary={`${data.total} casos`}
                    page={page}
                    pages={pages}
                    onPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div>
          {selectedId ? (
            <AdminCaseDetail key={selectedId} id={selectedId} onChange={() => void load()} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Selecciona un caso para revisarlo.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

type Mode = 'request-evidence' | 'messages' | 'validate' | 'reject' | 'publish' | 'withdraw';

const MODES: Record<
  Mode,
  { label: string; hint: string; button: string; tone: string; min: number; placeholder: string }
> = {
  'request-evidence': {
    label: 'Pedir evidencias al cliente',
    hint: 'El cliente recibirá un correo con un enlace para leer tu mensaje y subir sus pruebas.',
    button: 'Enviar petición',
    tone: 'bg-[#2563eb] hover:bg-blue-600',
    min: 10,
    placeholder: 'Para publicar tu reseña necesitamos que aportes pruebas de lo que describes…',
  },
  messages: {
    label: 'Escribir a las partes',
    hint: 'Lo recibe el cliente y, si ya ha sido notificada, la empresa.',
    button: 'Enviar mensaje',
    tone: 'bg-[#2563eb] hover:bg-blue-600',
    min: 10,
    placeholder: 'Mensaje',
  },
  validate: {
    label: 'Validar evidencias y notificar a la empresa',
    hint: 'La empresa verá la reseña, las evidencias del cliente y este mensaje (no la conversación previa).',
    button: 'Validar y notificar',
    tone: 'bg-emerald-600 hover:bg-emerald-700',
    min: 10,
    placeholder:
      'Hemos revisado las evidencias del cliente y las consideramos válidas. Aporta tu versión y tus evidencias.',
  },
  reject: {
    label: 'Rechazar la reseña',
    hint: 'Evidencias inexistentes o no válidas. La reseña no se publicará y el caso se cierra.',
    button: 'Rechazar reseña',
    tone: 'bg-red-600 hover:bg-red-700',
    min: 5,
    placeholder: 'Motivo (se envía al cliente)',
  },
  publish: {
    label: 'Publicar la reseña',
    hint: 'Sin acuerdo entre las partes. La reseña se publica y el caso se cierra.',
    button: 'Publicar reseña',
    tone: 'bg-[#2563eb] hover:bg-blue-600',
    min: 0,
    placeholder: 'Nota opcional',
  },
  withdraw: {
    label: 'Retirar por acuerdo',
    hint: 'Cliente y empresa han aceptado retirarla. La reseña se retira y el caso se cierra.',
    button: 'Retirar reseña',
    tone: 'bg-emerald-600 hover:bg-emerald-700',
    min: 0,
    placeholder: 'Nota opcional (p. ej. reembolso acordado)',
  },
};

/** Acciones disponibles en cada fase (mismas reglas que el backend). */
function modesFor(data: AdminCase): Mode[] {
  switch (data.status) {
    case 'awaiting_admin':
      return ['request-evidence', 'reject'];
    case 'evidence_requested':
      return ['request-evidence', 'messages', 'reject'];
    case 'evidence_submitted':
      return ['validate', 'messages', 'request-evidence', 'reject'];
    case 'company_notified':
    case 'company_responded':
      return data.clientAgreed && data.companyAgreed
        ? ['withdraw', 'messages', 'publish']
        : ['messages', 'publish', 'withdraw'];
    case 'closed':
      return [];
  }
}

function AdminCaseDetail({ id, onChange }: { id: string; onChange: () => void }) {
  const [data, setData] = useState<AdminCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.adminGetCase(id));
      setError(null);
    } catch (err) {
      setError(messageOf(err, 'No se pudo cargar el caso'));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function choose(next: Mode) {
    setMode(next);
    setText('');
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mode) return;
    setBusy(true);
    setError(null);
    try {
      const value = text.trim();
      const updated =
        mode === 'reject' || mode === 'publish' || mode === 'withdraw'
          ? await api.adminDecideCase(id, mode, value || undefined)
          : await api.adminCaseStep(id, mode, value);
      setData(updated);
      setMode(null);
      setText('');
      onChange();
    } catch (err) {
      setError(messageOf(err, 'No se pudo completar la acción'));
    } finally {
      setBusy(false);
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
  const modes = modesFor(data);
  const withdrawBlocked = !(data.clientAgreed && data.companyAgreed);
  const companyStage = data.status === 'company_notified' || data.status === 'company_responded';
  const current = mode ? MODES[mode] : null;

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <a
              href={`/empresa/${data.organization.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-slate-900 hover:text-[#2563eb]"
            >
              {data.organization.tradeName}
            </a>
            <p className="mt-0.5 text-xs text-slate-500">
              Caso abierto el {formatDate(data.createdAt)}
            </p>
          </div>
          <Badge label={badge.label} tone={badge.tone} />
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Stars rating={data.review.rating} />
          {data.review.title && (
            <h2 className="mt-2 font-semibold text-slate-900">{data.review.title}</h2>
          )}
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{data.review.body}</p>
          <p className="mt-3 text-xs text-slate-500">
            {data.review.reviewerName} · {data.review.reviewerEmail}
            {data.review.orderReference && ` · Pedido ${data.review.orderReference}`}
            {data.review.experienceDate &&
              ` · Experiencia del ${new Date(data.review.experienceDate).toLocaleDateString('es-ES')}`}
          </p>
          {data.review.antifraud.length > 0 && (
            <p className="mt-2 text-xs text-amber-600">
              Antifraude: {data.review.antifraud.join(', ')}
            </p>
          )}
        </div>
      </section>

      {data.status === 'closed' && data.decisionReason && (
        <Alert tone="info">Motivo de la decisión: {data.decisionReason}</Alert>
      )}

      {companyStage && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm">
          <span className={data.clientAgreed ? 'text-emerald-600' : 'text-slate-500'}>
            {data.clientAgreed ? '✓' : '·'} Cliente{' '}
            {data.clientAgreed ? 'acepta' : 'no ha aceptado'} el acuerdo
          </span>
          <span className={data.companyAgreed ? 'text-emerald-600' : 'text-slate-500'}>
            {data.companyAgreed ? '✓' : '·'} Empresa{' '}
            {data.companyAgreed ? 'acepta' : 'no ha aceptado'} el acuerdo
          </span>
        </div>
      )}

      {modes.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">Acciones</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {modes.map((item) => {
              const disabled = item === 'withdraw' && withdrawBlocked;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={disabled}
                  title={disabled ? 'El cliente y la empresa deben aceptar el acuerdo' : undefined}
                  onClick={() => choose(item)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    mode === item
                      ? 'border-[#2563eb] bg-blue-50 text-[#2563eb]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {MODES[item].label}
                </button>
              );
            })}
          </div>

          {mode && current && (
            <form onSubmit={submit} className="mt-4 space-y-2">
              <p className="text-xs text-slate-500">{current.hint}</p>
              <textarea
                rows={3}
                maxLength={3000}
                required={current.min > 0}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={current.placeholder}
                className={inputClass}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy || text.trim().length < current.min}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${current.tone}`}
                >
                  {busy ? 'Guardando…' : current.button}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Conversación y evidencias</h2>
        <CaseThread
          messages={data.messages}
          self="admin"
          names={{
            admin: 'FIVERTEN',
            client: `${data.review.reviewerName} (cliente)`,
            company: `${data.organization.tradeName} (empresa)`,
          }}
          download={(fileId) => api.adminCaseFile(id, fileId)}
        />
      </section>
    </div>
  );
}
