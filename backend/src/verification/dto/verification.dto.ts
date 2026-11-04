import { Type } from 'class-transformer';
import {
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
