'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../../lib/api';
import { Alert, Field, inputClass } from '../ui';

interface CreateForm {
  tradeName: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
}

const EMPTY_CREATE: CreateForm = {
  tradeName: '',
  legalName: '',
  taxId: '',
  email: '',
  phone: '',
  website: '',
  description: '',
  ownerEmail: '',
  ownerFirstName: '',
  ownerLastName: '',
};

/** Campos opcionales: solo se envían si tienen contenido. */
const OPTIONAL_FIELDS = ['legalName', 'taxId', 'email', 'phone', 'website', 'description'] as const;

export default function CreateOrganizationForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bind = (key: keyof CreateForm) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
    className: inputClass,
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof api.adminCreateOrganization>[0] = {
        tradeName: form.tradeName.trim(),
      };
      for (const key of OPTIONAL_FIELDS) {
        if (form[key].trim()) payload[key] = form[key].trim();
      }
      if (form.ownerEmail.trim()) {
        payload.ownerEmail = form.ownerEmail.trim();
        if (form.ownerFirstName.trim()) payload.ownerFirstName = form.ownerFirstName.trim();
        if (form.ownerLastName.trim()) payload.ownerLastName = form.ownerLastName.trim();
      }
      const created = await api.adminCreateOrganization(payload);
      router.replace(`/admin/organizations/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la empresa');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Datos de la empresa</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Propietario inicial (opcional)</h2>
        <p className="text-xs text-slate-500">
          Si indicas un correo, le enviaremos una invitación. Será propietario cuando la acepte y
          elija su contraseña (o entre con su cuenta si ya la tiene).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Correo del propietario" className="sm:col-span-2">
            <input type="email" {...bind('ownerEmail')} />
          </Field>
          <Field label="Nombre">
            <input {...bind('ownerFirstName')} />
          </Field>
          <Field label="Apellidos">
            <input {...bind('ownerLastName')} />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">add_business</span>
          {saving ? 'Creando…' : 'Crear empresa'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
