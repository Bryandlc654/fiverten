import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ConfirmReviewDto, SubmitReviewDto } from './dto/submit-review.dto';
import { PublicReviewsService, type ReviewSort } from './public-reviews.service';
import { parseRating } from './reviews.params';

/** Perfil público y recepción de reseñas (sin sesión). */
@Controller('public')
export class PublicReviewsController {
  constructor(private readonly reviews: PublicReviewsService) {}

  @Get('organizations/:slug')
  getProfile(@Param('slug') slug: string) {
    return this.reviews.getProfile(slug);
  }

  @Get('organizations/:slug/reviews')
  listReviews(
    @Param('slug') slug: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('sort', new DefaultValuePipe('recent'), new ParseEnumPipe(['recent', 'oldest']))
    sort: ReviewSort,
    @Query('rating') rating?: string,
  ) {
    return this.reviews.listReviews(slug, { page, pageSize, sort, rating: parseRating(rating) });
  }

  @Get('organizations/:slug/review-form')
  getReviewForm(@Param('slug') slug: string) {
    return this.reviews.getReviewForm(slug);
  }

  @Post('organizations/:slug/reviews')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@Param('slug') slug: string, @Body() dto: SubmitReviewDto, @Req() req: Request) {
    return this.reviews.submit(slug, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('reviews/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirm(@Body() dto: ConfirmReviewDto) {
    return this.reviews.confirm(dto.token);
  }
}
