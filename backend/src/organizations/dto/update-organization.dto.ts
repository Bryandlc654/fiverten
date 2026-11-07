import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Campos que un administrador de la empresa puede editar por si mismo. */
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  /** URL pública del perfil (/empresa/<slug>). Se normaliza en el servidor. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo de la empresa no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  allowContact?: boolean;

  /** El perfil público no muestra las reseñas de 1 y 2 estrellas. */
  @IsOptional()
  @IsBoolean()
  hideLowRatings?: boolean;

  /** Aviso (en la app y por correo) de cada reseña nueva de 3 a 5 estrellas. */
  @IsOptional()
  @IsBoolean()
  notifyNewReviews?: boolean;

  /** Aviso destacado de las reseñas de 1 y 2 estrellas al publicarse. */
  @IsOptional()
  @IsBoolean()
  notifyNegativeReviews?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @IsOptional()
  @IsUUID()
  countryId?: string;
}
