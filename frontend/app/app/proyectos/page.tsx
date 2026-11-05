'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, Field, inputClass } from '../../../components/ui';
import { ApiError, api, type VerificationStatusResponse } from '../../../lib/api';

const CLIENT_STATUS: Record<string, string> = {
  identified: 'Cliente identificado',
  invited: 'Cliente invitado',
  verified: 'Cliente verificado',
};

export default function ProjectsPage() {
  const [data, setData] = useState<VerificationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('reforma_integral');
  const [projectCity, setProjectCity] = useState('');
  const [projectYear, setProjectYear] = useState(String(new Date().getFullYear()));
  const [projectStatus, setProjectStatus] = useState('completed');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [projectVisibility, setProjectVisibility] = useState('public');
  const [evidenceType, setEvidenceType] = useState('contract');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectFiles, setProjectFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.myVerification());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los proyectos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  async function addProject(event: FormEvent) {
    event.preventDefault();
    if (!projectName.trim()) return;
    if (projectFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      setError('Cada archivo de evidencia debe pesar como máximo 10 MB');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const project = await api.addVerificationProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        url: projectUrl.trim() || undefined,
        projectType,
        city: projectCity.trim() || undefined,
        location: projectLocation.trim() || undefined,
        startDate: projectStartDate || undefined,
        endDate: projectEndDate || undefined,
        publicVisibility: projectVisibility as 'private' | 'public' | 'restricted',
        year: Number(projectYear) || undefined,
        status: projectStatus,
      });
      for (const file of projectFiles) {
        await api.uploadProjectVerificationDocument(project.id, file, evidenceType);
      }
      setNotice(
        projectFiles.length > 0
          ? `Proyecto añadido con ${projectFiles.length} archivo(s) de evidencia`
          : 'Proyecto añadido',
      );
      setProjectName('');
      setProjectCity('');
      setProjectLocation('');
      setProjectStartDate('');
      setProjectEndDate('');
      setProjectDescription('');
      setProjectUrl('');
      setProjectFiles([]);
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo añadir el proyecto');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) {
    return (
      <DashboardShell active="proyectos" title="Proyectos" subtitle="Proyectos y evidencias verificables">
        {error ? <Alert tone="error">{error}</Alert> : <p className="text-sm text-slate-500">Cargando…</p>}
      </DashboardShell>
    );
  }

  const request = data.request;
  const projects = request?.projects ?? [];

  return (
    <DashboardShell
      active="proyectos"
      title="Proyectos"
      subtitle="Proyectos y evidencias que FIVERTEN puede comprobar"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Evidencias de actividad
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {data.requirements.minProjects} proyecto(s) como mínimo
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Añade proyectos reales y adjunta imágenes o PDF que demuestren tu actividad.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link href="/app/clientes" className="text-blue-600 hover:underline">
                Invitar cliente
              </Link>
              <Link href="/app/sello" className="text-blue-600 hover:underline">
                Solicitar verificación
              </Link>
              <Link href="/app/documentos" className="text-blue-600 hover:underline">
                Documentos
              </Link>
            </div>
          </div>
        </section>

        {data.canSubmit ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Añadir proyecto</h2>
            <form onSubmit={addProject} className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nombre del proyecto" className="block">
                  <input
                    required
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="URL (opcional)" className="block">
                  <input
                    value={projectUrl}
                    onChange={(event) => setProjectUrl(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Tipo de proyecto" className="block">
                  <select
                    value={projectType}
                    onChange={(event) => setProjectType(event.target.value)}
                    className={inputClass}
                  >
                    <option value="reforma_integral">Reforma integral</option>
                    <option value="obra_nueva">Obra nueva</option>
                    <option value="rehabilitacion">Rehabilitación</option>
                    <option value="instalacion">Instalación</option>
                    <option value="consultoria">Consultoría</option>
                    <option value="otro">Otro</option>
                  </select>
                </Field>
                <Field label="Ciudad / área" className="block">
                  <input
                    value={projectCity}
                    onChange={(event) => setProjectCity(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Ubicación completa (opcional)" className="block">
                  <input
                    value={projectLocation}
                    onChange={(event) => setProjectLocation(event.target.value)}
                    placeholder="Dirección o zona del proyecto"
                    className={inputClass}
                  />
                </Field>
                <Field label="Fecha de inicio (opcional)" className="block">
                  <input
                    type="date"
                    value={projectStartDate}
                    onChange={(event) => setProjectStartDate(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Fecha de fin (opcional)" className="block">
                  <input
                    type="date"
                    value={projectEndDate}
                    onChange={(event) => setProjectEndDate(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Año" className="block">
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    value={projectYear}
                    onChange={(event) => setProjectYear(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Estado" className="block">
                  <select
                    value={projectStatus}
                    onChange={(event) => setProjectStatus(event.target.value)}
                    className={inputClass}
                  >
                    <option value="completed">Finalizado</option>
                    <option value="ongoing">En curso</option>
                  </select>
                </Field>
                <Field label="Visibilidad pública" className="block">
                  <select
                    value={projectVisibility}
                    onChange={(event) => setProjectVisibility(event.target.value)}
                    className={inputClass}
                  >
                    <option value="public">Público</option>
                    <option value="private">Privado</option>
                    <option value="restricted">Restringido</option>
                  </select>
                </Field>
              </div>
              <Field label="Descripción (opcional)" className="block">
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tipo de evidencia" className="block">
                  <select
                    value={evidenceType}
                    onChange={(event) => setEvidenceType(event.target.value)}
                    className={inputClass}
                  >
                    <option value="contract">Contrato</option>
                    <option value="budget">Presupuesto</option>
                    <option value="invoice">Factura</option>
                    <option value="photos">Fotografías</option>
                    <option value="certificate">Certificado</option>
                    <option value="act">Acta</option>
                    <option value="other">Otra</option>
                  </select>
                </Field>
                <Field label="Archivos de evidencia (máx. 10 MB cada uno)" className="block">
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
                    onChange={(event) => setProjectFiles(Array.from(event.target.files ?? []))}
                    className={inputClass}
                  />
                </Field>
              </div>
              {projectFiles.length > 0 && (
                <p className="text-[11px] text-slate-500">
                  {projectFiles.map((file) => file.name).join(' · ')}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !projectName.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Añadir proyecto
              </button>
            </form>
          </section>
        ) : (
          <Alert tone="info">
            Los proyectos no se pueden modificar mientras hay una solicitud en revisión o la
            verificación está vigente.
          </Alert>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Proyectos registrados</h2>
          {projects.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Todavía no hay proyectos.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {projects.map((project) => (
                <li key={project.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{project.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[
                          project.projectType?.replaceAll('_', ' '),
                          project.city,
                          project.year,
                          project.status === 'ongoing' ? 'En curso' : 'Finalizado',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Sin clasificar'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {project.publicVisibility === 'public'
                            ? 'Visible en el perfil'
                            : project.publicVisibility === 'restricted'
                              ? 'Visibilidad restringida'
                              : 'Proyecto privado'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {CLIENT_STATUS[project.clientStatus] ?? project.clientStatus}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            project.verifiedAt
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {project.verifiedAt ? 'Verificación completada' : 'Pendiente de verificar'}
                        </span>
                      </div>
                      {project.location && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Ubicación: {project.location}
                        </p>
                      )}
                      {(project.startDate || project.endDate) && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {project.startDate
                            ? new Date(project.startDate).toLocaleDateString('es-ES')
                            : '—'}{' '}
                          →{' '}
                          {project.endDate
                            ? new Date(project.endDate).toLocaleDateString('es-ES')
                            : '—'}
                        </p>
                      )}
                      {project.verificationScope && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Alcance: {project.verificationScope}
                        </p>
                      )}
                      {project.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{project.description}</p>
                      )}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="mt-1 inline-flex text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Ver proyecto
                        </a>
                      )}
                    </div>
                    {data.canSubmit && (
                      <button
                        type="button"
                        onClick={() =>
                          void run(
                            () => api.deleteVerificationProject(project.id),
                            'Proyecto eliminado',
                          )
                        }
                        disabled={busy}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {project.documents.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                      {project.documents.map((document) => (
                        <li key={document.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="truncate">{document.filename}</span>
                          <span>{(document.size / 1024).toFixed(0)} KB</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <Link href="/app/sello" className="text-sm font-semibold text-blue-600 hover:underline">
              Enviar solicitud y gestionar el sello →
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
