import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2, { message: 'El nombre comercial debe tener al menos 2 caracteres' })
  @MaxLength(200)
  tradeName!: string;

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

  // Propietario inicial (opcional).
  @IsOptional()
  @IsEmail({}, { message: 'El correo del propietario no es válido' })
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerLastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  ownerPassword?: string;
}
