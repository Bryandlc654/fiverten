import {
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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateReviewRequestDto } from './dto/review-request.dto';
import { ReviewRequestsService } from './review-requests.service';

/** Enlaces personalizados de solicitud de reseña para el panel de la empresa. */
@Controller('organizations/me/review-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
export class ReviewRequestsController {
  constructor(private readonly requests: ReviewRequestsService) {}

  @Get()
  list(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
  ) {
    return this.requests.list(this.requireOrg(orgId), { page, pageSize, status });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateReviewRequestDto,
  ) {
    return this.requests.create(this.requireOrg(orgId), userId, dto);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}
