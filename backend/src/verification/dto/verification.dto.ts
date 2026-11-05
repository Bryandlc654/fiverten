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
import {
  PROJECT_EVIDENCE_TYPES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from '../verification-project.constants';

export class UploadVerificationDocumentDto {
  @IsIn(VERIFICATION_DOCUMENT_CATEGORIES)
  category!: (typeof VERIFICATION_DOCUMENT_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  issueDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de caducidad no es válida' })
  expiryDate?: string;
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

  @IsOptional()
  @IsIn(PROJECT_TYPES)
  projectType?: (typeof PROJECT_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin no es válida' })
  endDate?: string;

  @IsOptional()
  @IsIn(['private', 'public', 'restricted'])
  publicVisibility?: 'private' | 'public' | 'restricted';

  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: (typeof PROJECT_STATUSES)[number];
}

export class UploadProjectEvidenceDto {
  @IsOptional()
  @IsIn(PROJECT_EVIDENCE_TYPES)
  evidenceType?: (typeof PROJECT_EVIDENCE_TYPES)[number];
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

  @IsOptional()
  @IsString()
  @MaxLength(200)
  scope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  methodologyVersion?: string;
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

  @IsOptional()
  @IsBoolean()
  publicCredential?: boolean;
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

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sector?: string;

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
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar la política de privacidad' })
  consent!: boolean;

  /** Campo trampa anti-bot: debe quedar vacío. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  honeypot?: string;
}

