'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { ApiError, api, type OrganizationDetail } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { roleAtLeast } from '../../../lib/roles';

interface FormState {
  tradeName: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  isPublic: boolean;
  allowContact: boolean;
}

function toForm(org: OrganizationDetail): FormState {
  return {
    tradeName: org.tradeName ?? '',
    legalName: org.legalName ?? '',
    taxId: org.taxId ?? '',
    email: org.email ?? '',
    phone: org.phone ?? '',
    website: org.website ?? '',
    description: org.description ?? '',
    isPublic: org.isPublic,
    allowContact: org.allowContact,
  };
}

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';

export default function CompanyPage() {
  const { role, isSuperAdmin } = useAuth();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canEdit = isSuperAdmin || roleAtLeast(role, 'admin');

  useEffect(() => {
    let active = true;
    api
      .getMyOrganization()
      .then((data) => {
        if (active) {
          setOrg(data);
          setForm(toForm(data));
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof ApiError ? err.message : 'No se pudo cargar la empresa');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !canEdit) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = { tradeName: form.tradeName.trim() };
      if (form.legalName.trim()) payload.legalName = form.legalName.trim();
      if (form.taxId.trim()) payload.taxId = form.taxId.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.website.trim()) payload.website = form.website.trim();
      payload.description = form.description.trim();
      payload.isPublic = form.isPublic;
      payload.allowContact = form.allowContact;

      const updated = await api.updateMyOrganization(payload);
      setOrg(updated);
      setForm(toForm(updated));
      setNotice('Datos de la empresa actualizados.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      active="company"
      title="Empresa"
      subtitle="Datos y edición del perfil de la empresa"
    >
      <div className="mx-auto max-w-3xl">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando empresa…
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        ) : form ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Datos de la empresa</h2>
                <p className="text-xs text-slate-500">
                  {org?.publicId} · /{org?.slug}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {canEdit ? 'Edición habilitada' : 'Solo lectura'}
              </span>
            </div>

            {notice && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Nombre comercial
                </span>
                <input
                  value={form.tradeName}
                  onChange={(e) => update('tradeName', e.target.value)}
                  disabled={!canEdit}
                  required
                  className={INPUT_CLASS}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Razón social</span>
                <input
                  value={form.legalName}
                  onChange={(e) => update('legalName', e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">CIF / NIF</span>
                <input
                  value={form.taxId}
                  onChange={(e) => update('taxId', e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Correo</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Teléfono</span>
                <input
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Sitio web</span>
                <input
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Descripción</span>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex items-center gap-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => update('isPublic', e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Mostrar el perfil de la empresa públicamente
                </span>
              </label>

              <label className="flex items-center gap-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.allowContact}
                  onChange={(e) => update('allowContact', e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Permitir que los clientes contacten a través del perfil
                </span>
              </label>

              {canEdit && (
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </form>

            <p className="mt-4 text-xs text-slate-400">
              Estado: {org?.status} · Verificación: {org?.verificationStatus}
            </p>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
