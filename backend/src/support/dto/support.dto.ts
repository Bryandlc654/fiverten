import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const TICKET_CATEGORIES = [
  'general',
  'billing',
  'reviews',
  'technical',
  'account',
  'other',
] as const;

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsOptional()
  @IsIn(TICKET_CATEGORIES)
  category?: (typeof TICKET_CATEGORIES)[number];

  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: (typeof TICKET_PRIORITIES)[number];

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;
}

export class TicketMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  /** Nota interna: solo la ve el equipo de soporte. */
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: (typeof TICKET_STATUSES)[number];

  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: (typeof TICKET_PRIORITIES)[number];

  @IsOptional()
  @IsIn(TICKET_CATEGORIES)
  category?: (typeof TICKET_CATEGORIES)[number];

  /** null para dejar el ticket sin asignar. */
  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;
}
