import { Prisma } from '@prisma/client';

/** Estado visible de una reseña, derivado de sus dimensiones independientes. */
export type ReviewStatus =
  | 'pending'
  | 'published'
  | 'under_review'
  | 'reported'
  | 'hidden'
  | 'rejected';

export const REVIEW_STATUSES: ReviewStatus[] = [
  'pending',
  'published',
  'under_review',
  'reported',
  'hidden',
  'rejected',
];

/** Filtro de Prisma equivalente a cada estado visible. */
export function statusFilter(status: ReviewStatus): Prisma.ReviewWhereInput {
  switch (status) {
    case 'pending':
      return { emailConfirmedAt: null };
    case 'published':
      return { lifecycleStatus: 'published', visibility: 'public', moderationStatus: 'none' };
    case 'under_review':
      return { moderationStatus: 'under_review' };
    case 'reported':
      return { moderationStatus: 'reported' };
    case 'hidden':
      return { moderationStatus: 'hidden' };
    case 'rejected':
      return { moderationStatus: 'rejected' };
  }
}

export function reviewStatus(review: {
  emailConfirmedAt: Date | null;
  lifecycleStatus: string;
  visibility: string;
  moderationStatus: string;
}): ReviewStatus {
  if (review.moderationStatus === 'hidden') return 'hidden';
  if (review.moderationStatus === 'rejected') return 'rejected';
  if (review.moderationStatus === 'under_review') return 'under_review';
  if (review.moderationStatus === 'reported') return 'reported';
  if (review.lifecycleStatus === 'published' && review.visibility === 'public') return 'published';
  return 'pending';
}

/**
 * Nombre que se muestra públicamente: nombre de pila + inicial del primer
 * apellido ("Carlos Pérez Ruiz" -> "Carlos P."), para no exponer el nombre completo.
 */
export function publicReviewerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] ?? 'Cliente';
  }
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

// Columnas seguras para el perfil público (nunca el email ni la IP del autor).
export const PUBLIC_REVIEW_SELECT = {
  id: true,
  reviewerName: true,
  rating: true,
  title: true,
  body: true,
  experienceDate: true,
  verificationStatus: true,
  publishedAt: true,
  response: { select: { body: true, createdAt: true, editedAt: true, isPublic: true } },
} satisfies Prisma.ReviewSelect;

type PublicReviewRow = Prisma.ReviewGetPayload<{ select: typeof PUBLIC_REVIEW_SELECT }>;

export function toPublicReview(review: PublicReviewRow) {
  return {
    id: review.id,
    reviewerName: publicReviewerName(review.reviewerName),
    rating: review.rating,
    title: review.title,
    body: review.body,
    experienceDate: review.experienceDate,
    verified: review.verificationStatus === 'verified',
    publishedAt: review.publishedAt,
    response:
      review.response && review.response.isPublic
        ? {
            body: review.response.body,
            createdAt: review.response.createdAt,
            editedAt: review.response.editedAt,
          }
        : null,
  };
}

/** Vista de la empresa: incluye el estado, pero no el email del autor. */
export function toTenantReview(
  review: Prisma.ReviewGetPayload<{ include: { response: true } }>,
) {
  return {
    id: review.id,
    reviewerName: review.reviewerName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    experienceDate: review.experienceDate,
    orderReference: review.orderReference,
    status: reviewStatus(review),
    verified: review.verificationStatus === 'verified',
    createdAt: review.createdAt,
    publishedAt: review.publishedAt,
    response: review.response
      ? {
          body: review.response.body,
          createdAt: review.response.createdAt,
          editedAt: review.response.editedAt,
        }
      : null,
  };
}
