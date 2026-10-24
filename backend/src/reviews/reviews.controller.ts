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
  ParseEnumPipe,
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
import { OpenResolutionDto, ResolutionMessageDto } from './dto/resolution.dto';
import { ModerationService } from './moderation.service';
import { REVIEW_STATUSES, type ReviewStatus } from './reviews.mappers';
import {
  parseAnswered,
  parsePeriod,
  parseRating,
  REVIEW_SORTS,
  type ReviewSort,
} from './reviews.params';
import { ResolutionsService } from './resolutions.service';
import { ReviewsService } from './reviews.service';

@Controller('organizations/me/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly moderation: ModerationService,
    private readonly resolutions: ResolutionsService,
  ) {}

  @Get()
  list(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('sort', new DefaultValuePipe('recent'), new ParseEnumPipe(REVIEW_SORTS))
    sort: ReviewSort,
    @Query('rating') rating?: string,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('answered') answered?: string,
    @Query('lowRating') lowRating?: string,
  ) {
    if (status && !REVIEW_STATUSES.includes(status as ReviewStatus)) {
      throw new BadRequestException('Estado no válido');
    }
    return this.reviews.list(this.requireOrg(orgId), {
      page,
      pageSize,
      sort,
      rating: parseRating(rating),
      status: (status || undefined) as ReviewStatus | undefined,
      since: parsePeriod(period),
      answered: parseAnswered(answered),
      lowRating: lowRating === 'true',
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

  /** Resolución de la reseña (si la hay), con sus mensajes. */
  @Get(':id/resolution')
  getResolution(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) reviewId: string,
  ) {
    return this.resolutions.getForReview(this.requireOrg(orgId), reviewId);
  }

  /** Abre una resolución para una reseña de baja valoración. */
  @Post(':id/resolution')
  @HttpCode(HttpStatus.CREATED)
  @Roles('editor')
  openResolution(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() dto: OpenResolutionDto,
  ) {
    return this.resolutions.open(this.requireOrg(orgId), userId, reviewId, dto.message);
  }

  /** La empresa escribe al cliente dentro de la resolución activa. */
  @Post(':id/resolution/messages')
  @HttpCode(HttpStatus.OK)
  @Roles('editor')
  sendResolutionMessage(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() dto: ResolutionMessageDto,
  ) {
    return this.resolutions.sendCompanyMessage(this.requireOrg(orgId), userId, reviewId, dto.body);
  }

  /** La empresa cierra la incidencia sin acuerdo. */
  @Post(':id/resolution/close')
  @HttpCode(HttpStatus.OK)
  @Roles('editor')
  closeResolution(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) reviewId: string,
  ) {
    return this.resolutions.close(this.requireOrg(orgId), userId, reviewId);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}
