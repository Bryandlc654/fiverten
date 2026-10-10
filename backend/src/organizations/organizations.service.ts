import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';
import { generatePublicId, slugify, slugifyUsername } from '../common/ids';
import * as ROLES from '../common/roles';
import { ensureAllSystemRoles, ensureSystemRole } from '../common/system-roles';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUpdateOrganizationDto } from './dto/admin-update-organization.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

interface ListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface PlatformStats {
  organizations: { total: number; active: number; verified: number; pending: number };
  users: { total: number; active: number; admins: number };
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Caché en proceso de las métricas de plataforma (evita agregados costosos en
  // cada visita del panel general). TTL corto para tolerar datos casi en vivo.
  private statsCache: { value: PlatformStats; expiresAt: number } | null = null;
  private static readonly STATS_TTL_MS = 30_000;

  // ---------------------------------------------------------------------------
  // Ámbito empresa (tenant)
  // ---------------------------------------------------------------------------
  async getMine(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const org = await tx.organization.findFirst({ where: { id: orgId, deletedAt: null } });
      if (!org) {
        throw new NotFoundException('Empresa no encontrada');
      }
      return this.toDetail(org);
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
      return this.toDetail(updated);
    });
  }

  async listMembers(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const memberships = await tx.organizationMembership.findMany({
        where: { organizationId: orgId },
        include: { user: true, role: true },
        orderBy: [{ isOwner: 'desc' }, { joinedAt: 'asc' }],
      });
      return { members: memberships.map((membership) => this.toMember(membership)) };
    });
  }

  async addMember(orgId: string, actorId: string, dto: CreateMemberDto) {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? 'viewer';

    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const actorRank = await this.getActorRank(tx, orgId, actorId);
      if (ROLES.roleRank(role) >= actorRank) {
        throw new ForbiddenException('No puedes asignar un rol igual o superior al tuyo');
      }

      let user = await tx.user.findFirst({ where: { email, deletedAt: null } });

      if (!user) {
        if (!dto.password) {
          throw new BadRequestException('Se requiere una contraseña para crear el usuario');
        }
        const passwordHash = await this.hashPassword(dto.password);
        user = await tx.user.create({
          data: {
            email,
            username: await this.buildUniqueUsername(tx, email),
            passwordHash,
            firstName: dto.firstName?.trim() || null,
            lastName: dto.lastName?.trim() || null,
            defaultOrganizationId: orgId,
            isActive: true,
          },
        });
      } else {
        const already = await tx.organizationMembership.findFirst({
          where: { organizationId: orgId, userId: user.id },
        });
        if (already) {
          throw new ConflictException('El usuario ya pertenece a la empresa');
        }
      }

    const roleRow = await ensureSystemRole(tx, orgId, role);
    const membership = await tx.organizationMembership.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          roleId: roleRow.id,
          isOwner: role === 'owner',
          isActive: true,
          invitedBy: actorId,
        },
        include: { user: true, role: true },
      });
      return this.toMember(membership);
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

      const actorRank = await this.getActorRank(tx, orgId, actorId);
      const targetRank = ROLES.roleRank(this.effectiveRole(membership));
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

      if (dto.role && dto.role !== this.effectiveRole(membership)) {
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
      return this.toMember(updated);
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
      const actorRank = await this.getActorRank(tx, orgId, actorId);
      const targetRank = ROLES.roleRank(this.effectiveRole(membership));
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

  // ---------------------------------------------------------------------------
  // Ámbito plataforma (administrador general)
  // ---------------------------------------------------------------------------
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
      return {
        organizations: {
          total: organizations,
          active: activeOrganizations,
          verified: verifiedOrganizations,
          pending: pendingOrganizations,
        },
        users: { total: users, active: activeUsers, admins: staffUsers },
      };
    });

    this.statsCache = { value, expiresAt: now + OrganizationsService.STATS_TTL_MS };
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
          ...this.toSummary(row),
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
        },
      });
      if (!org) {
        throw new NotFoundException('Empresa no encontrada');
      }
      return {
        ...this.toDetail(org),
        members: org.memberships.map((membership) => this.toMember(membership)),
      };
    });
  }

  async createOrganization(dto: CreateOrganizationDto, actorId: string) {
    const tradeName = dto.tradeName.trim();

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const organization = await tx.organization.create({
        data: {
          publicId: generatePublicId(),
          tradeName,
          legalName: dto.legalName?.trim() || tradeName,
          slug: await this.buildUniqueSlug(tx, tradeName),
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

      if (dto.ownerEmail) {
        await this.attachOwner(tx, organization.id, {
          email: dto.ownerEmail,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          password: dto.ownerPassword,
          actorId,
        });
      }

      return this.toDetail(organization);
    });
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
      return this.toDetail(updated);
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

  async updateUser(id: string, actorId: string, dto: { isActive?: boolean; isVerified?: boolean; isSuperAdmin?: boolean }) {
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

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async attachOwner(
    tx: Prisma.TransactionClient,
    orgId: string,
    owner: { email: string; firstName?: string; lastName?: string; password?: string; actorId: string },
  ) {
    const email = owner.email.trim().toLowerCase();
    let user = await tx.user.findFirst({ where: { email, deletedAt: null } });

    if (!user) {
      if (!owner.password) {
        throw new BadRequestException(
          'Se requiere una contraseña para crear la cuenta del propietario',
        );
      }
      user = await tx.user.create({
        data: {
          email,
          username: await this.buildUniqueUsername(tx, email),
          passwordHash: await this.hashPassword(owner.password),
          firstName: owner.firstName?.trim() || null,
          lastName: owner.lastName?.trim() || null,
          defaultOrganizationId: orgId,
          isActive: true,
          createdBy: owner.actorId,
        },
      });
    }

    const existing = await tx.organizationMembership.findFirst({
      where: { organizationId: orgId, userId: user.id },
    });
    if (existing) {
      return user;
    }

    const role = await ensureSystemRole(tx, orgId, 'owner');
    await tx.organizationMembership.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        roleId: role.id,
        isOwner: true,
        isActive: true,
        invitedBy: owner.actorId,
      },
    });
    return user;
  }

  private async buildUniqueSlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
    const base = slugify(name) || 'organizacion';
    let slug = base;
    let attempt = 0;
    while (await tx.organization.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      if (++attempt > 6) {
        throw new BadRequestException('No se pudo generar un identificador único');
      }
    }
    return slug;
  }

  private async buildUniqueUsername(tx: Prisma.TransactionClient, email: string): Promise<string> {
    const base = slugifyUsername(email);
    let username = base;
    let attempt = 0;
    while (await tx.user.findUnique({ where: { username }, select: { id: true } })) {
      username = `${base}${Math.floor(Math.random() * 90000)}`;
      if (++attempt > 6) {
        throw new BadRequestException('No se pudo generar un nombre de usuario único');
      }
    }
    return username;
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      algorithm: argon2.Algorithm.Argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  private effectiveRole(membership: { isOwner: boolean; role: { baseRole: string | null } }): string {
    return ROLES.effectiveRole(membership.role.baseRole, membership.isOwner);
  }

  private async getActorRank(
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
    return ROLES.roleRank(this.effectiveRole(actor));
  }

  private toDetail(org: {
    id: string; publicId: string; tradeName: string; legalName: string | null; slug: string;
    taxId: string | null; description: string | null; logoUrl: string | null; coverUrl: string | null;
    website: string | null;
    email: string | null; phone: string | null; locale: string; billingCurrency: string;
    status: string; verificationStatus: string; isActive: boolean; isPublic: boolean;
    allowContact: boolean; createdAt: Date; verifiedAt: Date | null;
  }) {
    return {
      id: org.id,
      publicId: org.publicId,
      tradeName: org.tradeName,
      legalName: org.legalName,
      slug: org.slug,
      taxId: org.taxId,
      description: org.description,
      logoUrl: org.logoUrl,
      coverUrl: org.coverUrl,
      website: org.website,
      email: org.email,
      phone: org.phone,
      locale: org.locale,
      billingCurrency: org.billingCurrency,
      status: org.status,
      verificationStatus: org.verificationStatus,
      isActive: org.isActive,
      isPublic: org.isPublic,
      allowContact: org.allowContact,
      createdAt: org.createdAt,
      verifiedAt: org.verifiedAt,
    };
  }

  private toSummary(org: {
    id: string; publicId: string; tradeName: string; slug: string; status: string;
    verificationStatus: string; isActive: boolean; createdAt: Date;
  }) {
    return {
      id: org.id,
      publicId: org.publicId,
      tradeName: org.tradeName,
      slug: org.slug,
      status: org.status,
      verificationStatus: org.verificationStatus,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }

  private toMember(membership: {
    id: string; userId: string; isOwner: boolean; isActive: boolean; joinedAt: Date;
    user: { id: string; email: string; username: string; firstName: string | null; lastName: string | null; isVerified: boolean; isActive: boolean };
    role: { name: string; baseRole: string | null };
  }) {
    return {
      membershipId: membership.id,
      userId: membership.userId,
      email: membership.user.email,
      username: membership.user.username,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      isVerified: membership.user.isVerified,
      isActive: membership.isActive && membership.user.isActive,
      isOwner: membership.isOwner,
      role: this.effectiveRole(membership),
      roleName: membership.role.name,
      joinedAt: membership.joinedAt,
    };
  }
}
