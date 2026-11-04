import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Alta de una solicitud personalizada de reseña (enlace único por cliente). */
export class CreateReviewRequestDto {
  @IsString()
  @MinLength(2, { message: 'Indica el nombre del cliente' })
  @MaxLength(200)
  name!: string;

  @IsEmail({}, { message: 'El correo del cliente no es válido' })
  @MaxLength(255)
  email!: string;
}

/** Consulta pública del enlace personalizado (?rt=token). */
export class ReviewRequestLookupDto {
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  token!: string;
}
