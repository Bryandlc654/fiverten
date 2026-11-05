import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const PUBLIC_ANALYTICS_EVENTS = [
  'profile_view',
  'contact_click',
  'website_click',
  'seal_download',
] as const;

export type PublicAnalyticsEvent = (typeof PUBLIC_ANALYTICS_EVENTS)[number];

export class TrackAnalyticsEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  slug!: string;

  @IsIn(PUBLIC_ANALYTICS_EVENTS)
  type!: PublicAnalyticsEvent;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;
}
