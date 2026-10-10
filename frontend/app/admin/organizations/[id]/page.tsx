'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../../components/DashboardShell';
import { ApiError, api, type Member, type OrganizationDetail } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { ORGANIZATION_STATUSES, VERIFICATION_STATUSES } from '../../../../lib/roles';

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
  ownerPassword: string;
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
  ownerPassword: '',
};

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

export default function AdminOrganizationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const isNew = id === 'new';
  const { isSuperAdmin, isLoading } = useAuth();

  const [edit, setEdit] = useState<EditForm | null>(null);
  const [create, setCreate] = useState<CreateForm>(EMPTY_CREATE);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, isSuperAdmin, router]);

  const load = useCallback(async () => {
    if (isNew || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminGetOrganization(id);
      setEdit(toEditForm(data));
      setMembers(data.members);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la empresa');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  async function onSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!edit || !id) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = {
        tradeName: edit.tradeName.trim(),
        description: edit.description.trim(),
        status: edit.status,
        verificationStatus: edit.verificationStatus,
        isActive: edit.isActive,
        isPublic: edit.isPublic,
        allowContact: edit.allowContact,
      };
      if (edit.legalName.trim()) payload.legalName = edit.legalName.trim();
      if (edit.taxId.trim()) payload.taxId = edit.taxId.trim();
      if (edit.email.trim()) payload.email = edit.email.trim();
      if (edit.phone.trim()) payload.phone = edit.phone.trim();
      if (edit.website.trim()) payload.website = edit.website.trim();

      const updated = await api.adminUpdateOrganization(id, payload);
      setEdit(toEditForm(updated));
      setNotice('Empresa actualizada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { tradeName: create.tradeName.trim() };
      if (create.legalName.trim()) payload.legalName = create.legalName.trim();
      if (create.taxId.trim()) payload.taxId = create.taxId.trim();
      if (create.email.trim()) payload.email = create.email.trim();
      if (create.phone.trim()) payload.phone = create.phone.trim();
      if (create.website.trim()) payload.website = create.website.trim();
      if (create.description.trim()) payload.description = create.description.trim();
      if (create.ownerEmail.trim()) {
        payload.ownerEmail = create.ownerEmail.trim();
        if (create.ownerFirstName.trim()) payload.ownerFirstName = create.ownerFirstName.trim();
        if (create.ownerLastName.trim()) payload.ownerLastName = create.ownerLastName.trim();
        if (create.ownerPassword) payload.ownerPassword = create.ownerPassword;
      }

      const created = await api.adminCreateOrganization(
        payload as Parameters<typeof api.adminCreateOrganization>[0],
      );
      router.replace(`/admin/organizations/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la empresa');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500';

  if (isNew) {
    return (
      <DashboardShell
        active="admin"
        title="Nueva empresa"
        subtitle="Crea una empresa y, opcionalmente, su propietario"
      >
        <form onSubmit={onCreate} className="mx-auto max-w-3xl space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Datos de la empresa</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Nombre comercial *
                </span>
                <input
                  required
                  value={create.tradeName}
                  onChange={(e) => setCreate({ ...create, tradeName: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Razón social</span>
                <input
                  value={create.legalName}
                  onChange={(e) => setCreate({ ...create, legalName: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">CIF / NIF</span>
                <input
                  value={create.taxId}
                  onChange={(e) => setCreate({ ...create, taxId: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Correo</span>
                <input
                  type="email"
                  value={create.email}
                  onChange={(e) => setCreate({ ...create, email: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Teléfono</span>
                <input
                  value={create.phone}
                  onChange={(e) => setCreate({ ...create, phone: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Sitio web</span>
                <input
                  value={create.website}
                  onChange={(e) => setCreate({ ...create, website: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Descripción</span>
                <textarea
                  rows={3}
                  value={create.description}
                  onChange={(e) => setCreate({ ...create, description: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Propietario inicial (opcional)</h2>
            <p className="text-xs text-slate-500">
              Si indicas un correo, se creará la cuenta del propietario si no existe.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Correo del propietario
                </span>
                <input
                  type="email"
                  value={create.ownerEmail}
                  onChange={(e) => setCreate({ ...create, ownerEmail: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Contraseña</span>
                <input
                  type="password"
                  value={create.ownerPassword}
                  onChange={(e) => setCreate({ ...create, ownerPassword: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Nombre</span>
                <input
                  value={create.ownerFirstName}
                  onChange={(e) => setCreate({ ...create, ownerFirstName: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Apellidos</span>
                <input
                  value={create.ownerLastName}
                  onChange={(e) => setCreate({ ...create, ownerLastName: e.target.value })}
                  className={inputClass}
                />
              </label>
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
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      active="admin"
      title={edit?.tradeName ?? 'Empresa'}
      subtitle="Edición de empresa como administrador general"
    >
      {loading ? (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Cargando empresa…
        </div>
      ) : edit ? (
        <div className="mx-auto max-w-3xl space-y-6">
          {notice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSaveEdit} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Nombre comercial *
                </span>
                <input
                  required
                  value={edit.tradeName}
                  onChange={(e) => setEdit({ ...edit, tradeName: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Razón social</span>
                <input
                  value={edit.legalName}
                  onChange={(e) => setEdit({ ...edit, legalName: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">CIF / NIF</span>
                <input
                  value={edit.taxId}
                  onChange={(e) => setEdit({ ...edit, taxId: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Correo</span>
                <input
                  type="email"
                  value={edit.email}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Teléfono</span>
                <input
                  value={edit.phone}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Sitio web</span>
                <input
                  value={edit.website}
                  onChange={(e) => setEdit({ ...edit, website: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Descripción</span>
                <textarea
                  rows={3}
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  className={inputClass}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Estado</span>
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                  className={inputClass}
                >
                  {ORGANIZATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Verificación</span>
                <select
                  value={edit.verificationStatus}
                  onChange={(e) => setEdit({ ...edit, verificationStatus: e.target.value })}
                  className={inputClass}
                >
                  {VERIFICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={edit.isActive}
                  onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Empresa activa</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={edit.isPublic}
                  onChange={(e) => setEdit({ ...edit, isPublic: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Perfil público</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={edit.allowContact}
                  onChange={(e) => setEdit({ ...edit, allowContact: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Permitir contacto</span>
              </label>
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

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Miembros ({members.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-t border-slate-100 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-semibold">Usuario</th>
                    <th className="px-5 py-3 font-semibold">Rol</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <tr key={member.membershipId}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">
                          {[member.firstName, member.lastName].filter(Boolean).join(' ') ||
                            member.username}
                        </p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {member.roleName}
                        {member.isOwner ? ' · propietario' : ''}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {member.isActive ? 'Activo' : 'Inactivo'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Empresa no encontrada'}
        </div>
      )}
    </DashboardShell>
  );
}
