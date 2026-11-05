import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientRelationDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactName!: string;

  @IsEmail()
  @MaxLength(255)
  contactEmail!: string;

  @IsOptional()
  @IsBoolean()
  consent?: boolean;

  @IsOptional()
  @IsIn(['identified', 'confirmed', 'verified'])
  verificationLevel?: 'identified' | 'confirmed' | 'verified';
}

export class UpdateClientRelationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsIn(['invited', 'active', 'completed', 'revoked'])
  status?: 'invited' | 'active' | 'completed' | 'revoked';

  @IsOptional()
  @IsBoolean()
  consent?: boolean;

  @IsOptional()
  @IsIn(['identified', 'confirmed', 'verified'])
  verificationLevel?: 'identified' | 'confirmed' | 'verified';
}
