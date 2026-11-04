'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, Field, inputClass } from '../../../components/ui';
import { ApiError, api, type VerificationStatusResponse } from '../../../lib/api';

export default function ProjectsPage() {
  const [data, setData] = useState<VerificationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [projectName, setProjectName] = useState('');
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
      });
      for (const file of projectFiles) {
        await api.uploadProjectVerificationDocument(project.id, file);
      }
      setNotice(
        projectFiles.length > 0
          ? `Proyecto añadido con ${projectFiles.length} archivo(s) de evidencia`
          : 'Proyecto añadido',
      );
      setProjectName('');
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
            <Link href="/app/documentos" className="text-sm font-semibold text-blue-600 hover:underline">
              Documentos →
            </Link>
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
              </div>
              <Field label="Descripción (opcional)" className="block">
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  className={inputClass}
                />
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
