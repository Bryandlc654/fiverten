import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewResponseDto } from './dto/review-response.dto';
import { statusFilter, toTenantReview, type ReviewStatus } from './reviews.mappers';
import { LOW_RATING_MAX } from './review-states';
import { reviewOrder, type ReviewSort } from './reviews.params';

interface ListQuery {
  rating?: number;
  status?: ReviewStatus;
  /** Solo reseñas recibidas desde esta fecha. */
  since?: Date;
  /** true = con respuesta, false = sin respuesta. */
  answered?: boolean;
  /** Solo reseñas publicadas de baja valoración (pendientes de atender). */
  lowRating?: boolean;
  sort: ReviewSort;
  page: number;
  pageSize: number;
}

/** Ámbito empresa (tenant): ver sus reseñas y responderlas públicamente. */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, query: ListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const where: Prisma.ReviewWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      ...(query.status ? statusFilter(query.status) : {}),
    };
    if (query.rating) {
      where.rating = query.rating;
    }
    if (query.since) {
      where.createdAt = { gte: query.since };
    }
    if (query.answered !== undefined) {
      where.response = query.answered ? { isNot: null } : { is: null };
    }
    if (query.lowRating) {
      where.AND = [
        { lifecycleStatus: 'published', visibility: 'public', moderationStatus: 'none' },
        { rating: { lte: LOW_RATING_MAX } },
      ];
    }

    return this.prisma.withContext({ orgId }, async (tx) => {
      const [total, rows, counts] = await Promise.all([
        tx.review.count({ where }),
        tx.review.findMany({
          where,
          include: {
            response: true,
            resolutions: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
          orderBy: reviewOrder(query.sort, 'createdAt'),
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.summary(tx, orgId),
      ]);
      return {
        items: rows.map((row) => toTenantReview(row)),
        total,
        page,
        pageSize,
        summary: counts,
      };
    });
  }

  async respond(orgId: string, actorId: string, reviewId: string, dto: ReviewResponseDto) {
    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const review = await this.findConfirmed(tx, orgId, reviewId);
      const body = dto.body.trim();
      await tx.reviewResponse.upsert({
        where: { reviewId },
        create: { reviewId, organizationId: orgId, authorUserId: actorId, body },
        update: { body, authorUserId: actorId, editedAt: new Date() },
      });
      const updated = await tx.review.findUniqueOrThrow({
        where: { id: review.id },
        include: { response: true, resolutions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      return toTenantReview(updated);
    });
  }

  async removeResponse(orgId: string, actorId: string, reviewId: string) {
    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      await this.findConfirmed(tx, orgId, reviewId);
      await tx.reviewResponse.deleteMany({ where: { reviewId, organizationId: orgId } });
      return { success: true };
    });
  }

  /** Contadores del panel en una sola consulta (antes eran cinco COUNT). */
  private async summary(tx: Prisma.TransactionClient, orgId: string) {
    // Mismo criterio que statusFilter('published').
    const published = Prisma.sql`r.lifecycle_status = 'published' AND r.visibility = 'public' AND r.moderation_status = 'none'`;
    const [row] = await tx.$queryRaw<
      { total: number; published: number; pending: number; unanswered: number; negative: number }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE r.email_confirmed_at IS NOT NULL)::int AS total,
        COUNT(*) FILTER (WHERE ${published})::int AS published,
        COUNT(*) FILTER (WHERE r.email_confirmed_at IS NULL)::int AS pending,
        COUNT(*) FILTER (WHERE ${published} AND rr.id IS NULL)::int AS unanswered,
        COUNT(*) FILTER (WHERE ${published} AND r.rating <= ${LOW_RATING_MAX})::int AS negative
      FROM reviews r
      LEFT JOIN review_responses rr ON rr.review_id = r.id
      WHERE r.organization_id = ${orgId}::uuid AND r.deleted_at IS NULL`;
    return row;
  }

  private async findConfirmed(tx: Prisma.TransactionClient, orgId: string, reviewId: string) {
    const review = await tx.review.findFirst({
      where: { id: reviewId, organizationId: orgId, deletedAt: null },
    });
    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }
    if (!review.emailConfirmedAt) {
      throw new BadRequestException('El autor aún no ha confirmado esta reseña');
    }
    return review;
  }
}
