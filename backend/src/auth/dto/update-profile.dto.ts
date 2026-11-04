import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Datos que el propio usuario puede editar desde su perfil. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]{3,100}$/, {
    message: 'El usuario solo admite letras, números, punto, guion y guion bajo (3-100).',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string | null;
}
