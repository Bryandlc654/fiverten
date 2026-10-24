import { Module } from '@nestjs/common';
import { AdminReviewsController } from './admin-reviews.controller';
import { ModerationService } from './moderation.service';
import { PublicResolutionsController } from './public-resolutions.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { PublicReviewsService } from './public-reviews.service';
import { ResolutionsService } from './resolutions.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [
    PublicReviewsController,
    PublicResolutionsController,
    ReviewsController,
    AdminReviewsController,
  ],
  providers: [PublicReviewsService, ReviewsService, ModerationService, ResolutionsService],
})
export class ReviewsModule {}
