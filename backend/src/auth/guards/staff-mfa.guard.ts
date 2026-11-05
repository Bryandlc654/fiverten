import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Exige MFA al personal de plataforma (superadmin y verificador).
 * Se activa en producción por defecto; puede desactivarse con REQUIRE_STAFF_MFA=false.
 */
@Injectable()
export class StaffMfaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || (!user.isSuperAdmin && !user.isVerifier)) return true;

    const configured = process.env.REQUIRE_STAFF_MFA?.toLowerCase();
    const required =
      configured === 'true' ||
      (configured !== 'false' && process.env.NODE_ENV === 'production');
    if (required && !user.mfaEnabled) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'MFA_REQUIRED',
        message:
          'El personal de FIVERTEN debe activar la verificación en dos pasos antes de acceder al panel.',
      });
    }
    return true;
  }
}
