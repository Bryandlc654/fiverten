export const ORGANIZATION_ROLES = ['admin', 'editor', 'viewer'] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
  // Valores heredados.
  owner: 'Admin',
  manager: 'Editor',
};

export const ROLE_RANK: Record<string, number> = {
  admin: 30,
  editor: 20,
  viewer: 10,
  owner: 30,
  manager: 20,
};

export const ROLE_OPTIONS: { value: OrganizationRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export const ORGANIZATION_STATUSES = ['pending', 'active', 'suspended', 'inactive'] as const;
export const ORGANIZATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activa',
  suspended: 'Suspendida',
  inactive: 'Inactiva',
};

export const VERIFICATION_STATUSES = [
  'not_verified',
  'pending',
  'verified',
  'rejected',
  'expired',
] as const;
export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  not_verified: 'No verificada',
  pending: 'En revisión',
  verified: 'Verificada',
  rejected: 'Rechazada',
  expired: 'Caducada',
};

export function organizationStatusLabel(status: string): string {
  return ORGANIZATION_STATUS_LABELS[status] ?? status;
}

export function verificationStatusLabel(status: string): string {
  return VERIFICATION_STATUS_LABELS[status] ?? status;
}

export function roleLabel(role?: string | null): string {
  if (!role) {
    return 'Viewer';
  }
  return ROLE_LABELS[role] ?? role;
}

export function roleRank(role?: string | null): number {
  if (!role) {
    return 0;
  }
  return ROLE_RANK[role] ?? 0;
}

export function roleAtLeast(role: string | null | undefined, min: OrganizationRole): boolean {
  return roleRank(role) >= roleRank(min);
}
