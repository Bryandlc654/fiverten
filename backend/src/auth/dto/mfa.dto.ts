import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class VerifyMfaLoginDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  mfaToken!: string;

  @IsString()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}

export class EnableMfaDto {
  @IsString()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}

export class DisableMfaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;

  @IsString()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}
