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
import { ClientRejectDto, ClientReviewUpdateDto } from './dto/resolution.dto';
import { ACTIVE_RESOLUTION_STATUSES, LOW_RATING_MAX } from './review-states';
import { reviewStatus } from './reviews.mappers';

const RESOLUTION_TTL_DAYS = 30;
const LINK_EXPIRED = 'Este enlace no es válido o ha caducado';

type ResolutionWithMessages = Prisma.ReviewResolutionGetPayload<{
  include: { messages: true };
}>;

/**
 * Resolución de incidencias entre la empresa y el cliente que dejó una reseña
 * de baja valoración. La empresa escribe desde el panel; el cliente participa
 * desde un enlace con token enviado a su correo (sin cuenta).
 */
@Injectable()
export class ResolutionsService {
  private readonly logger = new Logger(ResolutionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Empresa (panel)
  // ---------------------------------------------------------------------------

  /** Resolución más reciente de una reseña de la empresa (o null si no hay). */
  async getForReview(orgId: string, reviewId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      await this.findOwnedReview(tx, orgId, reviewId);
      const resolution = await tx.reviewResolution.findFirst({
        where: { reviewId },
        orderBy: { createdAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      return { resolution: resolution ? this.companyView(resolution) : null };
    });
  }

  /** Abre una resolución: crea el enlace para el cliente y le envía el primer mensaje. */
  async open(orgId: string, actorId: string, reviewId: string, message: string) {
    const token = randomToken(32);
    const text = message.trim();

    const { resolutionId, reviewerEmail, orgName } = await this.prisma.withContext(
      { orgId, userId: actorId },
      async (tx) => {
        const review = await this.findOwnedReview(tx, orgId, reviewId);
        if (reviewStatus(review) !== 'published') {
          throw new BadRequestException('Solo se puede resolver una reseña publicada');
        }
        if (review.rating > LOW_RATING_MAX) {
          throw new BadRequestException(
            `Solo se pueden resolver reseñas de ${LOW_RATING_MAX} estrellas o menos`,
          );
        }
        const active = await tx.reviewResolution.findFirst({
          where: { reviewId, status: { in: ACTIVE_RESOLUTION_STATUSES } },
          select: { id: true },
        });
        if (active) {
          throw new ConflictException('Esta reseña ya tiene una resolución abierta');
        }

        const org = await tx.organization.findUniqueOrThrow({
          where: { id: orgId },
          select: { tradeName: true },
        });
        const resolution = await tx.reviewResolution.create({
          data: {
            reviewId,
            organizationId: orgId,
            initiatedBy: actorId,
            status: 'open',
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + RESOLUTION_TTL_DAYS * 24 * 60 * 60 * 1000),
          },
        });
        await tx.resolutionMessage.create({
          data: {
            resolutionId: resolution.id,
            organizationId: orgId,
            senderType: 'company',
            senderUserId: actorId,
            body: text,
          },
        });
        return {
          resolutionId: resolution.id,
          reviewerEmail: review.reviewerEmail,
          orgName: org.tradeName,
        };
      },
    );

    this.notifyClient(reviewerEmail, token, orgName, 'open');
    return { id: resolutionId, status: 'open' };
  }

  /**
   * La empresa escribe al cliente dentro de una resolución activa. Cada mensaje
   * genera un enlace nuevo (el token se rota) y el anterior deja de valer: en la
   * base solo se guarda el hash, así que el enlace del correo es el único válido.
   */
  async sendCompanyMessage(orgId: string, actorId: string, reviewId: string, body: string) {
    const text = body.trim();
    const token = randomToken(32);
    const { reviewerEmail, orgName } = await this.prisma.withContext(
      { orgId, userId: actorId },
      async (tx) => {
        const review = await this.findOwnedReview(tx, orgId, reviewId);
        const resolution = await this.findActive(tx, reviewId);
        await tx.reviewResolution.update({
          where: { id: resolution.id },
          data: {
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + RESOLUTION_TTL_DAYS * 24 * 60 * 60 * 1000),
          },
        });
        await tx.resolutionMessage.create({
          data: {
            resolutionId: resolution.id,
            organizationId: orgId,
            senderType: 'company',
            senderUserId: actorId,
            body: text,
          },
        });
        const org = await tx.organization.findUniqueOrThrow({
          where: { id: orgId },
          select: { tradeName: true },
        });
        return { reviewerEmail: review.reviewerEmail, orgName: org.tradeName };
      },
    );

    this.notifyClient(reviewerEmail, token, orgName, 'message');
    return { ok: true };
  }

