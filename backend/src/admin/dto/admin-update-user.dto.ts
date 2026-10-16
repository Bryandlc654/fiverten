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
}
