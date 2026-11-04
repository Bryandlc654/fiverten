import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewStatsService } from './stats.service';

/** Estadísticas de reputación de la empresa (panel). */
@Controller('organizations/me/stats')
@UseGuards(JwtAuthGuard)
export class ReviewStatsController {
  constructor(private readonly stats: ReviewStatsService) {}

  @Get()
  overview(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ) {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    if (months < 1 || months > 24) {
      throw new BadRequestException('El número de meses debe estar entre 1 y 24');
    }
    return this.stats.overview(orgId, months);
  }
}
