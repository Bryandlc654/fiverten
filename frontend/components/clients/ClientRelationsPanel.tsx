'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Field, inputClass } from '../ui';
import {
  ApiError,
  api,
  type ClientRelation,
  type ClientRelationStatus,
  type VerificationProject,
} from '../../lib/api';

const STATUS_LABELS: Record<ClientRelationStatus, string> = {
  invited: 'Invitado',
  active: 'Activo',
  completed: 'Completado',
  revoked: 'Revocado',
};

const LEVEL_LABELS: Record<string, string> = {
  identified: 'Identificado',
  confirmed: 'Confirmado',
  verified: 'Verificado',
};

export default function ClientRelationsPanel() {
  const [relations, setRelations] = useState<ClientRelation[] | null>(null);
  const [projects, setProjects] = useState<VerificationProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [level, setLevel] = useState<'identified' | 'confirmed' | 'verified'>('identified');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [relationData, verification] = await Promise.all([
        api.listClientRelations(),
        api.myVerification(),
      ]);
      setRelations(relationData.items);
      setProjects(verification.request?.projects ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los clientes');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!projectId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.createClientRelation({
        projectId,
        contactName,
        contactEmail,
        consent,
        verificationLevel: level,
      });
      setContactName('');
      setContactEmail('');
      setConsent(false);
      setLevel('identified');
      setNotice('Relación con cliente creada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la relación');
    } finally {
      setBusy(false);
    }
  }

  async function update(relation: ClientRelation, status: ClientRelationStatus) {
    setBusy(true);
    setError(null);
    try {
      await api.updateClientRelation(relation.id, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la relación');
    } finally {
      setBusy(false);
    }
  }

  async function remove(relation: ClientRelation) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteClientRelation(relation.id);
      setNotice('Relación eliminada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la relación');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Relaciones de proyecto</h2>
          <p className="text-xs text-slate-500">
            Vincula cada proyecto con su cliente, consentimiento y nivel de verificación.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {relations?.length ?? 0} relaciones
        </span>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Proyecto" className="block">
          <select
            required
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nivel de verificación" className="block">
          <select
            value={level}
            onChange={(event) =>
              setLevel(event.target.value as 'identified' | 'confirmed' | 'verified')
            }
            className={inputClass}
          >
            <option value="identified">Identificado</option>
            <option value="confirmed">Confirmado</option>
            <option value="verified">Verificado</option>
          </select>
        </Field>
        <Field label="Nombre del cliente" className="block">
          <input
            required
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Correo del cliente" className="block">
          <input
            required
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <label className="flex items-start gap-2 text-xs text-slate-600 sm:col-span-2">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          El cliente ha dado su consentimiento para gestionar esta relación y recibir solicitudes de
          reseña.
        </label>
        <button
          type="submit"
          disabled={busy || !projectId}
          className="justify-self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2"
        >
          Añadir cliente
        </button>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4">
        {!relations ? (
          <p className="text-sm text-slate-500">Cargando relaciones…</p>
        ) : relations.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay clientes vinculados. Añade uno para relacionarlo con un proyecto.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {relations.map((relation) => (
              <li
                key={relation.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {relation.contactName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {relation.contactEmail} · {relation.projectName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {STATUS_LABELS[relation.status]} ·{' '}
                    {LEVEL_LABELS[relation.verificationLevel] ?? relation.verificationLevel} ·{' '}
                    {relation.consent ? 'Consentimiento registrado' : 'Sin consentimiento'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {relation.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => void update(relation, 'completed')}
                      disabled={busy}
                      className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      Completar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(relation)}
                    disabled={busy}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
