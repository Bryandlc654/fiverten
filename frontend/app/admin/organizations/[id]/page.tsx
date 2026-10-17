'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../../components/DashboardShell';
import CreateOrganizationForm from '../../../../components/admin/CreateOrganizationForm';
import EditOrganizationForm from '../../../../components/admin/EditOrganizationForm';
import OrganizationMembers from '../../../../components/admin/OrganizationMembers';
import { Alert } from '../../../../components/ui';
import { ApiError, api, type AdminOrganizationDetail } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

export default function AdminOrganizationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const isNew = id === 'new';
  const { isSuperAdmin, isLoading } = useAuth();

  const [organization, setOrganization] = useState<AdminOrganizationDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

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
      setOrganization(await api.adminGetOrganization(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la empresa');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  if (isNew) {
    return (
      <DashboardShell
        active="adminOrgs"
        title="Nueva empresa"
        subtitle="Crea una empresa y, opcionalmente, invita a su propietario"
      >
        <CreateOrganizationForm />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      active="adminOrgs"
      title={organization?.tradeName ?? 'Empresa'}
      subtitle="Edición de empresa como administrador general"
    >
      {loading ? (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Cargando empresa…
        </div>
      ) : organization ? (
        <div className="mx-auto max-w-3xl space-y-6">
          <EditOrganizationForm
            organization={organization}
            onSaved={(updated) => setOrganization({ ...organization, ...updated })}
          />
          <OrganizationMembers
            members={organization.members}
            invitations={organization.invitations}
          />
        </div>
      ) : (
        <Alert tone="error">{error ?? 'Empresa no encontrada'}</Alert>
      )}
    </DashboardShell>
  );
}
