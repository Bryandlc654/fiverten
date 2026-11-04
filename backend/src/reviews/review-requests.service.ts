import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { hashToken, randomToken } from '../common/tokens';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewRequestDto } from './dto/review-request.dto';

const DEFAULT_TTL_DAYS = 30;

export interface ReviewRequestListQuery {
  page: number;
  pageSize: number;
  status?: string;
}

/**
 * Solicitudes personalizadas de reseña: enlaces únicos por cliente con
 * seguimiento (enviada -> abierta -> completada) y tasa de conversión.
 */
@Injectable()
export class ReviewRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateReviewRequestDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const token = randomToken(32);
    const expiresAt = this.expiryDate();

    const organization = await this.prisma.withContext({ orgId }, (tx) =>
      tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: { tradeName: true, slug: true },
      }),
    );
    if (!organization) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const created = await this.prisma.withContext({ orgId }, (tx) =>
      tx.reviewRequest.create({
        data: {
          organizationId: orgId,
          tokenHash: hashToken(token),
          reviewerName: name,
          reviewerEmail: email,
          expiresAt,
          createdBy: userId,
        },
      }),
    );

    const url = this.buildUrl(organization.slug, token);
    this.mail
      .sendReviewRequest(email, name, organization.tradeName, url, this.ttlDays)
      .catch(() => undefined);

    return { ...this.toDto(created), url };
  }

  async list(orgId: string, query: ReviewRequestListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const where: Prisma.ReviewRequestWhereInput = {
      organizationId: orgId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows, grouped] = await this.prisma.withContext({ orgId }, (tx) =>
      Promise.all([
        tx.reviewRequest.count({ where }),
        tx.reviewRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { review: { select: { id: true } } },
        }),
        tx.reviewRequest.groupBy({
          by: ['status'],
          where: { organizationId: orgId },
          _count: { _all: true },
        }),
      ]),
    );

    const counts: Record<string, number> = { sent: 0, opened: 0, completed: 0 };
    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }
    const sent = counts.sent + counts.opened + counts.completed;

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
      stats: {
        sent,
        opened: counts.opened + counts.completed,
        completed: counts.completed,
        // Conversión = solicitudes que terminaron en reseña / solicitudes enviadas.
        conversion: sent > 0 ? Math.round((counts.completed / sent) * 1000) / 1000 : 0,
      },
    };
  }

  /** Valida el token público y marca la primera apertura. */
  async lookup(slug: string, token: string) {
    const now = new Date();
    const result = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const organization = await tx.organization.findFirst({
        where: { slug: slug.toLowerCase(), deletedAt: null },
        select: { id: true, tradeName: true, slug: true, logoUrl: true },
      });
      if (!organization) {
        return null;
      }
      const request = await tx.reviewRequest.findFirst({
        where: { organizationId: organization.id, tokenHash: hashToken(token) },
      });
      if (!request) {
        return null;
      }
      const completed = request.status === 'completed';
      // Un enlace ya usado sigue siendo "usado" aunque pase el plazo.
      const expired = !completed && request.expiresAt.getTime() < now.getTime();

      if (!expired && !completed && request.status === 'sent') {
        await tx.reviewRequest.update({
          where: { id: request.id },
          data: { status: 'opened', openedAt: now },
        });
      }

      return {
        reviewerName: request.reviewerName,
        reviewerEmail: request.reviewerEmail,
        completed,
        expired,
        expiresAt: request.expiresAt,
        organization: {
          tradeName: organization.tradeName,
          slug: organization.slug,
          logoUrl: organization.logoUrl,
        },
      };
    });

    if (!result) {
      throw new NotFoundException('El enlace de solicitud no es válido');
    }
    if (result.expired) {
      throw new BadRequestException('Este enlace de solicitud ha caducado');
    }
    return result;
  }

  /** Dentro de la transacción de envío: vincula la reseña recién creada. */
  async attachToReview(
    tx: Prisma.TransactionClient,
    orgId: string,
    token: string,
    reviewId: string,
  ): Promise<void> {
    const request = await tx.reviewRequest.findFirst({
      where: { organizationId: orgId, tokenHash: hashToken(token), reviewId: null },
      select: { id: true, expiresAt: true },
    });
    if (!request || request.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El enlace de solicitud no es válido o ha caducado');
    }
    await tx.reviewRequest.update({
      where: { id: request.id },
      data: { reviewId },
    });
  }

  /** Al confirmarse la reseña: la solicitud queda completada. */
  async completeForReview(tx: Prisma.TransactionClient, reviewId: string): Promise<void> {
    await tx.reviewRequest.updateMany({
      where: { reviewId, status: { not: 'completed' } },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  private toDto(row: {
    id: string;
    reviewerName: string;
    reviewerEmail: string;
    status: string;
    sentAt: Date;
    openedAt: Date | null;
    completedAt: Date | null;
    expiresAt: Date;
    reviewId: string | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      reviewerName: row.reviewerName,
      reviewerEmail: row.reviewerEmail,
      status: row.status,
      sentAt: row.sentAt,
      openedAt: row.openedAt,
      completedAt: row.completedAt,
      expiresAt: row.expiresAt,
      reviewId: row.reviewId,
      expired: row.status !== 'completed' && row.expiresAt.getTime() < Date.now(),
      createdAt: row.createdAt,
    };
  }

  private buildUrl(slug: string, token: string): string {
    const base = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    return `${base}/review/${encodeURIComponent(slug)}?rt=${encodeURIComponent(token)}`;
  }

  private expiryDate(): Date {
    return new Date(Date.now() + this.ttlDays * 24 * 60 * 60 * 1000);
  }

  private get ttlDays(): number {
    const value = Number(this.config.get<string>('REVIEW_REQUEST_TTL_DAYS') ?? DEFAULT_TTL_DAYS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_TTL_DAYS;
  }
}
