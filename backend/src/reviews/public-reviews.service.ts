import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashToken, randomToken } from '../common/tokens';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { PUBLIC_REVIEW_SELECT, toPublicReview } from './reviews.mappers';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export type ReviewSort = 'recent' | 'oldest';

interface ListQuery {
  rating?: number;
  sort: ReviewSort;
  page: number;
  pageSize: number;
}

const PUBLISHED: Prisma.ReviewWhereInput = {
  lifecycleStatus: 'published',
  visibility: 'public',
  deletedAt: null,
};

const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const IP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REVIEWS_PER_IP = 3;
const LINK_PATTERN = /(https?:\/\/|www\.)\S+/i;

const INVALID_CONFIRMATION = 'El enlace de confirmación no es válido o ha caducado';

/**
 * Ámbito público: perfil de la empresa, listado de reseñas publicadas y
 * recepción de reseñas nuevas. No requiere sesión.
 */
@Injectable()
export class PublicReviewsService {
  private readonly logger = new Logger(PublicReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Perfil público
  // ---------------------------------------------------------------------------
  async getProfile(slug: string) {
    const org = await this.findOrganization(slug, { requirePublic: true });

    // Sin contexto de tenant: la política RLS pública solo deja ver reseñas publicadas.
    const grouped = await this.prisma.withContext({}, (tx) =>
      tx.review.groupBy({
        by: ['rating'],
        where: { organizationId: org.id, ...PUBLISHED },
        _count: { _all: true },
      }),
    );

    const distribution: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of grouped) {
      distribution[row.rating] = row._count._all;
      total += row._count._all;
      sum += row.rating * row._count._all;
    }

    return {
      slug: org.slug,
      tradeName: org.tradeName,
      description: org.description,
      logoUrl: org.logoUrl,
      coverUrl: org.coverUrl,
      website: org.website,
      email: org.allowContact ? org.email : null,
      phone: org.allowContact ? org.phone : null,
      verified: org.verificationStatus === 'verified',
      createdAt: org.createdAt,
      rating: {
        average: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
        total,
        distribution,
      },
    };
  }

