'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import Modal from '../../../components/ui/Modal';
import { Alert, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type CountryItem,
  type EmailTemplateItem,
  type LanguageItem,
  type PlatformSettingItem,
  type ReportReasonItem,
  type SectorItem,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

type Tab =
  | 'general'
  | 'reviews'
  | 'notifications'
  | 'email'
  | 'verification'
  | 'sectors'
  | 'countries'
  | 'languages'
  | 'reasons';

const TABS: [Tab, string][] = [
  ['general', 'General'],
  ['reviews', 'Reseñas'],
  ['notifications', 'Notificaciones'],
  ['email', 'Plantillas de email'],
  ['verification', 'Verificación'],
  ['sectors', 'Categorías'],
  ['countries', 'Países'],
  ['languages', 'Idiomas'],
  ['reasons', 'Motivos de reporte'],
];

export default function AdminConfigPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [reasons, setReasons] = useState<ReportReasonItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [settingsData, sectorsData, countriesData, languagesData, templatesData, reasonsData] =
        await Promise.all([
          api.adminListSettings(),
          api.adminListSectors(),
          api.adminListCountries(),
          api.adminListLanguages(),
          api.adminListEmailTemplates(),
          api.adminListReportReasons(),
        ]);
      setSettings(settingsData);
      setSectors(sectorsData);
      setCountries(countriesData);
      setLanguages(languagesData);
      setTemplates(templatesData);
      setReasons(reasonsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la configuración');
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isSuperAdmin) return;
    void load();
  }, [isLoading, isSuperAdmin, load]);

  const value = useCallback(
    (key: string) => settings.find((item) => item.key === key)?.value,
    [settings],
  );

  async function saveSettings(entries: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      setSettings(await api.adminUpdateSettings(entries));
      setNotice('Configuración guardada');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      active="adminConfig"
      title="Configuración de la plataforma"
      subtitle="Políticas, catálogos, plantillas de email y avisos"
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 transition ${
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          {tab === 'general' && (
            <SettingsForm
              title="Configuración general"
              description="Identidad y comportamiento básico de la plataforma."
              busy={saving}
              onSubmit={(form) =>
                saveSettings({
                  'general.site_name': form.siteName,
                  'general.support_email': form.supportEmail,
                  'general.default_locale': form.defaultLocale,
                  'general.default_currency': form.defaultCurrency,
                  'general.registrations_enabled': form.registrationsEnabled === 'true',
                  'general.maintenance_mode': form.maintenanceMode === 'true',
                })
              }
              fields={[
                {
                  key: 'siteName',
                  label: 'Nombre de la plataforma',
                  value: String(value('general.site_name') ?? 'FIVERTEN'),
                },
                {
                  key: 'supportEmail',
                  label: 'Correo de soporte',
                  value: String(value('general.support_email') ?? ''),
                },
                {
                  key: 'defaultLocale',
                  label: 'Idioma por defecto',
                  value: String(value('general.default_locale') ?? 'es'),
                },
                {
                  key: 'defaultCurrency',
                  label: 'Moneda por defecto',
                  value: String(value('general.default_currency') ?? 'EUR'),
                },
                {
                  key: 'registrationsEnabled',
                  label: 'Permitir registro de empresas',
                  value: String(value('general.registrations_enabled') ?? true),
                  type: 'select',
                  options: [
                    ['true', 'Sí'],
                    ['false', 'No'],
                  ],
                },
                {
                  key: 'maintenanceMode',
                  label: 'Modo mantenimiento',
                  value: String(value('general.maintenance_mode') ?? false),
                  type: 'select',
                  options: [
                    ['false', 'Desactivado'],
                    ['true', 'Activado'],
                  ],
                },
              ]}
            />
          )}

          {tab === 'reviews' && (
            <SettingsForm
              title="Políticas de reseñas"
              description="Umbral de baja valoración y reglas de publicación."
              busy={saving}
              onSubmit={(form) =>
                saveSettings({
                  'reviews.low_rating_max': Number(form.lowRatingMax),
                  'reviews.allow_low_rating_resolution': form.allowResolution === 'true',
                  'reviews.require_email_confirmation': form.requireConfirmation === 'true',
                  'reviews.max_reviews_per_ip_day': Number(form.maxPerIp),
                })
              }
              fields={[
                {
                  key: 'lowRatingMax',
                  label: 'Estrellas máximas para baja valoración',
                  value: String(value('reviews.low_rating_max') ?? 2),
                  type: 'number',
                },
                {
                  key: 'allowResolution',
                  label: 'Permitir resolución de incidencias',
                  value: String(value('reviews.allow_low_rating_resolution') ?? true),
                  type: 'select',
                  options: [
                    ['true', 'Sí'],
                    ['false', 'No'],
                  ],
                },
                {
                  key: 'requireConfirmation',
                  label: 'Exigir confirmación por correo',
                  value: String(value('reviews.require_email_confirmation') ?? true),
                  type: 'select',
                  options: [
                    ['true', 'Sí'],
                    ['false', 'No (no aplicado aún)'],
                  ],
                },
                {
                  key: 'maxPerIp',
                  label: 'Máximo de reseñas por IP/día',
                  value: String(value('reviews.max_reviews_per_ip_day') ?? 3),
                  type: 'number',
                },
              ]}
            />
          )}

          {tab === 'notifications' && (
            <SettingsForm
              title="Notificaciones"
              description="Avisos por correo y valores iniciales de las empresas."
              busy={saving}
              onSubmit={(form) =>
                saveSettings({
                  'notifications.email_enabled': form.emailEnabled === 'true',
                  'notifications.default_new_reviews': form.defaultNew === 'true',
                  'notifications.default_negative_reviews': form.defaultNegative === 'true',
                  'notifications.reminder_days': Number(form.reminderDays),
                })
              }
              fields={[
                {
                  key: 'emailEnabled',
                  label: 'Enviar avisos por correo',
                  value: String(value('notifications.email_enabled') ?? true),
                  type: 'select',
                  options: [
                    ['true', 'Sí'],
                    ['false', 'No'],
                  ],
                },
                {
                  key: 'defaultNew',
                  label: 'Avisar de reseñas nuevas por defecto',
                  value: String(value('notifications.default_new_reviews') ?? true),
                  type: 'select',
                  options: [
                    ['true', 'Sí'],
                    ['false', 'No'],
                  ],
                },
                {
                  key: 'defaultNegative',
                  label: 'Avisar de reseñas negativas por defecto',
                  value: String(value('notifications.default_negative_reviews') ?? true),
                  type: 'select',
                  options: [
                    ['true', 'Sí'],
                    ['false', 'No'],
                  ],
                },
                {
                  key: 'reminderDays',
                  label: 'Días de antelación del recordatorio de renovación',
                  value: String(value('notifications.reminder_days') ?? 7),
                  type: 'number',
                },
              ]}
            />
          )}

          {tab === 'email' && (
            <div>
              <h2 className="text-base font-bold text-slate-900">Plantillas de email</h2>
              <p className="mt-1 text-xs text-slate-500">
                Variables disponibles: <code>{'{{site}}'}</code>, <code>{'{{organization}}'}</code>,{' '}
                <code>{'{{name}}'}</code>, <code>{'{{role}}'}</code>, <code>{'{{days}}'}</code>,{' '}
                <code>{'{{link}}'}</code>.
              </p>
              <ul className="mt-4 divide-y divide-slate-100">
                {templates.map((template) => (
                  <li
                    key={template.code}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {template.code}
                      </p>
                      <p className="truncate text-xs text-slate-500">{template.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          template.isActive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {template.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingTemplate(template)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'verification' && (
            <SettingsForm
              title="Verificación y sello"
              description="Requisitos, plazos y validez del sello de empresa verificada."
              busy={saving}
              onSubmit={(form) =>
                saveSettings({
                  'verification.required_documents': form.requiredDocs
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                  'verification.min_projects': Number(form.minProjects),
                  'verification.review_days': Number(form.reviewDays),
                  'verification.expiry_days': Number(form.expiryDays),
                  'verification.renewal_days': Number(form.renewalDays),
                })
              }
              fields={[
                {
                  key: 'requiredDocs',
                  label: 'Documentos obligatorios (coma)',
                  value: Array.isArray(value('verification.required_documents'))
                    ? (value('verification.required_documents') as string[]).join(', ')
                    : 'identity, tax, address',
                },
                {
                  key: 'minProjects',
                  label: 'Proyectos/evidencias mínimas',
                  value: String(value('verification.min_projects') ?? 1),
                  type: 'number',
                },
                {
                  key: 'reviewDays',
                  label: 'Días hábiles de revisión',
                  value: String(value('verification.review_days') ?? 5),
                  type: 'number',
                },
                {
                  key: 'expiryDays',
                  label: 'Días de validez del sello',
                  value: String(value('verification.expiry_days') ?? 365),
                  type: 'number',
                },
                {
                  key: 'renewalDays',
                  label: 'Días de antelación para renovar',
                  value: String(value('verification.renewal_days') ?? 30),
                  type: 'number',
                },
              ]}
            />
          )}

          {tab === 'sectors' && (
            <CatalogTable
              title="Categorías"
              items={sectors.map((sector) => ({
                id: sector.id,
                primary: sector.name,
                secondary: sector.slug,
                active: sector.isActive,
              }))}
              addFields={[
                { key: 'name', label: 'Nombre', required: true },
                { key: 'slug', label: 'Slug (opcional)' },
              ]}
              onAdd={(form) =>
                run(
                  () => api.adminCreateSector({ name: form.name, slug: form.slug }),
                  'Categoría creada',
                )
              }
              onDelete={(id) => run(() => api.adminDeleteSector(id), 'Categoría eliminada')}
              onToggle={(id, active) =>
                run(() => api.adminUpdateSector(id, { isActive: active }), 'Categoría actualizada')
              }
            />
          )}

          {tab === 'countries' && (
            <CatalogTable
              title="Países"
              items={countries.map((country) => ({
                id: country.id,
                primary: country.name,
                secondary: country.iso2,
                active: country.isActive,
              }))}
              addFields={[
                { key: 'name', label: 'Nombre', required: true },
                { key: 'iso2', label: 'ISO2', required: true },
              ]}
              onAdd={(form) =>
                run(
                  () => api.adminCreateCountry({ name: form.name, iso2: form.iso2 }),
                  'País creado',
                )
              }
              onDelete={(id) => run(() => api.adminDeleteCountry(id), 'País eliminado')}
              onToggle={(id, active) =>
                run(() => api.adminUpdateCountry(id, { isActive: active }), 'País actualizado')
              }
            />
          )}

          {tab === 'languages' && (
            <CatalogTable
              title="Idiomas"
              items={languages.map((language) => ({
                id: language.code,
                primary: language.name,
                secondary: language.code,
                active: language.isActive,
              }))}
              addFields={[
                { key: 'name', label: 'Nombre', required: true },
                { key: 'code', label: 'Código', required: true },
              ]}
              onAdd={(form) =>
                run(
                  () => api.adminCreateLanguage({ name: form.name, code: form.code }),
                  'Idioma creado',
                )
              }
              onDelete={(code) => run(() => api.adminDeleteLanguage(code), 'Idioma eliminado')}
              onToggle={(code, active) =>
                run(() => api.adminUpdateLanguage(code, { isActive: active }), 'Idioma actualizado')
              }
            />
          )}

          {tab === 'reasons' && (
            <CatalogTable
              title="Motivos de reporte"
              items={reasons.map((reason) => ({
                id: reason.id,
                primary: reason.label,
                secondary: reason.code,
                active: reason.isActive,
              }))}
              addFields={[
                { key: 'label', label: 'Etiqueta', required: true },
                { key: 'code', label: 'Código', required: true },
              ]}
              onAdd={(form) =>
                run(
                  () => api.adminCreateReportReason({ label: form.label, code: form.code }),
                  'Motivo creado',
                )
              }
              onDelete={(id) => run(() => api.adminDeleteReportReason(id), 'Motivo eliminado')}
              onToggle={(id, active) =>
                run(
                  () => api.adminUpdateReportReason(id, { isActive: active }),
                  'Motivo actualizado',
                )
              }
            />
          )}
        </section>
      </div>

      {editingTemplate && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={async () => {
            setEditingTemplate(null);
            await load();
          }}
        />
      )}
    </DashboardShell>
  );
}

function SettingsForm({
  title,
  description,
  fields,
  busy,
  onSubmit,
}: {
  title: string;
  description: string;
  fields: {
    key: string;
    label: string;
    value: string;
    type?: 'text' | 'number' | 'select';
    options?: [string, string][];
  }[];
  busy: boolean;
  onSubmit: (form: Record<string, string>) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.value])),
  );

  useEffect(() => {
    setForm(Object.fromEntries(fields.map((field) => [field.key, field.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.map((field) => `${field.key}:${field.value}`).join('|')]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.key} label={field.label} className="block">
            {field.type === 'select' ? (
              <select
                value={form[field.key] ?? ''}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                className={inputClass}
              >
                {(field.options ?? []).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={form[field.key] ?? ''}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                className={inputClass}
              />
            )}
          </Field>
        ))}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}

function CatalogTable({
  title,
  items,
  addFields,
  onAdd,
  onDelete,
  onToggle,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string; active: boolean }[];
  addFields: { key: string; label: string; required?: boolean }[];
  onAdd: (form: Record<string, string>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});

  return (
    <div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAdd(form);
          setForm({});
        }}
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))_auto]"
      >
        {addFields.map((field) => (
          <Field key={field.key} label={field.label} className="block">
            <input
              required={field.required}
              value={form[field.key] ?? ''}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              className={inputClass}
            />
          </Field>
        ))}
        <button
          type="submit"
          className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Añadir
        </button>
      </form>

      <ul className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.primary}</p>
              <p className="text-xs text-slate-500">{item.secondary}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggle(item.id, !item.active)}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.active ? 'Activo' : 'Inactivo'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Eliminar ${item.primary}?`)) onDelete(item.id);
                }}
                className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: EmailTemplateItem;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    subject: template.subject,
    title: template.title,
    intro: template.intro,
    action: template.action,
    isActive: template.isActive,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.adminUpsertEmailTemplate(template.code, form);
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
      setBusy(false);
    }
  }

  return (
    <Modal title={`Plantilla: ${template.code}`} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Asunto" className="block">
          <input
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Título" className="block">
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Introducción" className="block">
          <textarea
            rows={4}
            value={form.intro}
            onChange={(event) => setForm({ ...form, intro: event.target.value })}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Texto del botón" className="block">
          <input
            value={form.action}
            onChange={(event) => setForm({ ...form, action: event.target.value })}
            className={inputClass}
            required
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          Plantilla activa
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
