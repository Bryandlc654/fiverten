import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Mensaje del admin (pedir evidencias, validarlas o escribir a las partes). */
export class CaseAdminMessageDto {
  @IsString()
  @MinLength(10, { message: 'Explica a las partes qué necesitas (mínimo 10 caracteres)' })
  @MaxLength(3000)
  message!: string;
}

/** Rechazar la reseña: el motivo es obligatorio (se comunica al cliente). */
export class CaseRejectDto {
  @IsString()
  @MinLength(5, { message: 'Indica el motivo del rechazo' })
  @MaxLength(1000)
  reason!: string;
}

/** Publicar o retirar la reseña: nota opcional. */
export class CaseDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/** Mensaje de la empresa. Puede ir vacío si adjunta archivos. */
export class CaseMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  body?: string;
}

/** Cliente: identifica el caso con el token del enlace del correo. */
export class CaseTokenDto {
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  token!: string;
}

/** Mensaje del cliente. Puede ir vacío si adjunta archivos. */
export class ClientCaseMessageDto extends CaseTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  body?: string;
}