  async listReviews(slug: string, query: ListQuery) {
    const org = await this.findOrganization(slug, { requirePublic: true });
    const page = Math.max(1, query.page);
    const pageSize = Math.min(50, Math.max(1, query.pageSize));
    const where: Prisma.ReviewWhereInput = { organizationId: org.id, ...PUBLISHED };
    if (query.rating) {
      where.rating = query.rating;
    }

    return this.prisma.withContext({}, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.review.count({ where }),
        tx.review.findMany({
          where,
          select: PUBLIC_REVIEW_SELECT,
          orderBy: { publishedAt: query.sort === 'oldest' ? 'asc' : 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { items: rows.map((row) => toPublicReview(row)), total, page, pageSize };
    });
  }

  /** Cabecera del formulario: la empresa recibe reseñas aunque su perfil aún no sea público. */
  async getReviewForm(slug: string) {
    const org = await this.findOrganization(slug, { requirePublic: false });
    return {
      slug: org.slug,
      tradeName: org.tradeName,
      logoUrl: org.logoUrl,
      verified: org.verificationStatus === 'verified',
      isPublic: org.isPublic,
    };
  }

  // ---------------------------------------------------------------------------
  // Recepción de reseñas
  // ---------------------------------------------------------------------------
  async submit(slug: string, dto: SubmitReviewDto, ctx: RequestContext) {
    const pending = { status: 'pending_confirmation' as const };

    // Trampa para bots: se responde igual que si todo hubiera ido bien.
    if (dto.website) {
      this.logger.warn(`Reseña descartada por honeypot (ip=${ctx.ipAddress ?? 'n/a'})`);
      return pending;
    }

    const org = await this.findOrganization(slug, { requirePublic: false });
    const email = dto.email.trim().toLowerCase();
    const token = randomToken(32);

    await this.prisma.withContext({ orgId: org.id }, async (tx) => {
      const duplicate = await tx.review.findFirst({
        where: {
          organizationId: org.id,
          reviewerEmail: email,
          deletedAt: null,
          createdAt: { gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException(
          'Ya has enviado una reseña a esta empresa recientemente. Revisa tu correo para confirmarla.',
        );
      }

      await tx.review.create({
        data: {
          organizationId: org.id,
          reviewerName: dto.name.trim(),
          reviewerEmail: email,
          rating: dto.rating,
          title: dto.title?.trim() || null,
          body: dto.body.trim(),
          experienceDate: dto.experienceDate ? new Date(dto.experienceDate) : null,
          orderReference: dto.orderReference?.trim() || null,
          consent: dto.consent,
          confirmTokenHash: hashToken(token),
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent?.slice(0, 500) ?? null,
        },
      });
    });

    try {
      await this.mail.sendReviewConfirmation(email, token, org.tradeName);
    } catch (error) {
      this.logger.error(`No se pudo enviar la confirmación de reseña: ${String(error)}`);
    }
    return pending;
  }

  /**
   * El autor confirma su email desde el enlace. Si no hay señales de fraude la
   * reseña se publica; si las hay, queda en revisión para moderación.
   */
  async confirm(token: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const review = await tx.review.findUnique({
        where: { confirmTokenHash: hashToken(token) },
        include: { organization: { select: { slug: true, tradeName: true, isPublic: true } } },
      });
      if (
        !review ||
        review.emailConfirmedAt ||
        review.deletedAt ||
        review.createdAt.getTime() + CONFIRM_TTL_MS < Date.now()
      ) {
        throw new BadRequestException(INVALID_CONFIRMATION);
      }

      const flags = await this.antifraudFlags(tx, review);
      const now = new Date();
      const publish = flags.length === 0;

      // Reclamo atómico: el mismo enlace no puede confirmarse dos veces.
      const claimed = await tx.review.updateMany({
        where: { id: review.id, emailConfirmedAt: null },
        data: {
          emailConfirmedAt: now,
          confirmTokenHash: null,
          ...(publish
            ? { lifecycleStatus: 'published', visibility: 'public', publishedAt: now }
            : {
                moderationStatus: 'under_review',
                metadata: { ...(review.metadata as object), antifraud: flags },
              }),
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(INVALID_CONFIRMATION);
      }

      return {
        status: publish ? ('published' as const) : ('under_review' as const),
        organization: {
          slug: review.organization.slug,
          tradeName: review.organization.tradeName,
          isPublic: review.organization.isPublic,
        },
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async antifraudFlags(
    tx: Prisma.TransactionClient,
    review: { id: string; organizationId: string; ipAddress: string | null; body: string; title: string | null },
  ): Promise<string[]> {
    const flags: string[] = [];
    if (review.ipAddress) {
      const sameIp = await tx.review.count({
        where: {
          organizationId: review.organizationId,
          ipAddress: review.ipAddress,
          id: { not: review.id },
          createdAt: { gt: new Date(Date.now() - IP_WINDOW_MS) },
        },
      });
      if (sameIp >= MAX_REVIEWS_PER_IP) {
        flags.push('ip_burst');
      }
    }
    if (LINK_PATTERN.test(review.body) || LINK_PATTERN.test(review.title ?? '')) {
      flags.push('contains_link');
    }
    return flags;
  }

  private async findOrganization(slug: string, options: { requirePublic: boolean }) {
    // La búsqueda por slug es anterior a conocer el tenant: contexto de plataforma.
    const org = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.organization.findFirst({ where: { slug: slug.toLowerCase(), deletedAt: null } }),
    );
    if (
      !org ||
      !org.isActive ||
      org.status !== 'active' ||
      (options.requirePublic && !org.isPublic)
    ) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return org;
  }
}
