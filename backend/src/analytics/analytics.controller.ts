import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { TrackAnalyticsEventDto } from './dto/analytics.dto';

@Controller('organizations/me/analytics')
@UseGuards(JwtAuthGuard)
export class CompanyAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  summary(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    if (days < 1 || days > 365) {
      throw new BadRequestException('El periodo debe estar entre 1 y 365 días');
    }
    return this.analytics.summary(orgId, days);
  }
}

@Controller('public/analytics')
export class PublicAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  track(@Body() dto: TrackAnalyticsEventDto) {
    return this.analytics.track(dto);
  }
}
