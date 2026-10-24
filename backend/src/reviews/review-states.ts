import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ReviewStatus } from './reviews.mappers';

/**
 * Máquina de estados de las reseñas (alcance, punto 8):
 *
 *   pending       --confirma el email-->        published
 *   pending       --confirma + antifraude-->    under_review
 *   published     --reporte-->                  reported (sigue visible)
 *   under_review  --publish-->                  published
 *   under_review  --reject (motivo)-->          rejected
 *   published / reported --hide (motivo)-->     hidden
 *   reported      --unflag-->                   published (reportes rechazados)
 *   hidden / rejected --restore-->              published
 *
 * Las acciones de moderación las ejecuta el super admin y quedan registradas
 * en moderation_actions; los reportes los crean empresas o visitantes.
 */
export type ModerationActionName = 'publish' | 'reject' | 'hide' | 'restore' | 'unflag';

export const MODERATION_ACTIONS: ModerationActionName[] = [
  'publish',
  'reject',
  'hide',
  'restore',
  'unflag',
];

interface Transition {
  from: ReviewStatus[];
  to: ReviewStatus;
  requiresReason: boolean;
  /** Cómo quedan los reportes abiertos tras la acción. */
  reports: 'accepted' | 'rejected' | null;
}

export const TRANSITIONS: Record<ModerationActionName, Transition> = {
  publish: { from: ['under_review'], to: 'published', requiresReason: false, reports: null },
  reject: { from: ['under_review'], to: 'rejected', requiresReason: true, reports: null },
  hide: {
    from: ['published', 'reported'],
    to: 'hidden',
    requiresReason: true,
    reports: 'accepted',
  },
  restore: { from: ['hidden', 'rejected'], to: 'published', requiresReason: false, reports: null },
  unflag: { from: ['reported'], to: 'published', requiresReason: false, reports: 'rejected' },
};

/** Valida la transición y devuelve su definición. */
export function assertTransition(
  action: ModerationActionName,
  current: ReviewStatus,
  reason: string | undefined,
): Transition {
  const transition = TRANSITIONS[action];
  if (!transition.from.includes(current)) {
    throw new BadRequestException(
      `No se puede aplicar "${action}" a una reseña en estado "${current}"`,
    );
  }
  if (transition.requiresReason && !reason?.trim()) {
    throw new BadRequestException('Indica el motivo de la decisión');
  }
  return transition;
}

/** Columnas que representan cada estado visible (respetando los CHECK de la tabla). */
export function dataForStatus(
  status: ReviewStatus,
  review: { publishedAt: Date | null },
): Prisma.ReviewUpdateManyMutationInput {
  switch (status) {
    case 'published':
      return {
        lifecycleStatus: 'published',
        visibility: 'public',
        moderationStatus: 'none',
        publishedAt: review.publishedAt ?? new Date(),
      };
    case 'reported':
      // Sigue visible hasta que moderación decida.
      return { moderationStatus: 'reported' };
    case 'under_review':
      return { visibility: 'private', moderationStatus: 'under_review' };
    case 'hidden':
      return { visibility: 'private', moderationStatus: 'hidden' };
    case 'rejected':
      return { lifecycleStatus: 'archived', visibility: 'private', moderationStatus: 'rejected' };
    case 'pending':
      throw new BadRequestException('Una reseña no puede volver a pendiente');
  }
}

/** Reseñas con esta puntuación o menos son de baja valoración y pueden resolverse. */
export const LOW_RATING_MAX = 2;

/** Estados de una resolución en los que aún se puede escribir y decidir. */
export const ACTIVE_RESOLUTION_STATUSES = ['open', 'in_progress'];
