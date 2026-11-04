import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VERIFICATION_DOCUMENT_CATEGORIES } from '../verification-status';

export class UploadVerificationDocumentDto {
  @IsIn(VERIFICATION_DOCUMENT_CATEGORIES)
  category!: (typeof VERIFICATION_DOCUMENT_CATEGORIES)[number];
}

export class CreateVerificationProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  @MaxLength(500)
  url?: string;
}

export class ApproveVerificationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3650)
  expiresInDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class RejectVerificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}

export class RevokeVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class CreateCertificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  issuer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  credentialId?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  credentialUrl?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  issuedAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de caducidad no es válida' })
  expiresAt?: string;
}

export class ReviewCertificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class RejectCertificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}

export class UpdateVerificationInquiryDto {
  @IsIn(['new', 'contacted', 'closed'])
  status!: 'new' | 'contacted' | 'closed';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class VerificationInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  contactName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar la política de privacidad' })
  consent!: boolean;
}

