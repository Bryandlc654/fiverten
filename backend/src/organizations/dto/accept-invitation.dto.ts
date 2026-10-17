import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class InvitationTokenDto {
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  token!: string;
}

/** Aceptación creando una cuenta nueva: la contraseña la elige el invitado. */
export class AcceptInvitationDto extends InvitationTokenDto {
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe contener al menos una letra y un número',
  })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
