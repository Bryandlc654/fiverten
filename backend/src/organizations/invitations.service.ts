import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../common/passwords';
import * as ROLES from '../common/roles';
import { ensureSystemRole } from '../common/system-roles';
import { hashToken, randomToken } from '../common/tokens';
import { buildUniqueUsername } from '../common/unique';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { toInvitation, toMember } from './organizations.mappers';
import { getActorRank } from './organizations.service';

interface InvitationInput {
  email: string;
  role: ROLES.OrganizationRole;
  firstName?: string;
  lastName?: string;
}

const INVALID_INVITATION = 'La invitación no es válida o ha caducado';

/**
 * Invitaciones a una organización. Sustituyen al alta directa de miembros:
 * nadie entra en una empresa sin aceptar, y nadie elige la contraseña de otro.
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Ámbito empresa (tenant)
  // ---------------------------------------------------------------------------
  async invite(orgId: string, actorId: string, dto: CreateInvitationDto) {
    const input: InvitationInput = {
      email: dto.email.trim().toLowerCase(),
      role: dto.role ?? 'viewer',
      firstName: dto.firstName,
      lastName: dto.lastName,
    };

    const { invitation, token, orgName } = await this.prisma.withContext(
      { orgId, userId: actorId },
      async (tx) => {
        const actorRank = await getActorRank(tx, orgId, actorId);
        if (ROLES.roleRank(input.role) >= actorRank) {
          throw new ForbiddenException('No puedes asignar un rol igual o superior al tuyo');
        }
        const alreadyMember = await tx.organizationMembership.findFirst({
          where: { organizationId: orgId, user: { email: input.email } },
          select: { id: true },
        });
        if (alreadyMember) {
          throw new ConflictException('El usuario ya pertenece a la empresa');
        }
        return this.createInvitation(tx, orgId, actorId, input);
      },
    );

    // No se espera: sendInvitation ya registra sus errores.
    void this.sendInvitation(invitation.email, token, orgName, invitation.role);
    return toInvitation(invitation);
  }

  async listPending(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const invitations = await tx.organizationInvitation.findMany({
        where: {
          organizationId: orgId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { invitations: invitations.map((invitation) => toInvitation(invitation)) };
    });
  }

  async revoke(orgId: string, actorId: string, invitationId: string) {
    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const invitation = await tx.organizationInvitation.findFirst({
        where: { id: invitationId, organizationId: orgId, acceptedAt: null, revokedAt: null },
      });
      if (!invitation) {
        throw new NotFoundException('Invitación no encontrada');
      }
      const actorRank = await getActorRank(tx, orgId, actorId);
      if (ROLES.roleRank(invitation.role) >= actorRank) {
        throw new ForbiddenException(
          'No puedes cancelar una invitación con un rol igual o superior al tuyo',
        );
      }
      await tx.organizationInvitation.update({
        where: { id: invitationId },
        data: { revokedAt: new Date() },
      });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Ámbito plataforma: propietario inicial de una empresa creada por el super admin
  // ---------------------------------------------------------------------------
  async inviteOwner(
    tx: Prisma.TransactionClient,
    orgId: string,
    actorId: string,
    owner: { email: string; firstName?: string; lastName?: string },
  ): Promise<() => Promise<void>> {
    const { invitation, token, orgName } = await this.createInvitation(tx, orgId, actorId, {
      email: owner.email.trim().toLowerCase(),
      role: 'owner',
      firstName: owner.firstName,
      lastName: owner.lastName,
    });
    // El correo se envía cuando la transacción ya se ha confirmado.
    return () => this.sendInvitation(invitation.email, token, orgName, invitation.role);
  }

  // ---------------------------------------------------------------------------
  // Ámbito público: el invitado consulta y acepta con el token del enlace
  // ---------------------------------------------------------------------------
  async preview(token: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const invitation = await this.findUsable(tx, token);
      const account = await tx.user.findFirst({
        where: { email: invitation.email, deletedAt: null },
        select: { id: true },
      });
      return {
        email: invitation.email,
        role: invitation.role,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        organization: { tradeName: invitation.organization.tradeName },
        expiresAt: invitation.expiresAt,
        hasAccount: account !== null,
      };
    });
  }

  /** Acepta creando una cuenta nueva; la contraseña la elige el propio invitado. */
  async acceptWithNewAccount(dto: AcceptInvitationDto) {
    // Se calcula fuera de la transacción para no retener la conexión.
    const passwordHash = await hashPassword(dto.password);

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const invitation = await this.findUsable(tx, dto.token);
      const existing = await tx.user.findFirst({
        where: { email: invitation.email, deletedAt: null },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          'Ya existe una cuenta con este correo. Inicia sesión para aceptar la invitación.',
        );
      }
      await this.claim(tx, invitation.id);

      // Haber recibido el enlace en su buzón demuestra que controla el correo.
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          username: await buildUniqueUsername(tx, invitation.email),
          passwordHash,
          firstName: dto.firstName?.trim() || invitation.firstName,
          lastName: dto.lastName?.trim() || invitation.lastName,
          defaultOrganizationId: invitation.organizationId,
          isActive: true,
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      await this.join(tx, invitation, user.id);
      return { email: user.email };
    });
  }

  /** Acepta con la cuenta con la que ya se ha iniciado sesión (mismo correo). */
  async acceptAsUser(token: string, userId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const invitation = await this.findUsable(tx, token);
      const user = await tx.user.findFirst({
        where: { id: userId, isActive: true, deletedAt: null },
      });
      if (!user || user.email.toLowerCase() !== invitation.email) {
        throw new ForbiddenException('Esta invitación es para otra dirección de correo');
      }
      const already = await tx.organizationMembership.findFirst({
        where: { organizationId: invitation.organizationId, userId },
        select: { id: true },
      });
      if (already) {
        throw new ConflictException('Ya perteneces a esta empresa');
      }
      await this.claim(tx, invitation.id);
      const membership = await this.join(tx, invitation, userId);
      return toMember(membership);
    });
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async createInvitation(
    tx: Prisma.TransactionClient,
    orgId: string,
    actorId: string,
    input: InvitationInput,
  ) {
    const org = await tx.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { tradeName: true },
    });
    if (!org) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Reenviar = cancelar las invitaciones pendientes anteriores a ese correo.
    await tx.organizationInvitation.updateMany({
      where: { organizationId: orgId, email: input.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const token = randomToken(32);
    const ttlHours = Number(this.config.get<string>('INVITATION_TTL_HOURS') ?? 72);
    const invitation = await tx.organizationInvitation.create({
      data: {
        organizationId: orgId,
        email: input.email,
        role: input.role,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        tokenHash: hashToken(token),
        invitedBy: actorId,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
      },
    });
    return { invitation, token, orgName: org.tradeName };
  }

  private async findUsable(tx: Prisma.TransactionClient, token: string) {
    const invitation = await tx.organizationInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { organization: { select: { tradeName: true, deletedAt: true } } },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt.getTime() < Date.now() ||
      invitation.organization.deletedAt
    ) {
      throw new BadRequestException(INVALID_INVITATION);
    }
    return invitation;
  }

  /** Marca la invitación como usada de forma atómica (evita aceptarla dos veces). */
  private async claim(tx: Prisma.TransactionClient, invitationId: string) {
    const claimed = await tx.organizationInvitation.updateMany({
      where: { id: invitationId, acceptedAt: null, revokedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException(INVALID_INVITATION);
    }
  }

  private async join(
    tx: Prisma.TransactionClient,
    invitation: { id: string; organizationId: string; role: string; invitedBy: string | null },
    userId: string,
  ) {
    const role = invitation.role as ROLES.OrganizationRole;
    const roleRow = await ensureSystemRole(tx, invitation.organizationId, role);
    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedBy: userId },
    });
    return tx.organizationMembership.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        roleId: roleRow.id,
        isOwner: role === 'owner',
        isActive: true,
        invitedBy: invitation.invitedBy,
      },
      include: { user: true, role: true },
    });
  }

  private async sendInvitation(email: string, token: string, orgName: string, role: string) {
    try {
      await this.mail.sendOrganizationInvitation(
        email,
        token,
        orgName,
        ROLES.ROLE_LABELS[role] ?? role,
      );
    } catch (error) {
      this.logger.error(`No se pudo enviar la invitación: ${String(error)}`);
    }
  }
}
