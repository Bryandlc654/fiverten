// Roles de empresa admitidos por FIVERTEN. La propiedad no es un rol: es la
// marca `isOwner` sobre una membresía con rol `admin`.
export const ORGANIZATION_ROLES = ['admin', 'editor', 'viewer'] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
  // Valores heredados que se normalizan al leer datos antiguos.
  owner: 'Admin',
  manager: 'Editor',
};

const ROLE_RANK: Record<string, number> = {
  admin: 30,
  editor: 20,
  viewer: 10,
  // Valores heredados.
  owner: 30,
  manager: 20,
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

/** Normaliza roles heredados y devuelve el rol efectivo dentro de la empresa. */
export function effectiveRole(baseRole: string | null, _isOwner: boolean): OrganizationRole {
  if (baseRole === 'owner') return 'admin';
  if (baseRole === 'manager') return 'editor';
  if (baseRole === 'admin' || baseRole === 'editor' || baseRole === 'viewer') {
    return baseRole;
  }
  return 'viewer';
}

export function isOrganizationRole(value: string): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}
