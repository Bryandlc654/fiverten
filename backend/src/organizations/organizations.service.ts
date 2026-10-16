import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ROLES from '../common/roles';
import { ensureSystemRole } from '../common/system-roles';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { membershipRole, toMember, toOrganizationDetail } from './organizations.mappers';

/**
 * Ámbito empresa (tenant): perfil de la organización y gestión de sus miembros.
 * Las altas de miembros van por invitación (ver InvitationsService) y la
 * administración de la plataforma vive en el módulo `admin`.
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const org = await tx.organization.findFirst({ where: { id: orgId, deletedAt: null } });
      if (!org) {
        throw new NotFoundException('Empresa no encontrada');
      }
      return toOrganizationDetail(org);
    });
  }

  async updateMine(orgId: string, actorId: string, dto: UpdateOrganizationDto) {
    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const org = await tx.organization.findFirst({ where: { id: orgId, deletedAt: null } });
      if (!org) {
        throw new NotFoundException('Empresa no encontrada');
      }
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: { ...dto, updatedBy: actorId },
      });
      return toOrganizationDetail(updated);
    });
  }

  async listMembers(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const memberships = await tx.organizationMembership.findMany({
        where: { organizationId: orgId },
        include: { user: true, role: true },
        orderBy: [{ isOwner: 'desc' }, { joinedAt: 'asc' }],
      });
      return { members: memberships.map((membership) => toMember(membership)) };
    });
  }

  async updateMember(
    orgId: string,
    actorId: string,
    membershipId: string,
    dto: UpdateMemberDto,
  ) {
    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const membership = await tx.organizationMembership.findFirst({
        where: { id: membershipId, organizationId: orgId },
        include: { user: true, role: true },
      });
      if (!membership) {
        throw new NotFoundException('Miembro no encontrado');
      }

      const actorRank = await getActorRank(tx, orgId, actorId);
      const targetRank = ROLES.roleRank(membershipRole(membership));
      if (targetRank >= actorRank) {
        throw new ForbiddenException(
          'No puedes modificar a un miembro con un rol igual o superior al tuyo',
        );
      }

      const data: Prisma.OrganizationMembershipUpdateInput = {};

      if (dto.isActive !== undefined) {
        if (!dto.isActive && membership.userId === actorId) {
          throw new BadRequestException('No puedes desactivar tu propia cuenta');
        }
        data.isActive = dto.isActive;
      }

      if (dto.role && dto.role !== membershipRole(membership)) {
        if (ROLES.roleRank(dto.role) >= actorRank) {
          throw new ForbiddenException('No puedes asignar un rol igual o superior al tuyo');
        }
        const roleRow = await ensureSystemRole(tx, orgId, dto.role);
        data.role = { connect: { id: roleRow.id } };
      }

      const updated = await tx.organizationMembership.update({
        where: { id: membershipId },
        data,
        include: { user: true, role: true },
      });
      return toMember(updated);
    });
  }

  async removeMember(orgId: string, actorId: string, membershipId: string) {
    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const membership = await tx.organizationMembership.findFirst({
        where: { id: membershipId, organizationId: orgId },
        include: { role: true },
      });
      if (!membership) {
        throw new NotFoundException('Miembro no encontrado');
      }
      if (membership.userId === actorId) {
        throw new BadRequestException('No puedes eliminarte a ti mismo de la empresa');
      }
      const actorRank = await getActorRank(tx, orgId, actorId);
      const targetRank = ROLES.roleRank(membershipRole(membership));
      if (targetRank >= actorRank) {
        throw new ForbiddenException(
          'No puedes eliminar a un miembro con un rol igual o superior al tuyo',
        );
      }
      if (membership.isOwner) {
        const owners = await tx.organizationMembership.count({
          where: { organizationId: orgId, isOwner: true, isActive: true },
        });
        if (owners <= 1) {
          throw new BadRequestException('La empresa debe tener al menos un propietario');
        }
      }
      await tx.organizationMembership.delete({ where: { id: membershipId } });
      return { success: true };
    });
  }
}

/** Rango del actor dentro de la organización (falla si no es miembro activo). */
export async function getActorRank(
  tx: Prisma.TransactionClient,
  orgId: string,
  actorId: string,
): Promise<number> {
  const actor = await tx.organizationMembership.findFirst({
    where: { organizationId: orgId, userId: actorId, isActive: true },
    include: { role: true },
  });
  if (!actor) {
    throw new ForbiddenException('No perteneces a esta empresa');
  }
  return ROLES.roleRank(membershipRole(actor));
}
