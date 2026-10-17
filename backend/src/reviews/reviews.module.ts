import { Module } from '@nestjs/common';
import { AdminReviewsController } from './admin-reviews.controller';
import { ModerationService } from './moderation.service';
import { PublicReviewsController } from './public-reviews.controller';
import { PublicReviewsService } from './public-reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [PublicReviewsController, ReviewsController, AdminReviewsController],
  providers: [PublicReviewsService, ReviewsService, ModerationService],
})
export class ReviewsModule {}
