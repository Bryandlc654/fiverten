'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent } from 'react';
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
  coverUrl: string;
  isPublic: boolean;
  allowContact: boolean;
  hideLowRatings: boolean;
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
    coverUrl: org.coverUrl ?? '',
    isPublic: org.isPublic,
    allowContact: org.allowContact,
    hideLowRatings: org.hideLowRatings,
  };
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

async function prepareCoverImage(file: File): Promise<File> {
  // Los GIF conservan su animacion; el resto se redimensiona/comprime para no
  // superar el limite del servidor (5 MB).
  if (file.type === 'image/gif' || file.size <= 600 * 1024) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob) {
      return file;
    }
    return new File([blob], 'cover.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';

export default function CompanyPage() {
  const router = useRouter();
  const { role, isSuperAdmin } = useAuth();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
      payload.coverUrl = form.coverUrl ? form.coverUrl : null;
      payload.isPublic = form.isPublic;
      payload.allowContact = form.allowContact;
      payload.hideLowRatings = form.hideLowRatings;

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

  async function onCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !form) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('El archivo debe ser una imagen');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('La imagen supera el máximo de 5 MB');
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const prepared = await prepareCoverImage(file);
      const { url } = await api.uploadOrganizationCover(prepared);
      setForm((prev) => (prev ? { ...prev, coverUrl: url } : prev));
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
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
          <div className="flex items-center gap-3 text-sm text-slate-500">Cargando empresa…</div>
        ) : loadError ? (
          isSuperAdmin ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <span className="material-symbols-outlined text-[32px] text-slate-400">
                storefront
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Esta sección pertenece a las empresas
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Como administrador general no tienes una empresa asignada. Gestiona las empresas
                desde el panel general.
              </p>
              <button
                type="button"
                onClick={() => router.push('/admin?tab=organizations')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                Ir a Empresas
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          )
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
              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Imagen de portada
                </span>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="relative aspect-[3/1] w-full bg-slate-100">
                    {form.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.coverUrl}
                        alt="Portada de la empresa"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                        <span className="material-symbols-outlined text-[32px]">image</span>
                        <span className="text-xs">Sin portada</span>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-600">
                        Subiendo…
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label
                    className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
                      !canEdit || uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    {form.coverUrl ? 'Cambiar portada' : 'Subir portada'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={onCoverChange}
                      disabled={!canEdit || uploading}
                    />
                  </label>
                  {form.coverUrl && canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        setForm((prev) => (prev ? { ...prev, coverUrl: '' } : prev));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Quitar
                    </button>
                  )}
                </div>
                {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  Recomendado 3:1. JPG, PNG, WEBP, GIF o AVIF, hasta 5 MB. Se guarda al pulsar
                  &quot;Guardar cambios&quot;.
                </p>
              </div>

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
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Razón social
                </span>
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

              <label className="flex items-start gap-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.hideLowRatings}
                  onChange={(e) => update('hideLowRatings', e.target.checked)}
                  disabled={!canEdit}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Ocultar las reseñas de 1 y 2 estrellas en el perfil público
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Seguirás viéndolas en tu panel. La puntuación media se calcula con todas las
                    reseñas y los visitantes verán un aviso de que hay reseñas ocultas.
                  </span>
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
