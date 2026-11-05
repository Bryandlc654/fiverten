import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompletePrivacyRequestDto,
  CreatePrivacyRequestDto,
} from './dto/privacy.dto';

const REQUEST_INCLUDE = {
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, orgId: string | null, dto: CreatePrivacyRequestDto) {
    return this.prisma.withContext({ userId, orgId }, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { email: true },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      return tx.privacyRequest.create({
        data: {
          userId,
          organizationId: orgId,
          email: user.email,
          type: dto.type,
          details: dto.details?.trim() || null,
        },
      });
    });
  }

  async listMine(userId: string) {
    return this.prisma.withContext({ userId }, async (tx) => {
      const items = await tx.privacyRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return { items };
    });
  }

  /** Exportación de los datos personales del propio usuario. */
  async exportMine(userId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          lastLoginAt: true,
          mfaEnabled: true,
          memberships: {
            select: {
              organizationId: true,
              isOwner: true,
              isActive: true,
              joinedAt: true,
              organization: { select: { tradeName: true, slug: true } },
            },
          },
        },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      const email = user.email.toLowerCase();
      const [reviews, relations, consents, requests] = await Promise.all([
        tx.review.findMany({
          where: { reviewerEmail: email, deletedAt: null },
          select: {
            id: true,
            organizationId: true,
            rating: true,
            title: true,
            body: true,
            lifecycleStatus: true,
            createdAt: true,
            publishedAt: true,
          },
        }),
        tx.clientRelation.findMany({
          where: { contactEmail: email },
          select: {
            id: true,
            projectId: true,
            contactName: true,
            contactEmail: true,
            status: true,
            consent: true,
            createdAt: true,
          },
        }),
        tx.consentRecord.findMany({
          where: { OR: [{ userId }, { email }] },
          orderBy: { createdAt: 'desc' },
        }),
        tx.privacyRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      ]);
      return {
        exportedAt: new Date().toISOString(),
        user,
        reviews,
        clientRelations: relations,
        consents,
        privacyRequests: requests,
      };
    });
  }

  async adminList(query: { status?: string; page: number; pageSize: number }) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const where = query.status ? { status: query.status } : {};
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, items] = await Promise.all([
        tx.privacyRequest.count({ where }),
        tx.privacyRequest.findMany({
          where,
          include: REQUEST_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { items, total, page, pageSize };
    });
  }

  async complete(actorId: string, id: string, dto: CompletePrivacyRequestDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.privacyRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      if (request.status === 'completed' || request.status === 'rejected') {
        throw new ForbiddenException('La solicitud ya está cerrada');
      }
      return tx.privacyRequest.update({
        where: { id },
        data: {
          status: dto.status,
          response: dto.response?.trim() || null,
          handledBy: actorId,
          handledAt: new Date(),
        },
      });
    });
  }
}
