import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportReviewDto } from './dto/moderation.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ModerationService } from './moderation.service';
import { REVIEW_STATUSES, type ReviewStatus } from './reviews.mappers';
import { parseRating } from './reviews.params';
import { ReviewsService } from './reviews.service';

@Controller('organizations/me/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly moderation: ModerationService,
  ) {}

  @Get()
  list(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('rating') rating?: string,
    @Query('status') status?: string,
  ) {
    if (status && !REVIEW_STATUSES.includes(status as ReviewStatus)) {
      throw new BadRequestException('Estado no válido');
    }
    return this.reviews.list(this.requireOrg(orgId), {
      page,
      pageSize,
      rating: parseRating(rating),
      status: (status || undefined) as ReviewStatus | undefined,
    });
  }

  @Put(':id/response')
  @Roles('editor')
  respond(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() dto: ReviewResponseDto,
  ) {
    return this.reviews.respond(this.requireOrg(orgId), userId, reviewId, dto);
  }

  @Delete(':id/response')
  @Roles('editor')
  removeResponse(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) reviewId: string,
  ) {
    return this.reviews.removeResponse(this.requireOrg(orgId), userId, reviewId);
  }

  /** La empresa no puede ocultar reseñas: solo reportarlas a moderación. */
  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  @Roles('manager')
  report(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.moderation.reportAsOrganization(this.requireOrg(orgId), userId, reviewId, dto);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}
