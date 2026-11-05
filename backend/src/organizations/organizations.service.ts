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
import {
  CreateOrganizationLocationDto,
  UpdateOrganizationLocationDto,
} from './dto/organization-location.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  membershipRole,
  toLocation,
  toMember,
  toOrganizationDetail,
} from './organizations.mappers';

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
      const org = await tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        include: {
          locations: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      });
      if (!org) {
        throw new NotFoundException('Empresa no encontrada');
      }
      return {
        ...toOrganizationDetail(org),
        locations: org.locations.map(toLocation),
      };
    });
  }

  async listLocations(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const locations = await tx.organizationLocation.findMany({
        where: { organizationId: orgId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      return { locations: locations.map(toLocation) };
    });
  }

  async createLocation(orgId: string, dto: CreateOrganizationLocationDto) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const count = await tx.organizationLocation.count({
        where: { organizationId: orgId },
      });
      const isPrimary = dto.isPrimary ?? count === 0;
      if (isPrimary) {
        await tx.organizationLocation.updateMany({
          where: { organizationId: orgId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const location = await tx.organizationLocation.create({
        data: {
          organizationId: orgId,
          label: dto.label.trim(),
          addressLine: dto.addressLine?.trim() || null,
          city: dto.city?.trim() || null,
          region: dto.region?.trim() || null,
          postalCode: dto.postalCode?.trim() || null,
          country: dto.country?.trim() || null,
          isPrimary,
        },
      });
      return toLocation(location);
    });
  }

  async updateLocation(
    orgId: string,
    locationId: string,
    dto: UpdateOrganizationLocationDto,
  ) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const current = await tx.organizationLocation.findFirst({
        where: { id: locationId, organizationId: orgId },
      });
      if (!current) throw new NotFoundException('Ubicación no encontrada');
      if (dto.isPrimary) {
        await tx.organizationLocation.updateMany({
          where: { organizationId: orgId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const location = await tx.organizationLocation.update({
        where: { id: locationId },
        data: {
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.addressLine !== undefined
            ? { addressLine: dto.addressLine.trim() || null }
            : {}),
          ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
          ...(dto.region !== undefined ? { region: dto.region.trim() || null } : {}),
          ...(dto.postalCode !== undefined
            ? { postalCode: dto.postalCode.trim() || null }
            : {}),
          ...(dto.country !== undefined ? { country: dto.country.trim() || null } : {}),
          ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        },
      });
      return toLocation(location);
    });
  }

  async deleteLocation(orgId: string, locationId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const location = await tx.organizationLocation.findFirst({
        where: { id: locationId, organizationId: orgId },
      });
      if (!location) throw new NotFoundException('Ubicación no encontrada');
      await tx.organizationLocation.delete({ where: { id: locationId } });
      if (location.isPrimary) {
        const next = await tx.organizationLocation.findFirst({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'asc' },
        });
        if (next) {
          await tx.organizationLocation.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
      return { success: true };
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

      const actor = await getActor(tx, orgId, actorId);
      const targetRank = ROLES.roleRank(membershipRole(membership));
      if (targetRank > actor.rank || (targetRank === actor.rank && !actor.isOwner)) {
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
        const newRank = ROLES.roleRank(dto.role);
        if (newRank > actor.rank || (newRank === actor.rank && !actor.isOwner)) {
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
      const actor = await getActor(tx, orgId, actorId);
      const targetRank = ROLES.roleRank(membershipRole(membership));
      if (targetRank > actor.rank || (targetRank === actor.rank && !actor.isOwner)) {
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
export async function getActor(
  tx: Prisma.TransactionClient,
  orgId: string,
  actorId: string,
): Promise<{ rank: number; isOwner: boolean; role: string }> {
  const actor = await tx.organizationMembership.findFirst({
    where: { organizationId: orgId, userId: actorId, isActive: true },
    include: { role: true },
  });
  if (!actor) {
    throw new ForbiddenException('No perteneces a esta empresa');
  }
  const role = membershipRole(actor);
  return { rank: ROLES.roleRank(role), isOwner: actor.isOwner, role };
}

export async function getActorRank(
  tx: Prisma.TransactionClient,
  orgId: string,
  actorId: string,
): Promise<number> {
  return (await getActor(tx, orgId, actorId)).rank;
}
