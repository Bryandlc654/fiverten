import { IsString, MaxLength, MinLength } from 'class-validator';

/** Respuesta pública de la empresa a una reseña. */
export class ReviewResponseDto {
  @IsString()
  @MinLength(2, { message: 'La respuesta no puede estar vacía' })
  @MaxLength(3000)
  body!: string;
}
