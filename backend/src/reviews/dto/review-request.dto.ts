import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

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

export class CampaignRecipientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEmail({}, { message: 'El correo del cliente no es válido' })
  @MaxLength(255)
  email!: string;
}

export class CreateCampaignDto {
  @IsString()
  @MinLength(2, { message: 'Indica un nombre para la campaña' })
  @MaxLength(150)
  name!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Añade al menos un destinatario' })
  @ArrayMaxSize(200, { message: 'Máximo 200 destinatarios por campaña' })
  @ValidateNested({ each: true })
  @Type(() => CampaignRecipientDto)
  recipients!: CampaignRecipientDto[];
}

