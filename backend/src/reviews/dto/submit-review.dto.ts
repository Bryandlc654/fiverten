import { Equals, IsBoolean, IsDateString, IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Formulario público para dejar una reseña (plataforma.com/review/:slug). */
export class SubmitReviewDto {
  @IsString()
  @MinLength(2, { message: 'Indica tu nombre' })
  @MaxLength(200)
  name!: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(255)
  email!: string;

  @IsInt({ message: 'La puntuación debe ser un número entero' })
  @Min(1, { message: 'La puntuación mínima es 1' })
  @Max(5, { message: 'La puntuación máxima es 5' })
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  @MinLength(10, { message: 'Cuéntanos un poco más (mínimo 10 caracteres)' })
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de la experiencia no es válida' })
  experienceDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderReference?: string;

  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar las condiciones para publicar tu reseña' })
  consent!: boolean;

  // Trampa para bots: el formulario lo oculta, una persona nunca lo rellena.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class ConfirmReviewDto {
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  token!: string;
}
