import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Campos que un administrador de la empresa puede editar por si mismo. */
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
