import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PRIVACY_REQUEST_TYPES = ['access', 'rectification', 'erasure', 'objection'] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export class CreatePrivacyRequestDto {
  @IsIn(PRIVACY_REQUEST_TYPES)
  type!: PrivacyRequestType;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;
}

export class CompletePrivacyRequestDto {
  @IsIn(['completed', 'rejected'])
  status!: 'completed' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  response?: string;
}
