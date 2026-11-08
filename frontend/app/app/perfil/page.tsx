'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import LocationsPanel from '../../../components/organizations/LocationsPanel';
import {
  ApiError,
  api,
  type OrganizationDetail,
  type PublicCatalogs,
  resolveAssetUrl,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { roleAtLeast } from '../../../lib/roles';
import { ORGANIZATION_DESCRIPTION_MAX_LENGTH } from '../../../lib/organization';
import { slugify } from '../../../lib/slug';

interface FormState {
  tradeName: string;
  slug: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  presentationUrl: string;
  logoUrl: string;
  coverUrl: string;
  isPublic: boolean;
  allowContact: boolean;
  hideLowRatings: boolean;
  notifyNewReviews: boolean;
  notifyNegativeReviews: boolean;
  sectorId: string;
  countryId: string;
}

function toForm(org: OrganizationDetail): FormState {
  return {
    tradeName: org.tradeName ?? '',
    slug: org.slug ?? '',
    legalName: org.legalName ?? '',
    taxId: org.taxId ?? '',
    email: org.email ?? '',
    phone: org.phone ?? '',
    website: org.website ?? '',
    description: org.description ?? '',
    presentationUrl: org.presentationUrl ?? '',
    logoUrl: org.logoUrl ?? '',
    coverUrl: org.coverUrl ?? '',
    isPublic: org.isPublic,
    allowContact: org.allowContact,
    hideLowRatings: org.hideLowRatings,
    notifyNewReviews: org.notifyNewReviews,
    notifyNegativeReviews: org.notifyNegativeReviews,
    sectorId: org.sectorId ?? '',
    countryId: org.countryId ?? '',
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

const VERIFICATION_LABELS: Record<string, { label: string; tone: string }> = {
  not_verified: { label: 'Sin verificar', tone: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Verificación en revisión', tone: 'bg-amber-50 text-amber-700' },
  verified: { label: 'Empresa verificada', tone: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Verificación rechazada', tone: 'bg-red-50 text-red-700' },
  expired: { label: 'Verificación caducada', tone: 'bg-slate-100 text-slate-500' },
};

type SlugStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken'; suggestion: string | null };

export default function CompanyPage() {
  const router = useRouter();
  const { role, isSuperAdmin } = useAuth();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** El usuario ha tocado la URL pública: dejamos de sincronizarla con el nombre. */
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: 'idle' });
  const slugValue = form?.slug ?? '';

  const canEdit = isSuperAdmin || roleAtLeast(role, 'admin');

  const [catalogs, setCatalogs] = useState<PublicCatalogs | null>(null);

  useEffect(() => {
    api
      .publicCatalogs()
      .then(setCatalogs)
      .catch(() => setCatalogs(null));
  }, []);

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
    setForm((current) => {
      if (!current) return current;
      // Mientras la URL no se haya editado a mano, se rellena con el nombre.
      if (key === 'tradeName' && !slugEdited && typeof value === 'string') {
        return { ...current, tradeName: value, slug: slugify(value) };
      }
      return { ...current, [key]: value };
    });
  }

  // Comprobación con retardo de la URL pública. Solo mira si está libre: el
  // backend vuelve a comprobarlo al guardar para cubrirse de carreras.
  useEffect(() => {
    const candidate = slugify(slugValue);
    if (!org || !candidate || candidate === org.slug) {
      setSlugStatus({ state: 'idle' });
      return;
    }
    setSlugStatus({ state: 'checking' });
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .checkOrganizationSlug(candidate)
        .then((result) => {
          if (!active) return;
          setSlugStatus(
            result.available
              ? { state: 'available' }
              : { state: 'taken', suggestion: result.suggestion },
          );
        })
        .catch(() => {
          if (active) setSlugStatus({ state: 'idle' });
        });
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [slugValue, org]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !canEdit) return;
    const nextSlug = slugify(form.slug);
    setError(null);
    setNotice(null);
    if (form.description.trim().length > ORGANIZATION_DESCRIPTION_MAX_LENGTH) {
      setError(
        `La descripción no puede superar los ${ORGANIZATION_DESCRIPTION_MAX_LENGTH} caracteres.`,
      );
      return;
    }
    if (!nextSlug) {
      setError('La URL pública no puede estar vacía.');
      return;
    }
    if (nextSlug !== org?.slug && slugStatus.state === 'taken') {
      setError('Esa URL pública ya está en uso. Elige otra.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { tradeName: form.tradeName.trim() };
      if (nextSlug !== org?.slug) payload.slug = nextSlug;
      if (form.legalName.trim()) payload.legalName = form.legalName.trim();
      if (form.taxId.trim()) payload.taxId = form.taxId.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.website.trim()) payload.website = form.website.trim();
      payload.description = form.description.trim();
      const presentationUrl = form.presentationUrl.trim() || null;
      // Solo se envía si cambia: evita que un backend sin desplegar la rechace.
      if (presentationUrl !== (org?.presentationUrl ?? null)) {
        payload.presentationUrl = presentationUrl;
      }
      payload.logoUrl = form.logoUrl ? form.logoUrl : null;
      payload.coverUrl = form.coverUrl ? form.coverUrl : null;
      payload.isPublic = form.isPublic;
      payload.allowContact = form.allowContact;
      payload.hideLowRatings = form.hideLowRatings;
      payload.notifyNewReviews = form.notifyNewReviews;
      payload.notifyNegativeReviews = form.notifyNegativeReviews;
      if (form.sectorId) payload.sectorId = form.sectorId;
      if (form.countryId) payload.countryId = form.countryId;

      const updated = await api.updateMyOrganization(payload);
      setOrg(updated);
      setForm(toForm(updated));
      setSlugEdited(false);
      setSlugStatus({ state: 'idle' });
      setNotice('Datos de la empresa actualizados.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function onPresentationChange(event: ChangeEvent<HTMLInputElement>) {
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
    setUploadingPresentation(true);
    try {
      const prepared = await prepareCoverImage(file);
      const { url } = await api.uploadOrganizationPresentation(prepared);
      update('presentationUrl', url);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploadingPresentation(false);
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

  async function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
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
    setUploadingLogo(true);
    try {
      const prepared = await prepareCoverImage(file);
      const { url } = await api.uploadOrganizationLogo(prepared);
      setForm((prev) => (prev ? { ...prev, logoUrl: url } : prev));
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'No se pudo subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  const previewSlug = form ? slugify(form.slug) : '';
  const slugChanged = Boolean(org && previewSlug && previewSlug !== org.slug);

  return (
    <DashboardShell
      active="profile"
      title="Perfil"
      subtitle="Datos públicos y presentación de tu empresa"
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
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
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
                <p className="font-mono text-xs text-slate-500">
                  {org?.publicId} · /{org?.slug}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {canEdit ? 'Edición habilitada' : 'Solo lectura'}
              </span>
            </div>
            {org?.isPublic && org.slug && (
              <a
                href={`/empresa/${org.slug}`}
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 underline-offset-2 hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Ver perfil público
              </a>
            )}

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
                  Logo de la empresa
                </span>
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {form.logoUrl ? (
                      <Image
                        src={resolveAssetUrl(form.logoUrl) ?? form.logoUrl}
                        alt="Logo de la empresa"
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#356CFF] to-[#2343A6] text-2xl font-bold text-white">
                        {form.tradeName.trim()[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[11px] text-slate-600">
                        Subiendo…
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white ${
                        !canEdit || uploadingLogo
                          ? 'pointer-events-none opacity-60'
                          : 'cursor-pointer'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      {form.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                        className="hidden"
                        onChange={onLogoChange}
                        disabled={!canEdit || uploadingLogo}
                      />
                    </label>
                    {form.logoUrl && canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadError(null);
                          setForm((prev) => (prev ? { ...prev, logoUrl: '' } : prev));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Quitar logo
                      </button>
                    )}
                  </div>
                  <p className="w-full text-xs text-slate-400">
                    Recomendado cuadrado (por ejemplo 512×512). PNG, JPG, WEBP, GIF o AVIF, hasta 5
                    MB. Se guarda al pulsar &quot;Guardar cambios&quot;.
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Imagen de portada
                </span>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="relative aspect-[3/1] w-full bg-slate-100">
                    {form.coverUrl ? (
                      <Image
                        src={resolveAssetUrl(form.coverUrl) ?? form.coverUrl}
                        alt="Portada de la empresa"
                        fill
                        sizes="(max-width: 768px) 100vw, 768px"
                        className="object-cover"
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

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  URL pública del perfil
                </span>
                <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 focus-within:border-blue-500">
                  <span className="flex select-none items-center bg-slate-50 px-3 text-sm text-slate-400">
                    /empresa/
                  </span>
                  <input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      update('slug', e.target.value);
                    }}
                    onBlur={() => update('slug', slugify(form.slug))}
                    disabled={!canEdit}
                    spellCheck={false}
                    autoCapitalize="none"
                    aria-describedby="slug-help"
                    className="min-w-0 flex-1 border-0 px-2 py-2 text-sm text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
                <p id="slug-help" className="mt-1 text-xs leading-relaxed">
                  {slugStatus.state === 'checking' ? (
                    <span className="text-slate-500">Comprobando disponibilidad…</span>
                  ) : slugStatus.state === 'available' ? (
                    <span className="text-emerald-700">Disponible.</span>
                  ) : slugStatus.state === 'taken' ? (
                    <span className="text-red-600">
                      Ya está en uso.{' '}
                      {slugStatus.suggestion && (
                        <button
                          type="button"
                          onClick={() => {
                            setSlugEdited(true);
                            update('slug', slugStatus.suggestion ?? '');
                          }}
                          className="font-semibold underline underline-offset-2"
                        >
                          Usar {slugStatus.suggestion}
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Se rellena con el nombre. Puedes cambiarla; dos empresas con el mismo nombre
                      tendrán URLs distintas.
                    </span>
                  )}
                </p>
                {slugChanged && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    Al guardar, la URL pública cambiará y los enlaces o sellos antiguos dejarán de
                    funcionar.
                  </p>
                )}
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

              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Categoría</span>
                <select
                  value={form.sectorId}
                  onChange={(e) => update('sectorId', e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                >
                  <option value="">Sin categoría</option>
                  {catalogs?.sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">País</span>
                <select
                  value={form.countryId}
                  onChange={(e) => update('countryId', e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                >
                  <option value="">Sin país</option>
                  {catalogs?.countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Descripción</span>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  maxLength={ORGANIZATION_DESCRIPTION_MAX_LENGTH}
                  aria-describedby="description-counter"
                  className={INPUT_CLASS}
                />
                <span
                  id="description-counter"
                  className={`mt-1 block text-right font-mono text-[11px] ${
                    form.description.length > ORGANIZATION_DESCRIPTION_MAX_LENGTH
                      ? 'text-red-600'
                      : 'text-slate-400'
                  }`}
                >
                  {form.description.length}/{ORGANIZATION_DESCRIPTION_MAX_LENGTH}
                </span>
              </label>

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">
                    Imagen o vídeo de presentación
                  </span>
                  <input
                    value={form.presentationUrl}
                    onChange={(e) => update('presentationUrl', e.target.value)}
                    onBlur={() => update('presentationUrl', form.presentationUrl.trim())}
                    disabled={!canEdit}
                    placeholder="https://www.youtube.com/watch?v=… o URL de una imagen"
                    className={INPUT_CLASS}
                  />
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 ${
                      !canEdit || uploadingPresentation ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    {uploadingPresentation ? 'Subiendo…' : 'Subir imagen'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={onPresentationChange}
                      disabled={!canEdit || uploadingPresentation}
                    />
                  </label>
                  {form.presentationUrl && canEdit && (
                    <button
                      type="button"
                      onClick={() => update('presentationUrl', '')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-red-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Quitar
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Se muestra junto a la descripción en tu perfil público. Acepta un enlace de
                  YouTube o Vimeo, un MP4 o una imagen de hasta 5 MB. El título del bloque es
                  siempre «Descripción».
                </p>
              </div>

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

              <fieldset
                id="privacidad"
                className="space-y-3 border-t border-slate-100 pt-4 sm:col-span-2"
              >
                <legend className="mb-2 flex items-center gap-2 pt-4 text-sm font-bold text-slate-900">
                  <span className="material-symbols-outlined text-[18px] text-slate-500">
                    notifications
                  </span>
                  Avisos de reseñas
                </legend>
                <p className="text-xs text-slate-500">
                  Se muestran en la campana del panel y se envían por correo a los responsables de
                  la empresa al publicarse cada reseña.
                </p>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.notifyNewReviews}
                    onChange={(e) => update('notifyNewReviews', e.target.checked)}
                    disabled={!canEdit}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    Nuevas reseñas
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Cada reseña de 3, 4 o 5 estrellas que se publique en tu perfil.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.notifyNegativeReviews}
                    onChange={(e) => update('notifyNegativeReviews', e.target.checked)}
                    disabled={!canEdit}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    Reseñas negativas (aviso destacado)
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Las de 1 y 2 estrellas, cuando se publican tras revisar sus evidencias. Te
                      recomendamos mantenerlo activo para responder a tiempo.
                    </span>
                  </span>
                </label>
              </fieldset>

              {canEdit && (
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </form>

            <LocationsPanel canEdit={canEdit} />

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  org?.isPublic ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {org?.isPublic ? 'Perfil público' : 'Perfil privado'}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  VERIFICATION_LABELS[org?.verificationStatus ?? 'not_verified']?.tone ??
                  'bg-slate-100 text-slate-600'
                }`}
              >
                {VERIFICATION_LABELS[org?.verificationStatus ?? 'not_verified']?.label ??
                  org?.verificationStatus}
              </span>
            </div>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
