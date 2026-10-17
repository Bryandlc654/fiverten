'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, api, type OrganizationDetail } from '../../lib/api';
import { ORGANIZATION_STATUSES, VERIFICATION_STATUSES } from '../../lib/roles';
import { Alert, CheckboxField, Field, inputClass } from '../ui';

interface EditForm {
  tradeName: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  status: string;
  verificationStatus: string;
  isActive: boolean;
  isPublic: boolean;
  allowContact: boolean;
}

type TextKey = Exclude<keyof EditForm, 'isActive' | 'isPublic' | 'allowContact'>;

/** Campos que solo se envían si tienen contenido (vaciarlos no los borra). */
const OPTIONAL_FIELDS = ['legalName', 'taxId', 'email', 'phone', 'website'] as const;

function toEditForm(org: OrganizationDetail): EditForm {
  return {
    tradeName: org.tradeName,
    legalName: org.legalName ?? '',
    taxId: org.taxId ?? '',
    email: org.email ?? '',
    phone: org.phone ?? '',
    website: org.website ?? '',
    description: org.description ?? '',
    status: org.status,
    verificationStatus: org.verificationStatus,
    isActive: org.isActive,
    isPublic: org.isPublic,
    allowContact: org.allowContact,
  };
}

export default function EditOrganizationForm({
  organization,
  onSaved,
}: {
  organization: OrganizationDetail;
  onSaved: (updated: OrganizationDetail) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<EditForm>(() => toEditForm(organization));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const bind = (key: TextKey) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
    className: inputClass,
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = {
        tradeName: form.tradeName.trim(),
        description: form.description.trim(),
        status: form.status,
        verificationStatus: form.verificationStatus,
        isActive: form.isActive,
        isPublic: form.isPublic,
        allowContact: form.allowContact,
      };
      for (const key of OPTIONAL_FIELDS) {
        if (form[key].trim()) payload[key] = form[key].trim();
      }
      const updated = await api.adminUpdateOrganization(organization.id, payload);
      setForm(toEditForm(updated));
      onSaved(updated);
      setNotice('Empresa actualizada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial *" className="sm:col-span-2">
            <input required {...bind('tradeName')} />
          </Field>
          <Field label="Razón social">
            <input {...bind('legalName')} />
          </Field>
          <Field label="CIF / NIF">
            <input {...bind('taxId')} />
          </Field>
          <Field label="Correo">
            <input type="email" {...bind('email')} />
          </Field>
          <Field label="Teléfono">
            <input {...bind('phone')} />
          </Field>
          <Field label="Sitio web" className="sm:col-span-2">
            <input {...bind('website')} />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <textarea rows={3} {...bind('description')} />
          </Field>

          <Field label="Estado">
            <select {...bind('status')}>
              {ORGANIZATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Verificación">
            <select {...bind('verificationStatus')}>
              {VERIFICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <CheckboxField
            label="Empresa activa"
            checked={form.isActive}
            onChange={(isActive) => setForm({ ...form, isActive })}
          />
          <CheckboxField
            label="Perfil público"
            checked={form.isPublic}
            onChange={(isPublic) => setForm({ ...form, isPublic })}
          />
          <CheckboxField
            label="Permitir contacto"
            checked={form.allowContact}
            onChange={(allowContact) => setForm({ ...form, allowContact })}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
          >
            Volver
          </button>
        </div>
      </form>
    </>
  );
}
