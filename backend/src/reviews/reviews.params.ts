import { BadRequestException } from '@nestjs/common';

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
