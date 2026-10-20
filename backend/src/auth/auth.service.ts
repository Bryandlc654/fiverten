import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Organization, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { generatePublicId } from '../common/ids';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../common/passwords';
import { ensureAllSystemRoles, ensureSystemRole } from '../common/system-roles';
import { hashToken, randomToken } from '../common/tokens';
import { buildUniqueSlug, buildUniqueUsername } from '../common/unique';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface SessionBundle {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

interface SessionSubject {
  userId: string;
  email: string;
  organizationId: string | null;
  role: string | null;
  isOwner: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registro: crea usuario + organización + rol admin + membresía (owner)
  // ---------------------------------------------------------------------------
  async register(dto: RegisterDto, ctx: RequestContext) {
    const email = dto.email.trim().toLowerCase();

    // El hash se calcula antes de comprobar si el correo existe para que ambos
    // caminos tarden lo mismo.
    const passwordHash = await hashPassword(dto.password);

    const existing = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.user.findFirst({
        where: {
          OR: [{ email }, { username: dto.username ?? '__no_match__' }],
          deletedAt: null,
        },
        select: { id: true },
      }),
    );
    if (existing) {
      // Mensaje generico para no revelar si el correo o el usuario ya existen.
      throw new ConflictException(
        'No se pudo completar el registro con esos datos. Revisa la información e inténtalo de nuevo.',
      );
    }

    const created = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const organization = await tx.organization.create({
        data: {
          publicId: generatePublicId(),
          tradeName: dto.companyName.trim(),
          legalName: dto.companyName.trim(),
          slug: await buildUniqueSlug(tx, dto.companyName),
          taxId: dto.taxId?.trim() || null,
          email,
          phone: dto.phone?.trim() || null,
          status: 'active',
          isActive: true,
        },
      });

      await ensureAllSystemRoles(tx, organization.id);
      const role = await ensureSystemRole(tx, organization.id, 'admin');

      const username = dto.username ?? (await buildUniqueUsername(tx, email));
      const user = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          firstName: dto.firstName?.trim() || null,
          lastName: dto.lastName?.trim() || null,
          phone: dto.phone?.trim() || null,
          defaultOrganizationId: organization.id,
          isActive: true,
        },
      });

      await tx.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          roleId: role.id,
          isOwner: true,
          isActive: true,
        },
      });

      return { organization, role, user };
    });

    await this.recordAttempt(created.user.id, email, 'register', true, null, ctx);
    await this.issueEmailVerification(created.user);

    const session = this.isEmailVerificationRequired()
      ? null
      : await this.createSession(
          {
            userId: created.user.id,
            email: created.user.email,
            organizationId: created.organization.id,
            role: created.role.baseRole,
            isOwner: true,
            isSuperAdmin: created.user.isSuperAdmin,
            isStaff: created.user.isFivertenStaff,
          },
          ctx,
        );

    return this.buildResponse(
      created.user,
      created.organization,
      created.role.baseRole,
      true,
      session,
    );
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------
  async login(dto: LoginDto, ctx: RequestContext) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.user.findFirst({ where: { email, deletedAt: null } }),
    );

    // Anti-enumeracion: siempre se calcula un hash (real o ficticio) y las
    // respuestas que delatan el estado de la cuenta (bloqueada, inactiva) solo
    // se dan a quien conoce la contraseña.
    if (!user) {
      await burnPasswordCheck(dto.password);
      await this.recordAttempt(null, email, 'login', false, 'user_not_found', ctx);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordCheck = await verifyPassword(dto.password, user.passwordHash);
    const isLocked = !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();

    if (isLocked) {
      await this.recordAttempt(user.id, email, 'login', false, 'locked', ctx);
      throw new UnauthorizedException(
        passwordCheck.valid
          ? 'La cuenta está bloqueada temporalmente. Inténtalo más tarde.'
          : 'Credenciales inválidas',
      );
    }

    if (!passwordCheck.valid) {
      await this.handleFailedLogin(user.id, user.failedLoginCount, email, ctx);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      await this.recordAttempt(user.id, email, 'login', false, 'inactive', ctx);
      throw new UnauthorizedException('Esta cuenta está inactiva');
    }

    if (this.isEmailVerificationRequired() && !user.emailVerifiedAt) {
      await this.recordAttempt(user.id, email, 'login', false, 'email_not_verified', ctx);
      throw new UnauthorizedException(
        'Debes verificar tu correo electrónico antes de iniciar sesión',
      );
    }

    // Una sola transaccion agrupa: reset de contadores, lectura de membresía
    // (con su rol) y de la organización primaria (antes eran 3 transacciones).
    const { membership, organization } = await this.prisma.withContext(
      { isPlatformAdmin: true },
      async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            // Rehash transparente a Argon2id si el hash almacenado es legacy (bcrypt).
            passwordHash: passwordCheck.needsRehash ? await hashPassword(dto.password) : undefined,
          },
        });

        const membership = await tx.organizationMembership.findFirst({
          where: { userId: user.id, isActive: true },
          include: { role: true },
          orderBy: [{ isOwner: 'desc' }, { joinedAt: 'asc' }],
        });
        const organization = membership
          ? await tx.organization.findUnique({ where: { id: membership.organizationId } })
          : null;

        return { membership, organization };
      },
    );

    const role = membership?.role.baseRole ?? null;
    const isOwner = membership?.isOwner ?? false;

    await this.recordAttempt(user.id, email, 'login', true, null, ctx);
    const session = await this.createSession(
      {
        userId: user.id,
        email: user.email,
        organizationId: organization?.id ?? null,
        role,
        isOwner,
        isSuperAdmin: user.isSuperAdmin,
        isStaff: user.isFivertenStaff,
      },
      ctx,
    );

    return this.buildResponse(user, organization, role, isOwner, session);
  }

  // ---------------------------------------------------------------------------
  // Refresh con rotación y detección de reutilización
  // ---------------------------------------------------------------------------
  async refresh(refreshToken: string | undefined, ctx: RequestContext) {
    if (!refreshToken) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const token = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.refreshToken.findUnique({
        where: { tokenHash: hashToken(refreshToken) },
        include: { user: true },
      }),
    );

    if (!token) {
      throw new UnauthorizedException('Sesión no válida');
    }

    if (token.revokedAt) {
      throw new UnauthorizedException('La sesión ha sido revocada');
    }

    // Reutilización de un token ya rotado => posible robo: se revoca toda la familia.
    if (token.isUsed) {
      await this.revokeFamily(token.familyId, token.sessionId, 'refresh_token_reuse');
      this.logger.warn(`Reutilización de refresh token detectada (user=${token.userId})`);
      throw new UnauthorizedException('Sesión comprometida. Vuelve a iniciar sesión.');
    }

    if (token.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('La sesión ha caducado');
    }

    if (!token.user.isActive || token.user.deletedAt) {
      throw new UnauthorizedException('Esta cuenta está inactiva');
    }

    const membership = await this.getPrimaryMembership(token.userId);
    const role = membership?.role.baseRole ?? null;
    const isOwner = membership?.isOwner ?? false;
    const organization = membership ? await this.loadOrganization(membership.organizationId) : null;

    const refreshExpiresAt = token.expiresAt;
    const newRefreshToken = randomToken(48);

    // Rotación atómica: el token se "reclama" con un UPDATE condicional. Si dos
    // peticiones llegan a la vez, solo una obtiene count === 1; la otra se trata
    // como reutilización (igual que un token ya rotado).
    const rotated = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: token.id, isUsed: false, revokedAt: null },
        data: { isUsed: true, usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        return false;
      }
      const created = await tx.refreshToken.create({
        data: {
          userId: token.userId,
          sessionId: token.sessionId,
          tokenHash: hashToken(newRefreshToken),
          familyId: token.familyId,
          expiresAt: refreshExpiresAt,
        },
      });
      await tx.refreshToken.update({
        where: { id: token.id },
        data: { replacedByTokenId: created.id },
      });
      return true;
    });

    if (!rotated) {
      await this.revokeFamily(token.familyId, token.sessionId, 'refresh_token_reuse');
      this.logger.warn(`Rotación concurrente de refresh token (user=${token.userId})`);
      throw new UnauthorizedException('Sesión comprometida. Vuelve a iniciar sesión.');
    }

    const newAccessToken = await this.signAccessToken(
      {
        userId: token.userId,
        email: token.user.email,
        organizationId: organization?.id ?? null,
        role,
        isOwner,
        isSuperAdmin: token.user.isSuperAdmin,
        isStaff: token.user.isFivertenStaff,
      },
      token.sessionId,
    );

    void ctx;

    return this.buildResponse(token.user, organization, role, isOwner, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      refreshExpiresAt,
    });
  }

  // ---------------------------------------------------------------------------
  // Logout: revoca la familia de tokens y la sesión asociada
  // ---------------------------------------------------------------------------
  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return { success: true };
    }
    const token = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.refreshToken.findUnique({
        where: { tokenHash: hashToken(refreshToken) },
        select: { familyId: true, sessionId: true },
      }),
    );
    if (token) {
      await this.revokeFamily(token.familyId, token.sessionId, 'logout');
    }
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Perfil del usuario autenticado
  // ---------------------------------------------------------------------------
  async me(userId: string) {
    const user = await this.prisma.withContext({ userId }, (tx) =>
      tx.user.findFirst({ where: { id: userId, isActive: true, deletedAt: null } }),
    );
    if (!user) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const membership = await this.getPrimaryMembership(userId);
    const organization = membership ? await this.loadOrganization(membership.organizationId) : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        emailVerified: user.emailVerifiedAt !== null,
        isSuperAdmin: user.isSuperAdmin,
        isFivertenStaff: user.isFivertenStaff,
        isActive: user.isActive,
      },
      organization: organization
        ? {
            id: organization.id,
            publicId: organization.publicId,
            tradeName: organization.tradeName,
            legalName: organization.legalName,
            slug: organization.slug,
            taxId: organization.taxId,
            description: organization.description,
            logoUrl: organization.logoUrl,
            website: organization.website,
            email: organization.email,
            phone: organization.phone,
            status: organization.status,
            verificationStatus: organization.verificationStatus,
            isPublic: organization.isPublic,
            allowContact: organization.allowContact,
            locale: organization.locale,
            billingCurrency: organization.billingCurrency,
            createdAt: organization.createdAt,
          }
        : null,
      role: membership?.role.baseRole ?? null,
      isOwner: membership?.isOwner ?? false,
      isSuperAdmin: user.isSuperAdmin,
      isFivertenStaff: user.isFivertenStaff,
    };
  }

  // ---------------------------------------------------------------------------
  // Verificación de correo electrónico
  // ---------------------------------------------------------------------------
  async requestEmailVerification(userId: string) {
    const user = await this.prisma.withContext({ userId }, (tx) =>
      tx.user.findFirst({ where: { id: userId, isActive: true, deletedAt: null } }),
    );
    if (!user) {
      throw new UnauthorizedException('Sesión no válida');
    }
    if (user.emailVerifiedAt) {
      return { sent: false, alreadyVerified: true };
    }
    await this.issueEmailVerification(user);
    return { sent: true, alreadyVerified: false };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.emailVerification.findUnique({ where: { tokenHash: hashToken(token) } }),
    );
    if (
      !record ||
      !record.isActive ||
      record.verifiedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('El enlace de verificación no es válido o ha caducado');
    }

    await this.prisma.withContext({ userId: record.userId }, async (tx) => {
      await tx.emailVerification.update({
        where: { id: record.id },
        data: { verifiedAt: new Date(), isActive: false },
      });
      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date(), isVerified: true },
      });
    });
    return { verified: true };
  }

  private async issueEmailVerification(user: User): Promise<void> {
    if (user.emailVerifiedAt) {
      return;
    }
    const ttlHours = Number(this.config.get<string>('EMAIL_VERIFICATION_TTL_HOURS') ?? 24);
    const token = randomToken(32);

    await this.prisma.withContext({ userId: user.id }, async (tx) => {
      await tx.emailVerification.updateMany({
        where: { userId: user.id, isActive: true, verifiedAt: null },
        data: { isActive: false },
      });
      await tx.emailVerification.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
          isActive: true,
        },
      });
    });

    // No se espera: el envío por SMTP puede tardar y no debe retrasar la respuesta.
    this.mail.sendEmailVerification(user.email, token).catch((error: unknown) => {
      this.logger.error(`No se pudo enviar la verificación de correo: ${String(error)}`);
    });
  }

  // ---------------------------------------------------------------------------
  // Recuperación de contraseña
  // ---------------------------------------------------------------------------
  async forgotPassword(emailRaw: string, ctx: RequestContext) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.user.findFirst({ where: { email, isActive: true, deletedAt: null } }),
    );

    // No se revela si el correo existe (evita enumeración de usuarios).
    if (user) {
      const ttlMinutes = Number(this.config.get<string>('PASSWORD_RESET_TTL_MINUTES') ?? 60);
      const token = randomToken(32);

      await this.prisma.withContext({ userId: user.id }, async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, isActive: true, usedAt: null },
          data: { isActive: false },
        });
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
            ipAddress: ctx.ipAddress ?? null,
            userAgent: ctx.userAgent?.slice(0, 500) ?? null,
            isActive: true,
          },
        });
      });

      // El envío no se espera: si se esperase, la respuesta tardaría más cuando
      // el correo existe y eso permitiría enumerar usuarios.
      this.mail.sendPasswordReset(user.email, token).catch((error: unknown) => {
        this.logger.error(`No se pudo enviar el correo de recuperación: ${String(error)}`);
      });
    }

    await this.recordAttempt(user?.id ?? null, email, 'password_reset', true, null, ctx);
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string, ctx: RequestContext) {
    const record = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } }),
    );
    if (!record || !record.isActive || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El enlace de recuperación no es válido o ha caducado');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.withContext({ userId: record.userId }, async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date(), isActive: false },
      });
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      // Se revocan todas las sesiones tras cambiar la contraseña.
      await tx.session.updateMany({
        where: { userId: record.userId, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokeReason: 'password_reset' },
      });
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'password_reset' },
      });
    });

    await this.recordAttempt(record.userId, null, 'password_reset', true, null, ctx);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Gestión de sesiones
  // ---------------------------------------------------------------------------
  async listSessions(userId: string, currentSessionId: string | null) {
    const sessions = await this.prisma.withContext({ userId }, (tx) =>
      tx.session.findMany({
        where: { userId, revokedAt: null, isActive: true, expiresAt: { gt: new Date() } },
        orderBy: { lastActivityAt: 'desc' },
      }),
    );

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        country: session.country,
        platform: session.platform,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        current: currentSessionId === session.id,
      })),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.prisma.withContext({ userId }, async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) {
        throw new NotFoundException('Sesión no encontrada');
      }
      await tx.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'revoked_by_user' },
      });
      await tx.session.update({
        where: { id: sessionId },
        data: { isActive: false, revokedAt: new Date(), revokeReason: 'revoked_by_user' },
      });
      return { success: true };
    });
  }

  async logoutAll(userId: string) {
    return this.prisma.withContext({ userId }, async (tx) => {
      await tx.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokeReason: 'logout_all' },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'logout_all' },
      });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async handleFailedLogin(
    userId: string,
    currentCount: number,
    email: string,
    ctx: RequestContext,
  ): Promise<void> {
    const maxAttempts = Number(this.config.get<string>('MAX_FAILED_LOGINS') ?? 5);
    const lockMinutes = Number(this.config.get<string>('LOCK_MINUTES') ?? 15);
    const failedCount = currentCount + 1;
    const shouldLock = failedCount >= maxAttempts;

    await this.prisma.withContext({ userId }, (tx) =>
      tx.user.update({
        where: { id: userId },
        data: {
          failedLoginCount: failedCount,
          lockedUntil: shouldLock ? new Date(Date.now() + lockMinutes * 60 * 1000) : null,
        },
      }),
    );
    await this.recordAttempt(userId, email, 'login', false, 'invalid_password', ctx);
  }

  private async createSession(
    subject: SessionSubject,
    ctx: RequestContext,
  ): Promise<SessionBundle> {
    const ttlDays = Number(this.config.get<string>('JWT_REFRESH_TTL_DAYS') ?? 30);
    const refreshExpiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const sessionToken = randomToken(32);
    const refreshToken = randomToken(48);

    const session = await this.prisma.withContext({ userId: subject.userId }, async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: subject.userId,
          organizationId: subject.organizationId,
          sessionTokenHash: hashToken(sessionToken),
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent?.slice(0, 500) ?? null,
          expiresAt: refreshExpiresAt,
          isActive: true,
        },
      });

      await tx.refreshToken.create({
        data: {
          userId: subject.userId,
          sessionId: created.id,
          tokenHash: hashToken(refreshToken),
          familyId: randomUUID(),
          expiresAt: refreshExpiresAt,
        },
      });

      return created;
    });

    const accessToken = await this.signAccessToken(subject, session.id);

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async revokeFamily(
    familyId: string | null,
    sessionId: string | null,
    reason: string,
  ): Promise<void> {
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      if (familyId) {
        await tx.refreshToken.updateMany({
          where: { familyId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: reason },
        });
      }
      if (sessionId) {
        await tx.session.update({
          where: { id: sessionId },
          data: {
            isActive: false,
            revokedAt: new Date(),
            revokeReason: reason,
            compromisedAt: reason === 'refresh_token_reuse' ? new Date() : undefined,
          },
        });
      }
    });
  }

  private async getPrimaryMembership(userId: string) {
    return this.prisma.withContext({ userId }, (tx) =>
      tx.organizationMembership.findFirst({
        where: { userId, isActive: true },
        include: { role: true },
        orderBy: [{ isOwner: 'desc' }, { joinedAt: 'asc' }],
      }),
    );
  }

  private async loadOrganization(organizationId: string) {
    return this.prisma.withContext({ orgId: organizationId }, (tx) =>
      tx.organization.findUnique({ where: { id: organizationId } }),
    );
  }

  private async recordAttempt(
    userId: string | null,
    email: string | null,
    attemptType: string,
    success: boolean,
    failureReason: string | null,
    ctx: RequestContext,
  ): Promise<void> {
    try {
      await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
        tx.authAttempt.create({
          data: {
            userId,
            email,
            ipAddress: ctx.ipAddress ?? null,
            userAgent: ctx.userAgent?.slice(0, 500) ?? null,
            attemptType,
            success,
            failureReason,
          },
        }),
      );
    } catch (error) {
      this.logger.error(`No se pudo registrar el intento de autenticación: ${String(error)}`);
    }
  }

  private async signAccessToken(
    subject: SessionSubject,
    sessionId: string | null,
  ): Promise<string> {
    return this.jwt.signAsync({
      sub: subject.userId,
      email: subject.email,
      org: subject.organizationId,
      role: subject.role,
      sid: sessionId,
      own: subject.isOwner,
      root: subject.isSuperAdmin,
      staff: subject.isStaff,
    });
  }

  private isEmailVerificationRequired(): boolean {
    return (
      String(this.config.get<string>('REQUIRE_EMAIL_VERIFICATION') ?? 'false').toLowerCase() ===
      'true'
    );
  }

  private buildResponse(
    user: User,
    organization: Organization | null,
    role: string | null,
    isOwner: boolean,
    session: SessionBundle | null,
  ) {
    return {
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      refreshExpiresAt: session?.refreshExpiresAt ?? null,
      requiresEmailVerification: !session,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        isSuperAdmin: user.isSuperAdmin,
        isFivertenStaff: user.isFivertenStaff,
      },
      organization: organization
        ? {
            id: organization.id,
            publicId: organization.publicId,
            tradeName: organization.tradeName,
            slug: organization.slug,
            status: organization.status,
            verificationStatus: organization.verificationStatus,
          }
        : null,
      role,
      isOwner,
      isSuperAdmin: user.isSuperAdmin,
      isFivertenStaff: user.isFivertenStaff,
    };
  }
}
