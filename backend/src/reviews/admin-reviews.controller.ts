import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { ModerateReviewDto } from './dto/moderation.dto';
import { ModerationService } from './moderation.service';
import { MODERATION_ACTIONS, type ModerationActionName } from './review-states';
import { REVIEW_STATUSES, type ReviewStatus } from './reviews.mappers';

/** Cola de moderación del administrador general. */
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminReviewsController {
  constructor(private readonly moderation: ModerationService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    if (status && !REVIEW_STATUSES.includes(status as ReviewStatus)) {
      throw new BadRequestException('Estado no válido');
    }
    return this.moderation.adminList({
      page,
      pageSize,
      search,
      status: (status || undefined) as ReviewStatus | undefined,
    });
  }

  @Post(':id/:action')
  @HttpCode(HttpStatus.OK)
  moderate(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Param('action') action: string,
    @Body() dto: ModerateReviewDto,
  ) {
    if (!MODERATION_ACTIONS.includes(action as ModerationActionName)) {
      throw new BadRequestException('Acción no válida');
    }
    return this.moderation.moderate(userId, reviewId, action as ModerationActionName, dto);
  }
}
