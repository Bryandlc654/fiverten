import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VERIFICATION_REVIEWER_KEY } from '../decorators/verification-reviewer.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

@Injectable()
export class VerificationReviewerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(VERIFICATION_REVIEWER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || (!user.isSuperAdmin && !user.isVerifier)) {
      throw new ForbiddenException('Se requiere acceso de verificador o administrador FIVERTEN');
    }
    return true;
  }
}
