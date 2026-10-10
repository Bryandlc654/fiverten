import { SetMetadata } from '@nestjs/common';
import type { OrganizationRole } from '../../common/roles';

export const ROLES_KEY = 'required_roles';

/** Exige que el usuario tenga al menos uno de los roles indicados (o superior). */
export const Roles = (...roles: OrganizationRole[]) => SetMetadata(ROLES_KEY, roles);
