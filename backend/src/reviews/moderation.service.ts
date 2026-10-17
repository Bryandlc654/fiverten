import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModerateReviewDto, ReportReviewDto } from './dto/moderation.dto';
import {
  assertTransition,
  dataForStatus,
  type ModerationActionName,
} from './review-states';
import { reviewStatus, statusFilter, type ReviewStatus } from './reviews.mappers';

interface AdminListQuery {
  status?: ReviewStatus;
  search?: string;
  page: number;
  pageSize: number;
}

interface Reporter {
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
}

/** Estados en los que una reseña es pública y por tanto se puede reportar. */
const REPORTABLE: ReviewStatus[] = ['published', 'reported'];

/**
 * Reportes y moderación de reseñas. Las escrituras se hacen en contexto de
 * plataforma: review_reports y moderation_actions son tablas internas.
 */
@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  listReasons() {
    return this.prisma.withContext({}, async (tx) => {
      const reasons = await tx.reportReason.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { code: true, label: true },
      });
      return { reasons };
    });
  }

  // ---------------------------------------------------------------------------
  // Reportes
  // ---------------------------------------------------------------------------
  /** Una empresa reporta una reseña propia (p. ej. no corresponde a un cliente real). */
  async reportAsOrganization(orgId: string, userId: string, reviewId: string, dto: ReportReviewDto) {
    return this.report(reviewId, dto, { userId, organizationId: orgId }, orgId);
  }

  /** Un visitante reporta una reseña publicada desde el perfil público. */
  async reportAsVisitor(reviewId: string, dto: ReportReviewDto, ipAddress?: string) {
    return this.report(reviewId, dto, { ipAddress });
  }

  private async report(
    reviewId: string,
    dto: ReportReviewDto,
    reporter: Reporter,
    ownerOrgId?: string,
  ) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const review = await tx.review.findFirst({
        where: {
          id: reviewId,
          deletedAt: null,
          ...(ownerOrgId ? { organizationId: ownerOrgId } : {}),
        },
      });
      if (!review || !REPORTABLE.includes(reviewStatus(review))) {
        throw new NotFoundException('Reseña no encontrada');
      }
      const reason = await tx.reportReason.findFirst({
        where: { code: dto.reason, isActive: true },
      });
      if (!reason) {
        throw new BadRequestException('Motivo no válido');
      }

      // Un mismo denunciante no acumula reportes abiertos sobre la misma reseña.
      const duplicate = await tx.reviewReport.findFirst({
        where: {
          reviewId,
          status: 'open',
          OR: [
            reporter.organizationId ? { reporterOrganizationId: reporter.organizationId } : {},
            reporter.ipAddress ? { ipAddress: reporter.ipAddress } : {},
          ].filter((condition) => Object.keys(condition).length > 0),
        },
        select: { id: true },
      });
      if (!duplicate) {
        await tx.reviewReport.create({
          data: {
            reviewId,
            reasonId: reason.id,
            reporterUserId: reporter.userId ?? null,
            reporterOrganizationId: reporter.organizationId ?? null,
            ipAddress: reporter.ipAddress ?? null,
            comment: dto.comment?.trim() || null,
          },
        });
      }

      if (reviewStatus(review) === 'published') {
        await tx.review.update({ where: { id: reviewId }, data: dataForStatus('reported', review) });
        await tx.moderationAction.create({
          data: {
            reviewId,
            moderatorId: null,
            action: 'flag',
            fromStatus: 'published',
            toStatus: 'reported',
            reason: `Reporte: ${reason.label}`,
          },
        });
      }
      return { status: 'reported' as const };
    });
  }

  // ---------------------------------------------------------------------------
  // Moderación (super admin)
  // ---------------------------------------------------------------------------
  async adminList(query: AdminListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
      ...(query.status ? statusFilter(query.status) : {}),
    };
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { body: { contains: search, mode: 'insensitive' } },
        { reviewerName: { contains: search, mode: 'insensitive' } },
        { reviewerEmail: { contains: search, mode: 'insensitive' } },
        { organization: { tradeName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows, underReview, reported] = await Promise.all([
        tx.review.count({ where }),
        tx.review.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            organization: { select: { tradeName: true, slug: true } },
            response: { select: { body: true } },
            reports: {
              where: { status: 'open' },
              orderBy: { createdAt: 'desc' },
              include: { reason: { select: { label: true } } },
            },
            moderationActions: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        }),
        tx.review.count({ where: { deletedAt: null, ...statusFilter('under_review') } }),
        tx.review.count({ where: { deletedAt: null, ...statusFilter('reported') } }),
      ]);

      return {
        items: rows.map((review) => ({
          id: review.id,
          organization: review.organization,
          reviewerName: review.reviewerName,
          reviewerEmail: review.reviewerEmail,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: reviewStatus(review),
          ipAddress: review.ipAddress,
          antifraud: ((review.metadata as { antifraud?: string[] }).antifraud ?? []) as string[],
          createdAt: review.createdAt,
          publishedAt: review.publishedAt,
          response: review.response?.body ?? null,
          reports: review.reports.map((report) => ({
            id: report.id,
            reason: report.reason?.label ?? null,
            comment: report.comment,
            byOrganization: report.reporterOrganizationId !== null,
            createdAt: report.createdAt,
          })),
          history: review.moderationActions.map((action) => ({
            action: action.action,
            fromStatus: action.fromStatus,
            toStatus: action.toStatus,
            reason: action.reason,
            byModerator: action.moderatorId !== null,
            createdAt: action.createdAt,
          })),
        })),
        total,
        page,
        pageSize,
        queue: { underReview, reported },
      };
    });
  }

  async moderate(
    actorId: string,
    reviewId: string,
    action: ModerationActionName,
    dto: ModerateReviewDto,
  ) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const review = await tx.review.findFirst({ where: { id: reviewId, deletedAt: null } });
      if (!review) {
        throw new NotFoundException('Reseña no encontrada');
      }
      const from = reviewStatus(review);
      const transition = assertTransition(action, from, dto.reason);
      if (transition.to === 'published' && !review.emailConfirmedAt) {
        throw new BadRequestException('El autor no ha confirmado su correo');
      }

      // Condicionado al estado leído: si otro moderador actuó a la vez, no se pisa.
      const updated = await tx.review.updateMany({
        where: {
          id: reviewId,
          moderationStatus: review.moderationStatus,
          visibility: review.visibility,
        },
        data: dataForStatus(transition.to, review),
      });
      if (updated.count !== 1) {
        throw new BadRequestException('La reseña ha cambiado mientras tanto. Recarga la página.');
      }

      if (transition.reports) {
        await tx.reviewReport.updateMany({
          where: { reviewId, status: 'open' },
          data: { status: transition.reports, handledBy: actorId, handledAt: new Date() },
        });
      }
      await tx.moderationAction.create({
        data: {
          reviewId,
          moderatorId: actorId,
          action,
          fromStatus: from,
          toStatus: transition.to,
          reason: dto.reason?.trim() || null,
        },
      });
      return { id: reviewId, status: transition.to };
    });
  }
}
