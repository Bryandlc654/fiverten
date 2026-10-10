// Jerarquia de roles dentro de una organizacion (de mayor a menor nivel).
export const ORGANIZATION_ROLES = ['owner', 'admin', 'manager', 'editor', 'viewer'] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Responsable',
  editor: 'Editor',
  viewer: 'Consulta',
};

const ROLE_RANK: Record<string, number> = {
  owner: 50,
  admin: 40,
  manager: 30,
  editor: 20,
  viewer: 10,
};

export function roleRank(role: string | null | undefined): number {
  if (!role) {
    return 0;
  }
  return ROLE_RANK[role] ?? 0;
}

/** `true` si `role` tiene al menos el nivel de `minimum`. */
export function roleAtLeast(
  role: string | null | undefined,
  minimum: OrganizationRole,
): boolean {
  return roleRank(role) >= roleRank(minimum);
}

/** Rol efectivo: el propietario siempre es 'owner' aunque su baseRole sea 'admin'. */
export function effectiveRole(baseRole: string | null, isOwner: boolean): string {
  if (isOwner) {
    return 'owner';
  }
  return baseRole ?? 'viewer';
}
