import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { hashToken, randomToken } from '../common/tokens';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../settings/settings.service';
import { effectiveVerificationStatus } from '../verification/verification-status';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { ReviewCasesService } from './cases.service';
import { ReviewRequestsService } from './review-requests.service';
import { dataForStatus } from './review-states';
import { PUBLIC_REVIEW_SELECT, toPublicReview } from './reviews.mappers';
import { reviewOrder, type ReviewSort } from './reviews.params';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface ListQuery {
  rating?: number;
  /** Solo reseñas publicadas desde esta fecha. */
  since?: Date;
  projectType?: string;
  clientStatus?: string;
  sort: ReviewSort;
  page: number;
  pageSize: number;
}

const PUBLISHED: Prisma.ReviewWhereInput = {
  lifecycleStatus: 'published',
  visibility: 'public',
  deletedAt: null,
};

export const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const IP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REVIEWS_PER_IP = 3;
const LINK_PATTERN = /(https?:\/\/|www\.)\S+/i;

const INVALID_CONFIRMATION = 'El enlace de confirmación no es válido o ha caducado';

/** Motivo del rechazo de una reseña repetida, según el estado de la anterior. */
function duplicateMessage(previous: { createdAt: Date; emailConfirmedAt: Date | null }): string {
  if (!previous.emailConfirmedAt) {
    return 'Ya has enviado una reseña a esta empresa y está pendiente de confirmar. Revisa tu correo para confirmarla.';
  }
  const nextDate = new Date(previous.createdAt.getTime() + DUPLICATE_WINDOW_MS).toLocaleDateString(
    'es-ES',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
  return `Ya has dejado una reseña sobre esta empresa en los últimos 30 días. Podrás escribir otra a partir del ${nextDate}.`;
}

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
    private readonly cases: ReviewCasesService,
    private readonly notifications: NotificationsService,
    private readonly requests: ReviewRequestsService,
    private readonly billing: BillingService,
    private readonly settings: PlatformSettingsService,
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
        where: {
          organizationId: org.id,
          ...PUBLISHED,
          verificationStatus: { in: ['identified', 'confirmed', 'verified'] },
        },
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
      sector: org.sector ? { slug: org.sector.slug, name: org.sector.name } : null,
      country: org.country ? { iso2: org.country.iso2, name: org.country.name } : null,
      verified: effectiveVerificationStatus(org) === 'verified',
      createdAt: org.createdAt,
      // La media solo usa opiniones que cumplen el mínimo publicado:
      // identidad/canal confirmado (IDENTIFIED) o superior.
      lowRatingsHidden: org.hideLowRatings,
      rating: {
        average: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
        total,
        sampleSize: total,
        distribution,
      },
    };
  }

  async listReviews(slug: string, query: ListQuery) {
    const org = await this.findOrganization(slug, { requirePublic: true });
    const lowRatingMax = await this.settings.lowRatingMax();
    const page = Math.max(1, query.page);
    const pageSize = Math.min(50, Math.max(1, query.pageSize));
    const where: Prisma.ReviewWhereInput = { organizationId: org.id, ...PUBLISHED };
    if (query.rating) {
      where.rating = query.rating;
    }
    if (org.hideLowRatings) {
      where.AND = [{ rating: { gt: lowRatingMax } }];
    }
    if (query.since) {
      where.publishedAt = { gte: query.since };
    }
    if (query.projectType || query.clientStatus) {
      where.project = {
        ...(query.projectType ? { projectType: query.projectType } : {}),
        ...(query.clientStatus ? { clientStatus: query.clientStatus } : {}),
      };
    }

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.review.count({ where }),
        tx.review.findMany({
          where,
          select: PUBLIC_REVIEW_SELECT,
          orderBy: reviewOrder(query.sort, 'publishedAt'),
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
    const verified = effectiveVerificationStatus(org) === 'verified';
    const projects = verified
      ? await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
          const approved = await tx.verificationRequest.findFirst({
            where: { organizationId: org.id, status: 'approved' },
            orderBy: { reviewedAt: 'desc' },
            select: { id: true },
          });
          if (!approved) return [];
          return tx.verificationProject.findMany({
            where: { organizationId: org.id, requestId: approved.id },
            select: { id: true, name: true },
            orderBy: { createdAt: 'asc' },
          });
        })
      : [];
    return {
      slug: org.slug,
      tradeName: org.tradeName,
      logoUrl: org.logoUrl,
      verified,
      isPublic: org.isPublic,
      projects,
    };
  }

  // ---------------------------------------------------------------------------
  // Directorio público
  // ---------------------------------------------------------------------------
  async listOrganizations(query: {
    page: number;
    pageSize: number;
    search?: string;
    sector?: string;
    country?: string;
    verified?: boolean;
    hasProjects?: boolean;
    hasOpinions?: boolean;
    sort?: 'relevance' | 'recent' | 'rating';
  }) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(48, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const basePublic: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      isActive: true,
      status: 'active',
      isPublic: true,
    };
    const where: Prisma.OrganizationWhereInput = {
      ...basePublic,
      ...(search
        ? {
            OR: [
              { tradeName: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.sector ? { sector: { slug: query.sector } } : {}),
      ...(query.country ? { country: { iso2: query.country.toUpperCase() } } : {}),
    };
    const and: Prisma.OrganizationWhereInput[] = [];
    if (query.verified) {
      and.push(
        { verificationStatus: 'verified' },
        { OR: [{ verificationExpiresAt: null }, { verificationExpiresAt: { gt: new Date() } }] },
      );
    }
    if (query.hasProjects) {
      and.push({
        verificationRequests: { some: { status: 'approved', projects: { some: {} } } },
      });
    }
    if (query.hasOpinions) {
      and.push({ reviews: { some: PUBLISHED } });
    }
    if (and.length > 0) {
      where.AND = and;
    }

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.organization.count({ where }),
        tx.organization.findMany({
          where,
          include: {
            sector: { select: { slug: true, name: true } },
            country: { select: { iso2: true, name: true } },
            verificationRequests: {
              where: { status: 'approved' },
              orderBy: { reviewedAt: 'desc' },
              take: 1,
              select: {
                reviewedAt: true,
                _count: { select: { documents: true, projects: true } },
              },
            },
          },
          orderBy:
            query.sort === 'recent'
              ? { createdAt: 'desc' }
              : query.sort === 'rating'
                ? { reviews: { _count: 'desc' } }
                : { tradeName: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      const ids = rows.map((row) => row.id);
      const grouped = ids.length
        ? await           tx.review.groupBy({
            by: ['organizationId'],
            where: {
              organizationId: { in: ids },
              ...PUBLISHED,
              verificationStatus: { in: ['identified', 'confirmed', 'verified'] },
            },
            _avg: { rating: true },
            _count: { _all: true },
          })
        : [];
      const ratings = new Map(
        grouped.map((row) => [
          row.organizationId,
          {
            average:
              row._avg.rating === null ? null : Math.round(row._avg.rating * 10) / 10,
            total: row._count._all,
          },
        ]),
      );

      const verifiedCondition: Prisma.OrganizationWhereInput = {
        ...basePublic,
        verificationStatus: 'verified',
        OR: [{ verificationExpiresAt: null }, { verificationExpiresAt: { gt: new Date() } }],
      };
      const [sectorGroups, countryGroups, totalPublic, verifiedCount, withProjects, withOpinions, verifiedProjects] =
        await Promise.all([
          tx.organization.groupBy({
            by: ['sectorId'],
            where: basePublic,
            _count: { _all: true },
          }),
          tx.organization.groupBy({
            by: ['countryId'],
            where: basePublic,
            _count: { _all: true },
          }),
          tx.organization.count({ where: basePublic }),
          tx.organization.count({ where: verifiedCondition }),
          tx.organization.count({
            where: {
              ...basePublic,
              verificationRequests: { some: { status: 'approved', projects: { some: {} } } },
            },
          }),
          tx.organization.count({ where: { ...basePublic, reviews: { some: PUBLISHED } } }),
          tx.verificationProject.count({
            where: {
              request: { status: 'approved' },
              organization: basePublic,
            },
          }),
        ]);

      const sectorIds = sectorGroups.map((row) => row.sectorId).filter((id): id is string => !!id);
      const countryIds = countryGroups
        .map((row) => row.countryId)
        .filter((id): id is string => !!id);
      const [sectors, countries] = await Promise.all([
        sectorIds.length
          ? tx.sector.findMany({
              where: { id: { in: sectorIds } },
              select: { id: true, slug: true, name: true },
            })
          : ([] as { id: string; slug: string; name: string }[]),
        countryIds.length
          ? tx.country.findMany({
              where: { id: { in: countryIds } },
              select: { id: true, iso2: true, name: true },
            })
          : ([] as { id: string; iso2: string; name: string }[]),
      ]);
      const sectorById = new Map(sectors.map((sector) => [sector.id, sector]));
      const countryById = new Map(countries.map((country) => [country.id, country]));

      return {
        items: rows.map((row) => {
          const latest = row.verificationRequests[0];
          return {
            slug: row.slug,
            tradeName: row.tradeName,
            description: row.description,
            logoUrl: row.logoUrl,
            coverUrl: row.coverUrl,
            publicId: row.publicId,
            sector: row.sector,
            country: row.country,
            verified: effectiveVerificationStatus(row) === 'verified',
            verifiedAt: row.verifiedAt,
            lastVerifiedAt: latest?.reviewedAt ?? null,
            projectsCount: latest?._count.projects ?? 0,
            documentsCount: latest?._count.documents ?? 0,
            rating: ratings.get(row.id) ?? { average: null, total: 0 },
          };
        }),
        total,
        page,
        pageSize,
        facets: {
          sectors: sectorGroups
            .map((row) => {
              const sector = row.sectorId ? sectorById.get(row.sectorId) : null;
              return sector
                ? { slug: sector.slug, name: sector.name, count: row._count._all }
                : null;
            })
            .filter((item): item is { slug: string; name: string; count: number } => item !== null)
            .sort((a, b) => b.count - a.count),
          countries: countryGroups
            .map((row) => {
              const country = row.countryId ? countryById.get(row.countryId) : null;
              return country
                ? { iso2: country.iso2, name: country.name, count: row._count._all }
                : null;
            })
            .filter((item): item is { iso2: string; name: string; count: number } => item !== null)
            .sort((a, b) => b.count - a.count),
          verifiedCount,
          withProjects,
          withOpinions,
          metrics: {
            verifiedCompanies: verifiedCount,
            verifiedProjects,
            identityVerifiedPercent:
              totalPublic > 0 ? Math.round((verifiedCount / totalPublic) * 100) : 0,
            countries: countryGroups.length,
          },
        },
      };
    });
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
          // Una reseña sin confirmar cuyo enlace ya caducó no se puede publicar:
          // no debe impedir que el cliente vuelva a escribir.
          OR: [
            { emailConfirmedAt: { not: null } },
            { createdAt: { gt: new Date(Date.now() - CONFIRM_TTL_MS) } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, emailConfirmedAt: true },
      });
      if (duplicate) {
        throw new ConflictException(duplicateMessage(duplicate));
      }

      await this.billing.assertCanReceiveReview(tx, org.id);

      let projectId: string | null = null;
      if (dto.projectId) {
        if (effectiveVerificationStatus(org) !== 'verified') {
          throw new BadRequestException('La empresa no tiene una verificación vigente');
        }
        const approved = await tx.verificationRequest.findFirst({
          where: { organizationId: org.id, status: 'approved' },
          orderBy: { reviewedAt: 'desc' },
          select: { id: true },
        });
        const project = approved
          ? await tx.verificationProject.findFirst({
              where: {
                id: dto.projectId,
                organizationId: org.id,
                requestId: approved.id,
              },
              select: { id: true },
            })
          : null;
        if (!project) {
          throw new BadRequestException('El proyecto indicado no es válido');
        }
        projectId = project.id;
      }

      const created = await tx.review.create({
        data: {
          organizationId: org.id,
          projectId,
          reviewerName: dto.name.trim(),
          reviewerEmail: email,
          rating: dto.rating,
          title: dto.title?.trim() || null,
          body: dto.body.trim(),
          experienceDate: dto.experienceDate ? new Date(dto.experienceDate) : null,
          orderReference: dto.orderReference?.trim() || null,
          consent: dto.consent,
          verificationStatus: projectId || dto.requestToken ? 'confirmed' : 'identified',
          confirmTokenHash: hashToken(token),
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent?.slice(0, 500) ?? null,
        },
      });
      // Enlace personalizado: la reseña queda vinculada a la solicitud. La
      // relación cliente-experiencia queda confirmada, pero no verificada:
      // VERIFIED exige revisión y trazabilidad de FIVERTEN.
      if (dto.requestToken) {
        await this.requests.attachToReview(tx, org.id, dto.requestToken, created.id, email);
        await tx.review.update({
          where: { id: created.id },
          data: { verificationStatus: 'confirmed' },
        });
      }
      if (projectId) {
        await tx.verificationProject.update({
          where: { id: projectId },
          data: { clientStatus: 'confirmed' },
        });
      }
    });

    // No se espera: el envío por SMTP puede tardar y la respuesta debe ser inmediata.
    this.mail.sendReviewConfirmation(email, token, org.tradeName).catch((error: unknown) => {
      this.logger.error(`No se pudo enviar la confirmación de reseña: ${String(error)}`);
    });
    return pending;
  }

  /**
   * El autor confirma su email desde el enlace. Si no hay señales de fraude la
   * reseña se publica; si las hay, queda en revisión para moderación.
   */
  async confirm(token: string) {
    const lowRatingMax = await this.settings.lowRatingMax();
    const result = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
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
      // Una reseña de baja valoración no se publica sin revisar sus evidencias.
      const lowRating = review.rating <= lowRatingMax;
      const publish = flags.length === 0 && !lowRating;
      const to = publish ? 'published' : 'under_review';

      // Reclamo atómico: el mismo enlace no puede confirmarse dos veces.
      const claimed = await tx.review.updateMany({
        where: { id: review.id, emailConfirmedAt: null },
        data: {
          emailConfirmedAt: new Date(),
          confirmTokenHash: null,
          ...dataForStatus(to, review),
          ...(flags.length > 0
            ? { metadata: { ...(review.metadata as object), antifraud: flags } }
            : {}),
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(INVALID_CONFIRMATION);
      }
      await tx.moderationAction.create({
        data: {
          reviewId: review.id,
          moderatorId: null,
          action: publish ? 'publish' : 'flag',
          fromStatus: 'pending',
          toStatus: to,
          reason: publish
            ? 'Correo confirmado por el autor'
            : [
                lowRating ? 'Baja valoración: caso de evidencias' : null,
                flags.length ? `Antifraude: ${flags.join(', ')}` : null,
              ]
                .filter(Boolean)
                .join(' · '),
        },
      });
      await this.requests.completeForReview(tx, review.id);
      const caseId = lowRating ? await this.cases.openForReview(tx, review) : null;

      return {
        caseId,
        published: publish
          ? {
              id: review.id,
              organizationId: review.organizationId,
              rating: review.rating,
              reviewerName: review.reviewerName,
              title: review.title,
            }
          : null,
        rating: review.rating,
        status: publish ? ('published' as const) : ('under_review' as const),
        organization: {
          slug: review.organization.slug,
          tradeName: review.organization.tradeName,
          isPublic: review.organization.isPublic,
        },
      };
    });

    const { caseId, rating, published, ...response } = result;
    if (caseId) {
      this.cases.alertNewCase(caseId, response.organization.tradeName, rating);
    }
    if (published) {
      void this.notifications.reviewPublished(published);
    }
    // evidenceRequired: el cliente recibirá un correo pidiéndole pruebas.
    return { ...response, evidenceRequired: caseId !== null };
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async antifraudFlags(
    tx: Prisma.TransactionClient,
    review: {
      id: string;
      organizationId: string;
      ipAddress: string | null;
      body: string;
      title: string | null;
    },
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
      tx.organization.findFirst({
        where: { slug: slug.toLowerCase(), deletedAt: null },
        include: {
          sector: { select: { slug: true, name: true } },
          country: { select: { iso2: true, name: true } },
        },
      }),
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