  /** La empresa cierra la incidencia sin acuerdo (resultado "withdrawn"). */
  async close(orgId: string, actorId: string, reviewId: string) {
    return this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      await this.findOwnedReview(tx, orgId, reviewId);
      const resolution = await this.findActive(tx, reviewId);
      await tx.reviewResolution.update({
        where: { id: resolution.id },
        data: { status: 'closed', outcome: 'withdrawn', closedAt: new Date() },
      });
      await tx.resolutionMessage.create({
        data: {
          resolutionId: resolution.id,
          organizationId: orgId,
          senderType: 'system',
          body: 'La empresa ha cerrado la incidencia.',
        },
      });
      return { id: resolution.id, status: 'closed' as const };
    });
  }

  // ---------------------------------------------------------------------------
  // Cliente (enlace con token, sin cuenta)
  // ---------------------------------------------------------------------------

  /** Estado completo de la resolución para la página del cliente. */
  async lookup(token: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const resolution = await this.findByToken(tx, token);
      const active = ACTIVE_RESOLUTION_STATUSES.includes(resolution.status);
      return {
        company: resolution.review.organization.tradeName,
        review: {
          id: resolution.review.id,
          reviewerName: resolution.review.reviewerName,
          rating: resolution.review.rating,
          title: resolution.review.title,
          body: resolution.review.body,
          publishedAt: resolution.review.publishedAt,
        },
        resolution: {
          status: resolution.status,
          outcome: resolution.outcome,
          expiresAt: resolution.expiresAt,
          closedAt: resolution.closedAt,
        },
        messages: resolution.messages.map((m) => ({
          senderType: m.senderType,
          body: m.body,
          createdAt: m.createdAt,
        })),
        permissions: {
          canWrite: active,
          canEditReview: active,
          canDecide: active,
        },
      };
    });
  }

  /** El cliente responde a la empresa. */
  async clientMessage(token: string, body: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const resolution = await this.findActiveByToken(tx, token);
      await tx.resolutionMessage.create({
        data: {
          resolutionId: resolution.id,
          organizationId: resolution.organizationId,
          senderType: 'client',
          body: body.trim(),
        },
      });
      if (resolution.status === 'open') {
        await tx.reviewResolution.update({
          where: { id: resolution.id },
          data: { status: 'in_progress' },
        });
      }
      return { ok: true };
    });
  }

  /** El cliente actualiza su reseña mientras la incidencia está activa. */
  async updateReview(dto: ClientReviewUpdateDto) {
    const changes: Prisma.ReviewUpdateInput = {};
    if (dto.rating !== undefined) changes.rating = dto.rating;
    if (dto.title !== undefined) changes.title = dto.title.trim() || null;
    if (dto.body !== undefined) changes.body = dto.body.trim();
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('No hay cambios que guardar');
    }

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const resolution = await this.findActiveByToken(tx, dto.token);
      const review = await tx.review.findUniqueOrThrow({ where: { id: resolution.reviewId } });
      await tx.review.update({
        where: { id: review.id },
        data: {
          ...changes,
          metadata: { ...(review.metadata as object), lastEditedAt: new Date().toISOString() },
        },
      });
      await tx.resolutionMessage.create({
        data: {
          resolutionId: resolution.id,
          organizationId: resolution.organizationId,
          senderType: 'system',
          body: 'El cliente ha actualizado su reseña.',
        },
      });
      return { ok: true };
    });
  }

  /** El cliente acepta la solución: la incidencia queda resuelta. */
  async accept(token: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const resolution = await this.findActiveByToken(tx, token);
      await tx.reviewResolution.update({
        where: { id: resolution.id },
        data: { status: 'accepted', outcome: 'resolved', closedAt: new Date() },
      });
      await tx.resolutionMessage.create({
        data: {
          resolutionId: resolution.id,
          organizationId: resolution.organizationId,
          senderType: 'system',
          body: 'El cliente acepta la solución. La incidencia está resuelta.',
        },
      });
      return { status: 'accepted' as const, outcome: 'resolved' as const };
    });
  }

  /** El cliente no acepta la solución: la incidencia queda sin resolver. */
  async reject(dto: ClientRejectDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const resolution = await this.findActiveByToken(tx, dto.token);
      await tx.reviewResolution.update({
        where: { id: resolution.id },
        data: { status: 'rejected', outcome: 'unresolved', closedAt: new Date() },
      });
      await tx.resolutionMessage.create({
        data: {
          resolutionId: resolution.id,
          organizationId: resolution.organizationId,
          senderType: 'system',
          body: 'El cliente no acepta la solución propuesta.',
        },
      });
      return { status: 'rejected' as const, outcome: 'unresolved' as const };
    });
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------

  private companyView(resolution: ResolutionWithMessages) {
    return {
      id: resolution.id,
      status: resolution.status,
      outcome: resolution.outcome,
      expiresAt: resolution.expiresAt,
      closedAt: resolution.closedAt,
      createdAt: resolution.createdAt,
      messages: resolution.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        body: m.body,
        createdAt: m.createdAt,
      })),
    };
  }

  /** La reseña debe pertenecer a la organización (si no, 404: no revela si existe). */
  private async findOwnedReview(tx: Prisma.TransactionClient, orgId: string, reviewId: string) {
    const review = await tx.review.findFirst({
      where: { id: reviewId, organizationId: orgId, deletedAt: null },
    });
    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }
    return review;
  }

  /** Resolución activa de una reseña (la empresa solo escribe en las activas). */
  private async findActive(tx: Prisma.TransactionClient, reviewId: string) {
    const resolution = await tx.reviewResolution.findFirst({
      where: { reviewId, status: { in: ACTIVE_RESOLUTION_STATUSES } },
    });
    if (!resolution) {
      throw new BadRequestException('No hay una resolución abierta para esta reseña');
    }
    return resolution;
  }

  private async findByToken(tx: Prisma.TransactionClient, token: string) {
    const resolution = await tx.reviewResolution.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        review: { include: { organization: { select: { tradeName: true } } } },
      },
    });
    if (!resolution || resolution.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(LINK_EXPIRED);
    }
    return resolution;
  }

  private async findActiveByToken(tx: Prisma.TransactionClient, token: string) {
    const resolution = await this.findByToken(tx, token);
    if (!ACTIVE_RESOLUTION_STATUSES.includes(resolution.status)) {
      throw new BadRequestException('Esta resolución ya está cerrada');
    }
    return resolution;
  }

  /** El correo no bloquea la petición: si falla, queda registrado en el log. */
  private notifyClient(to: string, token: string, orgName: string, kind: 'open' | 'message'): void {
    this.mail.sendResolutionLink(to, token, orgName, kind).catch((error: unknown) => {
      this.logger.error(`No se pudo enviar el correo de resolución: ${String(error)}`);
    });
  }
}
