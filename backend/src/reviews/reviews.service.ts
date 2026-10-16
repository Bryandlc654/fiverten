import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewResponseDto } from './dto/review-response.dto';
import { statusFilter, toTenantReview, type ReviewStatus } from './reviews.mappers';

interface ListQuery {
  rating?: number;
  status?: ReviewStatus;
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

    return this.prisma.withContext({ orgId }, async (tx) => {
      const [total, rows, counts] = await Promise.all([
        tx.review.count({ where }),
        tx.review.findMany({
          where,
          include: { response: true },
          orderBy: { createdAt: 'desc' },
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
        include: { response: true },
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

  private async summary(tx: Prisma.TransactionClient, orgId: string) {
    const base = { organizationId: orgId, deletedAt: null };
    const [total, published, pending, unanswered, negative] = await Promise.all([
      tx.review.count({ where: { ...base, emailConfirmedAt: { not: null } } }),
      tx.review.count({ where: { ...base, ...statusFilter('published') } }),
      tx.review.count({ where: { ...base, ...statusFilter('pending') } }),
      tx.review.count({ where: { ...base, ...statusFilter('published'), response: null } }),
      tx.review.count({ where: { ...base, ...statusFilter('published'), rating: { lte: 2 } } }),
    ]);
    return { total, published, pending, unanswered, negative };
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
