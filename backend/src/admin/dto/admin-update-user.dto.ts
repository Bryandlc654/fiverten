import { IsBoolean, IsOptional } from 'class-validator';

/** Ajustes de plataforma sobre una cuenta de usuario. */
export class AdminUpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  /** Acceso al panel de soporte (permiso de plataforma). */
  @IsOptional()
  @IsBoolean()
  isSupportAgent?: boolean;

  /** Verificador FIVERTEN: revisa evidencias y cambia estados. */
  @IsOptional()
  @IsBoolean()
  isVerifier?: boolean;
}
