import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Reporte de una reseña (empresa o visitante). */
export class ReportReviewDto {
  @IsString()
  @Matches(/^[a-z_]{2,50}$/, { message: 'Motivo no válido' })
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

/** Decisión de moderación; el motivo es obligatorio al ocultar o rechazar. */
export class ModerateReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/** Cambio del estado de verificación de una opinión. */
export class ReviewVerificationDto {
  @IsIn(['identified', 'confirmed', 'verified'])
  status!: 'identified' | 'confirmed' | 'verified';

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  methodology?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
