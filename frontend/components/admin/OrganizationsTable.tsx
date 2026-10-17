'use client';

import { useRouter } from 'next/navigation';
import type { AdminOrganizationSummary } from '../../lib/api';
import { organizationStatusLabel, verificationStatusLabel } from '../../lib/roles';
import { NEUTRAL_TONE, STATUS_TONE, VERIFICATION_TONE } from '../../lib/status-tones';
import { Badge, EmptyRow, LoadingRow } from '../ui';

export default function OrganizationsTable({
  organizations,
  loading,
}: {
  organizations: AdminOrganizationSummary[];
  loading: boolean;
}) {
  const router = useRouter();

  if (loading) {
    return <LoadingRow label="Cargando empresas…" />;
  }
  if (organizations.length === 0) {
    return <EmptyRow label="No hay empresas que coincidan." />;
  }

  const open = (id: string) => router.push(`/admin/organizations/${id}`);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="px-5 py-3 font-semibold">Empresa</th>
            <th className="px-5 py-3 font-semibold">Estado</th>
            <th className="px-5 py-3 font-semibold">Verificación</th>
            <th className="px-5 py-3 font-semibold">Miembros</th>
            <th className="px-5 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {organizations.map((org) => (
            <tr key={org.id} className="cursor-pointer hover:bg-slate-50">
              <td className="px-5 py-3" onClick={() => open(org.id)}>
                <p className="font-semibold text-slate-900">{org.tradeName}</p>
                <p className="text-xs text-slate-500">{org.publicId}</p>
              </td>
              <td className="px-5 py-3">
                <Badge
                  label={organizationStatusLabel(org.status)}
                  tone={STATUS_TONE[org.status] ?? NEUTRAL_TONE}
                />
              </td>
              <td className="px-5 py-3">
                <Badge
                  label={verificationStatusLabel(org.verificationStatus)}
                  tone={VERIFICATION_TONE[org.verificationStatus] ?? NEUTRAL_TONE}
                />
              </td>
              <td className="px-5 py-3 text-slate-600">{org.members}</td>
              <td className="px-5 py-3 text-right">
                <button
                  type="button"
                  onClick={() => open(org.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
