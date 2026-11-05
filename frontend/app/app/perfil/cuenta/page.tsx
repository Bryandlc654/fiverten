'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import DashboardShell from '../../../../components/DashboardShell';
import { Alert, Badge, Field, inputClass } from '../../../../components/ui';
import { ApiError, api, type MeResponse, resolveAssetUrl } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

interface FormState {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  avatarUrl: string;
}

function toForm(user: MeResponse['user']): FormState {
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? '',
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? '',
  };
}

export default function ProfilePage() {
  const { reloadSession } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((data) => {
        setMe(data);
        setForm(toForm(data.user));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar tu perfil'),
      )
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        phone: form.phone.trim(),
      });
      setMe(updated);
      setForm(toForm(updated.user));
      await reloadSession();
      setNotice('Perfil actualizado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const { url } = await api.uploadAvatar(file);
      const updated = await api.updateProfile({ avatarUrl: url });
      setMe(updated);
      setForm((current) => (current ? { ...current, avatarUrl: url } : current));
      await reloadSession();
      setNotice('Foto de perfil actualizada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo subir la foto de perfil');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function removeAvatar() {
    if (!me) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await api.updateProfile({ avatarUrl: null });
      setMe(updated);
      setForm((current) => (current ? { ...current, avatarUrl: '' } : current));
      await reloadSession();
      setNotice('Foto de perfil eliminada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la foto');
    } finally {
      setUploading(false);
    }
  }

  const initials = (
    [me?.user.firstName?.[0], me?.user.lastName?.[0]].filter(Boolean).join('') ||
    me?.user.email?.[0] ||
    '?'
  ).toUpperCase();

  return (
    <DashboardShell
      active="profileEdit"
      title="Mi cuenta"
      subtitle="Actualiza tus datos personales y tu foto"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {loading || !form || !me ? (
          <p className="text-sm text-slate-500">Cargando perfil…</p>
        ) : (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow">
                  {form.avatarUrl ? (
                    <Image
                      src={resolveAssetUrl(form.avatarUrl) ?? form.avatarUrl}
                      alt="Foto de perfil"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#356CFF] to-[#2343A6] text-2xl font-bold text-white">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900">
                    {[me.user.firstName, me.user.lastName].filter(Boolean).join(' ') ||
                      me.user.username}
                  </p>
                  <p className="text-sm text-slate-500">{me.user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      label={me.user.emailVerified ? 'Correo verificado' : 'Correo sin verificar'}
                      tone={
                        me.user.emailVerified
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-700'
                      }
                    />
                    {me.user.isSupportAgent && (
                      <Badge label="Soporte" tone="bg-slate-100 text-slate-600" />
                    )}
                    {me.user.isSuperAdmin && (
                      <Badge label="Administrador general" tone="bg-blue-50 text-blue-700" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    {uploading ? 'Subiendo…' : 'Cambiar foto'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      onChange={onAvatarChange}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {form.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => void removeAvatar()}
                      disabled={uploading}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">Datos personales</h2>
              <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre" className="block">
                  <input
                    value={form.firstName}
                    maxLength={100}
                    onChange={(event) => update('firstName', event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Apellidos" className="block">
                  <input
                    value={form.lastName}
                    maxLength={100}
                    onChange={(event) => update('lastName', event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Nombre de usuario" className="block">
                  <input
                    value={form.username}
                    required
                    minLength={3}
                    maxLength={100}
                    pattern="[a-zA-Z0-9_.-]{3,100}"
                    onChange={(event) => update('username', event.target.value)}
                    className={inputClass}
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Letras, números, punto, guion y guion bajo.
                  </span>
                </Field>
                <Field label="Teléfono" className="block">
                  <input
                    value={form.phone}
                    maxLength={50}
                    onChange={(event) => update('phone', event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Correo electrónico" className="block sm:col-span-2">
                  <input
                    value={me.user.email}
                    readOnly
                    disabled
                    className={`${inputClass} bg-slate-50 text-slate-500`}
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    El correo no se puede cambiar desde aquí. Contacta con soporte si lo necesitas.
                  </span>
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                  <Link
                    href="/app/configuracion/seguridad"
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Cambiar contraseña o activar 2FA
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
