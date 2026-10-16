import { Module } from '@nestjs/common';
import { PublicReviewsController } from './public-reviews.controller';
import { PublicReviewsService } from './public-reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [PublicReviewsController, ReviewsController],
  providers: [PublicReviewsService, ReviewsService],
})
export class ReviewsModule {}
