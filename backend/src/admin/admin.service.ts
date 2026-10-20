import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { generatePublicId } from '../common/ids';
import * as ROLES from '../common/roles';
import { ensureAllSystemRoles } from '../common/system-roles';
import { buildUniqueSlug } from '../common/unique';
import { InvitationsService } from '../organizations/invitations.service';
import {
  toInvitation,
  toMember,
  toOrganizationDetail,
  toOrganizationSummary,
} from '../organizations/organizations.mappers';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUpdateOrganizationDto } from './dto/admin-update-organization.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

interface ListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface PlatformStats {
  organizations: { total: number; active: number; verified: number; pending: number };
  users: { total: number; active: number; admins: number };
  reviews: { published: number; underReview: number; reported: number };
}

/** Ámbito plataforma (administrador general): empresas, usuarios y métricas. */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
  ) {}

  // Caché en proceso de las métricas de plataforma (evita agregados costosos en
  // cada visita del panel general). TTL corto para tolerar datos casi en vivo.
  private statsCache: { value: PlatformStats; expiresAt: number } | null = null;
  private static readonly STATS_TTL_MS = 30_000;

  async stats(): Promise<PlatformStats> {
    const now = Date.now();
    if (this.statsCache && this.statsCache.expiresAt > now) {
      return this.statsCache.value;
    }

    const value = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [organizations, activeOrganizations, verifiedOrganizations, pendingOrganizations] =
        await Promise.all([
          tx.organization.count({ where: { deletedAt: null } }),
          tx.organization.count({ where: { deletedAt: null, status: 'active' } }),
          tx.organization.count({ where: { deletedAt: null, verificationStatus: 'verified' } }),
          tx.organization.count({ where: { deletedAt: null, verificationStatus: 'pending' } }),
        ]);
      const [users, activeUsers, staffUsers] = await Promise.all([
        tx.user.count({ where: { deletedAt: null } }),
        tx.user.count({ where: { deletedAt: null, isActive: true } }),
        tx.user.count({ where: { deletedAt: null, isSuperAdmin: true } }),
      ]);
      const [publishedReviews, underReview, reported] = await Promise.all([
        tx.review.count({
          where: { deletedAt: null, lifecycleStatus: 'published', visibility: 'public' },
        }),
        tx.review.count({ where: { deletedAt: null, moderationStatus: 'under_review' } }),
        tx.review.count({ where: { deletedAt: null, moderationStatus: 'reported' } }),
      ]);
      return {
        organizations: {
          total: organizations,
          active: activeOrganizations,
          verified: verifiedOrganizations,
          pending: pendingOrganizations,
        },
        users: { total: users, active: activeUsers, admins: staffUsers },
        reviews: { published: publishedReviews, underReview, reported },
      };
    });

    this.statsCache = { value, expiresAt: now + AdminService.STATS_TTL_MS };
    return value;
  }

  async listOrganizations(query: ListQuery & { status?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const search = query.search?.trim();

    const where: Prisma.OrganizationWhereInput = { deletedAt: null };
    if (query.status) {
      where.status = query.status;
    }
    if (search) {
      where.OR = [
        { tradeName: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { publicId: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.organization.count({ where }),
        tx.organization.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { _count: { select: { memberships: true } } },
        }),
      ]);
      return {
        items: rows.map((row) => ({
          ...toOrganizationSummary(row),
          members: row._count.memberships,
        })),
        total,
        page,
        pageSize,
      };
    });
  }

  async getOrganization(id: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id, deletedAt: null },
        include: {
          memberships: { include: { user: true, role: true }, orderBy: { isOwner: 'desc' } },
          invitations: {
            where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!org) {
        throw new NotFoundException('Empresa no encontrada');
      }
      return {
        ...toOrganizationDetail(org),
        members: org.memberships.map((membership) => toMember(membership)),
        invitations: org.invitations.map((invitation) => toInvitation(invitation)),
      };
    });
  }

  async createOrganization(dto: CreateOrganizationDto, actorId: string) {
    const tradeName = dto.tradeName.trim();

    const { organization, sendOwnerInvitation } = await this.prisma.withContext(
      { isPlatformAdmin: true },
      async (tx) => {
        const organization = await tx.organization.create({
          data: {
            publicId: generatePublicId(),
            tradeName,
            legalName: dto.legalName?.trim() || tradeName,
            slug: await buildUniqueSlug(tx, tradeName),
            taxId: dto.taxId?.trim() || null,
            email: dto.email?.trim().toLowerCase() || null,
            phone: dto.phone?.trim() || null,
            website: dto.website?.trim() || null,
            description: dto.description?.trim() || null,
            status: 'active',
            isActive: true,
            createdBy: actorId,
          },
        });

        await ensureAllSystemRoles(tx, organization.id);

        // El propietario no se crea ni se vincula directamente: se le invita.
        const sendOwnerInvitation = dto.ownerEmail
          ? await this.invitations.inviteOwner(tx, organization.id, actorId, {
              email: dto.ownerEmail,
              firstName: dto.ownerFirstName,
              lastName: dto.ownerLastName,
            })
          : null;

        return { organization, sendOwnerInvitation };
      },
    );

    // No se espera: el correo de invitación no debe retrasar la respuesta.
    void sendOwnerInvitation?.();
    return {
      ...toOrganizationDetail(organization),
      ownerInvitationSent: sendOwnerInvitation !== null,
    };
  }

  async updateOrganization(id: string, actorId: string, dto: AdminUpdateOrganizationDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const org = await tx.organization.findFirst({ where: { id, deletedAt: null } });
      if (!org) {
        throw new NotFoundException('Empresa no encontrada');
      }
      const data: Prisma.OrganizationUpdateInput = { ...dto, updatedBy: actorId };
      if (dto.verificationStatus === 'verified') {
        data.verifiedAt = new Date();
        data.verificationComputedAt = new Date();
      }
      const updated = await tx.organization.update({ where: { id }, data });
      return toOrganizationDetail(updated);
    });
  }

  async listUsers(query: ListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.user.count({ where }),
        tx.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            memberships: {
              where: { isActive: true },
              include: { organization: { select: { id: true, tradeName: true } }, role: true },
              orderBy: [{ isOwner: 'desc' }, { joinedAt: 'asc' }],
              take: 1,
            },
          },
        }),
      ]);
      return {
        items: rows.map((user) => ({
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isVerified: user.isVerified,
          isSuperAdmin: user.isSuperAdmin,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          organization: user.memberships[0]?.organization
            ? {
                id: user.memberships[0].organization.id,
                tradeName: user.memberships[0].organization.tradeName,
              }
            : null,
          role: user.memberships[0]
            ? ROLES.effectiveRole(user.memberships[0].role.baseRole, user.memberships[0].isOwner)
            : null,
        })),
        total,
        page,
        pageSize,
      };
    });
  }

  async updateUser(id: string, actorId: string, dto: AdminUpdateUserDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const user = await tx.user.findFirst({ where: { id, deletedAt: null } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      if (dto.isActive === false && id === actorId) {
        throw new BadRequestException('No puedes desactivar tu propia cuenta');
      }
      const updated = await tx.user.update({
        where: { id },
        data: {
          isActive: dto.isActive,
          isVerified: dto.isVerified,
          isSuperAdmin: dto.isSuperAdmin,
          updatedBy: actorId,
        },
      });
      return {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        firstName: updated.firstName,
        lastName: updated.lastName,
        isActive: updated.isActive,
        isVerified: updated.isVerified,
        isSuperAdmin: updated.isSuperAdmin,
      };
    });
  }
}
