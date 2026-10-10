import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { effectiveRole, roleAtLeast, type OrganizationRole } from '../../common/roles';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<OrganizationRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No autorizado');
    }
    if (user.isSuperAdmin) {
      return true;
    }

    const role = effectiveRole(user.role, user.isOwner);
    const allowed = required.some((minimum) => roleAtLeast(role, minimum));
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos suficientes para esta acción');
    }
    return true;
  }
}
