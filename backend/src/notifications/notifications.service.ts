import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { effectiveRole, roleAtLeast } from '../common/roles';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LOW_RATING_MAX } from '../reviews/review-states';

export type NotificationType = 'new_review' | 'negative_review';

/** Datos de la reseña recién publicada que necesita el aviso. */
export interface PublishedReview {
  id: string;
  organizationId: string;
  rating: number;
  reviewerName: string;
  title: string | null;
}

interface ListQuery {
  page: number;
  pageSize: number;
  unread: boolean;
}

/**
 * Centro de notificaciones del panel de la empresa. Cada aviso se guarda una
 * vez por miembro, para que cada uno marque sus leídas. Los avisos de reseñas
 * también se envían por correo a los responsables (manager o superior).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Avisa de una reseña recién publicada. Se llama tras confirmar la
   * transacción y nunca falla: los errores quedan en el log.
   */
  async reviewPublished(review: PublishedReview): Promise<void> {
    try {
      const notice = await this.storeReviewNotice(review);
      if (!notice) return;
      await Promise.all(
        notice.emails.map((email) =>
          this.mail
            .sendReviewNotice(email, notice.title, notice.body, notice.negative)
            .catch((error: unknown) => {
              this.logger.error(`No se pudo enviar el aviso de reseña: ${String(error)}`);
            }),
        ),
      );
    } catch (error) {
      this.logger.error(`No se pudo registrar el aviso de reseña: ${String(error)}`);
    }
  }

  async list(orgId: string, userId: string, query: ListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(50, Math.max(1, query.pageSize));
    const mine = { organizationId: orgId, userId };
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const where = query.unread ? { ...mine, readAt: null } : mine;
      const [total, unread, rows] = await Promise.all([
        tx.notification.count({ where }),
        tx.notification.count({ where: { ...mine, readAt: null } }),
        tx.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return {
        items: rows.map((row) => ({
          id: row.id,
          type: row.type as NotificationType,
          title: row.title,
          body: row.body,
          link: row.link,
          read: row.readAt !== null,
          createdAt: row.createdAt,
        })),
        total,
        unread,
        page,
        pageSize,
      };
    });
  }

  async unreadCount(orgId: string, userId: string) {
    const unread = await this.prisma.withContext({ orgId, userId }, (tx) =>
      tx.notification.count({ where: { organizationId: orgId, userId, readAt: null } }),
    );
    return { unread };
  }

  async markRead(orgId: string, userId: string, id: string) {
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const found = await tx.notification.findFirst({
        where: { id, organizationId: orgId, userId },
        select: { readAt: true },
      });
      if (!found) {
        throw new NotFoundException('Notificación no encontrada');
      }
      if (!found.readAt) {
        await tx.notification.update({ where: { id }, data: { readAt: new Date() } });
      }
      return { success: true };
    });
  }

  async markAllRead(orgId: string, userId: string) {
    const updated = await this.prisma.withContext({ orgId, userId }, (tx) =>
      tx.notification.updateMany({
        where: { organizationId: orgId, userId, readAt: null },
        data: { readAt: new Date() },
      }),
    );
    return { updated: updated.count };
  }

  /** Guarda el aviso para cada miembro y devuelve a quién escribir (null si está desactivado). */
  private async storeReviewNotice(review: PublishedReview) {
    const orgId = review.organizationId;
    const negative = review.rating <= LOW_RATING_MAX;
    return this.prisma.withContext({ orgId }, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { email: true, notifyNewReviews: true, notifyNegativeReviews: true },
      });
      if (!org || !(negative ? org.notifyNegativeReviews : org.notifyNewReviews)) {
        return null;
      }
      const memberships = await tx.organizationMembership.findMany({
        where: { organizationId: orgId, isActive: true, user: { isActive: true, deletedAt: null } },
        include: {
          user: { select: { id: true, email: true } },
          role: { select: { baseRole: true } },
        },
      });

      const stars = `${review.rating} ${review.rating === 1 ? 'estrella' : 'estrellas'}`;
      const title = negative ? `Reseña negativa de ${stars}` : `Nueva reseña de ${stars}`;
      const quoted = review.title ? `: «${review.title}»` : '';
      const body = negative
        ? `${review.reviewerName} ha publicado una reseña de baja valoración${quoted}. Respóndela cuanto antes o abre una incidencia para resolverla.`
        : `${review.reviewerName} ha publicado una reseña${quoted}.`;
      const type: NotificationType = negative ? 'negative_review' : 'new_review';
      const link = negative ? '/dashboard/reviews?lowRating=true' : '/dashboard/reviews';

      if (memberships.length > 0) {
        await tx.notification.createMany({
          data: memberships.map((m) => ({
            organizationId: orgId,
            userId: m.user.id,
            type,
            title,
            body,
            link,
            reviewId: review.id,
          })),
        });
      }
      const managers = memberships
        .filter((m) => roleAtLeast(effectiveRole(m.role.baseRole, m.isOwner), 'manager'))
        .map((m) => m.user.email);
      const emails = managers.length > 0 ? managers : org.email ? [org.email] : [];
      return { title, body, negative, emails };
    });
  }
}
