import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Filtro opcional por estrellas (1-5). */
export function parseRating(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BadRequestException('La puntuación debe estar entre 1 y 5');
  }
  return rating;
}

export const REVIEW_SORTS = ['recent', 'oldest', 'highest', 'lowest'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

/** Orden del listado: por fecha o por puntuación (desempata la fecha). */
export function reviewOrder(
  sort: ReviewSort,
  dateField: 'publishedAt' | 'createdAt',
): Prisma.ReviewOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ [dateField]: 'asc' }];
    case 'highest':
      return [{ rating: 'desc' }, { [dateField]: 'desc' }];
    case 'lowest':
      return [{ rating: 'asc' }, { [dateField]: 'desc' }];
    default:
      return [{ [dateField]: 'desc' }];
  }
}

const PERIOD_DAYS: Record<string, number> = { '30d': 30, '90d': 90, '365d': 365 };
export const REVIEW_PERIODS = Object.keys(PERIOD_DAYS);

/** Filtro opcional por fecha: últimos 30 días, 3 meses o 12 meses. */
export function parsePeriod(value: string | undefined): Date | undefined {
  if (value === undefined || value === '' || value === 'all') {
    return undefined;
  }
  const days = PERIOD_DAYS[value];
  if (!days) {
    throw new BadRequestException('Periodo no válido');
  }
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Filtro del panel: reseñas con o sin respuesta de la empresa. */
export function parseAnswered(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === 'yes') return true;
  if (value === 'no') return false;
  throw new BadRequestException('Filtro de respuesta no válido');
}
