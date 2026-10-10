import { Prisma } from '@prisma/client';
import { ORGANIZATION_ROLES, type OrganizationRole } from './roles';

interface RoleMeta {
  name: string;
  priority: number;
}

export const ROLE_META: Record<OrganizationRole, RoleMeta> = {
  owner: { name: 'Propietario', priority: 100 },
  admin: { name: 'Administrador', priority: 90 },
  manager: { name: 'Responsable', priority: 70 },
  editor: { name: 'Editor', priority: 50 },
  viewer: { name: 'Consulta', priority: 10 },
};

/**
 * Devuelve el rol de sistema de la organización, creándolo si no existe.
 * Único punto de creación de roles para mantener prioridades/nombres coherentes.
 */
export async function ensureSystemRole(
  tx: Prisma.TransactionClient,
  orgId: string,
  baseRole: OrganizationRole,
) {
  const existing = await tx.role.findFirst({
    where: { organizationId: orgId, slug: baseRole, deletedAt: null },
  });
  if (existing) {
    return existing;
  }
  const meta = ROLE_META[baseRole];
  return tx.role.create({
    data: {
      organizationId: orgId,
      name: meta.name,
      slug: baseRole,
      baseRole,
      description: `Rol de sistema: ${meta.name}`,
      scope: 'organization',
      isSystem: true,
      priority: meta.priority,
      isActive: true,
    },
  });
}

export async function ensureAllSystemRoles(tx: Prisma.TransactionClient, orgId: string) {
  for (const role of ORGANIZATION_ROLES) {
    await ensureSystemRole(tx, orgId, role);
  }
}
