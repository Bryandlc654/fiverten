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

interface ActiveMembership {
  organizationId: string;
  isOwner: boolean;
  role: { baseRole: string | null };
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
    // para que la desactivación del usuario, la revocación de su sesión y los
    // cambios de rol o expulsiones surtan efecto de inmediato en lugar de
    // esperar a que expire el token. Del JWT solo se usa la identidad (sub, sid)
    // y la organización elegida (org); el rol se lee siempre de la membresía.
    // Sin organización (p. ej. el super admin) no hay membresía que leer.
    const membershipQuery = {
      where: { organizationId: payload.org ?? undefined, isActive: true },
      include: { role: { select: { baseRole: true } } },
      take: payload.org ? 1 : 0,
    };

    const { user, sessionValid } = await this.prisma.withContext(
      { userId: payload.sub },
      async (tx) => {
        if (!payload.sid) {
          const found = await tx.user.findUnique({
            where: { id: payload.sub },
            include: { memberships: membershipQuery },
          });
          return { user: found, sessionValid: true };
        }
        const session = await tx.session.findUnique({
          where: { id: payload.sid },
          include: { user: { include: { memberships: membershipQuery } } },
        });
        return {
          user: session?.user ?? null,
          sessionValid:
            !!session &&
            session.userId === payload.sub &&
            session.isActive &&
            !session.revokedAt &&
            session.expiresAt.getTime() > Date.now(),
        };
      },
    );

    if (!sessionValid || !user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const membership: ActiveMembership | undefined = payload.org ? user.memberships[0] : undefined;

    return {
      userId: payload.sub,
      email: user.email,
      // Si la membresía ya no existe o está inactiva (expulsión, desactivación),
      // el usuario pierde el acceso a la organización en la siguiente petición.
      organizationId: membership?.organizationId ?? null,
      role: membership?.role.baseRole ?? null,
      isOwner: membership?.isOwner ?? false,
      isSuperAdmin: user.isSuperAdmin,
      isStaff: user.isFivertenStaff,
      sessionId: payload.sid,
    };
  }
}
