'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, inputClass } from '../../../components/ui';
import { ApiError, api, type PrivacyRequest, type PrivacyRequestStatus } from '../../../lib/api';

const TYPE_LABELS: Record<string, string> = {
  access: 'Acceso',
  rectification: 'Rectificación',
  erasure: 'Supresión',
  objection: 'Oposición',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En tramitación',
  completed: 'Completada',
  rejected: 'Rechazada',
};

export default function AdminPrivacyPage() {
  const [items, setItems] = useState<PrivacyRequest[] | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.adminListPrivacyRequests({ page: 1, pageSize: 100 });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las solicitudes');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(request: PrivacyRequest, status: PrivacyRequestStatus) {
    setBusy(request.id);
    setError(null);
    setNotice(null);
    try {
      await api.adminCompletePrivacyRequest(request.id, {
        status: status === 'completed' ? 'completed' : 'rejected',
        response: responses[request.id]?.trim() || undefined,
      });
      setNotice('Solicitud actualizada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la solicitud');
    } finally {
      setBusy(null);
    }
  }

  return (
    <DashboardShell
      active="adminPrivacy"
      title="Privacidad"
      subtitle="Solicitudes de derechos GDPR"
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <section className="rounded-xl border border-slate-200 bg-white">
          {!items ? (
            <p className="px-5 py-5 text-sm text-slate-500">Cargando solicitudes…</p>
          ) : items.length === 0 ? (
            <p className="px-5 py-5 text-sm text-slate-500">No hay solicitudes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((request) => (
                <li key={request.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {TYPE_LABELS[request.type] ?? request.type} · {request.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(request.createdAt).toLocaleString('es-ES')} ·{' '}
                        {request.details || 'Sin detalle'}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {STATUS_LABELS[request.status] ?? request.status}
                    </span>
                  </div>
                  {(request.status === 'pending' || request.status === 'in_progress') && (
                    <div className="flex flex-wrap items-end gap-2">
                      <input
                        value={responses[request.id] ?? ''}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Respuesta al solicitante"
                        className={`${inputClass} min-w-64 flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => void complete(request, 'completed')}
                        disabled={busy === request.id}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Completar
                      </button>
                      <button
                        type="button"
                        onClick={() => void complete(request, 'rejected')}
                        disabled={busy === request.id}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                  {request.response && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {request.response}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
