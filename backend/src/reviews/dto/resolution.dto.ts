import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Abrir una resolución: la empresa escribe el primer mensaje al cliente. */
export class OpenResolutionDto {
  @IsString()
  @MinLength(10, { message: 'Explica al cliente qué quieres resolver (mínimo 10 caracteres)' })
  @MaxLength(3000)
  message!: string;
}

/** Mensaje de la empresa dentro de una resolución abierta. */
export class ResolutionMessageDto {
  @IsString()
  @MinLength(2, { message: 'El mensaje no puede estar vacío' })
  @MaxLength(3000)
  body!: string;
}

/** Cliente: identifica la resolución con el token del enlace del correo. */
export class ResolutionTokenDto {
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  token!: string;
}

/** Cliente: escribe un mensaje a la empresa. */
export class ClientResolutionMessageDto extends ResolutionTokenDto {
  @IsString()
  @MinLength(2, { message: 'El mensaje no puede estar vacío' })
  @MaxLength(3000)
  body!: string;
}

/** Cliente: actualiza su reseña mientras la resolución está abierta. */
export class ClientReviewUpdateDto extends ResolutionTokenDto {
  @IsOptional()
  @IsInt({ message: 'La puntuación debe ser un número entero' })
  @Min(1, { message: 'La puntuación mínima es 1' })
  @Max(5, { message: 'La puntuación máxima es 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Cuéntanos un poco más (mínimo 10 caracteres)' })
  @MaxLength(5000)
  body?: string;
}

/** Cliente: rechaza la solución propuesta, con un motivo opcional. */
export class ClientRejectDto extends ResolutionTokenDto {
  @IsOptional()
  @IsString()
  @IsIn(['no_solution', 'other'], { message: 'Motivo no válido' })
  reason?: string;
}
