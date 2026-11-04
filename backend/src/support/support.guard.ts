import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/** Permite el acceso al super admin y a los usuarios con rol de soporte. */
@Injectable()
export class SupportStaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No autorizado');
    }
    if (user.isSuperAdmin || user.isSupportAgent) {
      return true;
    }
    throw new ForbiddenException('Se requiere rol de soporte');
  }
}
