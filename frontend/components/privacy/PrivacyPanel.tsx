'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Field, inputClass } from '../ui';
import {
  ApiError,
  api,
  type PrivacyRequest,
  type PrivacyRequestType,
} from '../../lib/api';

const TYPES: { value: PrivacyRequestType; label: string }[] = [
  { value: 'access', label: 'Acceso a mis datos' },
  { value: 'rectification', label: 'Rectificación de mis datos' },
  { value: 'erasure', label: 'Supresión de mis datos' },
  { value: 'objection', label: 'Oposición al tratamiento' },
];

const STATUS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En tramitación',
  completed: 'Completada',
  rejected: 'Rechazada',
};

export default function PrivacyPanel() {
  const [items, setItems] = useState<PrivacyRequest[] | null>(null);
  const [type, setType] = useState<PrivacyRequestType>('access');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listPrivacyRequests();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las solicitudes');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.createPrivacyRequest({ type, details: details.trim() || undefined });
      setDetails('');
      setNotice('Solicitud registrada. El equipo de FIVERTEN la tramitará.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.exportPrivacyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fiverten-datos-personales.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo exportar los datos');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Privacidad y derechos GDPR</h2>
          <p className="mt-1 text-xs text-slate-500">
            Descarga tus datos o solicita acceso, rectificación, supresión u oposición.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Descargar mis datos
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[240px_1fr_auto] sm:items-end">
        <Field label="Tipo de solicitud" className="block">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as PrivacyRequestType)}
            className={inputClass}
          >
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Detalle (opcional)" className="block">
          <input
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            className={inputClass}
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Solicitar
        </button>
      </form>

      <ul className="mt-4 divide-y divide-slate-100">
        {!items ? (
          <li className="py-2 text-xs text-slate-500">Cargando solicitudes…</li>
        ) : items.length === 0 ? (
          <li className="py-2 text-xs text-slate-500">No hay solicitudes registradas.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-semibold text-slate-900">
                  {TYPES.find((entry) => entry.value === item.type)?.label ?? item.type}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString('es-ES')} ·{' '}
                  {item.details || 'Sin detalle'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {STATUS[item.status] ?? item.status}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
