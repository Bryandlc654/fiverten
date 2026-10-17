import type { PlatformStats } from '../../lib/api';
import { StatCard } from '../ui';

export default function PlatformStatCards({ stats }: { stats: PlatformStats | null }) {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Empresas"
        value={stats?.organizations.total}
        hint={`${stats?.organizations.active ?? 0} activas`}
        icon="storefront"
        tone="bg-blue-50 text-blue-600"
      />
      <StatCard
        label="Verificadas"
        value={stats?.organizations.verified}
        hint={`${stats?.organizations.pending ?? 0} en revisión`}
        icon="verified"
        tone="bg-emerald-50 text-emerald-600"
      />
      <StatCard
        label="Usuarios"
        value={stats?.users.total}
        hint={`${stats?.users.active ?? 0} activos`}
        icon="group"
        tone="bg-violet-50 text-violet-600"
      />
      <StatCard
        label="Administradores"
        value={stats?.users.admins}
        hint="Super administradores"
        icon="admin_panel_settings"
        tone="bg-amber-50 text-amber-600"
      />
    </section>
  );
}
