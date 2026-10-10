import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  org: string | null;
  role: string | null;
  sid: string | null;
  own?: boolean;
  root?: boolean;
  staff?: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string | null;
  role: string | null;
  isOwner: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  sessionId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // El access token es de vida corta, pero revalidamos contra la base de datos
    // para que la desactivación del usuario o la revocación de su sesión surtan
    // efecto de inmediato en lugar de esperar a que expire el token.
    if (!payload.sid) {
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.deletedAt || !user.isActive) {
        throw new UnauthorizedException('Sesión no válida');
      }
      return this.buildUser(payload, user.isSuperAdmin, user.isFivertenStaff);
    }

    const session = await this.prisma.withContext({ userId: payload.sub }, (tx) =>
      tx.session.findUnique({ where: { id: payload.sid! }, include: { user: true } }),
    );

    const user = session?.user;
    const isValid =
      !!session &&
      session.userId === payload.sub &&
      session.isActive &&
      !session.revokedAt &&
      session.expiresAt.getTime() > Date.now() &&
      !!user &&
      !user.deletedAt &&
      user.isActive;

    if (!isValid || !user) {
      throw new UnauthorizedException('Sesión no válida');
    }

    return this.buildUser(payload, user.isSuperAdmin, user.isFivertenStaff);
  }

  private buildUser(
    payload: JwtPayload,
    isSuperAdmin: boolean,
    isStaff: boolean,
  ): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      organizationId: payload.org,
      role: payload.role,
      isOwner: payload.own ?? false,
      isSuperAdmin,
      isStaff,
      sessionId: payload.sid,
    };
  }
}
